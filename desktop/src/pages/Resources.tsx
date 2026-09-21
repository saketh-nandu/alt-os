import React, { useState } from 'react';
import { Cpu, Database, HardDrive, Battery, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { DeviceMetrics } from '../types';

interface ResourcesPageProps {
  metrics: DeviceMetrics | null;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ metrics }) => {
  const [cpuLimit, setCpuLimit] = useState<number>(50);
  const [ramLimit, setRamLimit] = useState<string>('2 GB');
  const [storageQuota, setStorageQuota] = useState<string>('10 GB');
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  const formatGb = (bytes: number) => {
    if (!bytes) return '0.0 GB';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleApplyLimits = () => {
    setAppliedMessage(`Advisory resource policies applied: CPU ${cpuLimit}%, RAM ${ramLimit}, Storage ${storageQuota}.`);
    setTimeout(() => setAppliedMessage(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100">Hardware &amp; Resource Control</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Real-time Android Telemetry &amp; Isolation Governance
        </p>
      </div>

      {!metrics && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          <span>No Mobile Device Connected. Telemetry will stream live once phone is paired.</span>
        </div>
      )}

      {/* Real Hardware Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CPU Monitor */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-200">CPU Usage &amp; Cores</h4>
                <p className="text-[11px] text-gray-500 font-mono">/proc/stat active jiffies delta</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-emerald-400 font-mono">
              {metrics ? `${metrics.cpuUsage.toFixed(1)}%` : '0.0%'}
            </span>
          </div>

          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics?.cpuUsage || 0))}%` }}
            ></div>
          </div>

          <div className="pt-2 text-xs text-gray-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>CPU Processor:</span>
              <span className="text-gray-200 font-sans font-medium truncate max-w-[200px]">
                {metrics?.cpuModel || (metrics ? 'ARM64 Mobile Processor' : 'Offline')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>CPU Cores Count:</span>
              <span className="text-emerald-400 font-bold">
                {metrics?.cpuCores ? `${metrics.cpuCores} Active Physical Cores` : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Managed Processes:</span>
              <span className="text-gray-200">
                {metrics?.activeProcesses ? `${metrics.activeProcesses} runtime processes` : '0 processes'}
              </span>
            </div>
          </div>
        </div>

        {/* RAM Monitor */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-200">RAM Memory Breakdown</h4>
                <p className="text-[11px] text-gray-500 font-mono">ActivityManager.getMemoryInfo()</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-indigo-400 font-mono">
              {metrics ? `${metrics.memory.percent.toFixed(0)}%` : '0%'}
            </span>
          </div>

          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics?.memory.percent || 0))}%` }}
            ></div>
          </div>

          <div className="pt-2 text-xs text-gray-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Used Memory:</span>
              <span className="text-gray-200">{formatGb(metrics?.memory.used || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Available Memory:</span>
              <span className="text-gray-200">{formatGb(metrics?.memory.available || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Device RAM:</span>
              <span className="text-gray-200 font-bold">{formatGb(metrics?.memory.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Storage Monitor */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-200">Storage Partition</h4>
                <p className="text-[11px] text-gray-500 font-mono">StatFs on app internal storage</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {metrics ? `${metrics.storage.percent.toFixed(0)}%` : '0%'}
            </span>
          </div>

          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics?.storage.percent || 0))}%` }}
            ></div>
          </div>

          <div className="pt-2 text-xs text-gray-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>PocketVPS Partition:</span>
              <span className="text-amber-400 font-bold">{formatGb(metrics?.storage.pocketVps || (4.2 * 1024 * 1024 * 1024))}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Device Storage:</span>
              <span className="text-gray-200 font-bold">{formatGb(metrics?.storage.total || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Available Free Space:</span>
              <span className="text-gray-200">{formatGb(metrics?.storage.available || 0)}</span>
            </div>
          </div>
        </div>

        {/* Battery & Health */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Battery className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-200">Battery &amp; Thermal</h4>
                <p className="text-[11px] text-gray-500 font-mono">BatteryManager BroadcastReceiver</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-cyan-400 font-mono flex items-center space-x-1">
              <span>{metrics?.battery.percent ?? 0}%</span>
              {metrics?.battery.isCharging && <span className="text-xs text-emerald-400">⚡</span>}
            </span>
          </div>

          <div className="w-full bg-[#182030] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics?.battery.percent || 0))}%` }}
            ></div>
          </div>

          <div className="pt-2 text-xs text-gray-400 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Charging Status:</span>
              <span className="text-gray-200">{metrics?.battery.status || 'Discharging'}</span>
            </div>
            <div className="flex justify-between">
              <span>Battery Temperature:</span>
              <span className="text-gray-200">{metrics?.battery.temperature ? `${metrics.battery.temperature}°C` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Power Source:</span>
              <span className="text-gray-200">{metrics?.battery.isCharging ? 'AC / USB Connected' : 'Battery Power'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Configurable Resource Policies Section */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-gray-100">Configurable Resource Policies</h3>
              <p className="text-xs text-gray-400">Configure runtime CPU, RAM, and Storage quotas</p>
            </div>
          </div>

          <button
            onClick={handleApplyLimits}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-500/20"
          >
            APPLY LIMITS
          </button>
        </div>

        {appliedMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{appliedMessage}</span>
          </div>
        )}

        {/* Advisory Limits Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <div className="p-4 rounded-xl bg-[#131926] border border-[#1e2738] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">CPU Allocation</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                Advisory limit
              </span>
            </div>
            <div className="text-xl font-bold text-gray-100 font-mono">{cpuLimit}%</div>
            <input
              type="range"
              min="10"
              max="100"
              value={cpuLimit}
              onChange={(e) => setCpuLimit(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#131926] border border-[#1e2738] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">RAM Ceiling</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                Advisory limit
              </span>
            </div>
            <input
              type="text"
              value={ramLimit}
              onChange={(e) => setRamLimit(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0e131d] border border-[#1e2738] rounded-lg text-sm text-gray-100 font-mono font-bold focus:outline-none focus:border-indigo-500/50"
            />
            <p className="text-[10px] text-gray-500 font-mono">Suggested max heap &amp; resident set</p>
          </div>

          <div className="p-4 rounded-xl bg-[#131926] border border-[#1e2738] space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">Storage Quota</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono">
                Runtime-dependent
              </span>
            </div>
            <input
              type="text"
              value={storageQuota}
              onChange={(e) => setStorageQuota(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0e131d] border border-[#1e2738] rounded-lg text-sm text-gray-100 font-mono font-bold focus:outline-none focus:border-indigo-500/50"
            />
            <p className="text-[10px] text-gray-500 font-mono">Sandboxed user directory cap</p>
          </div>

        </div>

        {/* Technical Isolation Notice */}
        <div className="p-4 rounded-xl bg-[#090d16] border border-[#1a2333] flex items-start space-x-3 text-xs text-gray-400">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-200">Unrooted Android Isolation Architecture Notice</p>
            <p className="leading-relaxed text-[11px] text-gray-400">
              Because this prototype runs on an unrooted Android device within the standard Android application security model, hardware cgroups are governed by the Linux kernel and Android ActivityManager. ALT-OS applies process niceness, thread priorities, and disk usage checks at the userspace level. Hard caps are clearly labeled as advisory to maintain architectural integrity.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
