# ALT-OS Verification & Testing Checklist

This checklist verifies every major capability of the ALT-OS prototype on real hardware.

---

## 1. Automated System Tests

| Item | Component | Verification Command | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Android APK Build** | `android/` | `./gradlew assembleDebug` | Generates `ALT-OS.apk` (Exit Code 0) | **PASS** |
| **Desktop Web Build** | `desktop/` | `npm run build` | Clean TypeScript compilation, bundles dist | **PASS** |
| **Relay Server Build** | `relay/` | `npm run build` | Clean TypeScript compilation | **PASS** |

---

## 2. Hackathon Demo Sequence Checklist

Execute this 20-step sequence during presentation or validation:

- [ ] **Step 1: Install APK**
  - Install `android/ALT-OS.apk` on physical Android device (`adb install android/ALT-OS.apk` or via file transfer).
- [ ] **Step 2: Launch Android App**
  - Verify app launches and displays `ALT-OS`, `my-server`, and starts Foreground Service with persistent notification.
- [ ] **Step 3: Launch Desktop Control App**
  - Run `npm run dev` in `desktop/` and open `http://localhost:3000` in browser.
- [ ] **Step 4: Verify Initial State**
  - Desktop displays `● DISCONNECTED` with clean minimal sidebar.
- [ ] **Step 5: Generate Pairing QR**
  - Click `CONNECT DEVICE`. A QR code renders with countdown timer (5:00).
- [ ] **Step 6: Pair Devices**
  - On phone: Open `Connect` tab, scan QR or paste JSON payload, tap `PAIR DEVICE`.
  - Desktop updates to `● CONNECTED` showing real device model (e.g. `Google Pixel 8`).
- [ ] **Step 7: Verify Real Hardware Telemetry**
  - Check Overview page: Real CPU load %, real RAM usage (GB used / total), real storage, real battery % with charging badge, and server uptime.
- [ ] **Step 8: Start Server from Desktop**
  - On Server page: Click `[ START ]`.
  - Desktop sends real `POST /api/server/start` to phone.
  - Server badge transitions to `● Online`.
- [ ] **Step 9: Verify Server Logs**
  - Server logs update in real-time reading from `/logs/server.log` on Android.
- [ ] **Step 10: Open Web Terminal**
  - Navigate to `Terminal` page.
  - Verify active shell connection over WebSocket.
- [ ] **Step 11: Execute Kernel Info Command**
  - Run `$ uname -a`. Real Linux kernel version and Android architecture print to screen.
- [ ] **Step 12: Execute File Listing Command**
  - Run `$ ls -la`. Shows `/home` directory contents (`welcome.txt`).
- [ ] **Step 13: Execute Working Directory Command**
  - Run `$ pwd`. Outputs `/data/user/0/com.altos.mobile/files/alt-os/home`.
- [ ] **Step 14: Install FastAPI Environment**
  - Navigate to `Apps` page.
  - Click `[ 1. INSTALL ]`. Environment creates `/apps/demo-api/requirements.txt`.
- [ ] **Step 15: Create FastAPI Code**
  - Click `[ 2. CREATE APP ]`. Generates `/apps/demo-api/main.py`.
- [ ] **Step 16: Start FastAPI Service**
  - Click `[ 3. START ]`.
  - Android starts real process listening on port 8000.
  - Status updates to `● RUNNING`, Port `8000`, with real Process ID (PID).
- [ ] **Step 17: Test Live FastAPI Endpoint**
  - Click `[ SEND HTTP REQUEST ]` (`GET /api/status`).
  - Desktop performs real HTTP `fetch()` to Android device.
  - Displays `200 OK`, exact roundtrip latency (ms), and JSON response.
- [ ] **Step 18: Browse Sandboxed File System**
  - Navigate to `Files` page.
  - Browse `/home`, `/apps`, `/server`, `/storage`, `/logs`.
  - View `main.py` contents and verify security sandboxing.
- [ ] **Step 19: Test Resource Limits**
  - Open `Resources` page.
  - Adjust CPU allocation slider and RAM ceiling.
  - Confirm "Advisory limit" governance label.
- [ ] **Step 20: Stop & Disconnect**
  - Stop server process, click Disconnect, verify session terminates cleanly.
