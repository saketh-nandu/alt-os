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

interface PairedDevice {
  sessionId?: string;
  token?: string;
  deviceName: string;
  deviceIp: string;
  devicePort: number;
  lastSeen: number;
}

const sessions = new Map<string, SessionInfo>();

// Track real connected device on LAN
let lastPairedDevice: PairedDevice | null = {
  deviceName: "realme RMX1925",
  deviceIp: "192.168.0.109",
  devicePort: 8765,
  lastSeen: Date.now()
};

// Clean up un-paired expired sessions periodically (do NOT delete paired sessions)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (!session.isPaired && session.expiresAt < now) {
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

// Current active phone on LAN endpoint
app.get("/api/device/current", async (_req: Request, res: Response) => {
  if (!lastPairedDevice) {
    return res.json({ paired: false });
  }

  try {
    const pingRes = await fetch(`http://${lastPairedDevice.deviceIp}:${lastPairedDevice.devicePort}/health`, {
      signal: AbortSignal.timeout(1500)
    });
    if (pingRes.ok) {
      const data: any = await pingRes.json();
      return res.json({
        paired: true,
        deviceIp: lastPairedDevice.deviceIp,
        devicePort: lastPairedDevice.devicePort,
        deviceName: data.device || lastPairedDevice.deviceName,
        sessionId: lastPairedDevice.sessionId || null,
        token: lastPairedDevice.token || null
      });
    }
  } catch (e) {}

  res.json({ paired: false, lastKnownDevice: lastPairedDevice.deviceName });
});

// Create new pairing session
app.post("/api/pair/session", (req: Request, res: Response) => {
  const sessionId = "altos-" + randomBytes(4).toString("hex");
  const token = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes TTL

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
  session.deviceName = deviceName || "realme RMX1925";
  session.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // Extend paired session for 24h
  
  // Extract client IP if not passed
  let clientIp = deviceIp;
  if (!clientIp) {
    const rawIp = req.ip || req.socket.remoteAddress || "";
    clientIp = rawIp.replace(/^.*:/, ""); // strip IPv6 prefix
  }
  session.deviceIp = clientIp || "192.168.0.109";
  session.devicePort = devicePort || 8765;

  lastPairedDevice = {
    sessionId,
    token,
    deviceName: session.deviceName || "realme RMX1925",
    deviceIp: session.deviceIp || "192.168.0.109",
    devicePort: session.devicePort || 8765,
    lastSeen: Date.now()
  };

  console.log(`[Relay] Phone paired for session ${sessionId}: ${session.deviceName} at ${session.deviceIp}:${session.devicePort}`);

  // Notify desktop WS immediately
  if (session.desktopWs && session.desktopWs.readyState === WebSocket.OPEN) {
    session.desktopWs.send(JSON.stringify({
      type: "device_connected",
      sessionId: session.sessionId,
      deviceName: session.deviceName,
      deviceIp: session.deviceIp,
      devicePort: session.devicePort
    }));
  }

  res.json({
    success: true,
    message: "Device paired successfully",
    sessionId,
    deviceName: session.deviceName,
    deviceIp: session.deviceIp,
    devicePort: session.devicePort
  });
});

// Verify if phone paired with session
app.get("/api/pair/status/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    if (lastPairedDevice && lastPairedDevice.sessionId === sessionId) {
      return res.json({
        sessionId,
        paired: true,
        deviceName: lastPairedDevice.deviceName,
        deviceIp: lastPairedDevice.deviceIp,
        devicePort: lastPairedDevice.devicePort,
        expiresAt: Date.now() + 60000
      });
    }
    return res.status(404).json({ error: "Session not found or expired" });
  }

  const isWsPaired = !!session.deviceWs && session.deviceWs.readyState === WebSocket.OPEN;
  const isPaired = isWsPaired || !!session.isPaired;

  res.json({
    sessionId,
    paired: isPaired,
    deviceName: session.deviceName || lastPairedDevice?.deviceName || null,
    deviceIp: session.deviceIp || lastPairedDevice?.deviceIp || null,
    devicePort: session.devicePort || lastPairedDevice?.devicePort || 8765,
    expiresAt: session.expiresAt
  });
});

// Ultra-fast HTTP Forwarding Proxy (Desktop -> Relay -> Phone -> Relay -> Desktop)
app.all(["/relay/proxy/:sessionId/*", "/api/proxy/*"], async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const path = "/" + (req.params[0] || "");

  let targetIp = "";
  let targetPort = 8765;

  if (sessionId && sessions.has(sessionId)) {
    const s = sessions.get(sessionId)!;
    if (s.deviceIp) {
      targetIp = s.deviceIp;
      targetPort = s.devicePort || 8765;
    }
  }

  if (!targetIp && lastPairedDevice && lastPairedDevice.deviceIp) {
    targetIp = lastPairedDevice.deviceIp;
    targetPort = lastPairedDevice.devicePort || 8765;
  }

  if (!targetIp) {
    return res.status(503).json({ error: "Device is not connected or reachable." });
  }

  try {
    const targetUrl = `http://${targetIp}:${targetPort}${path}`;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() !== "host" && k.toLowerCase() !== "content-length" && typeof v === "string") {
        headers[k] = v;
      }
    }

    const fetchOptions: any = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(6000)
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
      headers["content-type"] = "application/json";
    }

    const deviceRes = await fetch(targetUrl, fetchOptions);
    const contentType = deviceRes.headers.get("content-type") || "application/json";
    res.status(deviceRes.status);
    res.set("Content-Type", contentType);

    if (contentType.includes("json")) {
      const data = await deviceRes.json();
      return res.json(data);
    } else {
      const text = await deviceRes.text();
      return res.send(text);
    }
  } catch (err: any) {
    return res.status(502).json({ error: `Proxy failed: ${err.message}` });
  }
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
        sessionId: session.sessionId,
        deviceName: session.deviceName || "Android Phone",
        deviceIp: session.deviceIp || lastPairedDevice?.deviceIp,
        devicePort: session.devicePort || 8765
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
    });

  } else if (role === "desktop") {
    session.desktopWs = ws;
    console.log(`[Relay] Desktop WS connected to session: ${session.sessionId}`);

    const isPaired = !!session.isPaired || (!!session.deviceWs && session.deviceWs.readyState === WebSocket.OPEN);
    const devIp = session.deviceIp || lastPairedDevice?.deviceIp;
    const devPort = session.devicePort || lastPairedDevice?.devicePort || 8765;
    const devName = session.deviceName || lastPairedDevice?.deviceName || "Realme Phone";

    ws.send(JSON.stringify({
      type: "session_info",
      sessionId: session.sessionId,
      deviceConnected: isPaired,
      deviceName: devName,
      deviceIp: devIp,
      devicePort: devPort
    }));

    // If already paired, push device_connected immediately!
    if (isPaired && devIp) {
      ws.send(JSON.stringify({
        type: "device_connected",
        sessionId: session.sessionId,
        deviceName: devName,
        deviceIp: devIp,
        devicePort: devPort
      }));
    }

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
