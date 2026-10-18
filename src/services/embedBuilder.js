import { EmbedBuilder } from 'discord.js';
import {
  formatBytes,
  formatBitrate,
  formatDuration,
  generateProgressBar,
  getHealthStatus,
} from '../utils/formatters.js';

/**
 * Builds the primary live VPS monitoring embed.
 */
export function buildMonitorEmbed(stats) {
  const health = getHealthStatus(
    stats.cpu.usagePercent,
    stats.memory.percent,
    stats.disk.percent
  );

  const embed = new EmbedBuilder()
    .setTitle(`🖥️ VPS Monitor: ${stats.serverName}`)
    .setColor(health.color)
    .setDescription(
      `**OS:** \`${stats.os.distro} (${stats.os.arch})\` | **Host:** \`${stats.os.hostname}\`\n` +
      `**Uptime:** ⏳ System: \`${formatDuration(stats.os.uptimeSeconds)}\` • 🤖 Bot: \`${formatDuration(stats.os.botUptimeSeconds)}\``
    )
    .addFields(
      {
        name: '🔥 CPU Load',
        value: `${generateProgressBar(stats.cpu.usagePercent)}\n` +
          `• **Model:** ${stats.cpu.brand}\n` +
          `• **Cores:** ${stats.cpu.cores} threads\n` +
          `• **Load Avg:** \`${stats.cpu.loadAvg.map((l) => l.toFixed(2)).join(', ')}\``,
        inline: false,
      },
      {
        name: '🧠 Memory & Swap',
        value: `${generateProgressBar(stats.memory.percent)}\n` +
          `• **RAM Used:** \`${formatBytes(stats.memory.used)}\` / \`${formatBytes(stats.memory.total)}\`\n` +
          `• **RAM Available:** \`${formatBytes(stats.memory.available)}\`\n` +
          `• **Swap:** \`${formatBytes(stats.memory.swapUsed)}\` / \`${formatBytes(stats.memory.swapTotal)}\` (${stats.memory.swapPercent.toFixed(1)}%)`,
        inline: false,
      },
      {
        name: `💾 Storage (${stats.disk.mount || '/'})`,
        value: `${generateProgressBar(stats.disk.percent)}\n` +
          `• **Used:** \`${formatBytes(stats.disk.used)}\` / \`${formatBytes(stats.disk.total)}\`\n` +
          `• **Free:** \`${formatBytes(Math.max(0, stats.disk.total - stats.disk.used))}\`\n` +
          `• **Filesystem:** \`${stats.disk.fs || 'standard'}\``,
        inline: false,
      },
      {
        name: '🌐 Network Activity',
        value: `• **Speed:** ⬇️ \`${formatBitrate(stats.network.rxSec)}\` | ⬆️ \`${formatBitrate(stats.network.txSec)}\`\n` +
          `• **Total Transferred:** ⬇️ \`${formatBytes(stats.network.totalRxBytes)}\` | ⬆️ \`${formatBytes(stats.network.totalTxBytes)}\``,
        inline: false,
      },
      {
        name: '⚡ Status & Sync',
        value: `${health.emoji} **${health.label}** • Last checked <t:${Math.floor(Date.now() / 1000)}:R>`,
        inline: false,
      }
    )
    .setFooter({ text: 'VPS Monitor • Auto-updates every 30 seconds' })
    .setTimestamp();

  return embed;
}

/**
 * Builds the /status one-off command embed.
 */
export function buildStatusSnapshotEmbed(stats) {
  const health = getHealthStatus(
    stats.cpu.usagePercent,
    stats.memory.percent,
    stats.disk.percent
  );

  return new EmbedBuilder()
    .setTitle(`📊 System Snapshot: ${stats.serverName}`)
    .setColor(health.color)
    .setDescription(
      `**Platform:** \`${stats.os.distro} ${stats.os.release} (${stats.os.arch})\`\n` +
      `**Kernel:** \`${stats.os.kernel}\`\n` +
      `**System Uptime:** \`${formatDuration(stats.os.uptimeSeconds)}\`\n` +
      `**Bot Uptime:** \`${formatDuration(stats.os.botUptimeSeconds)}\``
    )
    .addFields(
      {
        name: '🔥 CPU',
        value: `${generateProgressBar(stats.cpu.usagePercent)}\nCores: **${stats.cpu.cores}** @ **${stats.cpu.speedGhz}GHz**\nLoad Avg: \`${stats.cpu.loadAvg.map((l) => l.toFixed(2)).join(', ')}\``,
        inline: true,
      },
      {
        name: '🧠 RAM',
        value: `${generateProgressBar(stats.memory.percent)}\nUsed: **${formatBytes(stats.memory.used)}**\nTotal: **${formatBytes(stats.memory.total)}**`,
        inline: true,
      },
      {
        name: '💾 Root Disk',
        value: `${generateProgressBar(stats.disk.percent)}\nUsed: **${formatBytes(stats.disk.used)}**\nTotal: **${formatBytes(stats.disk.total)}**`,
        inline: true,
      },
      {
        name: '🌐 Network Transfer',
        value: `Down: **${formatBitrate(stats.network.rxSec)}** (Total: ${formatBytes(stats.network.totalRxBytes)})\nUp: **${formatBitrate(stats.network.txSec)}** (Total: ${formatBytes(stats.network.totalTxBytes)})`,
        inline: false,
      }
    )
    .setFooter({ text: 'One-time system query' })
    .setTimestamp();
}

/**
 * Builds the /top process list embed.
 */
export function buildTopProcessesEmbed(serverName, processes, sortBy) {
  const embed = new EmbedBuilder()
    .setTitle(`⚙️ Top Processes (${sortBy.toUpperCase()}): ${serverName}`)
    .setColor(0x3498db)
    .setTimestamp();

  if (!processes || processes.length === 0) {
    embed.setDescription('No running processes reported.');
    return embed;
  }

  const tableHeader = '` PID    ` | ` CPU% ` | ` MEM% ` | ` Command            `\n';
  const rows = processes
    .map((p) => {
      const pid = String(p.pid).padEnd(6);
      const cpu = `${p.cpu.toFixed(1)}%`.padStart(5);
      const mem = `${p.mem.toFixed(1)}%`.padStart(5);
      const cmd = p.name.length > 20 ? `${p.name.slice(0, 17)}...` : p.name.padEnd(20);
      return `\`${pid}\` | \`${cpu}\` | \`${mem}\` | \`${cmd}\``;
    })
    .join('\n');

  embed.setDescription(`${tableHeader}${rows}`);
  return embed;
}

/**
 * Builds the /disk partition breakdown embed.
 */
export function buildDiskEmbed(serverName, disks) {
  const embed = new EmbedBuilder()
    .setTitle(`💾 Storage Partitions: ${serverName}`)
    .setColor(0x3498db)
    .setTimestamp();

  if (!disks || disks.length === 0) {
    embed.setDescription('No filesystem partitions detected.');
    return embed;
  }

  for (const disk of disks) {
    const free = Math.max(0, disk.size - disk.used);
    embed.addFields({
      name: `Mount: \`${disk.mount}\` (${disk.fs || disk.type || 'Storage'})`,
      value: `${generateProgressBar(disk.usePercent)}\n` +
        `• Used: **${formatBytes(disk.used)}** / **${formatBytes(disk.size)}**\n` +
        `• Available: **${formatBytes(free)}**`,
      inline: false,
    });
  }

  return embed;
}

/**
 * Builds the /network details embed.
 */
export function buildNetworkEmbed(serverName, ifaces) {
  const embed = new EmbedBuilder()
    .setTitle(`🌐 Network Interfaces: ${serverName}`)
    .setColor(0x3498db)
    .setTimestamp();

  if (!ifaces || ifaces.length === 0) {
    embed.setDescription('No network interfaces found.');
    return embed;
  }

  for (const iface of ifaces) {
    if (iface.internal) continue; // Skip loopback
    embed.addFields({
      name: `Interface: \`${iface.iface}\`${iface.speed ? ` (${iface.speed} Mbps)` : ''}`,
      value: `• **IPv4:** \`${iface.ip4 || 'N/A'}\`\n` +
        `• **MAC:** \`${iface.mac || 'N/A'}\`\n` +
        `• **Live Rates:** ⬇️ \`${formatBitrate(iface.rxSec)}\` | ⬆️ \`${formatBitrate(iface.txSec)}\`\n` +
        `• **Total Traffic:** ⬇️ \`${formatBytes(iface.rxBytes)}\` | ⬆️ \`${formatBytes(iface.txBytes)}\``,
      inline: false,
    });
  }

  return embed;
}

/**
 * Builds the /docker embed.
 */
export function buildDockerEmbed(serverName, dockerInfo) {
  const embed = new EmbedBuilder()
    .setTitle(`🐳 Docker Containers: ${serverName}`)
    .setColor(0x2496ed)
    .setTimestamp();

  if (!dockerInfo.available) {
    embed.setDescription('⚠️ Docker is not installed or the Docker daemon is not running.');
    return embed;
  }

  if (dockerInfo.containers.length === 0) {
    embed.setDescription('No Docker containers found.');
    return embed;
  }

  for (const c of dockerInfo.containers) {
    const isRunning = c.state === 'running';
    const statusEmoji = isRunning ? '🟢' : '⚪';
    embed.addFields({
      name: `${statusEmoji} ${c.name} (\`${c.id}\`)`,
      value: `• **Image:** \`${c.image}\`\n` +
        `• **State:** **${c.state}**\n` +
        `• **Status:** \`${c.status}\``,
      inline: false,
    });
  }

  return embed;
}
