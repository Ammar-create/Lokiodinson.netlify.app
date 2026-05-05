/**
 * Theatro - Export/Import
 * 
 * JSON export/import for all app data.
 */

import { storageAdapter } from './storageAdapter.js';

const EXPORT_VERSION = 'theatro-1.0';

/**
 * Export all data
 * @returns {Promise<Object>}
 */
export async function exportAll() {
  const data = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    settings: await storageAdapter.get('settings', 'global'),
    characters: await storageAdapter.getAll('characters'),
    scenarios: await storageAdapter.getAll('scenarios'),
    messages: await storageAdapter.getAll('messages'),
    memories: await storageAdapter.getAll('memories'),
    relationships: await storageAdapter.getAll('relationships'),
    media: await storageAdapter.getAll('media')
  };

  return data;
}

/**
 * Export a single scenario with all related data
 * @param {string} scenarioId
 * @returns {Promise<Object>}
 */
export async function exportScenario(scenarioId) {
  const scenario = await storageAdapter.get('scenarios', scenarioId);
  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  const messages = await storageAdapter.query('messages', { scenarioId });
  const relationships = await storageAdapter.get('relationships', scenarioId);
  const memories = await storageAdapter.query('memories', { scenarioId });
  
  // Get all characters in this scenario
  const characters = [];
  for (const charId of scenario.characterIds || []) {
    const character = await storageAdapter.get('characters', charId);
    if (character) {
      characters.push(character);
    }
  }

  // Get media referenced by messages
  const mediaIds = new Set();
  messages.forEach(msg => {
    if (msg.imageUrl) mediaIds.add(msg.imageUrl);
    if (msg.audioUrl) mediaIds.add(msg.audioUrl);
  });
  
  const media = [];
  for (const mediaId of mediaIds) {
    const item = await storageAdapter.get('media', mediaId);
    if (item) media.push(item);
  }

  return {
    version: 'theatro-scenario-1.0',
    exportedAt: new Date().toISOString(),
    scenario,
    characters,
    messages,
    relationships,
    memories,
    media
  };
}

/**
 * Import data
 * @param {Object} data
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function importData(data, options = {}) {
  const { merge = false, dryRun = false } = options;

  // Validate
  if (!data.version || !data.exportedAt) {
    throw new Error('Invalid export file: missing version or timestamp');
  }

  if (!dryRun) {
    const results = {
      characters: { imported: 0, skipped: 0, errors: [] },
      scenarios: { imported: 0, skipped: 0, errors: [] },
      messages: { imported: 0, skipped: 0, errors: [] },
      memories: { imported: 0, skipped: 0, errors: [] },
      relationships: { imported: 0, skipped: 0, errors: [] },
      settings: { imported: 0, skipped: 0, errors: [] }
    };

    // Import settings (optional)
    if (data.settings && !merge) {
      try {
        await storageAdapter.set('settings', 'global', data.settings);
        results.settings.imported = 1;
      } catch (error) {
        results.settings.errors.push(error.message);
      }
    } else {
      results.settings.skipped = 1;
    }

    // Import characters
    if (Array.isArray(data.characters)) {
      for (const character of data.characters) {
        try {
          const exists = await storageAdapter.exists('characters', character.id);
          if (exists && !merge) {
            results.characters.skipped++;
            continue;
          }
          await storageAdapter.set('characters', character.id, character);
          results.characters.imported++;
        } catch (error) {
          results.characters.errors.push({ id: character.id, error: error.message });
        }
      }
    }

    // Import scenarios
    if (Array.isArray(data.scenarios)) {
      for (const scenario of data.scenarios) {
        try {
          const exists = await storageAdapter.exists('scenarios', scenario.id);
          if (exists && !merge) {
            results.scenarios.skipped++;
            continue;
          }
          await storageAdapter.set('scenarios', scenario.id, scenario);
          results.scenarios.imported++;
        } catch (error) {
          results.scenarios.errors.push({ id: scenario.id, error: error.message });
        }
      }
    }

    // Import messages
    if (Array.isArray(data.messages)) {
      for (const message of data.messages) {
        try {
          const exists = await storageAdapter.exists('messages', message.id);
          if (exists && !merge) {
            results.messages.skipped++;
            continue;
          }
          await storageAdapter.set('messages', message.id, message);
          results.messages.imported++;
        } catch (error) {
          results.messages.errors.push({ id: message.id, error: error.message });
        }
      }
    }

    // Import memories
    if (Array.isArray(data.memories)) {
      for (const memory of data.memories) {
        try {
          const exists = await storageAdapter.exists('memories', memory.id);
          if (exists && !merge) {
            results.memories.skipped++;
            continue;
          }
          await storageAdapter.set('memories', memory.id, memory);
          results.memories.imported++;
        } catch (error) {
          results.memories.errors.push({ id: memory.id, error: error.message });
        }
      }
    }

    // Import relationships
    if (Array.isArray(data.relationships)) {
      for (const relationship of data.relationships) {
        try {
          const exists = await storageAdapter.exists('relationships', relationship.scenarioId);
          if (exists && !merge) {
            results.relationships.skipped++;
            continue;
          }
          await storageAdapter.set('relationships', relationship.scenarioId, relationship);
          results.relationships.imported++;
        } catch (error) {
          results.relationships.errors.push({ id: relationship.scenarioId, error: error.message });
        }
      }
    }

    return results;
  }

  return { dryRun: true, wouldImport: countItems(data) };
}

/**
 * Import a scenario export
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function importScenario(data) {
  if (!data.scenario) {
    throw new Error('Invalid scenario export: missing scenario data');
  }

  const results = {
    scenario: null,
    characters: [],
    messages: 0,
    errors: []
  };

  // Import characters first
  if (Array.isArray(data.characters)) {
    for (const character of data.characters) {
      try {
        await storageAdapter.set('characters', character.id, character);
        results.characters.push(character.id);
      } catch (error) {
        results.errors.push({ type: 'character', id: character.id, error: error.message });
      }
    }
  }

  // Import scenario
  try {
    await storageAdapter.set('scenarios', data.scenario.id, data.scenario);
    results.scenario = data.scenario.id;
  } catch (error) {
    results.errors.push({ type: 'scenario', id: data.scenario.id, error: error.message });
    return results;
  }

  // Import messages
  if (Array.isArray(data.messages)) {
    for (const message of data.messages) {
      try {
        await storageAdapter.set('messages', message.id, message);
        results.messages++;
      } catch (error) {
        results.errors.push({ type: 'message', id: message.id, error: error.message });
      }
    }
  }

  // Import relationships
  if (data.relationships) {
    try {
      await storageAdapter.set('relationships', data.relationships.scenarioId, data.relationships);
    } catch (error) {
      results.errors.push({ type: 'relationships', error: error.message });
    }
  }

  // Import memories
  if (Array.isArray(data.memories)) {
    for (const memory of data.memories) {
      try {
        await storageAdapter.set('memories', memory.id, memory);
      } catch (error) {
        results.errors.push({ type: 'memory', id: memory.id, error: error.message });
      }
    }
  }

  return results;
}

/**
 * Download export as file
 * @param {Object} data
 * @param {string} filename
 */
export function downloadExport(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Read import file
 * @param {File} file
 * @returns {Promise<Object>}
 */
export function readImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Count items in export data
 */
function countItems(data) {
  return {
    characters: data.characters?.length || 0,
    scenarios: data.scenarios?.length || 0,
    messages: data.messages?.length || 0,
    memories: data.memories?.length || 0
  };
}
