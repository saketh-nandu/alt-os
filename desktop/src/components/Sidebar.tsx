import React from 'react';
import { 
  Activity, 
  Server, 
  Terminal, 
  Layers, 
  Folder, 
  Cpu, 
  Wifi, 
  Settings, 
  Smartphone,
  Unlink,
  Globe,
  Shield
} from 'lucide-react';
import { ActiveTab, ConnectionMode } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isConnected: boolean;
  deviceName: string;
  connectionMode: ConnectionMode;
  onOpenConnectModal: () => void;
  onDisconnect: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  deviceName,
  connectionMode,
  onOpenConnectModal,
  onDisconnect
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'websites', label: 'Websites', icon: <Globe className="w-4 h-4 text-emerald-400" /> },
    { id: 'vpn', label: 'VPN & Tunnels', icon: <Shield className="w-4 h-4 text-indigo-400" /> },
    { id: 'server', label: 'Server', icon: <Server className="w-4 h-4" /> },
    { id: 'terminal', label: 'Terminal', icon: <Terminal className="w-4 h-4" /> },
    { id: 'apps', label: 'Apps', icon: <Layers className="w-4 h-4" /> },
    { id: 'files', label: 'Files', icon: <Folder className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <Cpu className="w-4 h-4" /> },
    { id: 'network', label: 'Network', icon: <Wifi className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-[#161c28] bg-[#090d16] flex flex-col justify-between h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-[#161c28]/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              Δ
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wider text-gray-100">ALT-OS</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Mobile Server</p>
            </div>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="px-6 py-4 border-b border-[#161c28]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 pulse-emerald' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#131926] text-gray-400 border border-[#1e2738]">
              {connectionMode === 'direct' ? 'LAN' : 'Relay'}
            </span>
          </div>

          {isConnected ? (
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-1.5 truncate">
                <Smartphone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate font-medium text-gray-200">{deviceName || 'Android Device'}</span>
              </div>
              <button
                onClick={onDisconnect}
                title="Disconnect device"
                className="text-gray-500 hover:text-rose-400 transition-colors p-1"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenConnectModal}
              className="mt-3 w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-md transition-all text-center flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <span>CONNECT DEVICE</span>
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#121724]'
                }`}
              >
                <span className={`${isActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-[#161c28]/60 text-xs text-gray-500">
        <div className="flex justify-between items-center text-[11px] font-mono">
          <span>ALT-OS Prototype</span>
          <span className="text-gray-600">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
