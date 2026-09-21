import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ConnectModal } from './components/ConnectModal';
import { Overview } from './pages/Overview';
import { WebsitesPage } from './pages/Websites';
import { VpnPage } from './pages/Vpn';
import { ServerPage } from './pages/Server';
import { TerminalPage } from './pages/Terminal';
import { AppsPage } from './pages/Apps';
import { FilesPage } from './pages/Files';
import { ResourcesPage } from './pages/Resources';
import { NetworkPage } from './pages/Network';
import { SettingsPage } from './pages/Settings';
import { ActiveTab, ConnectionMode, DeviceMetrics } from './types';
import { api } from './services/api';
import { 
  Globe, 
  Shield, 
  Cpu, 
  BatteryCharging, 
  HardDrive,
  QrCode,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('No Device Connected');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('direct');
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Check real health and real metrics from phone
  const refreshStatus = async () => {
    if (!api.getBaseUrl()) {
      setIsConnected(false);
      setServerOnline(false);
      setMetrics(null);
      setDeviceName('No Device Connected');
      return;
    }

    try {
      const health = await api.getHealth();
      if (health && health.status === 'online') {
        setIsConnected(true);
        if (health.device) setDeviceName(health.device);
        setServerOnline(true);

        const m = await api.getMetrics();
        setMetrics(m);
      } else {
        setIsConnected(false);
        setServerOnline(false);
        setMetrics(null);
        setDeviceName('No Device Connected');
      }
    } catch (e) {
      setIsConnected(false);
      setServerOnline(false);
      setMetrics(null);
      setDeviceName('No Device Connected');
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartServer = async () => {
    try {
      await api.startServer();
      setServerOnline(true);
      await refreshStatus();
    } catch (e: any) {
      alert(`Start failed: ${e.message}`);
    }
  };

  const handleStopServer = async () => {
    try {
      await api.stopServer();
      setServerOnline(false);
      await refreshStatus();
    } catch (e: any) {
      alert(`Stop failed: ${e.message}`);
    }
  };

  const handleDisconnect = () => {
    api.disconnect();
    setIsConnected(false);
    setServerOnline(false);
    setMetrics(null);
    setDeviceName('No Device Connected');
  };

  const handleCopyHostUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const currentHostUrl = metrics?.network?.ip ? `http://${metrics.network.ip}:8080` : null;

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans select-none antialiased">
      {/* Sleek Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        deviceName={deviceName}
        connectionMode={connectionMode}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main OS Workstation Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top OS System & Network Bar */}
        <header className="h-14 border-b border-white/[0.06] bg-[#090d15]/80 backdrop-blur-xl px-6 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-dot shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
              <span className="text-xs font-bold text-slate-200 tracking-wide font-mono">
                ALT-OS NODE
              </span>
            </div>

            <div className="h-3.5 w-[1px] bg-white/[0.08] hidden sm:block" />

            {/* Connection Status & Live Quick Badges */}
            {isConnected ? (
              <div className="flex items-center space-x-2.5">
                {/* Live Host URL Quick Badge */}
                {currentHostUrl && (
                  <div className="flex items-center px-2.5 py-1 rounded-xl bg-[#0e1422] border border-white/[0.08] text-xs space-x-2 shadow-sm">
                    <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">Host:</span>
                    <button 
                      onClick={() => setActiveTab('websites')}
                      className="text-emerald-400 font-mono font-bold hover:underline text-[11px] truncate max-w-[140px] sm:max-w-none"
                      title="Manage website"
                    >
                      {currentHostUrl}
                    </button>
                    <button
                      onClick={() => handleCopyHostUrl(currentHostUrl)}
                      className="p-1 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {/* SOCKS5 Proxy Quick Badge */}
                <button 
                  onClick={() => setActiveTab('vpn')}
                  className="px-2.5 py-1 rounded-xl bg-[#0e1422] hover:bg-[#131b2c] border border-white/[0.08] hidden md:flex items-center space-x-2 text-xs transition-all shadow-sm"
                  title="Configure VPN & SOCKS5 Proxy"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400 font-mono text-[11px]">Proxy:</span>
                  <span className="text-indigo-400 font-mono font-bold text-[11px]">
                    1080
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-[0.98] border border-emerald-500/30 flex items-center space-x-2 transition-all text-xs text-emerald-400 font-semibold shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>CONNECT MOBILE (SCAN QR)</span>
              </button>
            )}
          </div>

          {/* Right System Hardware Gauges - Clean Minimalist Pill Indicators */}
          {isConnected && metrics ? (
            <div className="flex items-center space-x-3 text-xs font-mono">
              {/* CPU Cores & Usage */}
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#0e1422] border border-white/[0.08]">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400 text-[11px]">CPU:</span>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.cpuUsage)}%` }}
                  />
                </div>
                <span className="text-cyan-400 font-bold text-[11px]">
                  {metrics.cpuUsage.toFixed(0)}%
                </span>
              </div>

              {/* Storage */}
              <div className="hidden xl:flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#0e1422] border border-white/[0.08]">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-[11px]">Disk:</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  {metrics.storage.percent.toFixed(0)}%
                </span>
              </div>

              {/* Battery Indicator */}
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#0e1422] border border-white/[0.08]">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-[11px]">
                  {metrics.battery.percent}%
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>OFFLINE</span>
            </div>
          )}
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto bg-[#07090e]">
          {activeTab === 'overview' && (
            <Overview
              metrics={metrics}
              serverOnline={serverOnline}
              onStartServer={handleStartServer}
              onStopServer={handleStopServer}
              onNavigate={(tab) => {
                if (tab === 'connect') {
                  setIsConnectModalOpen(true);
                } else {
                  setActiveTab(tab as ActiveTab);
                }
              }}
            />
          )}

          {activeTab === 'websites' && <WebsitesPage />}
          {activeTab === 'vpn' && <VpnPage metrics={metrics} />}
          {activeTab === 'server' && (
            <ServerPage 
              serverOnline={serverOnline}
              onRefreshMetrics={refreshStatus}
            />
          )}
          {activeTab === 'terminal' && <TerminalPage />}
          {activeTab === 'apps' && <AppsPage />}
          {activeTab === 'files' && <FilesPage />}
          {activeTab === 'resources' && <ResourcesPage metrics={metrics} />}
          {activeTab === 'network' && (
            <NetworkPage 
              metrics={metrics} 
              connectionMode={connectionMode} 
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPage 
              connectionMode={connectionMode}
              setConnectionMode={setConnectionMode}
              onDisconnect={handleDisconnect}
            />
          )}
        </main>
      </div>

      {/* Pairing & Connection Handshake Modal */}
      {isConnectModalOpen && (
        <ConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnected={() => {
            setIsConnectModalOpen(false);
            refreshStatus();
          }}
        />
      )}
    </div>
  );
};
