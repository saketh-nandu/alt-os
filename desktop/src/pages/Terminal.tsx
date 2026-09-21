import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Ban, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface TerminalPageProps {
  serverOnline?: boolean;
}

export const TerminalPage: React.FC<TerminalPageProps> = () => {
  const [inputCommand, setInputCommand] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [terminalOutput, setTerminalOutput] = useState<string>(
    'Connected to ALT-OS Terminal (Android Userspace Session)\r\nType commands or use quick actions below.\r\n$ '
  );
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalOutput]);

  // Connect to WebSocket terminal
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const baseUrl = api.getBaseUrl();
      const u = new URL(baseUrl);
      const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${u.host}/ws/terminal`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'output') {
            setTerminalOutput((prev) => prev + msg.data);
          } else if (msg.type === 'exit') {
            setTerminalOutput((prev) => prev + `\r\n[Process exited with code ${msg.exitCode}]\r\n$ `);
          }
        } catch (err) {
          setTerminalOutput((prev) => prev + e.data);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      wsRef.current = ws;
    } catch (e) {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleSendCommand = async (cmdToSend?: string) => {
    const cmd = cmdToSend !== undefined ? cmdToSend : inputCommand;
    if (!cmd.trim() && cmdToSend === undefined) return;

    // Update history
    if (cmd.trim()) {
      setHistory((prev) => [...prev, cmd.trim()]);
      setHistoryIndex(-1);
    }

    setInputCommand('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\n' }));
    } else {
      // Fallback via HTTP REST execution
      setIsExecuting(true);
      setTerminalOutput((prev) => prev + cmd + '\r\n');
      try {
        const res = await api.execCommand(cmd);
        setTerminalOutput((prev) => prev + res.output + (res.output.endsWith('\n') ? '$ ' : '\r\n$ '));
      } catch (err: any) {
        setTerminalOutput((prev) => prev + `Error: ${err.message}\r\n$ `);
      } finally {
        setIsExecuting(false);
      }
    }
    inputRef.current?.focus();
  };

  const handleInterrupt = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setTerminalOutput((prev) => prev + '^C\r\n$ ');
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setTerminalOutput('$ ');
    inputRef.current?.focus();
  };

  // Keyboard navigation for history (Up/Down)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputCommand(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInputCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setInputCommand(history[nextIndex]);
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      handleInterrupt();
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-8 space-y-6 flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-100 flex items-center space-x-2.5">
            <TerminalIcon className="w-6 h-6 text-emerald-400" />
            <span>Interactive Terminal</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">
            Direct Process Execution in Unrooted Android Shell
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
            wsConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 pulse-emerald' : 'bg-amber-400'}`}></span>
            <span>{wsConnected ? 'WebSocket Stream' : 'HTTP Shell Fallback'}</span>
          </span>

          <button
            onClick={handleInterrupt}
            className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg transition-all"
            title="Send Ctrl+C"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Ctrl+C</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#141b29] hover:bg-[#1a2336] border border-[#1e2738] text-gray-300 text-xs font-semibold rounded-lg transition-all"
            title="Clear Screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 bg-[#050811] border border-[#161c28] rounded-2xl p-5 overflow-hidden flex flex-col shadow-2xl">
        <div className="flex-1 overflow-y-auto font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap terminal-scroll">
          {terminalOutput}
          <div ref={terminalEndRef} />
        </div>

        {/* Quick Commands Chips */}
        <div className="pt-3 pb-2 border-t border-[#131926] flex items-center space-x-2 overflow-x-auto text-[11px] font-mono">
          <span className="text-gray-500 text-[10px] uppercase font-sans tracking-wider">Quick:</span>
          {[
            'uname -a',
            'ls -la',
            'pwd',
            'python3 -V',
            'cat /proc/cpuinfo | grep "Hardware\\|model name" | head -n 2',
            'df -h .'
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleSendCommand(cmd)}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#161e33] border border-[#1c263d] rounded text-gray-300 hover:text-emerald-400 transition-colors whitespace-nowrap"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Terminal Input Bar */}
        <div className="pt-2 flex items-center space-x-3">
          <span className="font-mono text-emerald-400 font-bold text-sm">$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command here and press Enter..."
            autoFocus
            className="flex-1 bg-transparent font-mono text-xs text-gray-100 placeholder-gray-600 focus:outline-none"
          />
          <button
            onClick={() => handleSendCommand()}
            disabled={isExecuting}
            className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-all flex items-center space-x-1"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>RUN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
