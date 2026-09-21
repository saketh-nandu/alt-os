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
  AlertCircle
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('No Device Connected');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('direct');
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

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

  const currentHostUrl = metrics?.network?.ip ? `http://${metrics.network.ip}:8080` : null;

  return (
    <div className="flex h-screen bg-[#080b11] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
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
        <header className="h-14 border-b border-[#161c28] bg-[#0a0e17] px-6 flex items-center justify-between select-none z-10 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-bold text-gray-200 tracking-wider">
                POCKET-VPS OS
              </span>
            </div>

            <div className="h-4 w-[1px] bg-[#1e2738] hidden sm:block"></div>

            {/* Connection Status Text / Button */}
            {isConnected ? (
              <>
                {/* Live Host URL Quick Badge */}
                {currentHostUrl && (
                  <div 
                    onClick={() => setActiveTab('websites')}
                    className="px-2.5 py-1 rounded-lg bg-[#121824] hover:bg-[#182030] border border-[#1e2738] flex items-center space-x-2 cursor-pointer transition-all text-xs group"
                    title="Click to manage hosted websites"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-gray-400 font-mono text-[11px]">Host URL:</span>
                    <span className="text-emerald-400 font-mono font-bold group-hover:underline text-[11px] truncate max-w-[150px] sm:max-w-none">
                      {currentHostUrl}
                    </span>
                  </div>
                )}

                {/* SOCKS5 Proxy Quick Badge */}
                <div 
                  onClick={() => setActiveTab('vpn')}
                  className="px-2.5 py-1 rounded-lg bg-[#121824] hover:bg-[#182030] border border-[#1e2738] hidden md:flex items-center space-x-2 cursor-pointer transition-all text-xs"
                  title="Click to manage VPN & SOCKS5 Proxy"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-gray-400 font-mono text-[11px]">Proxy:</span>
                  <span className="text-indigo-400 font-mono font-bold text-[11px]">
                    Port 1080
                  </span>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsConnectModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center space-x-2 transition-all text-xs text-emerald-400 font-semibold"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>PAIR ALT-OS MOBILE (SCAN QR)</span>
              </button>
            )}
          </div>

          {/* Right System Hardware Gauges - Only shown when real phone is connected */}
          {isConnected && metrics ? (
            <div className="flex items-center space-x-4 text-xs font-mono">
              {/* Real CPU Cores Indicator */}
              <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#121824] border border-[#1e2738]">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-gray-400 text-[11px]">CPU:</span>
                <span className="text-cyan-400 font-bold text-[11px]">
                  {metrics.cpuCores || 8} Cores ({metrics.cpuUsage.toFixed(0)}%)
                </span>
              </div>

              {/* Real Storage Indicator */}
              <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#121824] border border-[#1e2738]">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-gray-400 text-[11px]">Storage:</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  {metrics.storage.percent.toFixed(0)}%
                </span>
              </div>

              {/* Real Battery Indicator */}
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#121824] border border-[#1e2738]">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-[11px]">
                  {metrics.battery.percent}%
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-mono text-gray-500">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>NO DEVICE CONNECTED</span>
            </div>
          )}
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto">
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
                  setActiveTab(tab);
                }
              }}
              onRefresh={refreshStatus}
            />
          )}

          {activeTab === 'websites' && (
            <WebsitesPage />
          )}

          {activeTab === 'vpn' && (
            <VpnPage metrics={metrics} />
          )}

          {activeTab === 'server' && (
            <ServerPage
              serverOnline={serverOnline}
              onRefreshMetrics={refreshStatus}
            />
          )}

          {activeTab === 'terminal' && (
            <TerminalPage
              serverOnline={serverOnline}
            />
          )}

          {activeTab === 'apps' && (
            <AppsPage
              serverOnline={serverOnline}
            />
          )}

          {activeTab === 'files' && (
            <FilesPage />
          )}

          {activeTab === 'resources' && (
            <ResourcesPage
              metrics={metrics}
            />
          )}

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

      {/* Connection / Pairing QR Modal */}
      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={(device) => {
          setIsConnected(true);
          setDeviceName(device);
          refreshStatus();
        }}
      />
    </div>
  );
};
