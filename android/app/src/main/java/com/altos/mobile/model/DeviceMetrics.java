package com.altos.mobile.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DeviceMetrics {
    public double cpuUsage = 0.0;
    public long totalMemoryBytes = 0;
    public long availableMemoryBytes = 0;
    public long usedMemoryBytes = 0;
    public double memoryUsagePercent = 0.0;

    public int cpuCores = 8;
    public String cpuModel = "Octa-Core ARM64";
    public double[] coresUsage = new double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};

    public long totalStorageBytes = 0;
    public long availableStorageBytes = 0;
    public long usedStorageBytes = 0;
    public double storageUsagePercent = 0.0;
    public long storagePocketVpsBytes = 0;

    public int hostedWebsitesCount = 0;
    public boolean vpnActive = false;

    public int batteryPercent = 0;
    public boolean isCharging = false;
    public String batteryStatus = "Unknown";
    public float batteryTemperature = 0.0f;

    public String networkType = "Unknown";
    public String ipAddress = "127.0.0.1";
    public int serverPort = 8765;
    public long serverUptimeSeconds = 0;
    public String serverStatus = "offline";
    public String deviceName = "Android Device";
    public String androidVersion = "Android";
    public int activeProcesses = 0;

    public JSONObject toJsonObject() {
        JSONObject json = new JSONObject();
        try {
            json.put("cpuUsage", Math.round(cpuUsage * 10.0) / 10.0);
            json.put("cpuCores", cpuCores);
            json.put("cpuModel", cpuModel);

            JSONArray coresArray = new JSONArray();
            if (coresUsage != null) {
                for (double c : coresUsage) {
                    coresArray.put(Math.round(c * 10.0) / 10.0);
                }
            }
            json.put("coresUsage", coresArray);

            JSONObject mem = new JSONObject();
            mem.put("total", totalMemoryBytes);
            mem.put("available", availableMemoryBytes);
            mem.put("used", usedMemoryBytes);
            mem.put("percent", Math.round(memoryUsagePercent * 10.0) / 10.0);
            json.put("memory", mem);

            JSONObject storage = new JSONObject();
            storage.put("total", totalStorageBytes);
            storage.put("available", availableStorageBytes);
            storage.put("used", usedStorageBytes);
            storage.put("pocketVps", storagePocketVpsBytes);
            storage.put("percent", Math.round(storageUsagePercent * 10.0) / 10.0);
            json.put("storage", storage);

            json.put("hostedWebsitesCount", hostedWebsitesCount);
            json.put("vpnActive", vpnActive);

            JSONObject battery = new JSONObject();
            battery.put("percent", batteryPercent);
            battery.put("isCharging", isCharging);
            battery.put("status", batteryStatus);
            battery.put("temperature", Math.round(batteryTemperature * 10.0) / 10.0);
            json.put("battery", battery);

            JSONObject net = new JSONObject();
            net.put("type", networkType);
            net.put("ip", ipAddress);
            net.put("port", serverPort);
            json.put("network", net);

            json.put("serverStatus", serverStatus);
            json.put("serverUptimeSeconds", serverUptimeSeconds);
            json.put("deviceName", deviceName);
            json.put("androidVersion", androidVersion);
            json.put("activeProcesses", activeProcesses);
            json.put("timestamp", System.currentTimeMillis());
        } catch (JSONException e) {
            // fallback
        }
        return json;
    }

    public String toJson() {
        return toJsonObject().toString();
    }
}
