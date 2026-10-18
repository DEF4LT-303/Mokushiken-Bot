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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables before startup
const { valid, errors } = validateConfig();
if (!valid) {
  console.error('\n❌ Configuration Error:');
  for (const err of errors) console.error(`  - ${err}`);
  console.error('\nPlease copy .env.example to .env and configure DISCORD_TOKEN and CLIENT_ID.');
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
    console.warn(`[Bot] Warning: The command at ${file} is missing required 'data' or 'execute' export.`);
  }
}

// Client ready event
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`\n==============================================`);
  console.log(`🤖 Logged in as: ${readyClient.user.tag} (ID: ${readyClient.user.id})`);
  console.log(`📊 Serving ${readyClient.guilds.cache.size} server(s)`);
  console.log(`🔄 VPS Status Check Interval: ${config.checkInterval} seconds`);
  console.log(`==============================================\n`);

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
    console.error(`[Interaction] No command matching /${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Interaction] Error executing /${interaction.commandName}:`, error);

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
  console.log(`\n[Bot] Received ${signal}. Shutting down gracefully...`);
  stopMonitorService();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Connect to Discord
client.login(config.token).catch((err) => {
  console.error('\n❌ Failed to login to Discord:');
  console.error(err.message);
  process.exit(1);
});
