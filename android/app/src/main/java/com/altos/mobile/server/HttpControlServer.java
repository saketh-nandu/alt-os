package com.altos.mobile.server;

import android.content.Context;
import android.os.Build;
import android.os.Process;
import android.util.Log;

import com.altos.mobile.model.DeviceMetrics;
import com.altos.mobile.monitoring.SystemMonitor;
import com.altos.mobile.pairing.PairingManager;
import com.altos.mobile.runtime.InteractiveShell;
import com.altos.mobile.runtime.RuntimeManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class HttpControlServer extends NanoWSD {
    private static final String TAG = "HttpControlServer";

    private final Context context;
    private final RuntimeManager runtimeManager;
    private final SystemMonitor systemMonitor;
    private final PairingManager pairingManager;
    private final int port;

    public HttpControlServer(Context context,
                             int port,
                             RuntimeManager runtimeManager,
                             SystemMonitor systemMonitor,
                             PairingManager pairingManager) {
        super(port);
        this.context = context;
        this.port = port;
        this.runtimeManager = runtimeManager;
        this.systemMonitor = systemMonitor;
        this.pairingManager = pairingManager;
    }

    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        String uri = handshake.getUri();
        if (uri.startsWith("/ws/terminal")) {
            return new TerminalWebSocket(handshake, runtimeManager);
        } else if (uri.startsWith("/ws/metrics")) {
            return new MetricsWebSocket(handshake, systemMonitor, runtimeManager, port);
        }
        return null;
    }

    @Override
    public Response serveHttp(IHTTPSession session) {
        Method method = session.getMethod();
        String uri = session.getUri();

        // Handle CORS preflight
        if (Method.OPTIONS.equals(method)) {
            Response resp = NanoHTTPD.newFixedLengthResponse(Response.Status.OK, "text/plain", "");
            addCorsHeaders(resp);
            return resp;
        }

        Response response;
        try {
            response = handleRequest(session, uri, method);
        } catch (Exception e) {
            JSONObject err = new JSONObject();
            try {
                err.put("error", e.getMessage());
            } catch (JSONException ignored) {}
            response = createJsonResponse(Response.Status.INTERNAL_ERROR, err.toString());
        }

        addCorsHeaders(response);
        return response;
    }

    private Response handleRequest(IHTTPSession session, String uri, Method method) throws Exception {
        // Parse request body for POST/PUT
        Map<String, String> bodyFiles = new HashMap<>();
        if (Method.POST.equals(method) || Method.PUT.equals(method)) {
            session.parseBody(bodyFiles);
        }

        String postData = bodyFiles.get("postData");
        JSONObject bodyJson = null;
        if (postData != null && !postData.trim().isEmpty()) {
            try {
                bodyJson = new JSONObject(postData);
            } catch (JSONException ignored) {}
        }

        // 1. Health check
        if ("/health".equals(uri)) {
            JSONObject health = new JSONObject();
            health.put("status", runtimeManager.isServerRunning() ? "online" : "offline");
            health.put("device", Build.MANUFACTURER + " " + Build.MODEL);
            health.put("uptime", runtimeManager.getServerStartTime() > 0 ?
                    (System.currentTimeMillis() - runtimeManager.getServerStartTime()) / 1000 : 0);
            health.put("runtime", "Linux userspace (UID " + Process.myUid() + ")");
            health.put("version", "1.0.0");
            health.put("port", port);
            return createJsonResponse(Response.Status.OK, health.toString());
        }

        // 2. Metrics endpoint
        if ("/api/system/metrics".equals(uri)) {
            DeviceMetrics metrics = systemMonitor.collectMetrics(
                    runtimeManager.getServerStartTime(),
                    runtimeManager.isServerRunning(),
                    1,
                    port
            );
            return createJsonResponse(Response.Status.OK, metrics.toJson());
        }

        // 3. Pairing endpoint
        if ("/api/pair".equals(uri) && Method.POST.equals(method)) {
            if (bodyJson != null) {
                PairingManager.PairingPayload payload = new PairingManager.PairingPayload();
                payload.version = bodyJson.optString("version", "1.0");
                payload.sessionId = bodyJson.optString("sessionId", "");
                payload.token = bodyJson.optString("token", "");
                payload.expiresAt = bodyJson.optLong("expiresAt", 0);
                payload.localUrl = bodyJson.optString("localUrl", "");
                payload.relayUrl = bodyJson.optString("relayUrl", "");

                String client = bodyJson.optString("clientName", "ALT-OS Desktop");
                boolean success = pairingManager.processPairingPayload(payload, client);

                JSONObject res = new JSONObject();
                res.put("success", success);
                res.put("device", Build.MANUFACTURER + " " + Build.MODEL);
                res.put("sessionId", payload.sessionId);
                res.put("message", success ? "Device successfully paired" : "Pairing failed: Token expired or invalid");
                return createJsonResponse(success ? Response.Status.OK : Response.Status.BAD_REQUEST, res.toString());
            }
        }

        // 4. Server Lifecycle
        if ("/api/server/status".equals(uri)) {
            JSONObject status = new JSONObject();
            status.put("running", runtimeManager.isServerRunning());
            status.put("uptime", runtimeManager.getServerStartTime() > 0 ?
                    (System.currentTimeMillis() - runtimeManager.getServerStartTime()) / 1000 : 0);
            status.put("port", port);
            return createJsonResponse(Response.Status.OK, status.toString());
        }

        if ("/api/server/start".equals(uri) && Method.POST.equals(method)) {
            runtimeManager.startServer();
            JSONObject res = new JSONObject();
            res.put("status", "online");
            res.put("message", "ALT-OS server started successfully");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/server/stop".equals(uri) && Method.POST.equals(method)) {
            runtimeManager.stopServer();
            JSONObject res = new JSONObject();
            res.put("status", "offline");
            res.put("message", "ALT-OS server stopped");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/server/restart".equals(uri) && Method.POST.equals(method)) {
            runtimeManager.restartServer();
            JSONObject res = new JSONObject();
            res.put("status", "online");
            res.put("message", "ALT-OS server restarted");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/server/logs".equals(uri)) {
            String logContent = runtimeManager.readLogs("server.log", 100);
            JSONObject res = new JSONObject();
            res.put("logs", logContent);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        // 5. FastAPI App Lifecycle
        if ("/api/apps/fastapi/install".equals(uri) && Method.POST.equals(method)) {
            boolean ok = runtimeManager.installFastApi();
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", ok ? "FastAPI environment ready" : "Failed to install FastAPI");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/apps/fastapi/create".equals(uri) && Method.POST.equals(method)) {
            boolean ok = runtimeManager.createDemoApi();
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", ok ? "Created /apps/demo-api/main.py" : "Failed to create app files");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/apps/fastapi/start".equals(uri) && Method.POST.equals(method)) {
            boolean ok = runtimeManager.startFastApi();
            JSONObject res = runtimeManager.getFastApiStatus();
            res.put("success", ok);
            res.put("message", ok ? "FastAPI server running on port 8000" : "Failed to start FastAPI");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/apps/fastapi/stop".equals(uri) && Method.POST.equals(method)) {
            boolean ok = runtimeManager.stopFastApi();
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", "FastAPI server stopped");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/apps/fastapi/status".equals(uri)) {
            return createJsonResponse(Response.Status.OK, runtimeManager.getFastApiStatus().toString());
        }

        // 5b. Website Hosting Lifecycle & Host URL access
        String hostHeader = session.getHeaders().get("host");
        String hostIp = "127.0.0.1";
        if (hostHeader != null) {
            hostIp = hostHeader.contains(":") ? hostHeader.substring(0, hostHeader.indexOf(":")) : hostHeader;
        }

        if ("/api/websites".equals(uri) && Method.GET.equals(method)) {
            JSONArray list = runtimeManager.getHostedWebsites(hostIp);
            JSONObject res = new JSONObject();
            res.put("websites", list);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/websites/deploy".equals(uri) && Method.POST.equals(method)) {
            String siteId = bodyJson != null ? bodyJson.optString("id", "") : "";
            String name = bodyJson != null ? bodyJson.optString("name", "") : "";
            String html = bodyJson != null ? bodyJson.optString("html", "") : "";
            int sitePort = bodyJson != null ? bodyJson.optInt("port", 8080) : 8080;
            boolean ok = runtimeManager.deployWebsite(siteId, name, html, sitePort);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", ok ? "Website deployed successfully" : "Failed to deploy website");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/websites/start".equals(uri) && Method.POST.equals(method)) {
            String siteId = bodyJson != null ? bodyJson.optString("id", "") : "";
            int sitePort = bodyJson != null ? bodyJson.optInt("port", 8080) : 8080;
            boolean ok = runtimeManager.startWebsite(siteId, sitePort);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("hostUrl", "http://" + hostIp + ":" + sitePort);
            res.put("message", ok ? "Website online at http://" + hostIp + ":" + sitePort : "Failed to bind website port");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/websites/stop".equals(uri) && Method.POST.equals(method)) {
            String siteId = bodyJson != null ? bodyJson.optString("id", "") : "";
            boolean ok = runtimeManager.stopWebsite(siteId);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", "Website stopped");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/websites/file".equals(uri) && Method.GET.equals(method)) {
            String siteId = session.getParms().get("id");
            String fileName = session.getParms().containsKey("file") ? session.getParms().get("file") : session.getParms().getOrDefault("filename", "index.html");
            String content = runtimeManager.getWebsiteFile(siteId, fileName);
            JSONObject res = new JSONObject();
            res.put("content", content);
            res.put("html", content);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/websites/file".equals(uri) && Method.POST.equals(method)) {
            String siteId = bodyJson != null ? bodyJson.optString("id", "") : "";
            String fileName = "index.html";
            if (bodyJson != null) {
                if (bodyJson.has("file")) fileName = bodyJson.optString("file");
                else if (bodyJson.has("filename")) fileName = bodyJson.optString("filename");
            }
            String content = "";
            if (bodyJson != null) {
                if (bodyJson.has("content")) content = bodyJson.optString("content");
                else if (bodyJson.has("html")) content = bodyJson.optString("html");
            }
            boolean ok = runtimeManager.saveWebsiteFile(siteId, fileName, content);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        // 5b-2. Upload Multi-File Project to Mobile Storage & Host
        if ("/api/websites/upload".equals(uri) && Method.POST.equals(method)) {
            String siteId = bodyJson != null ? bodyJson.optString("id", "") : "";
            String name = bodyJson != null ? bodyJson.optString("name", "") : "";
            int sitePort = bodyJson != null ? bodyJson.optInt("port", 8080) : 8080;
            boolean autoStart = bodyJson != null && bodyJson.optBoolean("start", true);

            Map<String, String> filesMap = new HashMap<>();
            if (bodyJson != null && bodyJson.has("files")) {
                JSONArray filesArr = bodyJson.optJSONArray("files");
                if (filesArr != null) {
                    for (int i = 0; i < filesArr.length(); i++) {
                        JSONObject fObj = filesArr.optJSONObject(i);
                        if (fObj != null) {
                            String fName = fObj.optString("name", "index.html");
                            String fContent = fObj.optString("content", "");
                            filesMap.put(fName, fContent);
                        }
                    }
                }
            }

            boolean ok = runtimeManager.deployWebsiteFiles(siteId, name, sitePort, filesMap);
            if (ok && autoStart) {
                runtimeManager.startWebsite(siteId, sitePort);
            }
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("id", siteId);
            res.put("name", name);
            res.put("port", sitePort);
            res.put("hostUrl", "http://" + hostIp + ":" + sitePort);
            res.put("filesCount", filesMap.size());
            res.put("message", ok ? "Uploaded and hosting website on phone at port " + sitePort : "Upload failed");
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        // 5c. VPN & Secure Proxy Tunnel
        if ("/api/vpn/status".equals(uri) && Method.GET.equals(method)) {
            JSONObject status = runtimeManager.getVpnStatus(hostIp);
            return createJsonResponse(Response.Status.OK, status.toString());
        }

        if ("/api/vpn/socks/start".equals(uri) && Method.POST.equals(method)) {
            int proxyPort = bodyJson != null ? bodyJson.optInt("port", 1080) : 1080;
            boolean ok = runtimeManager.startSocksProxy(proxyPort);
            JSONObject res = runtimeManager.getVpnStatus(hostIp);
            res.put("success", ok);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/vpn/socks/stop".equals(uri) && Method.POST.equals(method)) {
            boolean ok = runtimeManager.stopSocksProxy();
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("message", "SOCKS5 proxy stopped");
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        // 6. Direct Command Execution
        if ("/api/terminal/exec".equals(uri) && Method.POST.equals(method)) {
            String command = bodyJson != null ? bodyJson.optString("command", "") : "";
            String out = runtimeManager.executeCommand(command);
            JSONObject res = new JSONObject();
            res.put("command", command);
            res.put("output", out);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        // 7. Sandboxed File Operations
        Map<String, String> params = session.getParms();
        if ("/api/files/list".equals(uri)) {
            String path = params.getOrDefault("path", "/");
            JSONArray arr = runtimeManager.listFiles(path);
            JSONObject res = new JSONObject();
            res.put("path", path);
            res.put("files", arr);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/files/read".equals(uri)) {
            String path = params.get("path");
            if (path == null) {
                return createJsonResponse(Response.Status.BAD_REQUEST, "{\"error\": \"Missing path parameter\"}");
            }
            String content = runtimeManager.readFile(path);
            JSONObject res = new JSONObject();
            res.put("path", path);
            res.put("content", content);
            return createJsonResponse(Response.Status.OK, res.toString());
        }

        if ("/api/files/write".equals(uri) && Method.POST.equals(method)) {
            String path = bodyJson != null ? bodyJson.optString("path", "") : "";
            String content = bodyJson != null ? bodyJson.optString("content", "") : "";
            boolean ok = runtimeManager.writeFile(path, content);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            res.put("path", path);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/files/mkdir".equals(uri) && Method.POST.equals(method)) {
            String path = bodyJson != null ? bodyJson.optString("path", "") : "";
            boolean ok = runtimeManager.createDirectory(path);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/files/delete".equals(uri) && (Method.DELETE.equals(method) || Method.POST.equals(method))) {
            String path = params.get("path");
            if (path == null && bodyJson != null) {
                path = bodyJson.optString("path", null);
            }
            if (path == null) {
                return createJsonResponse(Response.Status.BAD_REQUEST, "{\"error\": \"Missing path\"}");
            }
            boolean ok = runtimeManager.deletePath(path);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        if ("/api/files/rename".equals(uri) && Method.POST.equals(method)) {
            String oldPath = bodyJson != null ? bodyJson.optString("oldPath", "") : "";
            String newPath = bodyJson != null ? bodyJson.optString("newPath", "") : "";
            boolean ok = runtimeManager.renamePath(oldPath, newPath);
            JSONObject res = new JSONObject();
            res.put("success", ok);
            return createJsonResponse(ok ? Response.Status.OK : Response.Status.INTERNAL_ERROR, res.toString());
        }

        // 404 Fallback
        JSONObject notFound = new JSONObject();
        notFound.put("error", "Not Found");
        notFound.put("path", uri);
        return createJsonResponse(Response.Status.NOT_FOUND, notFound.toString());
    }

    private Response createJsonResponse(Response.IStatus status, String json) {
        return NanoHTTPD.newFixedLengthResponse(status, "application/json", json);
    }

    private void addCorsHeaders(Response resp) {
        resp.addHeader("Access-Control-Allow-Origin", "*");
        resp.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp.addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-ALTOS-Token");
        resp.addHeader("Access-Control-Max-Age", "86400");
    }

    // ==============================================================
    // TERMINAL WEBSOCKET HANDLER
    // ==============================================================
    private static class TerminalWebSocket extends WebSocket {
        private final RuntimeManager runtimeManager;
        private InteractiveShell shell;

        public TerminalWebSocket(IHTTPSession handshakeRequest, RuntimeManager runtimeManager) {
            super(handshakeRequest);
            this.runtimeManager = runtimeManager;
        }

        @Override
        protected void onOpen() {
            shell = runtimeManager.createShellSession();
            try {
                shell.start(new InteractiveShell.OutputListener() {
                    @Override
                    public void onOutput(String text) {
                        try {
                            JSONObject msg = new JSONObject();
                            msg.put("type", "output");
                            msg.put("data", text);
                            send(msg.toString());
                        } catch (Exception ignored) {}
                    }

                    @Override
                    public void onExit(int exitCode) {
                        try {
                            JSONObject msg = new JSONObject();
                            msg.put("type", "exit");
                            msg.put("exitCode", exitCode);
                            send(msg.toString());
                        } catch (Exception ignored) {}
                    }
                });

                try {
                    JSONObject greeting = new JSONObject();
                    greeting.put("type", "output");
                    greeting.put("data", "Connected to ALT-OS Terminal (Android Userspace)\r\n$ ");
                    send(greeting.toString());
                } catch (Exception ignored) {}
            } catch (IOException e) {
                try {
                    JSONObject err = new JSONObject();
                    err.put("type", "output");
                    err.put("data", "Failed to start shell: " + e.getMessage() + "\r\n");
                    send(err.toString());
                } catch (Exception ignored) {}
            }
        }

        @Override
        protected void onClose(NanoWSD.WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
            if (shell != null) {
                shell.terminate();
            }
        }

        @Override
        protected void onMessage(NanoWSD.WebSocketFrame message) {
            String payload = message.getTextPayload();
            if (payload == null || payload.isEmpty() || shell == null) return;

            try {
                JSONObject json = new JSONObject(payload);
                String type = json.optString("type", "input");

                if ("input".equals(type)) {
                    String data = json.optString("data", "");
                    shell.sendInput(data);
                } else if ("interrupt".equals(type)) {
                    shell.interrupt();
                } else if ("exec".equals(type)) {
                    String cmd = json.optString("command", "");
                    shell.sendInput(cmd + "\n");
                }
            } catch (JSONException e) {
                shell.sendInput(payload);
            }
        }

        @Override
        protected void onPong(NanoWSD.WebSocketFrame pong) {}

        @Override
        protected void onException(IOException exception) {
            if (shell != null) {
                shell.terminate();
            }
        }
    }

    // ==============================================================
    // METRICS WEBSOCKET HANDLER
    // ==============================================================
    private static class MetricsWebSocket extends WebSocket {
        private final SystemMonitor systemMonitor;
        private final RuntimeManager runtimeManager;
        private final int port;
        private Thread metricsThread;
        private volatile boolean running = true;

        public MetricsWebSocket(IHTTPSession handshakeRequest,
                                SystemMonitor systemMonitor,
                                RuntimeManager runtimeManager,
                                int port) {
            super(handshakeRequest);
            this.systemMonitor = systemMonitor;
            this.runtimeManager = runtimeManager;
            this.port = port;
        }

        @Override
        protected void onOpen() {
            metricsThread = new Thread(() -> {
                while (running && isOpen()) {
                    try {
                        DeviceMetrics metrics = systemMonitor.collectMetrics(
                                runtimeManager.getServerStartTime(),
                                runtimeManager.isServerRunning(),
                                1,
                                port
                        );
                        send(metrics.toJson());
                        Thread.sleep(1500);
                    } catch (Exception e) {
                        break;
                    }
                }
            });
            metricsThread.setDaemon(true);
            metricsThread.start();
        }

        @Override
        protected void onClose(NanoWSD.WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
            running = false;
            if (metricsThread != null) {
                metricsThread.interrupt();
            }
        }

        @Override
        protected void onMessage(NanoWSD.WebSocketFrame message) {}

        @Override
        protected void onPong(NanoWSD.WebSocketFrame pong) {}

        @Override
        protected void onException(IOException exception) {
            running = false;
        }
    }
}
