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
  ArrowUpRight,
  Globe,
  Shield,
  Zap,
  Smartphone,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DeviceMetrics } from '../types';

interface OverviewProps {
  metrics: DeviceMetrics | null;
  serverOnline: boolean;
  onStartServer: () => void;
  onStopServer: () => void;
  onNavigate: (tab: any) => void;
  onRefresh?: () => void;
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
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 space-y-8 animate-fadeIn">
      
      {/* Disconnected Notice Banner */}
      {!metrics && (
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs tracking-wide uppercase font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Mobile Phone Disconnected</span>
            </div>
            <p className="text-xs text-slate-300">
              Pair your Android phone running ALT-OS to stream real hardware telemetry, upload code, and host websites.
            </p>
          </div>
          <button
            onClick={() => onNavigate('connect')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 whitespace-nowrap"
          >
            Pair Phone via QR
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Physical Mobile Hardware &amp; Linux Cloud Environment
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh telemetry"
              className="p-2 rounded-xl bg-[#0e1422] hover:bg-[#141b2c] text-slate-400 hover:text-white border border-white/[0.08] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {serverOnline ? (
            <button
              onClick={onStopServer}
              className="flex items-center space-x-2 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs font-semibold rounded-xl transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
              <span>Stop Server</span>
            </button>
          ) : (
            <button
              onClick={onStartServer}
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Start Server</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Environment Card */}
      <div className="p-6 rounded-3xl bg-[#0c101a] border border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Userspace Container
            </span>
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
              serverOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{serverOnline ? 'Active' : 'Standby'}</span>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight mt-1.5">ALT-OS Server Node</h3>
          <p className="text-xs text-slate-400 mt-1">
            Isolated Linux sandbox in Android app userspace • <span className="text-slate-300 font-mono">/home, /apps, /server</span>
          </p>
        </div>

        <div className="flex items-center space-x-6 text-xs border-t md:border-t-0 md:border-l border-white/[0.06] pt-4 md:pt-0 md:pl-8 relative z-10">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Hardware</div>
            <div className="font-semibold text-white mt-1 text-sm flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
              <span>{metrics?.deviceName || 'Android Mobile'}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">OS Version</div>
            <div className="font-semibold text-white mt-1 text-sm">{metrics?.androidVersion || 'Android 14+'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Local Endpoint</div>
            <div className="font-mono font-semibold text-emerald-400 mt-1 text-sm">
              {metrics?.network?.ip ? `${metrics.network.ip}:8765` : '127.0.0.1:8765'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage Card */}
        <div className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Processor Load</span>
            <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {metrics ? `${metrics.cpuUsage.toFixed(1)}%` : '0.0%'}
            </div>
            <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics?.cpuUsage || 0))}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">/proc/stat load delta</span>
        </div>

        {/* RAM Card */}
        <div className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Memory (RAM)</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {metrics ? formatBytes(metrics.memory.used) : '0 GB'}
            </div>
            <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics?.memory.percent || 0))}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{metrics?.memory.percent ? `${metrics.memory.percent.toFixed(0)}% used` : '0%'}</span>
            <span>Total: {formatBytes(metrics?.memory.total || 0)}</span>
          </div>
        </div>

        {/* Storage Card */}
        <div className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Device Storage</span>
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {metrics ? formatBytes(metrics.storage.used) : '0 GB'}
            </div>
            <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics?.storage.percent || 0))}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{metrics?.storage.percent ? `${metrics.storage.percent.toFixed(0)}% used` : '0%'}</span>
            <span>Total: {formatBytes(metrics?.storage.total || 0)}</span>
          </div>
        </div>

        {/* Battery & Uptime Card */}
        <div className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] flex flex-col justify-between h-36">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Battery &amp; Uptime</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white font-mono tracking-tight flex items-center space-x-1.5">
              <span>{metrics?.battery.percent ?? 0}%</span>
              {metrics?.battery.isCharging && (
                <span className="text-xs text-emerald-400 font-sans">⚡ Charge</span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {metrics?.battery.temperature ? `${metrics.battery.temperature}°C` : ''}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-white/[0.06] pt-2">
            <span>Uptime:</span>
            <span className="text-slate-200 font-semibold">
              {formatUptime(metrics?.serverUptimeSeconds || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 8-Core CPU Processor Matrix */}
      <div className="p-6 rounded-3xl bg-[#0c101a] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Multi-Core Matrix: {metrics?.cpuCores || 8} Active Cores
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {metrics?.cpuModel || (metrics ? 'ARM64 Mobile CPU' : 'Awaiting mobile device connection')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            All Cores Active
          </span>
        </div>

        {/* 8-Core Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          {Array.from({ length: metrics?.cpuCores || 8 }).map((_, idx) => {
            const usage = metrics?.coresUsage?.[idx] ?? (metrics?.cpuUsage ? Math.max(1, (metrics.cpuUsage * (0.8 + (idx % 3) * 0.2))) : 5.0);
            const cluster = idx === 7 ? 'Prime' : idx >= 2 ? 'Gold' : 'Silver';
            const color = idx === 7 ? 'text-amber-400 bg-amber-400' : idx >= 2 ? 'text-indigo-400 bg-indigo-400' : 'text-emerald-400 bg-emerald-400';

            return (
              <div key={idx} className="p-3 rounded-2xl bg-[#0e1422] border border-white/[0.04] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-semibold text-slate-300">C{idx}</span>
                  <span className={color.split(' ')[0]}>{usage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full my-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${color.split(' ')[1]}`}
                    style={{ width: `${Math.min(100, Math.max(0, usage))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-mono">{cluster}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Service Access Hub */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Connected Mobile Services
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Websites & Web Hosting */}
          <div 
            onClick={() => onNavigate('websites')}
            className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] hover:border-emerald-500/30 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                      Website Hosting Studio
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-500/20">
                      Port 8080
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload code from PC, store on phone, and host live with accessible URL
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* VPN & Network Tunnels */}
          <div 
            onClick={() => onNavigate('vpn')}
            className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                      Wireless VPN &amp; Proxy
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-semibold border border-indigo-500/20">
                      Port 1080
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    SOCKS5 proxy, WireGuard client, and reverse network tunnels
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* Linux Terminal Shell */}
          <div 
            onClick={() => onNavigate('terminal')}
            className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                    Terminal Shell
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Interactive sh shell with standard Linux utilities and stdout streaming
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>

          {/* File Manager */}
          <div 
            onClick={() => onNavigate('files')}
            className="p-5 rounded-3xl bg-[#0c101a] border border-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                    File Explorer &amp; Code Uploader
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload code files, browse directories, and edit files on Android storage
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
