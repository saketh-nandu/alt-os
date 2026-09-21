package com.altos.mobile;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.altos.mobile.service.AltOsServerService;
import com.altos.mobile.ui.AppsFragment;
import com.altos.mobile.ui.ConnectionFragment;
import com.altos.mobile.ui.HomeFragment;
import com.altos.mobile.ui.ServerFragment;
import com.altos.mobile.ui.TerminalFragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class MainActivity extends AppCompatActivity {
    private TextView tvHeaderStatus;
    private BottomNavigationView bottomNav;

    private AltOsServerService serverService;
    private boolean isBound = false;

    private final Handler statusHandler = new Handler(Looper.getMainLooper());
    private Runnable statusRunnable;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            AltOsServerService.LocalBinder binder = (AltOsServerService.LocalBinder) service;
            serverService = binder.getService();
            isBound = true;
            updateHeaderStatus();
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            serverService = null;
            isBound = false;
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        tvHeaderStatus = findViewById(R.id.tv_header_status);
        bottomNav = findViewById(R.id.bottom_nav);

        requestAppPermissions();
        startAndBindService();

        // Default to HomeFragment
        if (savedInstanceState == null) {
            loadFragment(new HomeFragment());
        }

        bottomNav.setOnItemSelectedListener(item -> {
            Fragment fragment = null;
            int id = item.getItemId();
            if (id == R.id.nav_home) {
                fragment = new HomeFragment();
            } else if (id == R.id.nav_server) {
                fragment = new ServerFragment();
            } else if (id == R.id.nav_terminal) {
                fragment = new TerminalFragment();
            } else if (id == R.id.nav_apps) {
                fragment = new AppsFragment();
            } else if (id == R.id.nav_connection) {
                fragment = new ConnectionFragment();
            }

            if (fragment != null) {
                loadFragment(fragment);
                return true;
            }
            return false;
        });

        statusRunnable = new Runnable() {
            @Override
            public void run() {
                updateHeaderStatus();
                statusHandler.postDelayed(this, 2000);
            }
        };
    }

    private void loadFragment(Fragment fragment) {
        getSupportFragmentManager()
                .beginTransaction()
                .replace(R.id.fragment_container, fragment)
                .commit();
    }

    private void startAndBindService() {
        Intent serviceIntent = new Intent(this, AltOsServerService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
        bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    private void updateHeaderStatus() {
        if (serverService != null && serverService.isServerOnline()) {
            tvHeaderStatus.setText("● SERVER ONLINE");
            tvHeaderStatus.setTextColor(getResources().getColor(R.color.accent_emerald, null));
            tvHeaderStatus.setBackgroundResource(R.drawable.bg_pill_emerald);
        } else {
            tvHeaderStatus.setText("● SERVER OFFLINE");
            tvHeaderStatus.setTextColor(getResources().getColor(R.color.accent_rose, null));
            tvHeaderStatus.setBackgroundResource(R.drawable.bg_pill_rose);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        statusHandler.post(statusRunnable);
    }

    @Override
    protected void onPause() {
        super.onPause();
        statusHandler.removeCallbacks(statusRunnable);
    }

    @Override
    protected void onDestroy() {
        if (isBound) {
            unbindService(serviceConnection);
            isBound = false;
        }
        super.onDestroy();
    }

    public AltOsServerService getServerService() {
        return serverService;
    }
}
