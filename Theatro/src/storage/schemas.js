/**
 * Theatro - Storage Schemas
 * 
 * IndexedDB store schemas and validation.
 */

export const SCHEMA = {
  characters: {
    keyPath: 'id',
    indexes: [
      { name: 'isUser', keyPath: 'isUser', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
      { name: 'name', keyPath: 'name', unique: false }
    ]
  },
  
  scenarios: {
    keyPath: 'id',
    indexes: [
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
      { name: 'characterIds', keyPath: 'characterIds', unique: false, multiEntry: true }
    ]
  },
  
  messages: {
    keyPath: 'id',
    indexes: [
      { name: 'scenarioId', keyPath: 'scenarioId', unique: false },
      { name: 'characterId', keyPath: 'characterId', unique: false },
      { name: 'timestamp', keyPath: 'timestamp', unique: false }
    ]
  },
  
  memories: {
    keyPath: 'id', // characterId:scenarioId
    indexes: [
      { name: 'characterId', keyPath: 'characterId', unique: false },
      { name: 'scenarioId', keyPath: 'scenarioId', unique: false }
    ]
  },
  
  relationships: {
    keyPath: 'scenarioId',
    indexes: []
  },
  
  settings: {
    keyPath: 'id',
    indexes: []
  },
  
  providers: {
    keyPath: 'id',
    indexes: []
  },
  
  cache: {
    keyPath: 'id',
    indexes: [
      { name: 'expiresAt', keyPath: 'expiresAt', unique: false }
    ]
  },
  
  media: {
    keyPath: 'id',
    indexes: [
      { name: 'scenarioId', keyPath: 'scenarioId', unique: false },
      { name: 'characterId', keyPath: 'characterId', unique: false }
    ]
  }
};

/**
 * Validate character data
 */
export function validateCharacter(data) {
  const required = ['id', 'name', 'color'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (data.name.length > 100) {
    throw new Error('Name must be 100 characters or less');
  }
  
  if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
    throw new Error('Color must be a valid hex code (e.g., #7c3aed)');
  }
  
  return true;
}

/**
 * Validate scenario data
 */
export function validateScenario(data) {
  const required = ['id', 'name'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (!Array.isArray(data.characterIds)) {
    throw new Error('characterIds must be an array');
  }
  
  if (data.characterIds.length > 11) {
    throw new Error('Maximum 11 characters per scenario');
  }
  
  return true;
}

/**
 * Validate message data
 */
export function validateMessage(data) {
  const required = ['id', 'scenarioId', 'content', 'timestamp'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (data.content.length > 10000) {
    throw new Error('Message content must be 10000 characters or less');
  }
  
  return true;
}
