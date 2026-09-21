# ALT-OS: Personal Mobile Cloud & Server Environment

ALT-OS turns an Android smartphone into a personal, portable Linux server and computing environment controlled from a PC web application.

```
PC Web Browser (ALT-OS Desktop)
              │
    Dual Connection Modes:
    [Mode 1: Direct LAN / Wi-Fi]  or  [Mode 2: Persistent Outbound Relay]
              │
              ▼
Android Phone (ALT-OS Mobile APK)
              │
    Linux Userspace Runtime
    (/home, /apps, /server, /storage, /logs)
              │
              ▼
Real Applications (FastAPI on Port 8000)
```

---

## Repository Structure

```
ALT-OS/
├── android/            # Native Android Application (Java, Android SDK, Gradle)
│   ├── app/            # App module, AndroidManifest, Activities, Services, Runtimes
│   ├── build.gradle    # Root Gradle build script (AGP 8.7.3)
│   ├── gradlew         # Gradle wrapper executable
│   └── ALT-OS.apk      # Compiled standalone debug APK
├── desktop/            # PC Web Application (React, TypeScript, Vite, Tailwind CSS)
│   ├── src/            # Sidebar, ConnectModal, Terminal, Apps, Files, Resources
│   ├── package.json
│   └── vite.config.ts
├── relay/              # Mode 2 WebSocket & HTTP Relay (Node.js, TypeScript, ws)
│   ├── src/server.ts   # Session routing & proxy
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md # Deep-dive into isolation model & protocol
│   └── TESTING.md      # Hackathon 20-step verification checklist
└── README.md
```

---

## 1. How to Build APK

The Android application is built using the Gradle wrapper and Android SDK (Platform 34).

```bash
cd android
./gradlew assembleDebug
```

The output APK is generated at:
`android/app/build/outputs/apk/debug/app-debug.apk` and copied to `android/ALT-OS.apk`.

---

## 2. How to Install APK

Connect your Android phone via USB with USB Debugging enabled, or transfer the APK directly to the device:

```bash
# Using ADB
adb install -r android/ALT-OS.apk

# Or copy via ADB to device storage
adb push android/ALT-OS.apk /sdcard/Download/
```

Open the Files or Downloads app on the phone and tap **ALT-OS.apk** to install. Grant notification permissions when prompted.

---

## 3. How to Run Desktop Application

The desktop application is built with React 18, Vite, TypeScript, and Tailwind CSS.

```bash
cd desktop

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

Open **http://localhost:3000** in your PC browser (Chrome, Firefox, Edge, Safari).

To build the production bundle:
```bash
npm run build
npm run preview
```

---

## 4. How to Run Relay (Mode 2)

The relay server is used for remote or cross-NAT connections when direct LAN communication is unavailable.

```bash
cd relay

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start relay server
npm start
```

The relay runs on **port 4000**:
- Health check: `http://localhost:4000/health`
- WebSocket endpoint: `ws://localhost:4000/ws`

---

## 5. How QR Pairing Works

1. On the PC desktop app, click **CONNECT DEVICE**.
2. The browser generates a cryptographically secure, ephemeral JSON payload:
   ```json
   {
     "version": "1.0",
     "sessionId": "altos-9b3f",
     "token": "d748f219c0b1e4a5...",
     "expiresAt": 1726839300000,
     "localUrl": "http://192.168.1.150:8765",
     "relayUrl": "ws://192.168.1.150:4000/ws"
   }
   ```
3. A visual QR code renders with an active 5-minute countdown timer.
4. On the Android phone:
   - Tap the **Connect** tab.
   - Scan the QR code with the camera, or paste the payload JSON directly.
   - Tap **PAIR DEVICE**.
5. The Android device registers the token in memory and validates timestamp freshness.
6. The desktop interface transitions to **● CONNECTED**, showing the real device model (e.g. `Google Pixel 8`).

---

## 6. How to Connect Phone and PC on the Same Network (Mode 1)

1. Connect both the PC and Android phone to the same Wi-Fi router, or turn on your phone's Wi-Fi Hotspot and connect your PC to it.
2. Open the ALT-OS Android app. The active local IP address is displayed on the screen (e.g. `192.168.1.150:8765`).
3. In the Desktop app's **CONNECT DEVICE** modal, switch to the **DIRECT LAN IP** tab:
   - Enter Phone IP: `192.168.1.150`
   - Port: `8765`
   - Click **CONNECT TO PHONE**.
4. The desktop communicates directly with the phone over local HTTP & WebSockets. Full CORS headers are handled natively by the embedded server on Android.

---

## 7. How Linux Userspace is Implemented

ALT-OS provides a real Linux userspace environment on unrooted Android devices:

- **Directory Structure**:
  Created inside the private app directory (`/data/user/0/com.altos.mobile/files/alt-os/`):
  - `/home` — User home directory and default working directory.
  - `/apps` — Managed applications and deployed services (e.g. `/apps/demo-api/`).
  - `/server` — Server configurations and runtime state.
  - `/storage` — Sandboxed persistent user storage.
  - `/logs` — Process outputs and server logs (`server.log`, `fastapi.log`).
  - `/bin` — Custom runtime scripts and utilities.
  - `/tmp` — Temporary files.

- **Process Execution**:
  Uses Java `ProcessBuilder` executing `/system/bin/sh` with configured environment variables:
  - `HOME=/data/user/0/com.altos.mobile/files/alt-os/home`
  - `TMPDIR=/data/user/0/com.altos.mobile/files/alt-os/tmp`
  - `ALT_OS_ROOT=/data/user/0/com.altos.mobile/files/alt-os`
  - `PATH=/data/.../bin:/system/bin:/system/xbin:/apex/com.android.runtime/bin`

- **Interactive Terminal Streaming**:
  The Android app exposes a WebSocket endpoint at `/ws/terminal`. Stdin, stdout, stderr, and process signals (Ctrl+C / interrupt) are streamed bi-directionally in real time to the browser.

---

## 8. How FastAPI is Started

ALT-OS manages Python applications in `/apps/demo-api`:

1. **Install Dependencies**:
   Clicking **[ 1. INSTALL ]** generates `/apps/demo-api/requirements.txt` containing `fastapi`, `uvicorn`, `pydantic`.
2. **Generate Application**:
   Clicking **[ 2. CREATE APP ]** writes `/apps/demo-api/main.py`:
   ```python
   from fastapi import FastAPI
   import uvicorn, os, platform, time

   app = FastAPI(title="ALT-OS Demo API")

   @app.get("/api/status")
   def get_status():
       return {
           "status": "online",
           "device": "android",
           "runtime": "alt-os",
           "system": platform.system(),
           "machine": platform.machine(),
           "pid": os.getpid(),
           "timestamp": time.time()
       }

   if __name__ == "__main__":
       uvicorn.run(app, host="0.0.0.0", port=8000)
   ```
3. **Start Process**:
   Clicking **[ 3. START ]** launches the process bound to `0.0.0.0:8000`. The desktop updates immediately with the real Process ID (`PID`).
4. **Real HTTP Verification**:
   Clicking **[ SEND HTTP REQUEST ]** executes a real `fetch("http://<PHONE_IP>:8000/api/status")` from your PC browser, displaying real HTTP 200 OK, latency in ms, and the JSON payload returned from the phone.

---

## 9. Security Model

- **No Static Secrets in QR**: Pairing tokens are cryptographically randomized and expire in 5 minutes.
- **Strict Storage Sandboxing**: Canonical path validation prevents any directory traversal beyond the ALT-OS root. Personal Android photos, contacts, and SMS cannot be accessed.
- **Default-Off Services**: The server and application ports are stopped by default until explicitly started by the user.
- **Persistent Notification**: An ongoing Foreground Service notification alerts the user whenever the server is active in the background.

---

## 10. Known Limitations

- **Unrooted Android Governance**: Standard unrooted Android does not allow custom Linux namespaces (`unshare`, `chroot`) or kernel cgroups configuration. Resource quotas (CPU % and RAM ceilings) are implemented via thread priority and process niceness, and are accurately labeled as **"Advisory limit"** in the UI.
- **Process Backgrounding**: Android OEM battery managers (e.g. Samsung OneUI, Xiaomi MIUI) may throttle background CPU if battery optimization is not set to "Unrestricted" for the ALT-OS app.
- **Port Availability**: Non-root Android processes cannot bind to privileged ports below 1024. All ALT-OS services operate on high ports (8765 for control, 8000 for FastAPI).
