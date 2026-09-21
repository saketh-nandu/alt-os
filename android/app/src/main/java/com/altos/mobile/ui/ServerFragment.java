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
import com.altos.mobile.service.AltOsServerService;

public class ServerFragment extends Fragment {
    private TextView tvStatus, tvLogs;
    private Button btnStart, btnStop, btnRestart;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable refreshRunnable;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_server, container, false);

        tvStatus = v.findViewById(R.id.tv_server_status_label);
        tvLogs = v.findViewById(R.id.tv_server_logs);
        btnStart = v.findViewById(R.id.btn_server_start);
        btnStop = v.findViewById(R.id.btn_server_stop);
        btnRestart = v.findViewById(R.id.btn_server_restart);

        btnStart.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                s.startServer();
                updateUI();
            }
        });

        btnStop.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                s.stopServer();
                updateUI();
            }
        });

        btnRestart.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                s.restartServer();
                updateUI();
            }
        });

        refreshRunnable = new Runnable() {
            @Override
            public void run() {
                updateUI();
                handler.postDelayed(this, 2000);
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
        if (online) {
            tvStatus.setText("Status: ● Online (Port " + service.getServerPort() + ")");
            tvStatus.setTextColor(getResources().getColor(R.color.accent_emerald, null));
        } else {
            tvStatus.setText("Status: ● Offline");
            tvStatus.setTextColor(getResources().getColor(R.color.accent_rose, null));
        }

        String logs = service.getRuntimeManager().readLogs("server.log", 60);
        tvLogs.setText(logs);

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
