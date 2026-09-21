package com.altos.mobile.pairing;

import org.json.JSONException;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.UUID;

public class PairingManager {
    private String activeSessionId = null;
    private String activeAuthToken = null;
    private long sessionExpiresAt = 0;
    private String pairedClientName = null;
    private boolean isPaired = false;
    private final SecureRandom secureRandom = new SecureRandom();

    public static class PairingPayload {
        public String version;
        public String sessionId;
        public String token;
        public long expiresAt;
        public String localUrl;
        public String relayUrl;
        public String announceUrl;
        public String desktopIp;
        public int desktopPort;

        public static PairingPayload fromJson(String jsonStr) throws JSONException {
            if (jsonStr == null) {
                throw new JSONException("Pairing payload is null");
            }
            jsonStr = jsonStr.trim();
            JSONObject obj = new JSONObject(jsonStr);
            PairingPayload payload = new PairingPayload();
            payload.version = obj.optString("version", "1.0");
            payload.sessionId = obj.optString("sessionId", obj.optString("id", ""));
            payload.token = obj.optString("token", obj.optString("authToken", ""));

            // Support long, number, or string representation of expiresAt
            long exp = 0;
            if (obj.has("expiresAt")) {
                Object expVal = obj.get("expiresAt");
                if (expVal instanceof Number) {
                    exp = ((Number) expVal).longValue();
                } else {
                    try {
                        exp = Long.parseLong(expVal.toString().trim());
                    } catch (Exception ignored) {}
                }
            }
            payload.expiresAt = exp;
            payload.localUrl = obj.optString("localUrl", "");
            payload.relayUrl = obj.optString("relayUrl", "");
            payload.announceUrl = obj.optString("announceUrl", "");
            payload.desktopIp = obj.optString("desktopIp", "");
            payload.desktopPort = obj.optInt("desktopPort", 4000);
            return payload;
        }

        public String toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("version", version != null ? version : "1.0");
                obj.put("sessionId", sessionId != null ? sessionId : "");
                obj.put("token", token != null ? token : "");
                obj.put("expiresAt", expiresAt);
                obj.put("localUrl", localUrl != null ? localUrl : "");
                obj.put("relayUrl", relayUrl != null ? relayUrl : "");
                obj.put("announceUrl", announceUrl != null ? announceUrl : "");
                obj.put("desktopIp", desktopIp != null ? desktopIp : "");
                obj.put("desktopPort", desktopPort);
                return obj.toString();
            } catch (JSONException e) {
                return "{}";
            }
        }
    }

    public synchronized PairingPayload createLocalSession(long ttlMillis) {
        PairingPayload payload = new PairingPayload();
        payload.version = "1.0";
        payload.sessionId = UUID.randomUUID().toString();
        byte[] tokenBytes = new byte[24];
        secureRandom.nextBytes(tokenBytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : tokenBytes) {
            sb.append(String.format("%02x", b));
        }
        payload.token = sb.toString();
        payload.expiresAt = System.currentTimeMillis() + (ttlMillis > 0 ? ttlMillis : (5 * 60 * 1000));

        processPairingPayload(payload, "ALT-OS Host");
        return payload;
    }

    public synchronized boolean processPairingPayload(PairingPayload payload, String clientName) {
        if (payload == null || payload.sessionId == null || payload.sessionId.isEmpty()) {
            return false;
        }

        long now = System.currentTimeMillis();
        // If expiresAt is set (> 0), ensure it is not expired
        if (payload.expiresAt > 0 && payload.expiresAt < now) {
            return false; // Expired token
        }

        this.activeSessionId = payload.sessionId;
        this.activeAuthToken = payload.token;
        this.sessionExpiresAt = payload.expiresAt;
        this.pairedClientName = clientName != null ? clientName : "ALT-OS Desktop";
        this.isPaired = true;
        return true;
    }

    public synchronized boolean validateToken(String token) {
        if (!isPaired || activeAuthToken == null) {
            return false;
        }
        if (sessionExpiresAt > 0 && System.currentTimeMillis() > sessionExpiresAt) {
            disconnect();
            return false;
        }
        return activeAuthToken.equals(token);
    }

    public synchronized void disconnect() {
        this.activeSessionId = null;
        this.activeAuthToken = null;
        this.sessionExpiresAt = 0;
        this.pairedClientName = null;
        this.isPaired = false;
    }

    public synchronized boolean isPaired() {
        if (isPaired && sessionExpiresAt > 0 && System.currentTimeMillis() > sessionExpiresAt) {
            disconnect();
            return false;
        }
        return isPaired;
    }

    public synchronized String getActiveSessionId() {
        return activeSessionId;
    }

    public synchronized String getActiveAuthToken() {
        return activeAuthToken;
    }

    public synchronized String getPairedClientName() {
        return pairedClientName;
    }

    public synchronized long getSessionExpiresAt() {
        return sessionExpiresAt;
    }
}
