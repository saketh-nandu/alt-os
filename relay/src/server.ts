import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";
import os from "os";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

export function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

interface SessionInfo {
  sessionId: string;
  token: string;
  expiresAt: number;
  deviceWs?: WebSocket;
  desktopWs?: WebSocket;
  deviceName?: string;
  deviceStatus?: string;
  deviceIp?: string;
  devicePort?: number;
  isPaired?: boolean;
  createdAt: number;
}

const sessions = new Map<string, SessionInfo>();

// Clean up expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      session.deviceWs?.close(1000, "Session expired");
      session.desktopWs?.close(1000, "Session expired");
      sessions.delete(sessionId);
    }
  }
}, 30000);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    relay: "ALT-OS Real Connection Relay",
    activeSessions: sessions.size,
    localIp: getLocalIp(),
    port: PORT,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now()
  });
});

// Info endpoint for desktop LAN discovery
app.get("/api/info", (_req: Request, res: Response) => {
  res.json({
    localIp: getLocalIp(),
    port: PORT,
    timestamp: Date.now()
  });
});

// Create new pairing session
app.post("/api/pair/session", (req: Request, res: Response) => {
  const sessionId = "altos-" + randomBytes(4).toString("hex");
  const token = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

  const session: SessionInfo = {
    sessionId,
    token,
    expiresAt,
    createdAt: Date.now()
  };

  sessions.set(sessionId, session);

  const localIp = getLocalIp();
  const relayUrl = `ws://${localIp}:${PORT}/ws?role=device&sessionId=${sessionId}&token=${token}`;
  const announceUrl = `http://${localIp}:${PORT}/api/pair/announce`;
  const localUrl = `http://${localIp}:8765`;

  res.json({
    version: "1.0",
    sessionId,
    token,
    expiresAt,
    localUrl,
    relayUrl,
    announceUrl,
    desktopIp: localIp,
    desktopPort: PORT
  });
});

// Phone announces QR code scan & pairing over HTTP
app.post("/api/pair/announce", (req: Request, res: Response) => {
  const { sessionId, token, deviceName, deviceIp, devicePort } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  if (session.token !== token) {
    return res.status(401).json({ error: "Unauthorized: Token mismatch" });
  }

  session.isPaired = true;
  session.deviceName = deviceName || "Android Mobile Phone";
  
  // Extract client IP if not passed
  let clientIp = deviceIp;
  if (!clientIp) {
    const rawIp = req.ip || req.socket.remoteAddress || "";
    clientIp = rawIp.replace(/^.*:/, ""); // strip IPv6 prefix
  }
  session.deviceIp = clientIp || "127.0.0.1";
  session.devicePort = devicePort || 8765;

  console.log(`[Relay] Phone paired for session ${sessionId}: ${session.deviceName} at ${session.deviceIp}:${session.devicePort}`);

  // Notify desktop WS if open
  if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
    session.desktopWs.send(JSON.stringify({
      type: "device_connected",
      deviceName: session.deviceName,
      deviceIp: session.deviceIp,
      devicePort: session.devicePort
    }));
  }

  res.json({
    success: true,
    message: "Device paired successfully",
    sessionId,
    deviceName: session.deviceName
  });
});

// Verify if phone paired with session
app.get("/api/pair/status/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  const isWsPaired = !!session.deviceWs && session.deviceWs.readyState === WebSocket.OPEN;
  const isPaired = isWsPaired || !!session.isPaired;

  res.json({
    sessionId,
    paired: isPaired,
    deviceName: session.deviceName || null,
    deviceIp: session.deviceIp || null,
    devicePort: session.devicePort || 8765,
    expiresAt: session.expiresAt
  });
});

// Relay HTTP Proxy: Desktop -> Relay -> Device -> Relay -> Desktop
app.all("/relay/proxy/:sessionId/*", async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const path = "/" + req.params[0];
  const session = sessions.get(sessionId);

  if (!session || !session.deviceWs || session.deviceWs.readyState !== WebSocket.OPEN) {
    return res.status(503).json({ error: "Device is not connected to relay." });
  }

  const requestId = "req-" + randomBytes(6).toString("hex");

  // Send request over WebSocket to device
  const message = {
    type: "http_proxy_request",
    requestId,
    method: req.method,
    path,
    headers: req.headers,
    body: req.body
  };

  session.deviceWs.send(JSON.stringify(message));

  // Await response with timeout
  const timeout = setTimeout(() => {
    cleanup();
    res.status(504).json({ error: "Device relay response timeout" });
  }, 10000);

  const responseHandler = (data: any) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "http_proxy_response" && msg.requestId === requestId) {
        cleanup();
        res.status(msg.statusCode || 200).json(msg.data);
      }
    } catch (e) {}
  };

  const cleanup = () => {
    clearTimeout(timeout);
    session.deviceWs?.off("message", responseHandler);
  };

  session.deviceWs.on("message", responseHandler);
});

// WebSocket connection routing
wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  let role = url.searchParams.get("role"); // "device" | "desktop"
  let sessionId = url.searchParams.get("sessionId");
  let token = url.searchParams.get("token");

  // If query params are provided, validate immediately
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    if (token && session.token === token) {
      attachWs(ws, session, role || "device");
      return;
    }
  }

  // Otherwise, allow first message to authenticate
  const authTimeout = setTimeout(() => {
    ws.close(1008, "Authentication timeout");
  }, 5000);

  ws.once("message", (raw) => {
    clearTimeout(authTimeout);
    try {
      const msg = JSON.parse(raw.toString());
      const sId = msg.sessionId;
      const t = msg.token;
      if (sId && sessions.has(sId)) {
        const session = sessions.get(sId)!;
        if (session.token === t) {
          if (msg.type === "device_register") {
            session.deviceName = msg.deviceName;
            session.deviceStatus = msg.serverStatus;
            session.isPaired = true;
            attachWs(ws, session, "device");
            return;
          } else if (msg.type === "desktop_register") {
            attachWs(ws, session, "desktop");
            return;
          }
        }
      }
      ws.close(1008, "Unauthorized");
    } catch (e) {
      ws.close(1008, "Invalid auth payload");
    }
  });
});

function attachWs(ws: WebSocket, session: SessionInfo, role: string) {
  if (role === "device") {
    session.deviceWs = ws;
    session.isPaired = true;
    console.log(`[Relay] Device WS connected to session: ${session.sessionId}`);

    if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
      session.desktopWs.send(JSON.stringify({
        type: "device_connected",
        deviceName: session.deviceName || "Android Phone"
      }));
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "device_register") {
          session.deviceName = msg.deviceName;
          session.deviceStatus = msg.serverStatus;
          session.isPaired = true;
        }
        if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
          session.desktopWs.send(data.toString());
        }
      } catch (e) {
        if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
          session.desktopWs.send(data.toString());
        }
      }
    });

    ws.on("close", () => {
      console.log(`[Relay] Device WS disconnected: ${session.sessionId}`);
      session.deviceWs = undefined;
      if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
        session.desktopWs.send(JSON.stringify({ type: "device_disconnected" }));
      }
    });

  } else if (role === "desktop") {
    session.desktopWs = ws;
    console.log(`[Relay] Desktop WS connected to session: ${session.sessionId}`);

    ws.send(JSON.stringify({
      type: "session_info",
      sessionId: session.sessionId,
      deviceConnected: (!!session.deviceWs && session.deviceWs.readyState === WebSocket.OPEN) || !!session.isPaired,
      deviceName: session.deviceName
    }));

    ws.on("message", (data) => {
      if (session.deviceWs && session.deviceWs.readyState === WebSocket.OPEN) {
        session.deviceWs.send(data.toString());
      }
    });

    ws.on("close", () => {
      console.log(`[Relay] Desktop WS disconnected: ${session.sessionId}`);
      session.desktopWs = undefined;
    });
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ALT-OS Relay] Running on port ${PORT}`);
  console.log(`[ALT-OS Relay] Local IP: ${getLocalIp()}`);
  console.log(`[ALT-OS Relay] Health: http://${getLocalIp()}:${PORT}/health`);
});
