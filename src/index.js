import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ActivityType,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config, validateConfig } from './config.js';
import { initMonitorService, stopMonitorService } from './services/monitorService.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables before startup
const { valid, errors } = validateConfig();
if (!valid) {
  logger.error('Configuration Error:');
  for (const err of errors) logger.error(`  - ${err}`);
  logger.error('Please copy .env.example to .env and configure DISCORD_TOKEN and CLIENT_ID.');
  process.exit(1);
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// Load command modules
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(pathToFileURL(filePath).href);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    logger.warn(`The command at ${file} is missing required 'data' or 'execute' export.`);
  }
}

// Client ready event
client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`==============================================`);
  logger.info(`Logged in as: ${readyClient.user.tag} (ID: ${readyClient.user.id})`);
  logger.info(`Serving ${readyClient.guilds.cache.size} server(s)`);
  logger.info(`VPS Status Check Interval: ${config.checkInterval} seconds`);
  logger.info(`==============================================`);

  readyClient.user.setActivity('VPS Health • /help', {
    type: ActivityType.Watching,
  });

  // Initialize monitoring loop and recovery
  await initMonitorService(client);
});

// Slash command interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`No command matching /${interaction.commandName} was found.`);
    return;
  }

  const startTime = Date.now();
  try {
    await command.execute(interaction);
    const duration = Date.now() - startTime;
    logger.cmd(
      interaction.user.tag,
      interaction.user.id,
      interaction.guild?.name || 'DM',
      interaction.commandName,
      duration,
      true
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.cmd(
      interaction.user.tag,
      interaction.user.id,
      interaction.guild?.name || 'DM',
      interaction.commandName,
      duration,
      false
    );
    logger.error(`Error executing /${interaction.commandName}:`, error);

    const errorMessage = {
      content: '❌ An error occurred while executing this command.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage).catch(() => {});
    } else {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

// Graceful shutdown handling
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopMonitorService();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Connect to Discord
client.login(config.token).catch((err) => {
  logger.error('Failed to login to Discord:', err.message);
  process.exit(1);
});
