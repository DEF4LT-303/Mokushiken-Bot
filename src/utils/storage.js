import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Loads the current state from disk.
 * @returns {{ channels: Record<string, { guildId: string, channelId: string, messageId: string | null, enabled: boolean, lastUpdated: number | null }> }}
 */
export function loadState() {
  try {
    if (!fs.existsSync(config.storagePath)) {
      return { channels: {} };
    }
    const raw = fs.readFileSync(config.storagePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.channels) {
      return { channels: {} };
    }
    return parsed;
  } catch (err) {
    console.error(`[Storage] Failed to read state file at ${config.storagePath}:`, err.message);
    return { channels: {} };
  }
}

/**
 * Writes the state object to disk atomically.
 * @param {object} state
 */
export function saveState(state) {
  try {
    ensureDirectoryExists(config.storagePath);
    const tmpPath = `${config.storagePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, config.storagePath);
    return true;
  } catch (err) {
    console.error(`[Storage] Failed to write state file at ${config.storagePath}:`, err.message);
    return false;
  }
}

/**
 * Gets monitoring configuration for a specific guild.
 */
export function getMonitorConfig(guildId) {
  const state = loadState();
  return state.channels[guildId] || null;
}

/**
 * Registers or updates a guild's monitoring configuration.
 */
export function setMonitorConfig(guildId, { channelId, messageId = null, enabled = true }) {
  const state = loadState();
  state.channels[guildId] = {
    guildId,
    channelId,
    messageId,
    enabled,
    lastUpdated: Date.now(),
  };
  saveState(state);
  return state.channels[guildId];
}

/**
 * Updates the tracked message ID for a guild.
 */
export function updateMessageId(guildId, messageId) {
  const state = loadState();
  if (state.channels[guildId]) {
    state.channels[guildId].messageId = messageId;
    state.channels[guildId].lastUpdated = Date.now();
    saveState(state);
    return true;
  }
  return false;
}

/**
 * Removes monitoring configuration for a guild.
 */
export function removeMonitorConfig(guildId) {
  const state = loadState();
  if (state.channels[guildId]) {
    delete state.channels[guildId];
    saveState(state);
    return true;
  }
  return false;
}

/**
 * Gets all active monitor configurations.
 */
export function getAllMonitorConfigs() {
  const state = loadState();
  return Object.values(state.channels).filter((c) => c.enabled && c.channelId);
}
