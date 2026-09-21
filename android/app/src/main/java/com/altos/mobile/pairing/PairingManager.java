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
            JSONObject obj = new JSONObject(jsonStr);
            PairingPayload payload = new PairingPayload();
            payload.version = obj.optString("version", "1.0");
            payload.sessionId = obj.getString("sessionId");
            payload.token = obj.getString("token");
            payload.expiresAt = obj.getLong("expiresAt");
            payload.localUrl = obj.optString("localUrl", "");
            payload.relayUrl = obj.optString("relayUrl", "");
            payload.announceUrl = obj.optString("announceUrl", "");
            payload.desktopIp = obj.optString("desktopIp", "");
            payload.desktopPort = obj.optInt("desktopPort", 4000);
            return payload;
        }
    }

    public synchronized boolean processPairingPayload(PairingPayload payload, String clientName) {
        long now = System.currentTimeMillis();
        if (payload.expiresAt < now) {
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
        if (System.currentTimeMillis() > sessionExpiresAt) {
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
        if (isPaired && System.currentTimeMillis() > sessionExpiresAt) {
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
