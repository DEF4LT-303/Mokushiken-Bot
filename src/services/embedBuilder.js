import { EmbedBuilder } from 'discord.js';
import {
  formatBytes,
  formatBitrate,
  formatDuration,
  generateProgressBar,
  getHealthStatus,
} from '../utils/formatters.js';

/**
 * Builds the primary live VPS monitoring embed with clean, high-signal metrics.
 */
export function buildMonitorEmbed(stats, botPing = null, botAvatarUrl = null) {
  const health = getHealthStatus(
    stats.cpu.usagePercent,
    stats.memory.percent,
    stats.disk.percent
  );

  // Format clean load bars for individual cores
  let coreBarsText = '';
  if (Array.isArray(stats.cpu.perCore) && stats.cpu.perCore.length > 0) {
    const cores = stats.cpu.perCore.slice(0, 8);
    if (cores.length <= 4) {
      coreBarsText = cores
        .map((load, idx) => `\`Core ${idx}:\` ${generateProgressBar(load, 8)}`)
        .join('\n');
    } else {
      const pairs = [];
      for (let i = 0; i < cores.length; i += 2) {
        if (i + 1 < cores.length) {
          pairs.push(
            `\`C${i}:\` ${generateProgressBar(cores[i], 6)}  \`C${i + 1}:\` ${generateProgressBar(cores[i + 1], 6)}`
          );
        } else {
          pairs.push(`\`C${i}:\` ${generateProgressBar(cores[i], 6)}`);
        }
      }
      coreBarsText = pairs.join('\n');
    }
  }

  const pingDisplay =
    botPing !== null && botPing >= 0 ? `${Math.round(botPing)}ms` : 'Healthy';

  const embed = new EmbedBuilder()
    .setTitle(`🖥️ VPS Monitor • ${stats.serverName}`)
    .setColor(health.color)
    .setDescription(
      `📍 **Host:** \`${stats.os.hostname}\` • **Hardware:** \`${stats.hardware.model}\`\n` +
      `🏷️ **OS:** \`${stats.os.distro} ${stats.os.release} (${stats.os.arch})\` • **Kernel:** \`${stats.os.kernel}\``
    );

  // Use the bot's avatar URL as the thumbnail
  if (botAvatarUrl) {
    embed.setThumbnail(botAvatarUrl);
  }

  embed.addFields(
    {
      name: '⏱️ System Uptime',
      value: `\`${formatDuration(stats.os.uptimeSeconds)}\`\nBoot: <t:${stats.os.bootTimestamp}:d>`,
      inline: true,
    },
    {
      name: '🤖 Bot Status',
      value: `Uptime: \`${formatDuration(stats.os.botUptimeSeconds)}\`\nPing: \`${pingDisplay}\``,
      inline: true,
    },
    {
      name: '⚙️ Processes',
      value: `Total: \`${stats.processes.total}\`\nActive: \`${stats.processes.running}\``,
      inline: true,
    },
    {
      name: '🔥 CPU Load',
      value:
        `**Overall:** ${generateProgressBar(stats.cpu.usagePercent)}` +
        (coreBarsText ? `\n${coreBarsText}` : ''),
      inline: false,
    },
    {
      name: '🧠 Memory Utilization (RAM & Swap)',
      value:
        `**RAM:** ${generateProgressBar(stats.memory.percent)}\n` +
        `• **Used:** \`${formatBytes(stats.memory.used)}\` / \`${formatBytes(stats.memory.total)}\` • **Free:** \`${formatBytes(stats.memory.free)}\`\n` +
        `• **Buffers/Cache:** \`${formatBytes(stats.memory.buffCache)}\` • **Available:** \`${formatBytes(stats.memory.available)}\`\n` +
        `**Swap:** ${generateProgressBar(stats.memory.swapPercent)} (\`${formatBytes(stats.memory.swapUsed)}\` / \`${formatBytes(stats.memory.swapTotal)}\`)`,
      inline: false,
    },
    {
      name: '💾 Storage Distribution',
      value:
        `${generateProgressBar(stats.disk.percent)}\n` +
        `• **Used:** \`${formatBytes(stats.disk.used)}\` / \`${formatBytes(stats.disk.total)}\` • **Free:** \`${formatBytes(stats.disk.free)}\``,
      inline: false,
    },
    {
      name: `🌐 Network Bandwidth (${stats.network.primaryIface})`,
      value:
        `• **Transfer Rates:** ⬇️ \`${formatBitrate(stats.network.rxSec)}\` | ⬆️ \`${formatBitrate(stats.network.txSec)}\`\n` +
        `• **Total Transferred:** ⬇️ \`${formatBytes(stats.network.totalRxBytes)}\` | ⬆️ \`${formatBytes(stats.network.totalTxBytes)}\``,
      inline: false,
    },
    {
      name: '⚡ System Diagnostics',
      value:
        `${health.emoji} **${health.label}** • Refreshed: <t:${Math.floor(Date.now() / 1000)}:R> (<t:${Math.floor(Date.now() / 1000)}:T>)`,
      inline: false,
    }
  );

  embed.setFooter({ text: 'VPS Monitor • Auto-updates every 30s • Real-time metrics' })
    .setTimestamp();

  return embed;
}

/**
 * Builds the /status one-off command embed.
 */
export function buildStatusSnapshotEmbed(stats, botPing = null, botAvatarUrl = null) {
  const health = getHealthStatus(
    stats.cpu.usagePercent,
    stats.memory.percent,
    stats.disk.percent
  );

  const pingDisplay =
    botPing !== null && botPing >= 0 ? `${Math.round(botPing)}ms` : 'Healthy';

  const embed = new EmbedBuilder()
    .setTitle(`📊 System Snapshot • ${stats.serverName}`)
    .setColor(health.color)
    .setDescription(
      `📍 **Platform:** \`${stats.os.distro} ${stats.os.release} (${stats.os.arch})\`\n` +
      `⚙️ **Kernel:** \`${stats.os.kernel}\` • **Hardware:** \`${stats.hardware.model}\`\n` +
      `⏳ **System Uptime:** \`${formatDuration(stats.os.uptimeSeconds)}\` • 🤖 **Bot Uptime:** \`${formatDuration(stats.os.botUptimeSeconds)}\``
    );

  if (botAvatarUrl) {
    embed.setThumbnail(botAvatarUrl);
  }

  let coreBarsText = '';
  if (Array.isArray(stats.cpu.perCore) && stats.cpu.perCore.length > 0) {
    const cores = stats.cpu.perCore.slice(0, 8);
    coreBarsText = cores
      .map((load, idx) => `\`Core ${idx}:\` ${generateProgressBar(load, 8)}`)
      .join('\n');
  }

  embed.addFields(
    {
      name: '🔥 CPU Load',
      value:
        `**Overall:** ${generateProgressBar(stats.cpu.usagePercent)}` +
        (coreBarsText ? `\n${coreBarsText}` : ''),
      inline: false,
    },
    {
      name: '🧠 Memory (RAM)',
      value:
        `${generateProgressBar(stats.memory.percent)}\n` +
        `Used: **${formatBytes(stats.memory.used)}** / **${formatBytes(stats.memory.total)}**\n` +
        `Free: **${formatBytes(stats.memory.free)}**`,
      inline: true,
    },
    {
      name: '💾 Storage',
      value:
        `${generateProgressBar(stats.disk.percent)}\n` +
        `Used: **${formatBytes(stats.disk.used)}** / **${formatBytes(stats.disk.total)}**\n` +
        `Free: **${formatBytes(stats.disk.free)}**`,
      inline: true,
    },
    {
      name: '🌐 Network Transfer',
      value:
        `Live: ⬇️ **${formatBitrate(stats.network.rxSec)}** | ⬆️ **${formatBitrate(stats.network.txSec)}**\n` +
        `Total: ⬇️ **${formatBytes(stats.network.totalRxBytes)}** | ⬆️ **${formatBytes(stats.network.totalTxBytes)}**`,
      inline: false,
    },
    {
      name: '⚡ Status',
      value: `${health.emoji} **${health.label}** • Ping: \`${pingDisplay}\``,
      inline: false,
    }
  );

  embed.setFooter({ text: 'One-time system query' })
    .setTimestamp();

  return embed;
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
