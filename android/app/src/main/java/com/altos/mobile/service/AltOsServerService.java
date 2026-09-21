package com.altos.mobile.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.net.wifi.WifiManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.altos.mobile.MainActivity;
import com.altos.mobile.R;
import com.altos.mobile.monitoring.SystemMonitor;
import com.altos.mobile.pairing.PairingManager;
import com.altos.mobile.relay.RelayClient;
import com.altos.mobile.runtime.RuntimeManager;
import com.altos.mobile.server.HttpControlServer;

import java.io.IOException;

public class AltOsServerService extends Service {
    private static final String TAG = "AltOsServerService";
    private static final String CHANNEL_ID = "altos_server_channel";
    private static final int NOTIFICATION_ID = 1001;

    private final IBinder binder = new LocalBinder();

    private RuntimeManager runtimeManager;
    private SystemMonitor systemMonitor;
    private PairingManager pairingManager;
    private HttpControlServer controlServer;
    private RelayClient relayClient;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    private int serverPort = 8765;
    private boolean isRunning = false;

    public class LocalBinder extends Binder {
        public AltOsServerService getService() {
            return AltOsServerService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        // Acquire WakeLock and High-Performance WifiLock to prevent radio sleep
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "altos:server_wakelock");
                wakeLock.acquire();
            }
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) {
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "altos:wifi_lock");
                wifiLock.acquire();
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire wake/wifi locks: " + e.getMessage());
        }

        runtimeManager = new RuntimeManager(this);
        systemMonitor = new SystemMonitor(this);
        pairingManager = new PairingManager();
        relayClient = new RelayClient(runtimeManager, pairingManager);

        startForeground(NOTIFICATION_ID, buildNotification("ALT-OS Initializing...", "Starting services"));
        startServer();
    }

    public synchronized void startServer() {
        if (isRunning) return;

        try {
            controlServer = new HttpControlServer(this, serverPort, runtimeManager, systemMonitor, pairingManager);
            controlServer.start();
            runtimeManager.startServer();
            isRunning = true;
            updateNotification("ALT-OS Server: Online", "Port " + serverPort + " | Userspace Active");
            Log.d(TAG, "ALT-OS Control Server started on port " + serverPort);
        } catch (IOException e) {
            Log.e(TAG, "Failed to start control server: " + e.getMessage());
            updateNotification("ALT-OS Server: Error", "Port " + serverPort + " in use or failed");
        }
    }

    public synchronized void stopServer() {
        if (!isRunning) return;

        if (controlServer != null) {
            controlServer.stop();
            controlServer = null;
        }
        runtimeManager.stopServer();
        isRunning = false;
        updateNotification("ALT-OS Server: Offline", "Server stopped");
    }

    public synchronized void restartServer() {
        stopServer();
        try {
            Thread.sleep(500);
        } catch (InterruptedException ignored) {}
        startServer();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "ALT-OS Background Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Maintains ALT-OS Server & Runtime environment");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String title, String content) {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    public void updateNotification(String title, String content) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(title, content));
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        stopServer();
        if (relayClient != null) {
            relayClient.disconnect();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            try { wifiLock.release(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }

    public RuntimeManager getRuntimeManager() {
        return runtimeManager;
    }

    public SystemMonitor getSystemMonitor() {
        return systemMonitor;
    }

    public PairingManager getPairingManager() {
        return pairingManager;
    }

    public RelayClient getRelayClient() {
        return relayClient;
    }

    public boolean isServerOnline() {
        return isRunning && (controlServer != null && controlServer.isAlive());
    }

    public int getServerPort() {
        return serverPort;
    }

    public void setServerPort(int port) {
        this.serverPort = port;
        if (isRunning) {
            restartServer();
        }
    }
}
