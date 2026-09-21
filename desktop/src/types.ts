export interface MemoryMetrics {
  total: number;
  available: number;
  used: number;
  percent: number;
}

export interface StorageMetrics {
  total: number;
  available: number;
  used: number;
  percent: number;
  pocketVps?: number;
}

export interface BatteryMetrics {
  percent: number;
  isCharging: boolean;
  status: string;
  temperature: number;
}

export interface NetworkMetrics {
  type: string;
  ip: string;
  port: number;
}

export interface DeviceMetrics {
  cpuUsage: number;
  cpuCores?: number;
  cpuModel?: string;
  coresUsage?: number[];
  memory: MemoryMetrics;
  storage: StorageMetrics;
  battery: BatteryMetrics;
  network: NetworkMetrics;
  serverStatus: 'online' | 'offline';
  serverUptimeSeconds: number;
  deviceName: string;
  androidVersion: string;
  activeProcesses: number;
  hostedWebsitesCount?: number;
  vpnActive?: boolean;
  timestamp: number;
}

export interface HealthResponse {
  status: string;
  device: string;
  uptime: number;
  runtime: string;
  version: string;
  port: number;
}

export interface FastApiStatus {
  running: boolean;
  port: number;
  pid: number;
  appPath: string;
  endpoint: string;
}

export interface HostedWebsite {
  id: string;
  name: string;
  port: number;
  isRunning: boolean;
  hostUrl: string;
  requestsCount: number;
  created: number;
  template?: string;
}

export interface VpnStatus {
  isRunning: boolean;
  type: 'socks5' | 'wireguard' | 'openvpn';
  proxyPort: number;
  hostUrl: string;
  dataSentBytes: number;
  dataReceivedBytes: number;
  uptimeSeconds: number;
  publicIp: string;
  assignedIp?: string;
  country?: string;
  isp?: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: number;
  canWrite: boolean;
}

export interface PairingSession {
  version: string;
  sessionId: string;
  token: string;
  expiresAt: number;
  localUrl: string;
  relayUrl: string;
  announceUrl?: string;
  desktopIp?: string;
  desktopPort?: number;
}

export type ConnectionMode = 'direct' | 'relay';
export type ActiveTab = 'overview' | 'websites' | 'vpn' | 'server' | 'terminal' | 'apps' | 'files' | 'resources' | 'network' | 'settings';
