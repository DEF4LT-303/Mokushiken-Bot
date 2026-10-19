import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config, validateConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  const { valid, errors } = validateConfig();
  if (!valid) {
    console.error('❌ Configuration error:');
    for (const err of errors) console.error(`  - ${err}`);
    console.error('\nPlease copy .env.example to .env and fill in your credentials.');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      console.log(`[Deploy] Loaded command: /${command.data.name}`);
    } else {
      console.warn(`[Deploy] Warning: The command at ${file} is missing 'data' or 'execute'.`);
    }
  }

  const rest = new REST().setToken(config.token);

  try {
    console.log(`[Deploy] Refreshing ${commands.length} application (/) commands...`);

    let data;
    if (config.guildIds && config.guildIds.length > 0) {
      console.log(`[Deploy] Registering commands to ${config.guildIds.length} Guild(s) (Instant propagation)`);
      for (const guildId of config.guildIds) {
        console.log(`[Deploy] -> Guild ID: ${guildId}`);
        data = await rest.put(
          Routes.applicationGuildCommands(config.clientId, guildId),
          { body: commands }
        );
      }
    } else {
      console.log('[Deploy] Registering commands globally (May take up to an hour to propagate globally across all servers)');
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
    }

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
    process.exit(1);
  }
}

deploy();
