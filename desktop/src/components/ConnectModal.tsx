import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Globe, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [manualIp, setManualIp] = useState<string>('192.168.0.');
  const [manualPort, setManualPort] = useState<string>('8765');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generate new pairing session
  const generateNewSession = async () => {
    try {
      const newSession = await api.createPairingSession();
      setSession(newSession);
      setTimeLeft(300);
      setErrorMessage(null);
      setSuccessMessage(null);
    } catch (e: any) {
      setErrorMessage('Failed to generate session: ' + e.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateNewSession();
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !session) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setErrorMessage('Pairing token expired. Please click Regenerate.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session]);

  // Poll for pairing status (Waits for REAL phone to scan and pair!)
  useEffect(() => {
    if (!isOpen || !session || timeLeft <= 0) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await api.checkPairingStatus(session.sessionId);
        if (status.paired) {
          const devName = status.deviceName || 'Android Mobile Device';
          if (status.deviceIp) {
            api.setConnection(`http://${status.deviceIp}:${status.devicePort || 8765}`, session.token, 'direct', session.sessionId);
          } else {
            api.setConnection(`http://${window.location.hostname || '127.0.0.1'}:4000`, session.token, 'relay', session.sessionId);
          }
          setSuccessMessage(`✓ Phone Paired: ${devName}`);
          setTimeout(() => {
            onConnected(devName);
            onClose();
          }, 1200);
        }
      } catch (e) {
        // Keep waiting for phone
      }
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [isOpen, session, timeLeft]);

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
      }, 1000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f141f] border border-[#1e2738] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1e2738] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-100 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>PAIR ALT-OS MOBILE</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Real-time mobile connection</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1.5 rounded-lg hover:bg-[#1a2233] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-[#1e2738]/60">
          <button
            onClick={() => setActiveMode('qr')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeMode === 'qr'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>CAMERA QR SCAN</span>
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeMode === 'manual'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DIRECT LAN IP</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {activeMode === 'qr' ? (
            <div className="flex flex-col items-center">
              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
                {qrPayloadString ? (
                  <QRCodeSVG
                    value={qrPayloadString}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                    Generating...
                  </div>
                )}
              </div>

              {/* Countdown & Expiry */}
              <div className="mt-4 flex items-center justify-between w-full text-xs">
                <span className="text-gray-400">
                  Token expires in: <span className="font-mono font-bold text-emerald-400">{formatTime(timeLeft)}</span>
                </span>
                <button
                  onClick={generateNewSession}
                  className="flex items-center space-x-1 text-gray-400 hover:text-emerald-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              </div>

              <div className="mt-3 p-3 rounded-lg bg-[#141b29] border border-[#1e2738] text-[11px] text-gray-400 w-full space-y-1.5">
                <div className="flex justify-between items-center text-gray-300 font-medium">
                  <span>Instructions:</span>
                  <span className="font-mono text-emerald-400 text-[10px]">
                    Desktop IP: {session?.desktopIp || '192.168.0.108'}
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                  <li>Open <strong>ALT-OS</strong> on your phone.</li>
                  <li>Tap <strong>Connect</strong> tab.</li>
                  <li>Tap <strong>📷 SCAN DESKTOP QR CODE</strong>.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Android Phone IP (from phone screen)
                </label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="e.g. 192.168.0.150"
                  className="w-full px-3.5 py-2.5 bg-[#141b29] border border-[#1e2738] rounded-lg text-sm text-gray-100 placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Look under "DIRECT LAN REST API" on your phone's Connect tab.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Port
                </label>
                <input
                  type="text"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="8765"
                  className="w-full px-3.5 py-2.5 bg-[#141b29] border border-[#1e2738] rounded-lg text-sm text-gray-100 placeholder-gray-500 font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                onClick={handleManualConnect}
                disabled={isConnecting}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
              >
                {isConnecting ? 'TESTING REAL CONNECTION...' : 'CONNECT TO PHONE'}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
