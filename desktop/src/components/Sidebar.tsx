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
  Shield,
  QrCode,
  Radio
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
  const mainNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'websites', label: 'Websites', icon: <Globe className="w-4 h-4" />, badge: 'Host' },
    { id: 'vpn', label: 'VPN & Tunnels', icon: <Shield className="w-4 h-4" />, badge: '1080' },
    { id: 'terminal', label: 'Terminal', icon: <Terminal className="w-4 h-4" /> },
    { id: 'files', label: 'File Manager', icon: <Folder className="w-4 h-4" /> },
  ];

  const systemNavItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'server', label: 'Server Engine', icon: <Server className="w-4 h-4" /> },
    { id: 'apps', label: 'FastAPI Microservice', icon: <Layers className="w-4 h-4" /> },
    { id: 'resources', label: '8-Core Hardware', icon: <Cpu className="w-4 h-4" /> },
    { id: 'network', label: 'Network Interfaces', icon: <Wifi className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.06] bg-[#090d15]/95 backdrop-blur-xl flex flex-col justify-between h-screen select-none flex-shrink-0 z-20">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 p-[1px] shadow-lg shadow-emerald-500/15">
              <div className="w-full h-full bg-[#090d15] rounded-[11px] flex items-center justify-center">
                <span className="text-emerald-400 font-extrabold text-sm tracking-tight font-mono">Δ</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-bold text-sm tracking-tight text-white">ALT-OS</h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono tracking-tight">Mobile Linux Cloud</p>
            </div>
          </div>
        </div>

        {/* Device Status Card */}
        <div className="p-3.5 mx-3 my-3 rounded-2xl bg-[#0e1422] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse-dot shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`} />
              <span className="text-xs font-semibold tracking-wide text-gray-200">
                {isConnected ? 'Device Online' : 'No Phone Paired'}
              </span>
            </div>
            {isConnected && (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {connectionMode.toUpperCase()}
              </span>
            )}
          </div>

          {isConnected ? (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Smartphone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate text-xs text-gray-300 font-medium">{deviceName}</span>
              </div>
              <button
                onClick={onDisconnect}
                title="Disconnect phone"
                className="text-gray-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/[0.05] transition-all"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenConnectModal}
              className="mt-3 w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-[0.98] border border-emerald-500/25 text-emerald-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>PAIR PHONE (QR)</span>
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="px-3 pt-1 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Workspace
          </div>
          {mainNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-white font-semibold shadow-sm border border-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`${isActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    isActive 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : 'bg-white/[0.05] text-gray-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* System & Infrastructure Navigation */}
        <div className="px-3 pt-4 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            System Core
          </div>
          {systemNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-white font-semibold shadow-sm border border-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className={`${isActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-400 font-mono">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3 h-3 text-emerald-400" />
          <span>PORT 8765</span>
        </div>
        <span>v1.2.0</span>
      </div>
    </aside>
  );
};
