import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting test suite...\n');

  // 1. Test Formatters
  console.log('Testing src/utils/formatters.js...');
  const {
    formatBytes,
    formatDuration,
    formatBitrate,
    generateProgressBar,
    getHealthStatus,
  } = await import('../src/utils/formatters.js');

  assert.strictEqual(formatBytes(0), '0 B');
  assert.strictEqual(formatBytes(1024), '1 KB');
  assert.strictEqual(formatBytes(1024 * 1024 * 5), '5 MB');
  assert.strictEqual(formatDuration(65), '1m 5s');
  assert.strictEqual(formatDuration(86400 + 3600), '1d 1h');
  assert.strictEqual(formatDuration(0), '0s');
  assert.strictEqual(formatBitrate(1024 * 50), '50 KB/s');

  const bar = generateProgressBar(50, 10);
  assert.ok(bar.includes('50.0%'), 'Progress bar should show 50.0%');

  const healthGreen = getHealthStatus(20, 30, 40);
  assert.strictEqual(healthGreen.emoji, '🟢');
  const healthYellow = getHealthStatus(80, 50, 40);
  assert.strictEqual(healthYellow.emoji, '🟡');
  const healthRed = getHealthStatus(95, 50, 40);
  assert.strictEqual(healthRed.emoji, '🔴');
  console.log('  ✅ Formatters passed.');

  // 1b. Test Logger
  console.log('\nTesting src/utils/logger.js...');
  const { logger } = await import('../src/utils/logger.js');
  assert.ok(typeof logger.info === 'function');
  assert.ok(typeof logger.warn === 'function');
  assert.ok(typeof logger.error === 'function');
  assert.ok(typeof logger.monitor === 'function');
  assert.ok(typeof logger.cmd === 'function');
  logger.info('Test info log message');
  logger.cmd('TestUser#1234', '123456789', 'TestServer', 'ping', 15, true);
  console.log('  ✅ Logger passed.');

  // 2. Test Storage Operations
  console.log('\nTesting src/utils/storage.js...');
  const {
    loadState,
    saveState,
    setMonitorConfig,
    getMonitorConfig,
    updateMessageId,
    removeMonitorConfig,
    getAllMonitorConfigs,
  } = await import('../src/utils/storage.js');

  // Test set
  setMonitorConfig('test-guild-1', { channelId: 'chan-123', messageId: 'msg-456' });
  const cfg = getMonitorConfig('test-guild-1');
  assert.ok(cfg, 'Config should exist');
  assert.strictEqual(cfg.channelId, 'chan-123');
  assert.strictEqual(cfg.messageId, 'msg-456');

  // Test update
  updateMessageId('test-guild-1', 'msg-789');
  const updatedCfg = getMonitorConfig('test-guild-1');
  assert.strictEqual(updatedCfg.messageId, 'msg-789');

  // Test getAll
  const all = getAllMonitorConfigs();
  assert.ok(all.some((c) => c.guildId === 'test-guild-1'));

  // Test remove
  removeMonitorConfig('test-guild-1');
  assert.strictEqual(getMonitorConfig('test-guild-1'), null);
  console.log('  ✅ Storage passed.');

  // 3. Test SystemService
  console.log('\nTesting src/services/systemService.js...');
  const {
    getSystemStats,
    getDetailedDisks,
    getDetailedNetwork,
    getTopProcesses,
    getDockerInfo,
  } = await import('../src/services/systemService.js');

  const stats = await getSystemStats();
  assert.ok(stats.serverName, 'Stats should have serverName');
  assert.ok(typeof stats.cpu.usagePercent === 'number', 'CPU percent should be number');
  assert.ok(typeof stats.memory.percent === 'number', 'Memory percent should be number');
  assert.ok(typeof stats.disk.percent === 'number', 'Disk percent should be number');
  assert.ok(typeof stats.network.rxSec === 'number', 'Network rxSec should be number');
  console.log('  ✅ getSystemStats passed.');

  const disks = await getDetailedDisks();
  assert.ok(Array.isArray(disks), 'Disks should be array');
  console.log(`  ✅ getDetailedDisks passed (${disks.length} disks detected).`);

  const networks = await getDetailedNetwork();
  assert.ok(Array.isArray(networks), 'Networks should be array');
  console.log(`  ✅ getDetailedNetwork passed (${networks.length} interfaces detected).`);

  const procs = await getTopProcesses('cpu', 5);
  assert.ok(Array.isArray(procs), 'Processes should be array');
  assert.ok(procs.length <= 5, 'Processes count should respect limit');
  console.log(`  ✅ getTopProcesses passed (${procs.length} processes listed).`);

  const docker = await getDockerInfo();
  assert.ok('available' in docker, 'Docker info should contain available flag');
  console.log(`  ✅ getDockerInfo passed (Docker available: ${docker.available}).`);

  // 4. Test EmbedBuilder
  console.log('\nTesting src/services/embedBuilder.js...');
  const {
    buildMonitorEmbed,
    buildStatusSnapshotEmbed,
    buildTopProcessesEmbed,
    buildDiskEmbed,
    buildNetworkEmbed,
    buildDockerEmbed,
  } = await import('../src/services/embedBuilder.js');

  const monitorEmbed = buildMonitorEmbed(stats, 42, 'https://example.com/avatar.png');
  assert.ok(monitorEmbed.data.title.includes('VPS Monitor'), 'Title check');
  assert.strictEqual(monitorEmbed.data.thumbnail.url, 'https://example.com/avatar.png');
  assert.ok(monitorEmbed.data.fields.length >= 6, 'Fields check');

  // Verify CPU field has Overall bar
  const cpuField = monitorEmbed.data.fields.find((f) => f.name.includes('CPU'));
  assert.ok(cpuField, 'CPU field must exist');
  assert.ok(cpuField.value.includes('Overall:'), 'CPU field must contain Overall load bar');

  // Verify Storage field name and value are simplified
  const storageField = monitorEmbed.data.fields.find((f) => f.name.includes('Storage'));
  assert.ok(storageField, 'Storage field must exist');
  assert.strictEqual(storageField.name, '💾 Storage Distribution', 'Storage field name must not contain drive letter');
  assert.ok(!storageField.value.includes('Filesystem:'), 'Storage field must not contain filesystem line');

  const statusEmbed = buildStatusSnapshotEmbed(stats, 42, 'https://example.com/avatar.png');
  assert.ok(statusEmbed.data.title.includes('System Snapshot'), 'Status embed check');
  assert.strictEqual(statusEmbed.data.thumbnail.url, 'https://example.com/avatar.png');

  const topEmbed = buildTopProcessesEmbed(stats.serverName, procs, 'cpu');
  assert.ok(topEmbed.data.title.includes('Top Processes'), 'Top embed check');

  const diskEmbed = buildDiskEmbed(stats.serverName, disks);
  assert.ok(diskEmbed.data.title.includes('Storage Partitions'), 'Disk embed check');

  const netEmbed = buildNetworkEmbed(stats.serverName, networks);
  assert.ok(netEmbed.data.title.includes('Network Interfaces'), 'Network embed check');

  const dockerEmbed = buildDockerEmbed(stats.serverName, docker);
  assert.ok(dockerEmbed.data.title.includes('Docker Containers'), 'Docker embed check');
  console.log('  ✅ EmbedBuilder passed.');

  // 5. Test Slash Commands
  console.log('\nTesting command definitions in src/commands/...');
  const commandsPath = path.join(__dirname, '../src/commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const mod = await import(pathToFileURL(path.join(commandsPath, file)).href);
    assert.ok(mod.data, `${file} must export data`);
    assert.ok(typeof mod.data.toJSON === 'function', `${file} data must have toJSON()`);
    const json = mod.data.toJSON();
    assert.ok(json.name, `${file} must have command name`);
    assert.ok(json.description, `${file} must have command description`);
    assert.ok(typeof mod.execute === 'function', `${file} must export execute function`);
    console.log(`  ✅ Command /${json.name} verified`);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
