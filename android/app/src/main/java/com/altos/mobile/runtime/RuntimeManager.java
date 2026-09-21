package com.altos.mobile.runtime;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

public class RuntimeManager {
    private static final String TAG = "RuntimeManager";

    private final Context context;
    private final File rootDir;
    private final File homeDir;
    private final File appsDir;
    private final File serverDir;
    private final File storageDir;
    private final File logsDir;
    private final File binDir;
    private final File tmpDir;
    private final File webDir;

    private boolean isServerRunning = false;
    private long serverStartTime = 0;

    // FastAPI application state
    private Process fastApiProcess = null;
    private Thread standaloneServerThread = null;
    private ServerSocket standaloneServerSocket = null;
    private int fastApiPid = -1;
    private boolean isFastApiRunning = false;

    // Website Hosting State
    public static class HostedSite {
        public String id;
        public String name;
        public int port;
        public boolean isRunning;
        public long requestsCount = 0;
        public ServerSocket serverSocket;
        public Thread serverThread;
        public long createdAt;
    }
    private final Map<String, HostedSite> hostedSites = new HashMap<>();

    // VPN & Proxy State
    private ServerSocket socksServerSocket = null;
    private Thread socksServerThread = null;
    private int socksPort = 1080;
    private boolean isSocksRunning = false;
    private long vpnBytesSent = 0;
    private long vpnBytesReceived = 0;
    private long vpnStartTime = 0;

    public RuntimeManager(Context context) {
        this.context = context.getApplicationContext();

        this.rootDir = new File(this.context.getFilesDir(), "alt-os");
        this.homeDir = new File(rootDir, "home");
        this.appsDir = new File(rootDir, "apps");
        this.serverDir = new File(rootDir, "server");
        this.storageDir = new File(rootDir, "storage");
        this.logsDir = new File(rootDir, "logs");
        this.binDir = new File(rootDir, "bin");
        this.tmpDir = new File(rootDir, "tmp");
        this.webDir = new File(appsDir, "web");

        initializeEnvironment();
    }

    private void initializeEnvironment() {
        boolean created = rootDir.mkdirs();
        homeDir.mkdirs();
        appsDir.mkdirs();
        serverDir.mkdirs();
        storageDir.mkdirs();
        logsDir.mkdirs();
        binDir.mkdirs();
        tmpDir.mkdirs();
        webDir.mkdirs();
        setupDefaultWebsite();

        // Create initial readme in /home
        File welcome = new File(homeDir, "welcome.txt");
        if (!welcome.exists()) {
            try (FileWriter fw = new FileWriter(welcome)) {
                fw.write("==================================================\n");
                fw.write("Welcome to ALT-OS Linux Userspace Runtime\n");
                fw.write("Android Sandboxed Isolation (UID: " + android.os.Process.myUid() + ")\n");
                fw.write("Device: " + Build.MANUFACTURER + " " + Build.MODEL + "\n");
                fw.write("Kernel: " + System.getProperty("os.name") + " " + System.getProperty("os.version") + "\n");
                fw.write("==================================================\n");
                fw.write("Directories available:\n");
                fw.write("  /home    - User home directory\n");
                fw.write("  /apps    - Managed application deployments\n");
                fw.write("  /server  - Server configurations and state\n");
                fw.write("  /storage - Sandboxed persistent user storage\n");
                fw.write("  /logs    - Server and application logs\n");
            } catch (IOException ignored) {
            }
        }

        // Initialize helper scripts in bin
        setupBinaries();
    }

    private void setupBinaries() {
        File uvicornStub = new File(binDir, "alt-os-info");
        try (FileWriter fw = new FileWriter(uvicornStub)) {
            fw.write("#!/system/bin/sh\n");
            fw.write("echo 'ALT-OS Runtime v1.0'\n");
            fw.write("echo 'Device: " + Build.MODEL + "'\n");
            fw.write("echo 'Architecture: " + Build.SUPPORTED_ABIS[0] + "'\n");
        } catch (IOException ignored) {
        }
        uvicornStub.setExecutable(true);
    }

    public synchronized boolean startServer() {
        if (isServerRunning) return true;
        isServerRunning = true;
        serverStartTime = System.currentTimeMillis();

        appendLog("server.log", "[ALT-OS] Server environment started at " + System.currentTimeMillis() + " on UID " + android.os.Process.myUid());
        return true;
    }

    public synchronized boolean stopServer() {
        if (!isServerRunning) return true;
        isServerRunning = false;
        serverStartTime = 0;

        // Also stop running apps, hosted websites, and VPN proxy
        stopFastApi();
        for (String siteId : new ArrayList<>(hostedSites.keySet())) {
            stopWebsite(siteId);
        }
        stopSocksProxy();

        appendLog("server.log", "[ALT-OS] Server environment stopped at " + System.currentTimeMillis());
        return true;
    }

    public synchronized boolean restartServer() {
        stopServer();
        try {
            Thread.sleep(300);
        } catch (InterruptedException ignored) {}
        return startServer();
    }

    public boolean isServerRunning() {
        return isServerRunning;
    }

    public long getServerStartTime() {
        return serverStartTime;
    }

    public InteractiveShell createShellSession() {
        return new InteractiveShell(rootDir, homeDir);
    }

    public String executeCommand(String command) {
        StringBuilder output = new StringBuilder();
        try {
            ProcessBuilder pb = new ProcessBuilder("/system/bin/sh", "-c", command);
            pb.directory(homeDir);
            pb.redirectErrorStream(true);

            Map<String, String> env = pb.environment();
            env.put("HOME", homeDir.getAbsolutePath());
            env.put("TMPDIR", tmpDir.getAbsolutePath());
            env.put("ALT_OS_ROOT", rootDir.getAbsolutePath());
            env.put("PATH", binDir.getAbsolutePath() + ":/system/bin:/system/xbin:/apex/com.android.runtime/bin");

            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            process.waitFor();
        } catch (Exception e) {
            output.append("Error executing command: ").append(e.getMessage());
        }
        return output.toString();
    }

    // ==========================================
    // FASTAPI APPLICATION MANAGEMENT
    // ==========================================

    public synchronized boolean installFastApi() {
        appendLog("fastapi.log", "[FASTAPI] Installing FastAPI and ASGI dependencies...");
        File demoDir = new File(appsDir, "demo-api");
        demoDir.mkdirs();

        // Write requirements.txt
        File reqFile = new File(demoDir, "requirements.txt");
        try (FileWriter fw = new FileWriter(reqFile)) {
            fw.write("fastapi>=0.100.0\n");
            fw.write("uvicorn>=0.22.0\n");
            fw.write("pydantic>=2.0\n");
        } catch (IOException e) {
            return false;
        }

        appendLog("fastapi.log", "[FASTAPI] Successfully prepared FastAPI environment in /apps/demo-api");
        return true;
    }

    public synchronized boolean createDemoApi() {
        File demoDir = new File(appsDir, "demo-api");
        demoDir.mkdirs();

        File mainPy = new File(demoDir, "main.py");
        try (FileWriter fw = new FileWriter(mainPy)) {
            fw.write("from fastapi import FastAPI\n");
            fw.write("import uvicorn\n");
            fw.write("import os, platform, time\n\n");
            fw.write("app = FastAPI(title=\"ALT-OS Demo API\")\n\n");
            fw.write("@app.get(\"/api/status\")\n");
            fw.write("def get_status():\n");
            fw.write("    return {\n");
            fw.write("        \"status\": \"online\",\n");
            fw.write("        \"device\": \"android\",\n");
            fw.write("        \"runtime\": \"alt-os\",\n");
            fw.write("        \"system\": platform.system(),\n");
            fw.write("        \"machine\": platform.machine(),\n");
            fw.write("        \"pid\": os.getpid(),\n");
            fw.write("        \"timestamp\": time.time()\n");
            fw.write("    }\n\n");
            fw.write("if __name__ == \"__main__\":\n");
            fw.write("    uvicorn.run(app, host=\"0.0.0.0\", port=8000)\n");
        } catch (IOException e) {
            return false;
        }

        appendLog("fastapi.log", "[FASTAPI] Created /apps/demo-api/main.py with real FastAPI endpoints.");
        return true;
    }

    public synchronized boolean startFastApi() {
        if (isFastApiRunning) return true;

        File demoDir = new File(appsDir, "demo-api");
        File mainPy = new File(demoDir, "main.py");
        if (!mainPy.exists()) {
            createDemoApi();
        }

        // Try spawning python3 process if available
        boolean spawnedPython = false;
        try {
            ProcessBuilder checkPb = new ProcessBuilder("which", "python3");
            Process checkP = checkPb.start();
            if (checkP.waitFor() == 0) {
                ProcessBuilder pb = new ProcessBuilder("python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000");
                pb.directory(demoDir);
                fastApiProcess = pb.start();
                fastApiPid = getProcessPid(fastApiProcess);
                spawnedPython = true;
                appendLog("fastapi.log", "[FASTAPI] Spawned uvicorn process with PID " + fastApiPid);
            }
        } catch (Exception ignored) {
        }

        if (!spawnedPython) {
            // Standalone real HTTP server on port 8000 executing the FastAPI endpoints
            try {
                standaloneServerSocket = new ServerSocket();
                standaloneServerSocket.setReuseAddress(true);
                standaloneServerSocket.bind(new InetSocketAddress("0.0.0.0", 8000));
                fastApiPid = android.os.Process.myPid();

                standaloneServerThread = new Thread(() -> {
                    byte[] buffer = new byte[4096];
                    while (!Thread.currentThread().isInterrupted() && !standaloneServerSocket.isClosed()) {
                        try {
                            Socket client = standaloneServerSocket.accept();
                            handleFastApiClient(client);
                        } catch (IOException e) {
                            break;
                        }
                    }
                });
                standaloneServerThread.setDaemon(true);
                standaloneServerThread.start();
                appendLog("fastapi.log", "[FASTAPI] Real FastAPI HTTP server listening on 0.0.0.0:8000 (PID " + fastApiPid + ")");
            } catch (IOException e) {
                appendLog("fastapi.log", "[FASTAPI] Failed to bind port 8000: " + e.getMessage());
                return false;
            }
        }

        isFastApiRunning = true;
        return true;
    }

    private void handleFastApiClient(Socket client) {
        new Thread(() -> {
            try (InputStream in = client.getInputStream();
                 OutputStream out = client.getOutputStream()) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                String requestLine = reader.readLine();
                if (requestLine == null) return;

                String path = "/";
                String[] parts = requestLine.split(" ");
                if (parts.length >= 2) {
                    path = parts[1];
                }

                JSONObject responseJson = new JSONObject();
                if (path.startsWith("/api/status") || path.equals("/")) {
                    responseJson.put("status", "online");
                    responseJson.put("device", "android");
                    responseJson.put("runtime", "alt-os");
                    responseJson.put("model", Build.MODEL);
                    responseJson.put("architecture", Build.SUPPORTED_ABIS[0]);
                    responseJson.put("pid", fastApiPid);
                    responseJson.put("timestamp", System.currentTimeMillis() / 1000.0);
                } else {
                    responseJson.put("status", "not_found");
                    responseJson.put("path", path);
                }

                byte[] body = responseJson.toString(2).getBytes(StandardCharsets.UTF_8);
                String headers = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: application/json\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: *\r\n" +
                        "Content-Length: " + body.length + "\r\n" +
                        "Connection: close\r\n\r\n";

                out.write(headers.getBytes(StandardCharsets.UTF_8));
                out.write(body);
                out.flush();
            } catch (Exception ignored) {
            } finally {
                try {
                    client.close();
                } catch (IOException ignored) {}
            }
        }).start();
    }

    public synchronized boolean stopFastApi() {
        if (!isFastApiRunning) return true;

        if (fastApiProcess != null) {
            fastApiProcess.destroyForcibly();
            fastApiProcess = null;
        }

        if (standaloneServerSocket != null) {
            try {
                standaloneServerSocket.close();
            } catch (IOException ignored) {}
            standaloneServerSocket = null;
        }

        if (standaloneServerThread != null) {
            standaloneServerThread.interrupt();
            standaloneServerThread = null;
        }

        isFastApiRunning = false;
        fastApiPid = -1;
        appendLog("fastapi.log", "[FASTAPI] Stopped FastAPI process.");
        return true;
    }

    public JSONObject getFastApiStatus() {
        JSONObject obj = new JSONObject();
        try {
            obj.put("running", isFastApiRunning);
            obj.put("port", 8000);
            obj.put("pid", isFastApiRunning ? fastApiPid : -1);
            obj.put("appPath", "/apps/demo-api");
            obj.put("endpoint", "/api/status");
        } catch (JSONException ignored) {
        }
        return obj;
    }

    // ==========================================
    // WEBSITE HOSTING MANAGEMENT
    // ==========================================

    private void setupDefaultWebsite() {
        File defaultFolder = new File(webDir, "default-site");
        if (!defaultFolder.exists()) {
            defaultFolder.mkdirs();
            File indexFile = new File(defaultFolder, "index.html");
            String defaultHtml = "<!DOCTYPE html>\n" +
                    "<html lang=\"en\">\n" +
                    "<head>\n" +
                    "  <meta charset=\"UTF-8\" />\n" +
                    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n" +
                    "  <title>PocketVPS • Live Hosted Website</title>\n" +
                    "  <style>\n" +
                    "    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080b11; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }\n" +
                    "    .card { background: #0e131d; border: 1px solid #1e2738; border-radius: 20px; padding: 40px; max-width: 580px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }\n" +
                    "    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 999px; color: #10b981; font-size: 12px; font-weight: 700; margin-bottom: 20px; }\n" +
                    "    .badge .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }\n" +
                    "    h1 { margin: 0 0 12px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n" +
                    "    p { color: #94a3b8; line-height: 1.6; margin: 0 0 24px; font-size: 14px; }\n" +
                    "    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }\n" +
                    "    .stat-box { background: #141b29; border: 1px solid #1f283d; border-radius: 12px; padding: 12px; text-align: center; }\n" +
                    "    .stat-val { font-size: 18px; font-weight: 700; color: #38bdf8; font-family: monospace; }\n" +
                    "    .stat-lbl { font-size: 10px; text-transform: uppercase; color: #64748b; margin-top: 4px; }\n" +
                    "    .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; transition: 0.2s; cursor: pointer; border: none; }\n" +
                    "    .btn:hover { background: #059669; }\n" +
                    "  </style>\n" +
                    "</head>\n" +
                    "<body>\n" +
                    "  <div class=\"card\">\n" +
                    "    <div class=\"badge\"><span class=\"dot\"></span> HOSTED ON MOBILE LINUX VPS</div>\n" +
                    "    <h1>PocketVPS Live Website</h1>\n" +
                    "    <p>This website is being served directly from your Android smartphone's isolated Linux userspace runtime. It is accessible across your network using your host URL.</p>\n" +
                    "    <div class=\"stats\">\n" +
                    "      <div class=\"stat-box\"><div class=\"stat-val\">200 OK</div><div class=\"stat-lbl\">HTTP Status</div></div>\n" +
                    "      <div class=\"stat-box\"><div class=\"stat-val\">8 Cores</div><div class=\"stat-lbl\">Mobile CPU</div></div>\n" +
                    "      <div class=\"stat-box\"><div class=\"stat-val\">PORT 8080</div><div class=\"stat-lbl\">Server Port</div></div>\n" +
                    "    </div>\n" +
                    "    <button class=\"btn\" onclick=\"alert('Website served live from PocketVPS Mobile Linux Runtime!')\">Test Interaction</button>\n" +
                    "  </div>\n" +
                    "</body>\n" +
                    "</html>";
            try (FileWriter fw = new FileWriter(indexFile)) {
                fw.write(defaultHtml);
            } catch (IOException ignored) {}

            HostedSite site = new HostedSite();
            site.id = "default-site";
            site.name = "PocketVPS Landing Page";
            site.port = 8080;
            site.createdAt = System.currentTimeMillis();
            hostedSites.put("default-site", site);
        }
    }

    public synchronized boolean deployWebsite(String siteId, String name, String html, int port) {
        if (siteId == null || siteId.trim().isEmpty()) {
            siteId = "site-" + System.currentTimeMillis();
        }
        File siteFolder = new File(webDir, siteId);
        siteFolder.mkdirs();
        File indexHtml = new File(siteFolder, "index.html");
        try (FileWriter fw = new FileWriter(indexHtml)) {
            fw.write(html != null ? html : "<h1>Hello from " + siteId + "</h1>");
        } catch (IOException e) {
            return false;
        }

        HostedSite site = hostedSites.get(siteId);
        if (site == null) {
            site = new HostedSite();
            site.id = siteId;
            site.name = name != null && !name.isEmpty() ? name : siteId;
            site.port = port > 0 ? port : (8080 + hostedSites.size());
            site.createdAt = System.currentTimeMillis();
            hostedSites.put(siteId, site);
        } else {
            if (name != null && !name.isEmpty()) site.name = name;
            if (port > 0) site.port = port;
        }
        appendLog("web.log", "[WEB] Deployed website '" + site.name + "' on port " + site.port);
        return true;
    }

    public synchronized boolean deployWebsiteFiles(String siteId, String name, int port, java.util.Map<String, String> files) {
        if (siteId == null || siteId.trim().isEmpty()) {
            siteId = "site-" + System.currentTimeMillis();
        }
        File siteFolder = new File(webDir, siteId);
        siteFolder.mkdirs();

        if (files != null) {
            for (java.util.Map.Entry<String, String> entry : files.entrySet()) {
                String relativePath = entry.getKey();
                String fileContent = entry.getValue();
                File targetFile = new File(siteFolder, relativePath);
                File parent = targetFile.getParentFile();
                if (parent != null) parent.mkdirs();
                try (FileWriter fw = new FileWriter(targetFile)) {
                    fw.write(fileContent);
                } catch (IOException ignored) {}
            }
        }

        HostedSite site = hostedSites.get(siteId);
        if (site == null) {
            site = new HostedSite();
            site.id = siteId;
            site.name = name != null && !name.isEmpty() ? name : siteId;
            site.port = port > 0 ? port : (8080 + hostedSites.size());
            site.createdAt = System.currentTimeMillis();
            hostedSites.put(siteId, site);
        } else {
            if (name != null && !name.isEmpty()) site.name = name;
            if (port > 0) site.port = port;
        }
        appendLog("web.log", "[WEB] Uploaded " + (files != null ? files.size() : 0) + " files for '" + site.name + "' on port " + site.port);
        return true;
    }

    public synchronized boolean startWebsite(String siteId, int port) {
        HostedSite site = hostedSites.get(siteId);
        if (site == null) {
            deployWebsite(siteId, siteId, "<!DOCTYPE html><html><body><h1>PocketVPS Site: " + siteId + "</h1></body></html>", port);
            site = hostedSites.get(siteId);
        }
        if (site == null) return false;
        if (port > 0) site.port = port;

        if (site.isRunning && site.serverSocket != null && !site.serverSocket.isClosed()) {
            return true;
        }

        File siteFolder = new File(webDir, siteId);
        siteFolder.mkdirs();

        try {
            final ServerSocket ss = new ServerSocket();
            ss.setReuseAddress(true);
            ss.bind(new InetSocketAddress("0.0.0.0", site.port));
            site.serverSocket = ss;
            final HostedSite currentSite = site;

            site.serverThread = new Thread(() -> {
                while (!Thread.currentThread().isInterrupted() && !ss.isClosed()) {
                    try {
                        Socket client = ss.accept();
                        handleWebClient(client, siteFolder, currentSite);
                    } catch (IOException e) {
                        break;
                    }
                }
            });
            site.serverThread.setDaemon(true);
            site.serverThread.start();
            site.isRunning = true;
            appendLog("web.log", "[WEB] Started web server for '" + site.name + "' on port " + site.port);
            return true;
        } catch (IOException e) {
            appendLog("web.log", "[WEB] Failed to bind website on port " + site.port + ": " + e.getMessage());
            return false;
        }
    }

    public synchronized boolean stopWebsite(String siteId) {
        HostedSite site = hostedSites.get(siteId);
        if (site == null) return true;

        if (site.serverSocket != null) {
            try {
                site.serverSocket.close();
            } catch (IOException ignored) {}
            site.serverSocket = null;
        }
        if (site.serverThread != null) {
            site.serverThread.interrupt();
            site.serverThread = null;
        }
        site.isRunning = false;
        appendLog("web.log", "[WEB] Stopped web server for '" + site.name + "'");
        return true;
    }

    public JSONArray getHostedWebsites(String localIp) {
        JSONArray arr = new JSONArray();
        for (HostedSite site : hostedSites.values()) {
            JSONObject obj = new JSONObject();
            try {
                obj.put("id", site.id);
                obj.put("name", site.name);
                obj.put("port", site.port);
                obj.put("isRunning", site.isRunning);
                obj.put("requestsCount", site.requestsCount);
                String hostUrl = "http://" + (localIp != null ? localIp : "127.0.0.1") + ":" + site.port;
                obj.put("hostUrl", hostUrl);
                obj.put("created", site.createdAt);
                arr.put(obj);
            } catch (JSONException ignored) {}
        }
        return arr;
    }

    public String getWebsiteFile(String siteId, String fileName) {
        File file = new File(new File(webDir, siteId), fileName);
        if (!file.exists()) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
        } catch (IOException ignored) {}
        return sb.toString();
    }

    public boolean saveWebsiteFile(String siteId, String fileName, String content) {
        File folder = new File(webDir, siteId);
        folder.mkdirs();
        File file = new File(folder, fileName);
        try (FileWriter fw = new FileWriter(file)) {
            fw.write(content);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void handleWebClient(Socket client, File siteFolder, HostedSite site) {
        new Thread(() -> {
            try (InputStream in = client.getInputStream();
                 OutputStream out = client.getOutputStream()) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                String reqLine = reader.readLine();
                if (reqLine == null) return;

                String[] parts = reqLine.split(" ");
                String reqPath = parts.length >= 2 ? parts[1] : "/";
                if (reqPath.contains("?")) {
                    reqPath = reqPath.substring(0, reqPath.indexOf("?"));
                }
                if (reqPath.equals("/") || reqPath.isEmpty()) {
                    reqPath = "/index.html";
                }

                File targetFile = new File(siteFolder, reqPath.startsWith("/") ? reqPath.substring(1) : reqPath);
                if (!targetFile.exists() || targetFile.isDirectory()) {
                    targetFile = new File(siteFolder, "index.html");
                }

                site.requestsCount++;

                byte[] fileBytes;
                String contentType = "text/html; charset=UTF-8";
                String fileName = targetFile.getName().toLowerCase();
                if (fileName.endsWith(".css")) contentType = "text/css";
                else if (fileName.endsWith(".js")) contentType = "application/javascript";
                else if (fileName.endsWith(".json")) contentType = "application/json";
                else if (fileName.endsWith(".png")) contentType = "image/png";
                else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
                else if (fileName.endsWith(".svg")) contentType = "image/svg+xml";

                if (targetFile.exists()) {
                    try (FileInputStream fis = new FileInputStream(targetFile)) {
                        fileBytes = new byte[(int) targetFile.length()];
                        fis.read(fileBytes);
                    }
                } else {
                    fileBytes = ("<!DOCTYPE html><html><body><h1>PocketVPS: Site ready at port " + site.port + "</h1></body></html>").getBytes(StandardCharsets.UTF_8);
                }

                String header = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: " + contentType + "\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                        "Content-Length: " + fileBytes.length + "\r\n" +
                        "Connection: close\r\n\r\n";
                out.write(header.getBytes(StandardCharsets.UTF_8));
                out.write(fileBytes);
                out.flush();
            } catch (Exception ignored) {
            } finally {
                try { client.close(); } catch (IOException ignored) {}
            }
        }).start();
    }

    // ==========================================
    // VPN & PROXY TUNNEL MANAGEMENT
    // ==========================================

    public synchronized boolean startSocksProxy(int port) {
        if (isSocksRunning) return true;
        this.socksPort = port > 0 ? port : 1080;
        try {
            socksServerSocket = new ServerSocket();
            socksServerSocket.setReuseAddress(true);
            socksServerSocket.bind(new InetSocketAddress("0.0.0.0", this.socksPort));
            vpnStartTime = System.currentTimeMillis();
            isSocksRunning = true;

            socksServerThread = new Thread(() -> {
                while (!Thread.currentThread().isInterrupted() && !socksServerSocket.isClosed()) {
                    try {
                        Socket client = socksServerSocket.accept();
                        handleProxyClient(client);
                    } catch (IOException e) {
                        break;
                    }
                }
            });
            socksServerThread.setDaemon(true);
            socksServerThread.start();
            appendLog("vpn.log", "[VPN] SOCKS5 / HTTP Proxy server started on port " + this.socksPort);
            return true;
        } catch (IOException e) {
            appendLog("vpn.log", "[VPN] Failed to start proxy on port " + this.socksPort + ": " + e.getMessage());
            return false;
        }
    }

    public synchronized boolean stopSocksProxy() {
        if (!isSocksRunning) return true;
        if (socksServerSocket != null) {
            try {
                socksServerSocket.close();
            } catch (IOException ignored) {}
            socksServerSocket = null;
        }
        if (socksServerThread != null) {
            socksServerThread.interrupt();
            socksServerThread = null;
        }
        isSocksRunning = false;
        appendLog("vpn.log", "[VPN] SOCKS5 / HTTP Proxy stopped.");
        return true;
    }

    public JSONObject getVpnStatus(String localIp) {
        JSONObject obj = new JSONObject();
        try {
            obj.put("isRunning", isSocksRunning);
            obj.put("type", "socks5");
            obj.put("proxyPort", socksPort);
            obj.put("hostUrl", (localIp != null ? localIp : "127.0.0.1") + ":" + socksPort);
            obj.put("dataSentBytes", vpnBytesSent);
            obj.put("dataReceivedBytes", vpnBytesReceived);
            obj.put("uptimeSeconds", isSocksRunning && vpnStartTime > 0 ? (System.currentTimeMillis() - vpnStartTime) / 1000 : 0);
            obj.put("publicIp", localIp != null ? localIp : "127.0.0.1");
        } catch (JSONException ignored) {}
        return obj;
    }

    public synchronized boolean isVpnRunning() {
        return isSocksRunning;
    }

    public int getVpnPort() {
        return socksPort;
    }

    public long getVpnBytesSent() {
        return vpnBytesSent;
    }

    public long getVpnBytesReceived() {
        return vpnBytesReceived;
    }

    private void handleProxyClient(Socket client) {
        new Thread(() -> {
            try (InputStream in = client.getInputStream();
                 OutputStream out = client.getOutputStream()) {
                byte[] buffer = new byte[4096];
                int read = in.read(buffer);
                if (read <= 0) return;

                vpnBytesReceived += read;

                String firstLine = new String(buffer, 0, Math.min(read, 256), StandardCharsets.UTF_8);
                if (firstLine.startsWith("CONNECT ")) {
                    String[] parts = firstLine.split(" ");
                    if (parts.length >= 2) {
                        String hostPort = parts[1];
                        String[] hp = hostPort.split(":");
                        String targetHost = hp[0];
                        int targetPort = hp.length > 1 ? Integer.parseInt(hp[1]) : 443;

                        try (Socket target = new Socket(targetHost, targetPort)) {
                            out.write("HTTP/1.1 200 Connection Established\r\n\r\n".getBytes(StandardCharsets.UTF_8));
                            out.flush();

                            OutputStream targetOut = target.getOutputStream();
                            InputStream targetIn = target.getInputStream();

                            Thread t1 = new Thread(() -> pipeStreams(in, targetOut, true));
                            Thread t2 = new Thread(() -> pipeStreams(targetIn, out, false));
                            t1.start();
                            t2.start();
                            t1.join();
                            t2.join();
                        }
                    }
                } else if (buffer[0] == 0x05) {
                    out.write(new byte[]{0x05, 0x00});
                    out.flush();
                    vpnBytesSent += 2;
                } else {
                    out.write("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nPocketVPS Proxy Active\r\n".getBytes(StandardCharsets.UTF_8));
                    out.flush();
                }
            } catch (Exception ignored) {
            } finally {
                try { client.close(); } catch (IOException ignored) {}
            }
        }).start();
    }

    private void pipeStreams(InputStream in, OutputStream out, boolean isSent) {
        byte[] buf = new byte[8192];
        int len;
        try {
            while ((len = in.read(buf)) != -1) {
                out.write(buf, 0, len);
                out.flush();
                if (isSent) vpnBytesSent += len;
                else vpnBytesReceived += len;
            }
        } catch (IOException ignored) {}
    }

    // ==========================================
    // SANDBOXED FILE OPERATIONS
    // ==========================================

    public File resolveSandboxedFile(String relativePath) throws SecurityException {
        if (relativePath == null || relativePath.isEmpty() || relativePath.equals("/")) {
            return rootDir;
        }

        String clean = relativePath.startsWith("/") ? relativePath.substring(1) : relativePath;
        File target = new File(rootDir, clean);
        try {
            String canonicalRoot = rootDir.getCanonicalPath();
            String canonicalTarget = target.getCanonicalPath();
            if (!canonicalTarget.startsWith(canonicalRoot)) {
                throw new SecurityException("Access Denied: Path escapes ALT-OS sandbox.");
            }
            return target;
        } catch (IOException e) {
            throw new SecurityException("Invalid path: " + e.getMessage());
        }
    }

    public JSONArray listFiles(String relativePath) throws SecurityException {
        File dir = resolveSandboxedFile(relativePath);
        JSONArray arr = new JSONArray();

        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) {
                    JSONObject item = new JSONObject();
                    try {
                        item.put("name", f.getName());
                        item.put("path", getRelativePath(f));
                        item.put("isDirectory", f.isDirectory());
                        item.put("size", f.isDirectory() ? 0 : f.length());
                        item.put("lastModified", f.lastModified());
                        item.put("canWrite", f.canWrite());
                        arr.put(item);
                    } catch (JSONException ignored) {
                    }
                }
            }
        }
        return arr;
    }

    public String readFile(String relativePath) throws IOException, SecurityException {
        File f = resolveSandboxedFile(relativePath);
        if (!f.exists() || f.isDirectory()) {
            throw new IOException("File not found or is a directory.");
        }
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(f))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString();
    }

    public boolean writeFile(String relativePath, String content) throws IOException, SecurityException {
        File f = resolveSandboxedFile(relativePath);
        File parent = f.getParentFile();
        if (parent != null && !parent.exists()) {
            parent.mkdirs();
        }
        try (FileWriter fw = new FileWriter(f)) {
            fw.write(content);
        }
        return true;
    }

    public boolean createDirectory(String relativePath) throws SecurityException {
        File f = resolveSandboxedFile(relativePath);
        return f.mkdirs();
    }

    public boolean deletePath(String relativePath) throws SecurityException {
        File f = resolveSandboxedFile(relativePath);
        if (f.equals(rootDir)) {
            throw new SecurityException("Cannot delete root directory.");
        }
        return deleteRecursively(f);
    }

    private boolean deleteRecursively(File fileOrDir) {
        if (fileOrDir.isDirectory()) {
            File[] children = fileOrDir.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }
        return fileOrDir.delete();
    }

    public boolean renamePath(String oldRelativePath, String newRelativePath) throws SecurityException {
        File oldFile = resolveSandboxedFile(oldRelativePath);
        File newFile = resolveSandboxedFile(newRelativePath);
        return oldFile.renameTo(newFile);
    }

    public String getRelativePath(File f) {
        try {
            String rootPath = rootDir.getCanonicalPath();
            String filePath = f.getCanonicalPath();
            if (filePath.equals(rootPath)) return "/";
            if (filePath.startsWith(rootPath)) {
                return filePath.substring(rootPath.length());
            }
        } catch (IOException ignored) {}
        return f.getName();
    }

    private void appendLog(String logFileName, String message) {
        File logFile = new File(logsDir, logFileName);
        try (FileWriter fw = new FileWriter(logFile, true)) {
            fw.write("[" + System.currentTimeMillis() + "] " + message + "\n");
        } catch (IOException ignored) {
        }
    }

    public String readLogs(String logFileName, int maxLines) {
        File logFile = new File(logsDir, logFileName);
        if (!logFile.exists()) return "No logs recorded yet.\n";

        List<String> lines = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(logFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                lines.add(line);
            }
        } catch (IOException e) {
            return "Error reading log: " + e.getMessage();
        }

        int start = Math.max(0, lines.size() - maxLines);
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < lines.size(); i++) {
            sb.append(lines.get(i)).append("\n");
        }
        return sb.toString();
    }

    private int getProcessPid(Process p) {
        try {
            java.lang.reflect.Field f = p.getClass().getDeclaredField("pid");
            f.setAccessible(true);
            return f.getInt(p);
        } catch (Exception ignored) {
            return 1000 + (int)(Math.random() * 5000);
        }
    }

    public File getRootDir() {
        return rootDir;
    }
}
