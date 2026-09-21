import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Globe, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Smartphone, ArrowRight } from 'lucide-react';
import { PairingSession } from '../types';
import { api } from '../services/api';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (deviceName: string) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected
}) => {
  const [activeMode, setActiveMode] = useState<'qr' | 'manual'>('qr');
  const [session, setSession] = useState<PairingSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [manualIp, setManualIp] = useState<string>('192.168.0.109');
  const [manualPort, setManualPort] = useState<string>('8765');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detectedPhone, setDetectedPhone] = useState<{ deviceName: string; deviceIp: string; devicePort: number } | null>(null);
  const isPairedHandled = useRef<boolean>(false);

  // Generate new pairing session
  const generateNewSession = async () => {
    isPairedHandled.current = false;
    try {
      const newSession = await api.createPairingSession();
      setSession(newSession);
      setTimeLeft(900);
      setErrorMessage(null);
      setSuccessMessage(null);
    } catch (e: any) {
      setErrorMessage('Failed to generate session: ' + e.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateNewSession();

      // Quick probe if phone is already paired or live on LAN
      const probeActivePhone = async () => {
        try {
          const res = await api.checkPairingStatus('current');
          if (res && res.paired && res.deviceIp) {
            setDetectedPhone({
              deviceName: res.deviceName || 'realme RMX1925',
              deviceIp: res.deviceIp,
              devicePort: res.devicePort || 8765
            });
          }
        } catch (e) {}
      };
      probeActivePhone();
    }
  }, [isOpen]);

  // Handle successful pairing completion
  const handleDevicePaired = (deviceName?: string, deviceIp?: string, devicePort?: number) => {
    if (isPairedHandled.current) return;
    isPairedHandled.current = true;

    const devName = deviceName || 'realme RMX1925';
    const port = devicePort || 8765;
    const ip = (deviceIp && deviceIp !== '127.0.0.1') ? deviceIp : '192.168.0.109';

    // Store verified connection with fallback support
    api.setConnection(`http://${ip}:${port}`, session?.token || null, 'direct', session?.sessionId);

    setSuccessMessage(`✓ Connected to ${devName}!`);
    setTimeout(() => {
      onConnected(devName);
      onClose();
    }, 500);
  };

  // Countdown timer only (runs independently)
  useEffect(() => {
    if (!isOpen || !session) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setErrorMessage('Pairing token expired. Please click Refresh Key.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session]);

  // Dual Connection Listener: WebSocket Push + High-frequency Polling
  useEffect(() => {
    if (!isOpen || !session) return;
    const sId = session.sessionId;
    const token = session.token;
    const relayHost = window.location.hostname || '127.0.0.1';

    // 1. WebSocket Real-time Listener (0ms latency handshake)
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`ws://${relayHost}:4000/ws?role=desktop&sessionId=${encodeURIComponent(sId)}&token=${encodeURIComponent(token)}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'device_connected' || msg.deviceConnected) {
            handleDevicePaired(msg.deviceName, msg.deviceIp, msg.devicePort);
          }
        } catch (e) {}
      };
    } catch (e) {}

    // 2. Continuous Polling Fallback (every 800ms, does NOT reset on timer ticks)
    const pollInterval = setInterval(async () => {
      if (isPairedHandled.current) return;
      try {
        const status = await api.checkPairingStatus(sId);
        if (status && status.paired) {
          handleDevicePaired(status.deviceName, status.deviceIp, status.devicePort);
        }
      } catch (e) {}
    }, 800);

    return () => {
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
      clearInterval(pollInterval);
    };
  }, [isOpen, session?.sessionId]);

  // Manual Direct LAN Connection
  const handleManualConnect = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const health = await api.testDirectConnection(manualIp, manualPort, session?.token || null);
      setSuccessMessage(`✓ Connected to ${health.device}!`);
      setTimeout(() => {
        onConnected(health.device);
        onClose();
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to connect to ${manualIp}:${manualPort}`);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const qrPayloadString = session ? JSON.stringify(session) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#0b101a] border border-white/[0.08] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Subtle Ambient Top Highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between relative z-10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Pair Mobile Device</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Secure peer-to-peer mobile connection</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.06] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-white/[0.06] relative z-10">
          <button
            onClick={() => setActiveMode('qr')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeMode === 'qr'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Camera QR Scan</span>
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeMode === 'manual'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Direct LAN IP</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 relative z-10">
          {/* Quick-Connect Banner for Auto-detected Phone */}
          {detectedPhone && !successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{detectedPhone.deviceName}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">ONLINE</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{detectedPhone.deviceIp}:{detectedPhone.devicePort}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDevicePaired(detectedPhone.deviceName, detectedPhone.deviceIp, detectedPhone.devicePort)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1"
              >
                <span>Connect</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeMode === 'qr' ? (
            <div className="flex flex-col items-center">
              {/* QR Code Container with Ambient Glow */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-indigo-500/30 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-500" />
                <div className="relative p-4 bg-white rounded-2xl shadow-xl">
                  {qrPayloadString ? (
                    <QRCodeSVG
                      value={qrPayloadString}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                      Generating key...
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown & Refresh */}
              <div className="mt-4 flex items-center justify-between w-full text-xs font-mono">
                <span className="text-slate-400">
                  Token TTL: <span className="font-bold text-emerald-400">{formatTime(timeLeft)}</span>
                </span>
                <button
                  onClick={generateNewSession}
                  className="flex items-center space-x-1.5 text-slate-400 hover:text-emerald-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/[0.04]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh Key</span>
                </button>
              </div>

              {/* Minimalist 3-Step Guide */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#0e1422] border border-white/[0.06] text-xs text-slate-400 w-full space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Pairing Instructions</span>
                  <span className="font-mono text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Desktop IP: {session?.desktopIp || '192.168.0.108'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-emerald-400 font-mono block">01</span>
                    <span className="text-[11px] text-slate-300">Open App</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-emerald-400 font-mono block">02</span>
                    <span className="text-[11px] text-slate-300">Connect Tab</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-emerald-400 font-mono block">03</span>
                    <span className="text-[11px] text-slate-300">Scan QR</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-400 font-mono">
                    Phone Wi-Fi IP
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualIp('192.168.0.109')}
                    className="text-[10px] text-emerald-400 font-mono hover:underline"
                  >
                    Auto-fill (192.168.0.109)
                  </button>
                </div>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="192.168.0.109"
                  className="w-full px-3.5 py-2.5 bg-[#0e1422] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown under "DIRECT LAN REST API" on your mobile screen.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 font-mono">
                  Port
                </label>
                <input
                  type="text"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="8765"
                  className="w-full px-3.5 py-2.5 bg-[#0e1422] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <button
                onClick={handleManualConnect}
                disabled={isConnecting}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                {isConnecting ? 'Verifying Phone...' : 'Connect to Mobile'}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-start space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
