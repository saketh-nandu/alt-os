package com.altos.mobile.ui;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.altos.mobile.MainActivity;
import com.altos.mobile.R;
import com.altos.mobile.model.DeviceMetrics;
import com.altos.mobile.pairing.PairingManager;
import com.altos.mobile.service.AltOsServerService;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

import android.os.Build;
import android.util.Log;

public class ConnectionFragment extends Fragment {
    private TextView tvStatusBadge, tvDeviceName, tvLanAddress;
    private EditText etToken;
    private Button btnPair, btnDisconnect, btnScanQr;

    // Wireless VPN UI
    private TextView tvVpnStatusBadge, tvVpnAddress, tvVpnStats;
    private Button btnToggleVpn;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable refreshRunnable;

    // ZXing QR Scanner Launcher
    private final ActivityResultLauncher<ScanOptions> qrScanLauncher = registerForActivityResult(
            new ScanContract(),
            result -> {
                if (result.getContents() != null) {
                    String scannedContent = result.getContents().trim();
                    handleScannedQrPayload(scannedContent);
                } else {
                    Toast.makeText(getContext(), "QR scan cancelled", Toast.LENGTH_SHORT).show();
                }
            }
    );

    // Camera Permission Launcher
    private final ActivityResultLauncher<String> cameraPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            isGranted -> {
                if (isGranted) {
                    launchQrScanner();
                } else {
                    Toast.makeText(getContext(), "Camera permission required to scan desktop QR code", Toast.LENGTH_LONG).show();
                }
            }
    );

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_connection, container, false);

        tvStatusBadge = v.findViewById(R.id.tv_conn_status_badge);
        tvDeviceName = v.findViewById(R.id.tv_paired_device_name);
        tvLanAddress = v.findViewById(R.id.tv_lan_address);
        etToken = v.findViewById(R.id.et_pairing_token);
        btnPair = v.findViewById(R.id.btn_pair_token);
        btnDisconnect = v.findViewById(R.id.btn_disconnect_device);
        btnScanQr = v.findViewById(R.id.btn_scan_qr);

        // Wireless VPN UI elements
        tvVpnStatusBadge = v.findViewById(R.id.tv_vpn_status_badge);
        tvVpnAddress = v.findViewById(R.id.tv_vpn_address);
        tvVpnStats = v.findViewById(R.id.tv_vpn_stats);
        btnToggleVpn = v.findViewById(R.id.btn_toggle_vpn);

        // Camera QR scan click
        btnScanQr.setOnClickListener(view -> checkPermissionAndScan());

        // Manual token pairing click
        btnPair.setOnClickListener(view -> pairWithEnteredPayload());

        // Disconnect click
        btnDisconnect.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                s.getPairingManager().disconnect();
                updateUI();
                Toast.makeText(getContext(), "Disconnected from PC", Toast.LENGTH_SHORT).show();
            }
        });

        // Wireless VPN toggle click
        btnToggleVpn.setOnClickListener(view -> toggleWirelessVpn());

        refreshRunnable = new Runnable() {
            @Override
            public void run() {
                updateUI();
                handler.postDelayed(this, 1500);
            }
        };

        return v;
    }

    @Override
    public void onResume() {
        super.onResume();
        handler.post(refreshRunnable);
    }

    @Override
    public void onPause() {
        super.onPause();
        handler.removeCallbacks(refreshRunnable);
    }

    private void checkPermissionAndScan() {
        if (getContext() == null) return;
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            launchQrScanner();
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    private void launchQrScanner() {
        ScanOptions options = new ScanOptions();
        options.setPrompt("Scan ALT-OS Desktop QR Code to Pair & Activate VPN");
        options.setBeepEnabled(true);
        options.setOrientationLocked(false);
        options.setBarcodeImageEnabled(false);
        options.setDesiredBarcodeFormats(ScanOptions.QR_CODE);
        qrScanLauncher.launch(options);
    }

    private void handleScannedQrPayload(String raw) {
        if (raw == null || raw.isEmpty()) return;

        etToken.setText(raw);
        AltOsServerService s = getService();
        if (s == null) {
            Toast.makeText(getContext(), "ALT-OS Server service not ready", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            PairingManager.PairingPayload payload;
            if (raw.startsWith("{") && raw.endsWith("}")) {
                payload = PairingManager.PairingPayload.fromJson(raw);
            } else {
                // Parse simple key=value or plain token
                payload = new PairingManager.PairingPayload();
                payload.version = "1.0";
                payload.sessionId = "qr-" + (System.currentTimeMillis() % 100000);
                payload.token = raw;
                payload.expiresAt = System.currentTimeMillis() + (30 * 60 * 1000);
            }

            boolean ok = s.getPairingManager().processPairingPayload(payload, "ALT-OS Desktop");
            if (ok) {
                // Get real phone IP
                DeviceMetrics metrics = s.getSystemMonitor().collectMetrics(
                        s.getRuntimeManager().getServerStartTime(),
                        s.isServerOnline(),
                        1,
                        s.getServerPort()
                );
                String phoneIp = (metrics.ipAddress != null && !metrics.ipAddress.isEmpty()) ? metrics.ipAddress : "127.0.0.1";

                // Announce pairing to desktop relay if announceUrl is available
                if (payload.announceUrl != null && !payload.announceUrl.isEmpty()) {
                    final String announceUrl = payload.announceUrl;
                    new Thread(() -> {
                        try {
                            URL url = new URL(announceUrl);
                            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                            conn.setRequestMethod("POST");
                            conn.setRequestProperty("Content-Type", "application/json");
                            conn.setDoOutput(true);
                            conn.setConnectTimeout(4000);
                            conn.setReadTimeout(4000);

                            JSONObject announce = new JSONObject();
                            announce.put("sessionId", payload.sessionId);
                            announce.put("token", payload.token);
                            announce.put("deviceName", Build.MANUFACTURER + " " + Build.MODEL);
                            announce.put("deviceIp", phoneIp);
                            announce.put("devicePort", s.getServerPort());

                            try (OutputStream os = conn.getOutputStream()) {
                                os.write(announce.toString().getBytes(StandardCharsets.UTF_8));
                            }
                            int respCode = conn.getResponseCode();
                            Log.d("ConnectionFragment", "Desktop pairing announce returned HTTP " + respCode);
                        } catch (Exception ex) {
                            Log.w("ConnectionFragment", "Announce pairing failed: " + ex.getMessage());
                        }
                    }).start();
                }

                // Connect relay client if relayUrl exists
                if (payload.relayUrl != null && !payload.relayUrl.isEmpty()) {
                    s.getRelayClient().connectToRelay(payload.relayUrl);
                }

                // Automatically activate Wireless VPN SOCKS5 proxy on port 1080
                s.getRuntimeManager().startSocksProxy(1080);

                Toast.makeText(getContext(), "✓ Desktop Paired & Wireless VPN Active!", Toast.LENGTH_LONG).show();
                updateUI();
            } else {
                Toast.makeText(getContext(), "Pairing Failed: Token expired or invalid", Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) {
            Toast.makeText(getContext(), "Error processing QR payload: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void pairWithEnteredPayload() {
        String payloadStr = etToken.getText().toString().trim();
        if (payloadStr.isEmpty()) {
            Toast.makeText(getContext(), "Please enter pairing JSON payload", Toast.LENGTH_SHORT).show();
            return;
        }
        handleScannedQrPayload(payloadStr);
    }

    private void toggleWirelessVpn() {
        AltOsServerService s = getService();
        if (s == null) return;

        boolean isRunning = s.getRuntimeManager().isVpnRunning();
        if (isRunning) {
            s.getRuntimeManager().stopSocksProxy();
            Toast.makeText(getContext(), "Wireless VPN Stopped", Toast.LENGTH_SHORT).show();
        } else {
            boolean ok = s.getRuntimeManager().startSocksProxy(1080);
            if (ok) {
                Toast.makeText(getContext(), "✓ Wireless VPN Active on port 1080", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(getContext(), "Failed to start VPN on port 1080", Toast.LENGTH_SHORT).show();
            }
        }
        updateUI();
    }

    private void updateUI() {
        AltOsServerService s = getService();
        if (s == null || getContext() == null) return;

        PairingManager pm = s.getPairingManager();
        boolean paired = pm.isPaired();

        if (paired) {
            tvStatusBadge.setText("● PC CONNECTED");
            tvStatusBadge.setTextColor(getResources().getColor(R.color.accent_emerald, null));
            tvStatusBadge.setBackgroundResource(R.drawable.bg_pill_emerald);
            tvDeviceName.setText("Device: " + pm.getPairedClientName() + "\nSession ID: " + pm.getActiveSessionId());
            btnDisconnect.setVisibility(View.VISIBLE);
        } else {
            tvStatusBadge.setText("● DISCONNECTED");
            tvStatusBadge.setTextColor(getResources().getColor(R.color.accent_rose, null));
            tvStatusBadge.setBackgroundResource(R.drawable.bg_pill_rose);
            tvDeviceName.setText("No computer paired.\nDesktop shows pairing QR code.");
            btnDisconnect.setVisibility(View.GONE);
        }

        DeviceMetrics metrics = s.getSystemMonitor().collectMetrics(
                s.getRuntimeManager().getServerStartTime(),
                s.isServerOnline(),
                1,
                s.getServerPort()
        );
        String phoneIp = (metrics.ipAddress != null && !metrics.ipAddress.isEmpty()) ? metrics.ipAddress : "127.0.0.1";
        tvLanAddress.setText("http://" + phoneIp + ":" + metrics.serverPort);

        // Wireless VPN UI State
        boolean vpnRunning = s.getRuntimeManager().isVpnRunning();
        int vpnPort = s.getRuntimeManager().getVpnPort();
        if (vpnPort <= 0) vpnPort = 1080;

        if (vpnRunning) {
            tvVpnStatusBadge.setText("● VPN ACTIVE");
            tvVpnStatusBadge.setTextColor(getResources().getColor(R.color.accent_emerald, null));
            tvVpnStatusBadge.setBackgroundResource(R.drawable.bg_pill_emerald);

            tvVpnAddress.setText("socks5://" + phoneIp + ":" + vpnPort);
            tvVpnAddress.setTextColor(getResources().getColor(R.color.accent_emerald, null));

            long sent = s.getRuntimeManager().getVpnBytesSent();
            long recv = s.getRuntimeManager().getVpnBytesReceived();
            tvVpnStats.setText("Traffic: Sent " + formatBytes(sent) + " | Recv " + formatBytes(recv));

            btnToggleVpn.setText("STOP WIRELESS VPN");
            btnToggleVpn.setBackgroundTintList(ColorStateList.valueOf(getResources().getColor(R.color.accent_rose, null)));
            btnToggleVpn.setTextColor(0xFFFFFFFF);
        } else {
            tvVpnStatusBadge.setText("● VPN OFFLINE");
            tvVpnStatusBadge.setTextColor(getResources().getColor(R.color.accent_rose, null));
            tvVpnStatusBadge.setBackgroundResource(R.drawable.bg_pill_rose);

            tvVpnAddress.setText("socks5://" + phoneIp + ":" + vpnPort);
            tvVpnAddress.setTextColor(getResources().getColor(R.color.text_secondary, null));

            tvVpnStats.setText("Traffic: Offline (Tap to start tunnel)");

            btnToggleVpn.setText("START WIRELESS VPN");
            btnToggleVpn.setBackgroundTintList(ColorStateList.valueOf(getResources().getColor(R.color.accent_emerald, null)));
            btnToggleVpn.setTextColor(0xFF0B0F19);
        }
    }

    private String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char pre = "KMGTPE".charAt(exp - 1);
        return String.format(Locale.US, "%.1f %cB", bytes / Math.pow(1024, exp), pre);
    }

    private AltOsServerService getService() {
        if (getActivity() instanceof MainActivity) {
            return ((MainActivity) getActivity()).getServerService();
        }
        return null;
    }
}
