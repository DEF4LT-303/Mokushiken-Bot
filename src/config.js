import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildIds: (process.env.GUILD_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  checkInterval: Math.max(10, parseInt(process.env.CHECK_INTERVAL || '30', 10)),
  serverName: process.env.SERVER_NAME || null,
  storagePath: path.resolve(__dirname, '../', process.env.STORAGE_PATH || './data/monitor_state.json'),
  ownerIds: (process.env.OWNER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  enableExec: process.env.ENABLE_EXEC === 'true',
};

export function validateConfig() {
  const errors = [];
  if (!config.token) {
    errors.push('DISCORD_TOKEN is missing in .env file.');
  }
  if (!config.clientId) {
    errors.push('CLIENT_ID is missing in .env file.');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
