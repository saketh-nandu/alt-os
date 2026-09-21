import React, { useState } from 'react';
import { Wifi, Shield, Activity, RefreshCw } from 'lucide-react';
import { ConnectionMode, DeviceMetrics } from '../types';
import { api } from '../services/api';

interface NetworkPageProps {
  metrics: DeviceMetrics | null;
  connectionMode: ConnectionMode;
}

export const NetworkPage: React.FC<NetworkPageProps> = ({
  metrics,
  connectionMode
}) => {
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);

  const testPing = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await api.getHealth();
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
    } catch (e) {
      setPingLatency(-1);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-100">Network &amp; Connectivity</h2>
        <p className="text-xs text-gray-400 mt-1 font-mono">
          Network Interfaces, Authentication &amp; Channels
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Network Details Card */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-100">Network Interface</h3>
              <p className="text-xs text-gray-400 font-mono">Android active interface details</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs font-mono">
            <div className="flex justify-between py-2 border-b border-[#182030]">
              <span className="text-gray-400">Interface Type:</span>
              <span className="text-gray-100 font-bold">{metrics?.network.type || 'Wi-Fi'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#182030]">
              <span className="text-gray-400">Local IP Address:</span>
              <span className="text-emerald-400 font-bold">{metrics?.network.ip || '127.0.0.1'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#182030]">
              <span className="text-gray-400">Control Server Port:</span>
              <span className="text-gray-100 font-bold">{metrics?.network.port || 8765}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#182030]">
              <span className="text-gray-400">FastAPI Port:</span>
              <span className="text-indigo-400 font-bold">8000</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Connection Mode:</span>
              <span className="text-gray-100 uppercase font-bold">
                {connectionMode === 'direct' ? 'Mode 1 (Direct LAN)' : 'Mode 2 (Relay)'}
              </span>
            </div>
          </div>
        </div>

        {/* Latency & Ping Card */}
        <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-100">Live Health Ping</h3>
                <p className="text-xs text-gray-400 font-mono">End-to-End roundtrip time to Android</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="text-4xl font-bold font-mono text-gray-100">
                {pingLatency === null ? '—' : pingLatency === -1 ? 'Timeout' : `${pingLatency} ms`}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">
                {pingLatency !== null && pingLatency >= 0 ? 'Direct HTTP roundtrip latency' : 'No test conducted yet'}
              </p>
            </div>
          </div>

          <button
            onClick={testPing}
            disabled={isPinging}
            className="w-full py-2.5 bg-[#141b29] hover:bg-[#1a2336] border border-[#1e2738] rounded-xl text-xs font-bold text-gray-200 transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'TESTING LATENCY...' : 'TEST CONNECTION PING'}</span>
          </button>
        </div>

      </div>

      {/* Security Architecture */}
      <div className="p-6 rounded-2xl bg-[#0e131d] border border-[#1a2333] space-y-4">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
            Security &amp; Network Policies
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-400">
          <div className="p-3 bg-[#0a0d16] rounded-xl border border-[#161c28]">
            <p className="font-bold text-gray-200">Zero Public Exposure</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              No public ports are automatically mapped or exposed. Inbound communication is restricted to LAN or authenticated outbound relay.
            </p>
          </div>
          <div className="p-3 bg-[#0a0d16] rounded-xl border border-[#161c28]">
            <p className="font-bold text-gray-200">Ephemeral Pairing Tokens</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              QR pairing payloads expire in 5 minutes. No permanent static secrets are embedded in the QR code.
            </p>
          </div>
          <div className="p-3 bg-[#0a0d16] rounded-xl border border-[#161c28]">
            <p className="font-bold text-gray-200">Sandboxed File Isolation</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Path canonicalization prevents directory traversal beyond the app-specific ALT-OS storage root.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
