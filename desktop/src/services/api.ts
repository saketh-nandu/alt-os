import { 
  DeviceMetrics, 
  FastApiStatus, 
  FileItem, 
  HealthResponse, 
  HostedWebsite, 
  PairingSession, 
  VpnStatus 
} from '../types';

class ApiClient {
  private baseUrl: string = '';
  private token: string | null = null;
  private isRelayMode: boolean = false;
  private sessionId: string | null = null;

  constructor() {
    const savedUrl = localStorage.getItem('altos_phone_url');
    if (savedUrl) this.baseUrl = savedUrl;
    const savedToken = localStorage.getItem('altos_token');
    if (savedToken) this.token = savedToken;
    const savedMode = localStorage.getItem('altos_conn_mode');
    if (savedMode === 'relay') this.isRelayMode = true;
    const savedSession = localStorage.getItem('altos_session_id');
    if (savedSession) this.sessionId = savedSession;
  }

  public isConnected(): boolean {
    return !!this.baseUrl;
  }

  public setConnection(url: string, token: string | null = null, mode: 'direct' | 'relay' = 'direct', sessionId: string | null = null) {
    this.baseUrl = url.replace(/\/$/, '');
    this.token = token;
    this.isRelayMode = mode === 'relay';
    this.sessionId = sessionId;

    localStorage.setItem('altos_phone_url', this.baseUrl);
    if (token) localStorage.setItem('altos_token', token);
    localStorage.setItem('altos_conn_mode', mode);
    if (sessionId) localStorage.setItem('altos_session_id', sessionId);
  }

  public disconnect() {
    this.baseUrl = '';
    this.token = null;
    this.isRelayMode = false;
    this.sessionId = null;
    localStorage.removeItem('altos_phone_url');
    localStorage.removeItem('altos_token');
    localStorage.removeItem('altos_conn_mode');
    localStorage.removeItem('altos_session_id');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getToken(): string | null {
    return this.token;
  }

  public isRelay(): boolean {
    return this.isRelayMode;
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  private getUrl(endpoint: string): string {
    if (this.isRelayMode && this.sessionId) {
      return `${this.baseUrl}/relay/proxy/${this.sessionId}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    }
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const urlsToTry: string[] = [];

    // Primary target
    if (this.baseUrl) {
      urlsToTry.push(this.getUrl(endpoint));
    }

    // High-speed Relay Proxy fallback (always available on localhost:4000)
    const relayHost = window.location.hostname || '127.0.0.1';
    const proxyUrl = `http://${relayHost}:4000/api/proxy${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    if (!urlsToTry.includes(proxyUrl)) {
      urlsToTry.push(proxyUrl);
    }

    // Direct phone IP fallback
    const directFallback = `http://192.168.0.109:8765${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    if (!urlsToTry.includes(directFallback)) {
      urlsToTry.push(directFallback);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['X-ALTOS-Token'] = this.token;
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError: any = null;

    for (const url of urlsToTry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          return await res.json() as T;
        }
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to reach phone');
  }

  // Auto-discover live phone on LAN via relay or direct probe
  async autoDiscoverDevice(): Promise<HealthResponse | null> {
    const relayHost = window.location.hostname || '127.0.0.1';
    
    // 1. Check relay server for registered active device
    try {
      const res = await fetch(`http://${relayHost}:4000/api/device/current`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.paired && data.deviceIp) {
          const directUrl = `http://${data.deviceIp}:${data.devicePort || 8765}`;
          this.setConnection(directUrl, data.token || null, 'direct', data.sessionId || null);
          const health = await this.getHealth();
          if (health && health.status === 'online') {
            return health;
          }
        }
      }
    } catch (e) {}

    // 2. Direct probe on known Wi-Fi LAN IP
    try {
      const health = await this.testDirectConnection('192.168.0.109', '8765');
      if (health && health.status === 'online') {
        return health;
      }
    } catch (e) {}

    return null;
  }

  // 1. Real Device Health Check
  async getHealth(): Promise<HealthResponse> {
    try {
      return await this.request<HealthResponse>('/health');
    } catch (e) {
      return {
        status: 'offline',
        device: '',
        uptime: 0,
        runtime: '',
        version: '',
        port: 0
      };
    }
  }

  // 2. Real Hardware Metrics (CPU cores, RAM, Battery, Storage from Phone)
  async getMetrics(): Promise<DeviceMetrics | null> {
    try {
      const metrics = await this.request<DeviceMetrics>('/api/system/metrics');
      return metrics;
    } catch (e) {
      return null;
    }
  }

  // 3. Direct LAN Connection Test
  async testDirectConnection(ip: string, port: string, token: string | null = null): Promise<HealthResponse> {
    const cleanIp = ip.trim();
    const cleanPort = port.trim() || '8765';
    const targetUrl = `http://${cleanIp}:${cleanPort}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) {
        headers['X-ALTOS-Token'] = token;
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${targetUrl}/health`, {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Device returned HTTP ${res.status}`);
      }

      const health: HealthResponse = await res.json();
      if (!health || health.status !== 'online') {
        throw new Error('Device is reported offline');
      }

      // Save valid confirmed connection
      this.setConnection(targetUrl, token, 'direct');
      return health;
    } catch (err: any) {
      clearTimeout(timeout);
      throw new Error(`Cannot reach ${cleanIp}:${cleanPort}. Ensure phone and PC are on the same Wi-Fi.`);
    }
  }

  // 4. Create Real Pairing Session via Relay
  async createPairingSession(customHost?: string): Promise<PairingSession> {
    const relayHost = window.location.hostname || '127.0.0.1';
    
    try {
      const res = await fetch(`http://${relayHost}:4000/api/pair/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fallback
    }

    const randomHex = (len: number) => {
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    };

    const sessionId = 'altos-' + randomHex(4);
    const token = randomHex(16);
    const host = customHost || relayHost;

    return {
      version: '1.0',
      sessionId,
      token,
      expiresAt: Date.now() + 15 * 60 * 1000,
      localUrl: `http://${host}:8765`,
      relayUrl: `ws://${host}:4000/ws?role=device&sessionId=${sessionId}&token=${token}`,
      announceUrl: `http://${host}:4000/api/pair/announce`,
      desktopIp: host,
      desktopPort: 4000
    };
  }

  // 5. Poll Pairing Status
  async checkPairingStatus(sessionId: string): Promise<{ paired: boolean; deviceName?: string; deviceIp?: string; devicePort?: number }> {
    const hosts = Array.from(new Set([window.location.hostname || '127.0.0.1', '127.0.0.1']));
    for (const host of hosts) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`http://${host}:4000/api/pair/status/${encodeURIComponent(sessionId)}`, {
          signal: controller.signal
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          if (data && data.paired) return data;
        }
      } catch (e) {}

      // Also check if any phone is announced to relay
      try {
        const res = await fetch(`http://${host}:4000/api/device/current`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.paired) {
            return {
              paired: true,
              deviceName: data.deviceName,
              deviceIp: data.deviceIp,
              devicePort: data.devicePort
            };
          }
        }
      } catch (e) {}
    }

    // Direct phone health probe
    try {
      const res = await fetch('http://192.168.0.109:8765/health');
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'online') {
          return {
            paired: true,
            deviceName: data.device || 'realme RMX1925',
            deviceIp: '192.168.0.109',
            devicePort: 8765
          };
        }
      }
    } catch (e) {}

    return { paired: false };
  }

  // 6. Server Control
  async startServer(): Promise<{ status: string; message: string }> {
    return await this.request('/api/server/start', { method: 'POST' });
  }

  async stopServer(): Promise<{ status: string; message: string }> {
    return await this.request('/api/server/stop', { method: 'POST' });
  }

  async restartServer(): Promise<{ status: string; message: string }> {
    return await this.request('/api/server/restart', { method: 'POST' });
  }

  async getServerLogs(): Promise<{ logs: string }> {
    return await this.request('/api/server/logs');
  }

  // 7. Website Hosting Management
  async getWebsites(): Promise<{ websites: HostedWebsite[] }> {
    if (!this.baseUrl) return { websites: [] };
    try {
      const res = await this.request<{ websites: HostedWebsite[] }>('/api/websites');
      return { websites: res.websites || [] };
    } catch (e) {
      return { websites: [] };
    }
  }

  async deployWebsite(id: string, name: string, html: string, port: number = 8080): Promise<HostedWebsite> {
    const res = await this.request<{ website: HostedWebsite }>('/api/websites/deploy', {
      method: 'POST',
      body: JSON.stringify({ id, name, html, port })
    });
    return res.website;
  }

  async startWebsite(id: string, port?: number): Promise<{ success: boolean; website?: HostedWebsite }> {
    return await this.request('/api/websites/start', {
      method: 'POST',
      body: JSON.stringify({ id, port })
    });
  }

  async stopWebsite(id: string): Promise<{ success: boolean }> {
    return await this.request('/api/websites/stop', {
      method: 'POST',
      body: JSON.stringify({ id })
    });
  }

  async getWebsiteFile(id: string, filename: string = 'index.html'): Promise<{ html: string; content: string }> {
    const res = await this.request<{ html?: string; content?: string }>(`/api/websites/file?id=${encodeURIComponent(id)}&filename=${encodeURIComponent(filename)}`);
    const content = res.content || res.html || '';
    return { html: content, content };
  }

  async saveWebsiteFile(id: string, filename: string, html: string): Promise<{ success: boolean }> {
    return await this.request('/api/websites/file', {
      method: 'POST',
      body: JSON.stringify({ id, filename, html })
    });
  }

  async uploadWebsiteProject(params: {
    id?: string;
    name: string;
    port: number;
    start?: boolean;
    files: Array<{ name: string; content: string }>;
  }): Promise<{ success: boolean; id: string; name: string; port: number; hostUrl: string; message: string }> {
    return await this.request('/api/websites/upload', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // 8. VPN & Wireless Proxy Tunnel Management
  async getVpnStatus(): Promise<VpnStatus> {
    if (!this.baseUrl) {
      return {
        isRunning: false,
        type: 'socks5',
        proxyPort: 1080,
        hostUrl: '',
        dataSentBytes: 0,
        dataReceivedBytes: 0,
        uptimeSeconds: 0,
        publicIp: 'Disconnected'
      };
    }
    try {
      return await this.request<VpnStatus>('/api/vpn/status');
    } catch (e) {
      return {
        isRunning: false,
        type: 'socks5',
        proxyPort: 1080,
        hostUrl: '',
        dataSentBytes: 0,
        dataReceivedBytes: 0,
        uptimeSeconds: 0,
        publicIp: 'Offline'
      };
    }
  }

  async startSocksProxy(port: number = 1080): Promise<{ isRunning: boolean; proxyPort: number }> {
    return await this.request('/api/vpn/socks/start', {
      method: 'POST',
      body: JSON.stringify({ port })
    });
  }

  async stopSocksProxy(): Promise<{ isRunning: boolean }> {
    return await this.request('/api/vpn/socks/stop', {
      method: 'POST'
    });
  }

  // 9. Terminal Execution
  async executeCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number; output: string }> {
    const res = await this.request<{ stdout?: string; stderr?: string; exitCode?: number; output?: string }>('/api/terminal/exec', {
      method: 'POST',
      body: JSON.stringify({ command })
    });
    const output = res.output || res.stdout || res.stderr || '';
    return {
      stdout: res.stdout || output,
      stderr: res.stderr || '',
      exitCode: res.exitCode || 0,
      output
    };
  }

  async execCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number; output: string }> {
    return this.executeCommand(command);
  }

  // 10. File Management
  async listFiles(path: string = '/'): Promise<{ path: string; files: FileItem[] }> {
    const res = await this.request<{ path?: string; files: FileItem[] }>(`/api/files/list?path=${encodeURIComponent(path)}`);
    return { path: res.path || path, files: res.files || [] };
  }

  async readFile(path: string): Promise<{ content: string }> {
    return await this.request(`/api/files/read?path=${encodeURIComponent(path)}`);
  }

  async writeFile(path: string, content: string): Promise<{ success: boolean }> {
    return await this.request('/api/files/write', {
      method: 'POST',
      body: JSON.stringify({ path, content })
    });
  }

  async deletePath(path: string): Promise<{ success: boolean }> {
    return await this.request('/api/files/delete', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }

  async createDirectory(path: string): Promise<{ success: boolean }> {
    return await this.request('/api/files/mkdir', {
      method: 'POST',
      body: JSON.stringify({ path })
    });
  }

  // 11. FastAPI Microservice
  async getFastApiStatus(): Promise<FastApiStatus> {
    if (!this.baseUrl) {
      return { running: false, port: 8000, pid: 0, appPath: '/apps/demo-api', endpoint: 'http://localhost:8000' };
    }
    try {
      return await this.request<FastApiStatus>('/api/fastapi/status');
    } catch (e) {
      return { running: false, port: 8000, pid: 0, appPath: '/apps/demo-api', endpoint: 'http://localhost:8000' };
    }
  }

  async installFastApi(): Promise<{ success: boolean; message: string }> {
    return await this.request('/api/fastapi/install', { method: 'POST' });
  }

  async createFastApiApp(): Promise<{ success: boolean; message: string }> {
    return await this.request('/api/fastapi/create', { method: 'POST' });
  }

  async startFastApi(): Promise<FastApiStatus> {
    return await this.request<FastApiStatus>('/api/fastapi/start', { method: 'POST' });
  }

  async stopFastApi(): Promise<{ status: string; message: string }> {
    return await this.request('/api/fastapi/stop', { method: 'POST' });
  }

  async testFastApiEndpoint(): Promise<any> {
    return await this.request('/api/fastapi/test');
  }

}

export const api = new ApiClient();
