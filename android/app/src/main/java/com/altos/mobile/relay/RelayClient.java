package com.altos.mobile.relay;

import android.os.Build;
import android.util.Log;

import com.altos.mobile.pairing.PairingManager;
import com.altos.mobile.runtime.RuntimeManager;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URI;

public class RelayClient {
    private static final String TAG = "RelayClient";

    private final RuntimeManager runtimeManager;
    private final PairingManager pairingManager;
    private WebSocketClient webSocketClient;
    private boolean isConnected = false;
    private String relayServerUrl = null;

    public interface RelayStatusListener {
        void onConnectionChanged(boolean connected, String message);
    }

    private RelayStatusListener listener;

    public RelayClient(RuntimeManager runtimeManager, PairingManager pairingManager) {
        this.runtimeManager = runtimeManager;
        this.pairingManager = pairingManager;
    }

    public void setListener(RelayStatusListener listener) {
        this.listener = listener;
    }

    public synchronized void connectToRelay(String relayUrl) {
        disconnect();
        this.relayServerUrl = relayUrl;

        try {
            URI uri = new URI(relayUrl);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshakedata) {
                    isConnected = true;
                    Log.d(TAG, "Connected to Relay Server: " + relayUrl);

                    // Register device with relay
                    try {
                        JSONObject reg = new JSONObject();
                        reg.put("type", "device_register");
                        reg.put("sessionId", pairingManager.getActiveSessionId() != null ?
                                pairingManager.getActiveSessionId() : "device-" + System.currentTimeMillis());
                        reg.put("token", pairingManager.getActiveAuthToken());
                        reg.put("deviceName", Build.MANUFACTURER + " " + Build.MODEL);
                        reg.put("serverStatus", runtimeManager.isServerRunning() ? "online" : "offline");
                        send(reg.toString());
                    } catch (JSONException ignored) {}

                    if (listener != null) {
                        listener.onConnectionChanged(true, "Connected to Relay");
                    }
                }

                @Override
                public void onMessage(String message) {
                    handleRelayMessage(message);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    isConnected = false;
                    Log.d(TAG, "Relay connection closed: " + reason);
                    if (listener != null) {
                        listener.onConnectionChanged(false, "Disconnected: " + reason);
                    }
                }

                @Override
                public void onError(Exception ex) {
                    Log.e(TAG, "Relay error: " + ex.getMessage());
                    if (listener != null) {
                        listener.onConnectionChanged(false, "Error: " + ex.getMessage());
                    }
                }
            };

            webSocketClient.connect();
        } catch (Exception e) {
            Log.e(TAG, "Failed to connect to relay: " + e.getMessage());
            if (listener != null) {
                listener.onConnectionChanged(false, "Failed to connect: " + e.getMessage());
            }
        }
    }

    private void handleRelayMessage(String message) {
        try {
            JSONObject msg = new JSONObject(message);
            String type = msg.optString("type", "");

            if ("ping".equals(type)) {
                JSONObject pong = new JSONObject();
                pong.put("type", "pong");
                pong.put("timestamp", System.currentTimeMillis());
                sendRelayMessage(pong);
            } else if ("command".equals(type)) {
                String cmd = msg.optString("command", "");
                String out = runtimeManager.executeCommand(cmd);
                JSONObject res = new JSONObject();
                res.put("type", "command_response");
                res.put("requestId", msg.optString("requestId", ""));
                res.put("output", out);
                sendRelayMessage(res);
            }
        } catch (Exception ignored) {
        }
    }

    public synchronized void sendRelayMessage(JSONObject json) {
        if (isConnected && webSocketClient != null && webSocketClient.isOpen()) {
            webSocketClient.send(json.toString());
        }
    }

    public synchronized void disconnect() {
        if (webSocketClient != null) {
            try {
                webSocketClient.close();
            } catch (Exception ignored) {}
            webSocketClient = null;
        }
        isConnected = false;
    }

    public boolean isConnected() {
        return isConnected;
    }
}
