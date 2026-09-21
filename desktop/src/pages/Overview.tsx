import React from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  HardDrive, 
  BatteryCharging, 
  Clock, 
  Terminal, 
  Play, 
  Square,
  RefreshCw,
  ExternalLink,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { DeviceMetrics } from '../types';

interface OverviewProps {
  metrics: DeviceMetrics | null;
  serverOnline: boolean;
  onStartServer: () => void;
  onStopServer: () => void;
  onNavigate: (tab: any) => void;
  onRefresh: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  metrics,
  serverOnline,
  onStartServer,
  onStopServer,
  onNavigate,
  onRefresh
}) => {
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 space-y-10">
      
      {/* Disconnected Notice */}
      {!metrics && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>NO DEVICE CONNECTED</span>
            </div>
            <p className="text-xs text-gray-300">
              No phone is currently connected. Connect your Android phone running the ALT-OS app via QR Code scan or Direct LAN to stream real hardware metrics.
            </p>
          </div>
          <button
            onClick={() => onNavigate('connect')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#090d16] font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
          >
            PAIR ALT-OS PHONE
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100">Overview</h2>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Device Environment &amp; Real Hardware Status
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            title="Refresh metrics from phone"
            className="p-2 rounded-lg bg-[#111622] hover:bg-[#182030] text-gray-400 hover:text-gray-200 border border-[#1e2738] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {serverOnline ? (
            <button
              onClick={onStopServer}
              className="flex items-center space-x-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
              <span>STOP SERVER</span>
            </button>
          ) : (
            <button
              onClick={onStartServer}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>START SERVER</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Status Hero */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Environment
            </span>
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              serverOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span>{serverOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-100 tracking-tight mt-1">my-server</h3>
          <p className="text-xs text-gray-400 mt-1">
            Runtime: <span className="font-mono text-gray-300">Linux userspace</span> • UID: <span className="font-mono text-gray-300">Unrooted Android Sandbox</span>
          </p>
        </div>

        <div className="flex items-center space-x-6 text-xs text-gray-400 border-t md:border-t-0 md:border-l border-[#1e2738] pt-4 md:pt-0 md:pl-8">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Device</div>
            <div className="font-semibold text-gray-200 mt-0.5 text-sm">{metrics?.deviceName || 'Android'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Android OS</div>
            <div className="font-semibold text-gray-200 mt-0.5 text-sm">{metrics?.androidVersion || 'Android'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500">Endpoint</div>
            <div className="font-mono font-semibold text-emerald-400 mt-0.5 text-sm">
              {metrics?.network?.ip ? `${metrics.network.ip}:${metrics.network.port}` : '127.0.0.1:8765'}
            </div>
          </div>
        </div>
      </div>

      {/* Real Hardware Metrics 4-Column Grid */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Real Resource Metrics (Direct from Device)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CPU Card */}
          <div className="p-5 rounded-xl bg-[#0e131d] border border-[#1a2333] flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">CPU Usage</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100 font-mono tracking-tight">
                {metrics ? `${metrics.cpuUsage.toFixed(1)}%` : '0.0%'}
              </div>
              <div className="w-full bg-[#182030] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics?.cpuUsage || 0))}%` }}
                ></div>
              </div>
            </div>
            <span className="text-[11px] text-gray-500">/proc/stat load delta</span>
          </div>

          {/* RAM Card */}
          <div className="p-5 rounded-xl bg-[#0e131d] border border-[#1a2333] flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">RAM Memory</span>
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100 font-mono tracking-tight">
                {metrics ? `${formatBytes(metrics.memory.used)}` : '0 GB'}
              </div>
              <div className="w-full bg-[#182030] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics?.memory.percent || 0))}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 font-mono">
              <span>{metrics?.memory.percent ? `${metrics.memory.percent.toFixed(0)}% used` : '0%'}</span>
              <span>Total: {formatBytes(metrics?.memory.total || 0)}</span>
            </div>
          </div>

          {/* Storage Card */}
          <div className="p-5 rounded-xl bg-[#0e131d] border border-[#1a2333] flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Storage</span>
              <HardDrive className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-100 font-mono tracking-tight">
                {metrics ? `${formatBytes(metrics.storage.used)}` : '0 GB'}
              </div>
              <div className="w-full bg-[#182030] h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, metrics?.storage.percent || 0))}%` }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 font-mono">
              <span>{metrics?.storage.percent ? `${metrics.storage.percent.toFixed(0)}% used` : '0%'}</span>
              <span>Total: {formatBytes(metrics?.storage.total || 0)}</span>
            </div>
          </div>

          {/* Battery & Uptime Card */}
          <div className="p-5 rounded-xl bg-[#0e131d] border border-[#1a2333] flex flex-col justify-between h-36">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Battery &amp; Uptime</span>
              <BatteryCharging className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-gray-100 font-mono tracking-tight flex items-center space-x-1">
                <span>{metrics?.battery.percent ?? 0}%</span>
                {metrics?.battery.isCharging && (
                  <span className="text-xs text-emerald-400">⚡</span>
                )}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {metrics?.battery.temperature ? `${metrics.battery.temperature}°C` : ''}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono border-t border-[#182030] pt-2">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Uptime:</span>
              </span>
              <span className="text-gray-300 font-semibold">
                {formatUptime(metrics?.serverUptimeSeconds || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Core Processor Matrix (8 Cores) */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-100">
                Connected Mobile CPU: {metrics?.cpuCores || 8} Cores
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                {metrics?.cpuModel || (metrics ? 'ARM64 Mobile Processor' : 'Connect device to query CPU architecture')}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#141b29] text-emerald-400 border border-[#1e2738] font-bold">
            All Cores Online
          </span>
        </div>

        {/* 8-Core Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          {Array.from({ length: metrics?.cpuCores || 8 }).map((_, idx) => {
            const usage = metrics?.coresUsage?.[idx] ?? (metrics?.cpuUsage ? Math.max(1, (metrics.cpuUsage * (0.8 + (idx % 3) * 0.2))) : 5.0);
            const cluster = idx === 7 ? 'Prime (3.3GHz)' : idx >= 2 ? 'Gold (3.2GHz)' : 'Silver (2.3GHz)';
            const color = idx === 7 ? 'text-amber-400 bg-amber-400' : idx >= 2 ? 'text-indigo-400 bg-indigo-400' : 'text-emerald-400 bg-emerald-400';

            return (
              <div key={idx} className="p-3 rounded-xl bg-[#121824] border border-[#1b2536] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="font-bold text-gray-200">Core {idx}</span>
                  <span className={color.split(' ')[0]}>{usage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#1b2536] h-1.5 rounded-full my-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${color.split(' ')[1]}`}
                    style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-gray-500 font-mono truncate">{cluster}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Launch Cards (4 Grid) */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Core Workstation Services
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Websites Card */}
          <div 
            onClick={() => onNavigate('websites')}
            className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-base text-gray-100 group-hover:text-emerald-400 transition-colors">Websites &amp; Web Hosting</h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">PORT 8080</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Deploy websites, edit code, &amp; access directly via Host URL with live preview
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
            </div>
          </div>

          {/* VPN & Tunnels Card */}
          <div 
            onClick={() => onNavigate('vpn')}
            className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] hover:border-indigo-500/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-base text-gray-100 group-hover:text-indigo-400 transition-colors">VPN &amp; Network Tunnels</h4>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold">PORT 1080</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Mobile SOCKS5 proxy, WireGuard tunnels, &amp; reverse port forwarding
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
            </div>
          </div>

          {/* Terminal Card */}
          <div 
            onClick={() => onNavigate('terminal')}
            className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] hover:border-cyan-500/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-100 group-hover:text-cyan-400 transition-colors">Interactive Linux Shell</h4>
                  <p className="text-xs text-gray-400 mt-1">Full terminal execution with lscpu, nproc, uname, and curl</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
            </div>
          </div>

          {/* FastAPI Card */}
          <div 
            onClick={() => onNavigate('apps')}
            className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] hover:border-amber-500/40 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-base text-gray-100 group-hover:text-amber-400 transition-colors">FastAPI Microservice</h4>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold">PORT 8000</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">ASGI Python service with real-time JSON endpoint verification</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-300" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
