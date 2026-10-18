import os from 'node:os';
import si from 'systeminformation';
import { config } from '../config.js';

let lastNetworkSnapshot = null;
let lastNetworkTime = null;

/**
 * Gathers a full snapshot of the VPS hardware and runtime metrics.
 */
export async function getSystemStats() {
  const [currentLoad, cpu, mem, fsSize, networkStats, osInfo, time] = await Promise.all([
    si.currentLoad().catch(() => ({ currentLoad: 0, cpus: [] })),
    si.cpu().catch(() => ({ brand: 'Unknown CPU', cores: 1, physicalCores: 1, speed: 0 })),
    si.mem().catch(() => ({ total: 1, used: 0, active: 0, free: 0, swaptotal: 0, swapused: 0 })),
    si.fsSize().catch(() => []),
    si.networkStats().catch(() => []),
    si.osInfo().catch(() => ({ distro: 'Linux', release: '', arch: 'x64', hostname: os.hostname() })),
    si.time(),
  ]);

  // Load averages (Linux 1m, 5m, 15m; on Windows os.loadavg() is [0, 0, 0])
  const loadAverages = os.loadavg();

  // Primary / Root disk selection
  let primaryDisk = null;
  if (Array.isArray(fsSize) && fsSize.length > 0) {
    // Look for root '/' on Linux, or 'C:' on Windows
    primaryDisk =
      fsSize.find((f) => f.mount === '/' || f.mount === 'C:' || f.mount === 'C:\\') ||
      fsSize[0];
  }

  const diskUsed = primaryDisk?.used || 0;
  const diskTotal = primaryDisk?.size || 1;
  const diskPercent = primaryDisk?.use || (diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0);

  // Network rates calculation
  let totalRxSec = 0;
  let totalTxSec = 0;
  let totalRxBytes = 0;
  let totalTxBytes = 0;

  if (Array.isArray(networkStats) && networkStats.length > 0) {
    for (const iface of networkStats) {
      if (iface.rx_sec && iface.rx_sec > 0) totalRxSec += iface.rx_sec;
      if (iface.tx_sec && iface.tx_sec > 0) totalTxSec += iface.tx_sec;
      if (iface.rx_bytes) totalRxBytes += iface.rx_bytes;
      if (iface.tx_bytes) totalTxBytes += iface.tx_bytes;
    }
  }

  // Memory calculations
  const memUsed = mem.active || mem.used || 0;
  const memTotal = mem.total || 1;
  const memPercent = (memUsed / memTotal) * 100;
  const swapPercent = mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;

  const serverName = config.serverName || osInfo.hostname || os.hostname() || 'VPS Server';

  return {
    serverName,
    os: {
      distro: osInfo.distro || 'Unknown OS',
      release: osInfo.release || '',
      arch: osInfo.arch || os.arch(),
      hostname: osInfo.hostname || os.hostname(),
      kernel: osInfo.kernel || os.release(),
      uptimeSeconds: time.uptime || os.uptime(),
      botUptimeSeconds: Math.floor(process.uptime()),
    },
    cpu: {
      brand: cpu.brand,
      cores: cpu.cores || 1,
      physicalCores: cpu.physicalCores || 1,
      speedGhz: cpu.speed || 0,
      usagePercent: currentLoad.currentLoad || 0,
      perCore: (currentLoad.cpus || []).map((c) => c.load || 0),
      loadAvg: loadAverages,
    },
    memory: {
      total: memTotal,
      used: memUsed,
      free: mem.free,
      available: mem.available || mem.free,
      percent: memPercent,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused,
      swapPercent: swapPercent,
    },
    disk: {
      primary: primaryDisk,
      mount: primaryDisk?.mount || '/',
      fs: primaryDisk?.fs || '',
      total: diskTotal,
      used: diskUsed,
      percent: diskPercent,
      allDisks: fsSize,
    },
    network: {
      rxSec: totalRxSec,
      txSec: totalTxSec,
      totalRxBytes,
      totalTxBytes,
      interfacesCount: networkStats.length,
    },
    timestamp: Date.now(),
  };
}

/**
 * Returns detailed disk partition statistics.
 */
export async function getDetailedDisks() {
  const fsList = await si.fsSize().catch(() => []);
  return fsList.map((disk) => ({
    fs: disk.fs,
    type: disk.type,
    size: disk.size,
    used: disk.used,
    available: disk.available,
    usePercent: disk.use,
    mount: disk.mount,
  }));
}

/**
 * Returns network interfaces and IP addresses.
 */
export async function getDetailedNetwork() {
  const [interfaces, stats] = await Promise.all([
    si.networkInterfaces().catch(() => []),
    si.networkStats().catch(() => []),
  ]);

  const statsMap = new Map();
  if (Array.isArray(stats)) {
    for (const s of stats) {
      statsMap.set(s.iface, s);
    }
  }

  const list = Array.isArray(interfaces) ? interfaces : [interfaces];
  return list.map((iface) => {
    const stat = statsMap.get(iface.iface) || {};
    return {
      iface: iface.iface,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
      internal: iface.internal,
      speed: iface.speed,
      rxBytes: stat.rx_bytes || 0,
      txBytes: stat.tx_bytes || 0,
      rxSec: stat.rx_sec || 0,
      txSec: stat.tx_sec || 0,
    };
  });
}

/**
 * Returns top processes sorted by CPU or Memory usage.
 * @param {'cpu' | 'mem'} sortBy
 * @param {number} limit
 */
export async function getTopProcesses(sortBy = 'cpu', limit = 10) {
  const processData = await si.processes().catch(() => ({ list: [] }));
  const list = processData.list || [];

  const sorted = [...list].sort((a, b) => {
    if (sortBy === 'mem') {
      return (b.mem || 0) - (a.mem || 0);
    }
    return (b.cpu || 0) - (a.cpu || 0);
  });

  return sorted.slice(0, Math.min(25, Math.max(1, limit))).map((p) => ({
    pid: p.pid,
    name: p.name,
    cpu: p.cpu || 0,
    mem: p.mem || 0,
    user: p.user || '',
    command: p.command || p.name,
  }));
}

/**
 * Returns Docker container statuses if Docker is running.
 */
export async function getDockerInfo() {
  try {
    const containers = await si.dockerContainers(true);
    if (!Array.isArray(containers)) {
      return { available: false, containers: [] };
    }
    return {
      available: true,
      containers: containers.map((c) => ({
        id: c.id ? c.id.substring(0, 12) : 'unknown',
        name: c.name,
        image: c.image,
        state: c.state,
        status: c.status,
        created: c.created,
      })),
    };
  } catch {
    return { available: false, containers: [] };
  }
}
