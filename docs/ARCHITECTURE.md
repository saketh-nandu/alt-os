# ALT-OS Architecture & Isolation Model

ALT-OS turns an Android smartphone into a personal, portable Linux server and computing environment controlled from a PC web application.

```
┌────────────────────────┐
│     PC Web Browser     │
│   (ALT-OS Desktop)     │
└───────────┬────────────┘
            │
    Dual Connection Modes:
    [Mode 1: Direct LAN WebSocket / HTTP]
    [Mode 2: Persistent Outbound Relay]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│                   ALT-OS Mobile (APK)                  │
│       Native Android Application (Android SDK / Java)   │
│                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │   HttpControlServer   │  │    SystemMonitor      │  │
│  │  (Port 8765 / WS / API│  │ (CPU, RAM, Batt, Net) │  │
│  └───────────┬───────────┘  └───────────────────────┘  │
│              │                                         │
│  ┌───────────▼───────────┐  ┌───────────────────────┐  │
│  │    RuntimeManager     │  │    PairingManager     │  │
│  │ (ProcessBuilder, Sand)│  │ (Ephemeral QR Token)  │  │
│  └───────────┬───────────┘  └───────────────────────┘  │
│              │                                         │
│              ▼                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Linux Userspace Environment              │  │
│  │     (/home, /apps, /server, /storage, /logs)     │  │
│  └───────────────────────┬──────────────────────────┘  │
│                          │                             │
│                          ▼                             │
│         ┌─────────────────────────────────┐            │
│         │   FastAPI Service (Port 8000)   │            │
│         │     /apps/demo-api/main.py      │            │
│         └─────────────────────────────────┘            │
└────────────────────────────────────────────────────────┘
```

---

## 1. Unrooted Android Isolation Model

### Process Boundaries & Permissions
- Android runs each application inside a distinct Linux UID (e.g. `u0_a248`).
- Without root permissions, standard Linux namespace creation (`unshare`, `chroot`, or hardware cgroups) is restricted by Android SELinux policies.
- ALT-OS provides a legitimate userspace runtime by initializing an isolated filesystem root in the application's private files directory:
  `/data/user/0/com.altos.mobile/files/alt-os/`
- Standard Android system binaries (`/system/bin/sh`, `/system/bin/toybox`, `/system/bin/toolbox`, and APEX runtime binaries) are accessible to unrooted applications.
- Processes are executed via `ProcessBuilder` with a tailored environment:
  - `HOME`: `/data/user/0/com.altos.mobile/files/alt-os/home`
  - `TMPDIR`: `/data/user/0/com.altos.mobile/files/alt-os/tmp`
  - `ALT_OS_ROOT`: `/data/user/0/com.altos.mobile/files/alt-os`
  - `PATH`: `/data/user/0/com.altos.mobile/files/alt-os/bin:/system/bin:/system/xbin:/apex/com.android.runtime/bin`

### Sandboxed Storage Security
- To strictly adhere to Android storage sandboxing and prevent unauthorized access to user personal data (photos, contacts, downloads), the file manager validates all target paths:
  ```java
  String canonicalRoot = rootDir.getCanonicalPath();
  String canonicalTarget = target.getCanonicalPath();
  if (!canonicalTarget.startsWith(canonicalRoot)) {
      throw new SecurityException("Access Denied: Path escapes ALT-OS sandbox.");
  }
  ```
- No external storage permissions (`READ_EXTERNAL_STORAGE`) are requested or required.

### Resource Limits Governance
- Hardware cgroups cannot be set by unprivileged UIDs on unrooted Android.
- ALT-OS transparently informs the user:
  - Resource policies (CPU limits, RAM ceilings, storage quotas) are clearly labeled as **"Advisory limit"** or **"Runtime-dependent"**.
  - Internal thread priority and process niceness adjustments are applied to prevent background execution starvation.

---

## 2. Connection Architecture

### Mode 1 — Local / LAN Direct
- **Use Case**: PC and Android phone are connected to the same Wi-Fi router or mobile hotspot.
- **Protocol**: Direct HTTP & WebSocket communication to `http://<PHONE_IP>:8765`.
- **CORS Handling**: Full cross-origin headers (`Access-Control-Allow-Origin: *`, preflight `OPTIONS` support) allow direct browser `fetch()` requests without browser blocking.
- **Endpoints**:
  - `GET /health`: Device status, uptime, runtime info.
  - `GET /api/system/metrics`: Real CPU, RAM, storage, battery, network metrics.
  - `GET /ws/terminal`: Interactive streaming shell over WebSocket.
  - `GET /ws/metrics`: Live push telemetry.

### Mode 2 — Persistent Outbound Relay
- **Use Case**: Cellular networks, CGNAT, firewalls where inbound connections to phone IP are blocked.
- **Protocol**:
  1. The Android phone establishes an outbound persistent WebSocket to `ws://<RELAY_HOST>:4000/ws?role=device`.
  2. The PC browser connects to `ws://<RELAY_HOST>:4000/ws?role=desktop`.
  3. The relay validates cryptographic session tokens and bidirectionally routes authenticated commands, telemetry, and terminal streams.

---

## 3. Pairing Security Protocol

1. **PC Generation**:
   The desktop application creates an ephemeral cryptographic session:
   ```json
   {
     "version": "1.0",
     "sessionId": "altos-a9b4",
     "token": "4f9d0c2e...",
     "expiresAt": 1726839300000,
     "localUrl": "http://192.168.1.150:8765",
     "relayUrl": "ws://relay.altos.io:4000/ws"
   }
   ```
2. **Short-lived Expiry**:
   The token has a strict 5-minute TTL. Permanent passwords are never stored in the QR payload.
3. **Mutual Handshake**:
   When scanned or entered into the phone, the phone validates timestamp freshness (`expiresAt > now`), stores the session token in memory, and responds with authenticated confirmation.
