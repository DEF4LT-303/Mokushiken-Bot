/**
 * Utility functions for formatting hardware metrics and time values.
 */

export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatBitrate(bytesPerSec, decimals = 1) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytesPerSec / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export function generateProgressBar(percentage, length = 10) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` **${clamped.toFixed(1)}%**`;
}

export function getHealthStatus(cpuPercent = 0, memPercent = 0, diskPercent = 0) {
  const maxUsage = Math.max(cpuPercent, memPercent, diskPercent);
  if (maxUsage >= 90) {
    return {
      label: 'Critical Load',
      emoji: '🔴',
      color: 0xe74c3c, // Red
    };
  }
  if (maxUsage >= 75) {
    return {
      label: 'Elevated Load',
      emoji: '🟡',
      color: 0xf1c40f, // Yellow
    };
  }
  return {
    label: 'Healthy',
    emoji: '🟢',
    color: 0x2ecc71, // Green
  };
}
