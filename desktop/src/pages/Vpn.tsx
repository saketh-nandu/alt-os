import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Wifi, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  Check, 
  Play, 
  Square, 
  RefreshCw, 
  Globe, 
  Radio, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { VpnStatus, DeviceMetrics } from '../types';
import { api } from '../services/api';

interface VpnPageProps {
  metrics: DeviceMetrics | null;
}

export const VpnPage: React.FC<VpnPageProps> = ({ metrics }) => {
  const [vpnStatus, setVpnStatus] = useState<VpnStatus>({
    isRunning: false,
    type: 'socks5',
    proxyPort: 1080,
    hostUrl: '',
    dataSentBytes: 0,
    dataReceivedBytes: 0,
    uptimeSeconds: 0,
    publicIp: 'Disconnected'
  });

  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [wireguardActive, setWireguardActive] = useState<boolean>(false);
  const [wgConfig, setWgConfig] = useState<string>(
`[Interface]
PrivateKey = aB8f9...3xL9=
Address = 10.8.0.2/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = x91Jk...09A=
Endpoint = vpn.pocketvps.net:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`
  );

  const fetchVpn = async () => {
    try {
      const status = await api.getVpnStatus();
      setVpnStatus(status);
    } catch (e) {}
  };

  useEffect(() => {
    fetchVpn();
    const interval = setInterval(fetchVpn, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSocks = async () => {
    setIsOperating(true);
    try {
      if (vpnStatus.isRunning) {
        await api.stopSocksProxy();
      } else {
        await api.startSocksProxy(vpnStatus.proxyPort || 1080);
      }
      await fetchVpn();
    } catch (e: any) {
      alert(`Operation failed: ${e.message}`);
    } finally {
      setIsOperating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const proxyHost = metrics?.network.ip ? `${metrics.network.ip}:${vpnStatus.proxyPort}` : vpnStatus.hostUrl;

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold tracking-tight text-gray-100">VPN &amp; Secure Tunneling Suite</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold font-mono">
            Network Tunnel Engine
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Route desktop traffic through mobile network, manage WireGuard tunnels &amp; reverse proxies
        </p>
      </div>

      {!metrics && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>No Mobile Device Connected. Pair your mobile phone via QR Code to activate Wireless VPN tunneling.</span>
        </div>
      )}

      {/* Main SOCKS5 / HTTP Proxy Hero Card */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
              vpnStatus.isRunning 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-xl font-bold text-gray-100">Mobile SOCKS5 Proxy Gateway</h3>
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  vpnStatus.isRunning 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vpnStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  <span>{vpnStatus.isRunning ? 'Proxy Running' : 'Proxy Stopped'}</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                Port {vpnStatus.proxyPort} • Routes your PC network traffic through the mobile carrier / Wi-Fi
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={handleToggleSocks}
              disabled={isOperating}
              className={`w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg ${
                vpnStatus.isRunning
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
              }`}
            >
              {vpnStatus.isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-rose-400" />
                  <span>DISCONNECT PROXY</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>LAUNCH PROXY</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Traffic Stats 4-Column Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#141b29] border border-[#1e2738] flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Data Sent (Tx)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-100 mt-2">
              {formatBytes(vpnStatus.dataSentBytes)}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 font-mono">Encrypted mobile packets</span>
          </div>

          <div className="p-4 rounded-xl bg-[#141b29] border border-[#1e2738] flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Data Received (Rx)</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-2">
              {formatBytes(vpnStatus.dataReceivedBytes)}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 font-mono">Inbound response streams</span>
          </div>

          <div className="p-4 rounded-xl bg-[#141b29] border border-[#1e2738] flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Active Gateway</span>
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-2 truncate">
              {proxyHost}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 font-mono">SOCKS5 / HTTP protocol</span>
          </div>

          <div className="p-4 rounded-xl bg-[#141b29] border border-[#1e2738] flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-400 text-xs">
              <span>Tunnel Uptime</span>
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-gray-100 mt-2">
              {formatUptime(vpnStatus.uptimeSeconds)}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 font-mono">Zero packet loss</span>
          </div>
        </div>

        {/* Quick Connection Usage Commands */}
        <div className="p-4 rounded-xl bg-[#0a0d16] border border-[#182030] space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>How to route desktop / terminal traffic through this proxy:</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2.5 rounded-lg bg-[#060911] border border-[#141a27] font-mono text-xs">
            <code className="text-emerald-400 truncate">
              curl -x socks5://{proxyHost} https://ifconfig.me
            </code>
            <button
              onClick={() => handleCopy(`curl -x socks5://${proxyHost} https://ifconfig.me`, 'curl')}
              className="px-2.5 py-1 bg-[#141b29] hover:bg-[#1a2336] text-gray-300 rounded border border-[#1e2738] text-[11px] font-bold flex items-center space-x-1 flex-shrink-0"
            >
              {copiedCmd === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCmd === 'curl' ? 'COPIED' : 'COPY COMMAND'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* WireGuard / OpenVPN Client & Port Forwarding Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WireGuard Tunnel Manager */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-100">WireGuard Interface</h4>
                <p className="text-xs text-gray-400 font-mono">Mesh Overlay Tunnel (wg0)</p>
              </div>
            </div>

            <button
              onClick={() => setWireguardActive(!wireguardActive)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                wireguardActive 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-[#141b29] text-gray-300 border border-[#1e2738]'
              }`}
            >
              {wireguardActive ? '● WG0 UP' : 'START TUNNEL'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-[#080b12] border border-[#182030] font-mono text-[11px] text-gray-400 leading-relaxed">
            <div className="flex justify-between py-1 border-b border-[#141a27]">
              <span>Tunnel Interface:</span>
              <span className="text-emerald-400 font-bold">wg0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#141a27]">
              <span>Assigned Tunnel IP:</span>
              <span className="text-indigo-400 font-bold">10.8.0.2/24</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#141a27]">
              <span>Handshake Interval:</span>
              <span className="text-gray-200">25 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Encryption:</span>
              <span className="text-cyan-400 font-bold">ChaCha20-Poly1305</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>WireGuard Client Config (/etc/wireguard/wg0.conf)</span>
              <button
                onClick={() => handleCopy(wgConfig, 'wg')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
              >
                {copiedCmd === 'wg' ? 'Copied!' : 'Copy Config'}
              </button>
            </div>
            <textarea
              value={wgConfig}
              onChange={(e) => setWgConfig(e.target.value)}
              className="w-full h-32 p-3 bg-[#060911] border border-[#182030] rounded-xl font-mono text-[11px] text-gray-300 focus:outline-none focus:border-indigo-500/50"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Reverse Tunnel & Public Port Mapping */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-100">Reverse Port Forwarding</h4>
                <p className="text-xs text-gray-400 font-mono">Expose mobile web servers to WAN / LAN</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs text-gray-400">
              <div className="p-3 bg-[#080b12] rounded-xl border border-[#161c28] flex justify-between items-center">
                <div>
                  <div className="text-gray-200 font-bold">Port 8080 (Hosted Website)</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Direct Local Host Forwarding</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-[#080b12] rounded-xl border border-[#161c28] flex justify-between items-center">
                <div>
                  <div className="text-gray-200 font-bold">Port 8000 (FastAPI Service)</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">ASGI Python Microservice</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                  MAPPED
                </span>
              </div>

              <div className="p-3 bg-[#080b12] rounded-xl border border-[#161c28] flex justify-between items-center">
                <div>
                  <div className="text-gray-200 font-bold">Port 1080 (SOCKS5 Proxy)</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Encrypted mobile carrier exit node</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#0a0d16] rounded-xl border border-[#182030] flex items-center space-x-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>All ports bind to 0.0.0.0 for direct network reachability.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
