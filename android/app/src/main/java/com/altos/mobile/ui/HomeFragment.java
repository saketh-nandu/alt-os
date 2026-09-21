package com.altos.mobile.ui;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.altos.mobile.MainActivity;
import com.altos.mobile.R;
import com.altos.mobile.model.DeviceMetrics;
import com.altos.mobile.service.AltOsServerService;

import java.util.Locale;

public class HomeFragment extends Fragment {
    private TextView tvEnvName, tvRuntimeInfo;
    private TextView tvCpu, tvRam, tvStorage, tvBattery;
    private TextView tvNetwork, tvUptime;
    private Button btnStart, btnStop;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable refreshRunnable;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_home, container, false);

        tvEnvName = v.findViewById(R.id.tv_home_env_name);
        tvRuntimeInfo = v.findViewById(R.id.tv_home_runtime_info);
        tvCpu = v.findViewById(R.id.tv_home_cpu);
        tvRam = v.findViewById(R.id.tv_home_ram);
        tvStorage = v.findViewById(R.id.tv_home_storage);
        tvBattery = v.findViewById(R.id.tv_home_battery);
        tvNetwork = v.findViewById(R.id.tv_home_network);
        tvUptime = v.findViewById(R.id.tv_home_uptime);
        btnStart = v.findViewById(R.id.btn_home_start_server);
        btnStop = v.findViewById(R.id.btn_home_stop_server);

        btnStart.setOnClickListener(view -> {
            AltOsServerService service = getService();
            if (service != null) {
                service.startServer();
                updateUI();
            }
        });

        btnStop.setOnClickListener(view -> {
            AltOsServerService service = getService();
            if (service != null) {
                service.stopServer();
                updateUI();
            }
        });

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

    private void updateUI() {
        AltOsServerService service = getService();
        if (service == null || getContext() == null) return;

        boolean online = service.isServerOnline();
        DeviceMetrics metrics = service.getSystemMonitor().collectMetrics(
                service.getRuntimeManager().getServerStartTime(),
                online,
                1,
                service.getServerPort()
        );

        tvCpu.setText(String.format(Locale.US, "%.1f%%", metrics.cpuUsage));

        double usedGb = metrics.usedMemoryBytes / (1024.0 * 1024.0 * 1024.0);
        double totalGb = metrics.totalMemoryBytes / (1024.0 * 1024.0 * 1024.0);
        tvRam.setText(String.format(Locale.US, "%.1f / %.1f GB", usedGb, totalGb));

        double usedStorageGb = metrics.usedStorageBytes / (1024.0 * 1024.0 * 1024.0);
        double totalStorageGb = metrics.totalStorageBytes / (1024.0 * 1024.0 * 1024.0);
        tvStorage.setText(String.format(Locale.US, "%.1f / %.1f GB", usedStorageGb, totalStorageGb));

        tvBattery.setText(String.format(Locale.US, "%d%%%s", metrics.batteryPercent, metrics.isCharging ? " ⚡" : ""));

        tvNetwork.setText(String.format(Locale.US, "IP: %s:%d (%s)", metrics.ipAddress, metrics.serverPort, metrics.networkType));
        tvUptime.setText(String.format(Locale.US, "Server Uptime: %ds | %s", metrics.serverUptimeSeconds, online ? "ONLINE" : "OFFLINE"));

        btnStart.setEnabled(!online);
        btnStop.setEnabled(online);
    }

    private AltOsServerService getService() {
        if (getActivity() instanceof MainActivity) {
            return ((MainActivity) getActivity()).getServerService();
        }
        return null;
    }
}
