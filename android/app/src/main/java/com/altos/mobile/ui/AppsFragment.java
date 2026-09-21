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

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class AppsFragment extends Fragment {
    private TextView tvBadge, tvDetails, tvApiResult;
    private Button btnInstall, btnCreate, btnStart, btnStop, btnTestApi;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable refreshRunnable;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_apps, container, false);

        tvBadge = v.findViewById(R.id.tv_fastapi_badge);
        tvDetails = v.findViewById(R.id.tv_fastapi_details);
        tvApiResult = v.findViewById(R.id.tv_api_test_result);

        btnInstall = v.findViewById(R.id.btn_fastapi_install);
        btnCreate = v.findViewById(R.id.btn_fastapi_create);
        btnStart = v.findViewById(R.id.btn_fastapi_start);
        btnStop = v.findViewById(R.id.btn_fastapi_stop);
        btnTestApi = v.findViewById(R.id.btn_test_api);

        btnInstall.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                boolean ok = s.getRuntimeManager().installFastApi();
                tvApiResult.setText(ok ? "FastAPI environment initialized in /apps/demo-api\nrequirements.txt ready." : "Failed to install FastAPI.");
                updateUI();
            }
        });

        btnCreate.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                boolean ok = s.getRuntimeManager().createDemoApi();
                tvApiResult.setText(ok ? "Created /apps/demo-api/main.py\nEndpoint: GET /api/status" : "Failed to create app files.");
                updateUI();
            }
        });

        btnStart.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                boolean ok = s.getRuntimeManager().startFastApi();
                tvApiResult.setText(ok ? "FastAPI process started on 0.0.0.0:8000" : "Failed to start FastAPI.");
                updateUI();
            }
        });

        btnStop.setOnClickListener(view -> {
            AltOsServerService s = getService();
            if (s != null) {
                s.getRuntimeManager().stopFastApi();
                tvApiResult.setText("FastAPI service stopped.");
                updateUI();
            }
        });

        btnTestApi.setOnClickListener(view -> testFastApiEndpoint());

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
        AltOsServerService s = getService();
        if (s == null || getContext() == null) return;

        JSONObject status = s.getRuntimeManager().getFastApiStatus();
        boolean running = status.optBoolean("running", false);
        int pid = status.optInt("pid", -1);
        int port = status.optInt("port", 8000);

        if (running) {
            tvBadge.setText("● RUNNING");
            tvBadge.setTextColor(getResources().getColor(R.color.accent_emerald, null));
            tvBadge.setBackgroundResource(R.drawable.bg_pill_emerald);
            tvDetails.setText("Location: /apps/demo-api/main.py\nPORT: " + port + " | PID: " + pid);
        } else {
            tvBadge.setText("● STOPPED");
            tvBadge.setTextColor(getResources().getColor(R.color.accent_rose, null));
            tvBadge.setBackgroundResource(R.drawable.bg_pill_rose);
            tvDetails.setText("Location: /apps/demo-api/main.py\nPORT: " + port + " | PID: -");
        }

        btnStart.setEnabled(!running);
        btnStop.setEnabled(running);
    }

    private void testFastApiEndpoint() {
        tvApiResult.setText("Connecting to http://127.0.0.1:8000/api/status...");
        new Thread(() -> {
            long start = System.currentTimeMillis();
            try {
                URL url = new URL("http://127.0.0.1:8000/api/status");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(3000);

                int code = conn.getResponseCode();
                long elapsed = System.currentTimeMillis() - start;

                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                br.close();

                String res = "HTTP/1.1 " + code + " OK (" + elapsed + "ms)\n\n" + sb.toString();
                handler.post(() -> tvApiResult.setText(res));
            } catch (Exception e) {
                long elapsed = System.currentTimeMillis() - start;
                String err = "Connection Failed (" + elapsed + "ms):\n" + e.getMessage() +
                        "\nEnsure the FastAPI server is started above.";
                handler.post(() -> tvApiResult.setText(err));
            }
        }).start();
    }

    private AltOsServerService getService() {
        if (getActivity() instanceof MainActivity) {
            return ((MainActivity) getActivity()).getServerService();
        }
        return null;
    }
}
