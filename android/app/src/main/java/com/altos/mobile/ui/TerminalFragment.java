package com.altos.mobile.ui;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.altos.mobile.MainActivity;
import com.altos.mobile.R;
import com.altos.mobile.runtime.InteractiveShell;
import com.altos.mobile.service.AltOsServerService;

import java.io.IOException;

public class TerminalFragment extends Fragment {
    private ScrollView scrollTerminal;
    private TextView tvTerminalOutput;
    private EditText etInput;
    private Button btnSend, btnCtrlC, btnClear;
    private InteractiveShell shell;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final StringBuilder outputBuffer = new StringBuilder();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_terminal, container, false);

        scrollTerminal = v.findViewById(R.id.scroll_terminal);
        tvTerminalOutput = v.findViewById(R.id.tv_terminal_output);
        etInput = v.findViewById(R.id.et_terminal_input);
        btnSend = v.findViewById(R.id.btn_terminal_send);
        btnCtrlC = v.findViewById(R.id.btn_term_ctrl_c);
        btnClear = v.findViewById(R.id.btn_term_clear);

        // Chip buttons
        setupChip(v.findViewById(R.id.chip_uname), "uname -a");
        setupChip(v.findViewById(R.id.chip_ls), "ls -la");
        setupChip(v.findViewById(R.id.chip_pwd), "pwd");
        setupChip(v.findViewById(R.id.chip_python), "python3 -V 2>&1 || which python || echo 'Python check completed'");
        setupChip(v.findViewById(R.id.chip_df), "df -h .");

        btnSend.setOnClickListener(view -> sendCommandFromInput());

        etInput.setOnEditorActionListener((textView, actionId, keyEvent) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND || actionId == EditorInfo.IME_ACTION_DONE) {
                sendCommandFromInput();
                return true;
            }
            return false;
        });

        btnCtrlC.setOnClickListener(view -> {
            if (shell != null) {
                shell.interrupt();
                appendOutput("\n^C\n");
            }
        });

        btnClear.setOnClickListener(view -> {
            outputBuffer.setLength(0);
            tvTerminalOutput.setText("$ ");
        });

        startShell();
        return v;
    }

    private void setupChip(Button chip, String cmd) {
        if (chip != null) {
            chip.setOnClickListener(v -> executeCommandDirect(cmd));
        }
    }

    private void startShell() {
        AltOsServerService service = getService();
        if (service == null) {
            handler.postDelayed(this::startShell, 500);
            return;
        }

        if (shell != null && shell.isAlive()) return;

        shell = service.getRuntimeManager().createShellSession();
        try {
            shell.start(new InteractiveShell.OutputListener() {
                @Override
                public void onOutput(String text) {
                    handler.post(() -> appendOutput(text));
                }

                @Override
                public void onExit(int exitCode) {
                    handler.post(() -> appendOutput("\n[Process completed with code " + exitCode + "]\n$ "));
                }
            });
        } catch (IOException e) {
            appendOutput("Failed to spawn shell: " + e.getMessage() + "\n");
        }
    }

    private void sendCommandFromInput() {
        String cmd = etInput.getText().toString().trim();
        if (cmd.isEmpty()) return;
        executeCommandDirect(cmd);
        etInput.setText("");
    }

    private void executeCommandDirect(String cmd) {
        if (shell != null && shell.isAlive()) {
            shell.sendInput(cmd + "\n");
        } else {
            // Fallback direct execution
            AltOsServerService service = getService();
            if (service != null) {
                appendOutput("$ " + cmd + "\n");
                new Thread(() -> {
                    String out = service.getRuntimeManager().executeCommand(cmd);
                    handler.post(() -> appendOutput(out + "\n$ "));
                }).start();
            }
        }
    }

    private void appendOutput(String text) {
        outputBuffer.append(text);
        if (outputBuffer.length() > 20000) {
            outputBuffer.delete(0, outputBuffer.length() - 15000);
        }
        tvTerminalOutput.setText(outputBuffer.toString());
        scrollTerminal.post(() -> scrollTerminal.fullScroll(View.FOCUS_DOWN));
    }

    @Override
    public void onDestroyView() {
        if (shell != null) {
            shell.terminate();
            shell = null;
        }
        super.onDestroyView();
    }

    private AltOsServerService getService() {
        if (getActivity() instanceof MainActivity) {
            return ((MainActivity) getActivity()).getServerService();
        }
        return null;
    }
}
