package com.altos.mobile.runtime;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class InteractiveShell {
    public interface OutputListener {
        void onOutput(String text);
        void onExit(int exitCode);
    }

    private final File workingDir;
    private final File rootDir;
    private Process process;
    private OutputStream stdin;
    private OutputListener listener;
    private boolean isAlive = false;

    public InteractiveShell(File rootDir, File workingDir) {
        this.rootDir = rootDir;
        this.workingDir = workingDir;
    }

    public synchronized void start(OutputListener listener) throws IOException {
        this.listener = listener;

        ProcessBuilder pb = new ProcessBuilder("/system/bin/sh");
        pb.directory(workingDir);
        pb.redirectErrorStream(true);

        Map<String, String> env = pb.environment();
        env.put("HOME", workingDir.getAbsolutePath());
        env.put("TMPDIR", new File(rootDir, "tmp").getAbsolutePath());
        env.put("ALT_OS_ROOT", rootDir.getAbsolutePath());
        env.put("PATH", new File(rootDir, "bin").getAbsolutePath() + ":/system/bin:/system/xbin:/apex/com.android.runtime/bin");
        env.put("PS1", "alt-os:\\w$ ");
        env.put("TERM", "xterm-256color");

        this.process = pb.start();
        this.stdin = process.getOutputStream();
        this.isAlive = true;

        // Read stdout / stderr stream
        Thread readThread = new Thread(() -> {
            byte[] buffer = new byte[2048];
            try (InputStream in = process.getInputStream()) {
                int read;
                while ((read = in.read(buffer)) != -1) {
                    String chunk = new String(buffer, 0, read, StandardCharsets.UTF_8);
                    if (this.listener != null) {
                        this.listener.onOutput(chunk);
                    }
                }
            } catch (IOException ignored) {
            }

            int exitCode = -1;
            try {
                exitCode = process.waitFor();
            } catch (InterruptedException ignored) {
            }

            isAlive = false;
            if (this.listener != null) {
                this.listener.onExit(exitCode);
            }
        });
        readThread.setDaemon(true);
        readThread.start();
    }

    public synchronized void sendInput(String input) {
        if (!isAlive || stdin == null) return;
        try {
            stdin.write(input.getBytes(StandardCharsets.UTF_8));
            stdin.flush();
        } catch (IOException ignored) {
        }
    }

    public synchronized void interrupt() {
        if (!isAlive || stdin == null) return;
        try {
            // Send ETX (Ctrl+C = \u0003)
            stdin.write(3);
            stdin.flush();
        } catch (IOException ignored) {
        }
    }

    public synchronized void terminate() {
        isAlive = false;
        if (process != null) {
            process.destroyForcibly();
        }
    }

    public boolean isAlive() {
        return isAlive;
    }
}
