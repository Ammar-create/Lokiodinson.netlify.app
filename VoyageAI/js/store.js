// ========================================
// FILE 9: js/store.js
// Voyage AI — IndexedDB Data Layer
// Zero dependencies. All CRUD operations.
// ========================================

const DB_NAME = 'voyage_ai';
const DB_VERSION = 1;

let db = null;

// ========================================
// INITIALIZATION
// ========================================

export async function init() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Profile — single record
      if (!database.objectStoreNames.contains('profile')) {
        database.createObjectStore('profile', { keyPath: 'id', autoIncrement: true });
      }

      // Settings — key-value pairs
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // Providers
      if (!database.objectStoreNames.contains('providers')) {
        const providers = database.createObjectStore('providers', { keyPath: 'id', autoIncrement: true });
        providers.createIndex('name', 'name', { unique: false });
      }

      // Models
      if (!database.objectStoreNames.contains('models')) {
        const models = database.createObjectStore('models', { keyPath: 'id', autoIncrement: true });
        models.createIndex('providerId', 'providerId', { unique: false });
        models.createIndex('active', 'active', { unique: false });
      }

      // Chats
      if (!database.objectStoreNames.contains('chats')) {
        const chats = database.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
        chats.createIndex('updatedAt', 'updatedAt', { unique: false });
        chats.createIndex('private', 'private', { unique: false });
      }

      // Messages
      if (!database.objectStoreNames.contains('messages')) {
        const messages = database.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        messages.createIndex('chatId', 'chatId', { unique: false });
        messages.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Memories
      if (!database.objectStoreNames.contains('memories')) {
        const memories = database.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
        memories.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Images
      if (!database.objectStoreNames.contains('images')) {
        const images = database.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
        images.createIndex('createdAt', 'createdAt', { unique: false });
        images.createIndex('chatId', 'chatId', { unique: false });
      }

      // Tasks
      if (!database.objectStoreNames.contains('tasks')) {
        const tasks = database.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        tasks.createIndex('status', 'status', { unique: false });
        tasks.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Templates
      if (!database.objectStoreNames.contains('templates')) {
        database.createObjectStore('templates', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      seedDefaults().then(resolve).catch(reject);
    };

    request.onerror = (event) => {
      console.error('[Store] IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

// ========================================
// SEED DEFAULT DATA
// ========================================

async function seedDefaults() {
  // Seed default settings if empty
  const existingTheme = await getSetting('theme');
  if (existingTheme === undefined) {
    const defaults = {
      accent_h: 215,
      accent_s: 92,
      accent_l: 56,
      theme: 'dark',
      tone: 'default',
      warmth: 1,
      enthusiasm: 1,
      emoji_usage: 1,
      headers_usage: 1,
      custom_instructions: '',
      web_search_enabled: true,
      streaming_enabled: true,
      reference_memories: true,
      reference_chat_history: true,
      nickname: '',
      occupation: '',
      additional_info: '',
      active_provider: null,
      active_model: null,
      private_mode: false,
      onboarding_complete: false
    };

    for (const [key, value] of Object.entries(defaults)) {
      await setSetting(key, value);
    }
  }

  // Seed default templates if empty
  const templates = await getTemplates();
  if (templates.length === 0) {
    const defaultTemplates = [
      { label: 'Write Code',     icon: '✍️',  prompt: 'Help me write code. What do you need built?' },
      { label: 'Research',       icon: '🔍',  prompt: 'Research this topic and provide a comprehensive summary.' },
      { label: 'Generate Image', icon: '🎨',  prompt: 'Describe the image you want me to create.' },
      { label: 'Analyze Data',   icon: '📊',  prompt: 'Paste your data and I\'ll analyze it for patterns and insights.' },
      { label: 'Explain Code',   icon: '💡',  prompt: 'Paste the code you want explained.' },
      { label: 'Write Content',  icon: '📝',  prompt: 'What kind of content do you need? Article, email, report?' }
    ];

    for (const tpl of defaultTemplates) {
      await dbPut('templates', tpl);
    }
  }

  // Seed AquaDevs provider if no providers exist
  const providers = await getProviders();
  if (providers.length === 0) {
    const providerId = await addProvider({
      name: 'AquaDevs',
      baseUrl: 'https://api.aquadevs.com',
      apiKey: '',
      capabilities: ['chat', 'image', 'video', 'tts', 'stt', 'search', 'extract', 'embeddings']
    });

    // Seed default models for AquaDevs
    const defaultModels = [
      { name: 'gpt-5',             capabilities: ['text', 'tools', 'vision'],   type: 'standard' },
      { name: 'gpt-5.2',           capabilities: ['text', 'tools', 'vision'],   type: 'standard' },
      { name: 'gemini-3',          capabilities: ['text', 'tools', 'vision'],   type: 'standard' },
      { name: 'deepseek-v4',       capabilities: ['text', 'tools'],             type: 'standard' },
      { name: 'claude-sonnet-4.6', capabilities: ['text', 'tools', 'vision'],   type: 'premium' },
      { name: 'grok-4.1-thinking', capabilities: ['text', 'reasoning'],         type: 'premium' },
      { name: 'flux-2',            capabilities: ['image'],                     type: 'standard' },
      { name: 'gptimage-2',        capabilities: ['image'],                     type: 'standard' },
      { name: 'midjourney',        capabilities: ['image'],                     type: 'premium' },
      { name: 'imagen4',           capabilities: ['image'],                     type: 'standard' },
      { name: 'nanobanana',        capabilities: ['image'],                     type: 'standard' },
      { name: 'video-2',           capabilities: ['video'],                     type: 'standard' },
      { name: 'video-3',           capabilities: ['video'],                     type: 'premium' },
      { name: 'tts-1',             capabilities: ['tts'],                       type: 'standard' },
      { name: 'whisper-3',         capabilities: ['stt'],                       type: 'standard' }
    ];

    for (const model of defaultModels) {
      await addModel({
        providerId,
        name: model.name,
        type: model.type,
        active: true,
        capabilities: model.capabilities
      });
    }

    // Set gpt-5 as default active model
    await setSetting('active_provider', providerId);
    const firstModel = await dbGetByIndex('models', 'providerId', providerId);
    if (firstModel) {
      await setSetting('active_model', firstModel.id);
    }
  }
}

// ========================================
// GENERIC CRUD OPERATIONS
// ========================================

function getStore(storeName, mode = 'readonly') {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function dbGet(storeName, id) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetFirstByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const index = store.index(indexName);
    const request = index.get(value);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function dbPut(storeName, item) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbDelete(storeName, id) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// PROFILE
// ========================================

export async function getProfile() {
  const all = await dbGetAll('profile');
  return all[0] || { firstName: '', lastName: '', nickname: '', picture: null };
}

export async function saveProfile(profile) {
  const existing = await getProfile();
  const data = { ...existing, ...profile };
  if (!data.id) {
    const all = await dbGetAll('profile');
    if (all.length > 0) data.id = all[0].id;
  }
  await dbPut('profile', data);
  return data;
}

// ========================================
// SETTINGS
// ========================================

export async function getSetting(key) {
  const record = await dbGet('settings', key);
  return record ? record.value : undefined;
}

export async function setSetting(key, value) {
  await dbPut('settings', { key, value });
}

export async function getAllSettings() {
  const all = await dbGetAll('settings');
  const result = {};
  for (const item of all) {
    result[item.key] = item.value;
  }
  return result;
}

// ========================================
// PROVIDERS
// ========================================

export async function getProviders() {
  return await dbGetAll('providers');
}

export async function getProvider(id) {
  return await dbGet('providers', id);
}

export async function addProvider(provider) {
  const data = {
    name: provider.name,
    baseUrl: provider.baseUrl || '',
    apiKey: provider.apiKey || '',
    capabilities: provider.capabilities || ['chat'],
    createdAt: Date.now()
  };
  return await dbPut('providers', data);
}

export async function updateProvider(id, updates) {
  const existing = await dbGet('providers', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id };
  await dbPut('providers', data);
  return data;
}

export async function deleteProvider(id) {
  // Delete all models for this provider
  const models = await getModels(id);
  for (const model of models) {
    await dbDelete('models', model.id);
  }
  await dbDelete('providers', id);
}

// ========================================
// MODELS
// ========================================

export async function getModels(providerId) {
  if (providerId !== undefined) {
    return await dbGetByIndex('models', 'providerId', providerId);
  }
  return await dbGetAll('models');
}

export async function getModel(id) {
  return await dbGet('models', id);
}

export async function addModel(model) {
  const data = {
    providerId: model.providerId,
    name: model.name,
    type: model.type || 'standard',
    active: model.active !== undefined ? model.active : true,
    capabilities: model.capabilities || ['text'],
    createdAt: Date.now()
  };
  return await dbPut('models', data);
}

export async function updateModel(id, updates) {
  const existing = await dbGet('models', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id };
  await dbPut('models', data);
  return data;
}

export async function deleteModel(id) {
  await dbDelete('models', id);
}

export async function getActiveModel() {
  const providerId = await getSetting('active_provider');
  const modelId = await getSetting('active_model');

  if (!providerId || !modelId) return null;

  const provider = await getProvider(providerId);
  const model = await getModel(modelId);

  if (!provider || !model) return null;

  return { provider, model };
}

// ========================================
// CHATS
// ========================================

export async function getChats(options = {}) {
  let chats = await dbGetAll('chats');

  // Filter private chats if needed
  if (options.excludePrivate) {
    chats = chats.filter(c => !c.private);
  }

  // Sort by updatedAt descending (newest first)
  chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return chats;
}

export async function getChat(id) {
  return await dbGet('chats', id);
}

export async function createChat(title, isPrivate = false) {
  const data = {
    title: title || 'New Chat',
    private: isPrivate,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  return await dbPut('chats', data);
}

export async function updateChat(id, updates) {
  const existing = await dbGet('chats', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id, updatedAt: Date.now() };
  await dbPut('chats', data);
  return data;
}

export async function deleteChat(id) {
  // Delete all messages for this chat
  const messages = await getMessages(id);
  for (const msg of messages) {
    await dbDelete('messages', msg.id);
  }
  // Delete chat record
  await dbDelete('chats', id);
}

export async function searchChats(query) {
  if (!query || !query.trim()) return await getChats();

  const lowerQuery = query.toLowerCase().trim();
  const chats = await getChats();

  return chats.filter(chat => {
    // Search in chat title
    if (chat.title && chat.title.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
}

// ========================================
// MESSAGES
// ========================================

export async function getMessages(chatId) {
  const messages = await dbGetByIndex('messages', 'chatId', chatId);
  // Sort by createdAt ascending (oldest first — chronological order)
  messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return messages;
}

export async function getMessage(id) {
  return await dbGet('messages', id);
}

export async function addMessage(message) {
  const data = {
    chatId: message.chatId,
    role: message.role,           // 'user' | 'assistant' | 'system' | 'tool'
    content: message.content || '',
    model: message.model || null, // model name string
    thinking: message.thinking || null,
    toolCalls: message.toolCalls || null,
    toolResult: message.toolResult || null,
    toolName: message.toolName || null,
    imageData: message.imageData || null,
    videoData: message.videoData || null,
    stats: message.stats || null, // { inputTokens, outputTokens, tokensPerSecond, duration }
    edited: false,
    createdAt: Date.now()
  };
  const id = await dbPut('messages', data);

  // Update chat's updatedAt
  if (data.chatId) {
    await updateChat(data.chatId, {});
  }

  return id;
}

export async function updateMessage(id, updates) {
  const existing = await dbGet('messages', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id };
  await dbPut('messages', data);
  return data;
}

export async function deleteMessage(id) {
  const msg = await dbGet('messages', id);
  await dbDelete('messages', id);
  if (msg && msg.chatId) {
    await updateChat(msg.chatId, {});
  }
}

export async function deleteMessagesFrom(chatId, fromMessageId) {
  const messages = await getMessages(chatId);
  let deleting = false;
  for (const msg of messages) {
    if (msg.id === fromMessageId) deleting = true;
    if (deleting) {
      await dbDelete('messages', msg.id);
    }
  }
}

// ========================================
// MEMORIES
// ========================================

export async function getMemories() {
  const memories = await dbGetAll('memories');
  memories.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return memories;
}

export async function getMemory(id) {
  return await dbGet('memories', id);
}

export async function addMemory(content, vector = null) {
  const data = {
    content,
    vector,      // Float32Array or null (populated later by embedding)
    createdAt: Date.now()
  };
  return await dbPut('memories', data);
}

export async function updateMemory(id, updates) {
  const existing = await dbGet('memories', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id };
  await dbPut('memories', data);
  return data;
}

export async function deleteMemory(id) {
  await dbDelete('memories', id);
}

// ========================================
// IMAGES
// ========================================

export async function getImages(options = {}) {
  let images = await dbGetAll('images');

  if (options.chatId) {
    images = images.filter(img => img.chatId === options.chatId);
  }

  images.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return images;
}

export async function getImage(id) {
  return await dbGet('images', id);
}

export async function addImage(image) {
  const data = {
    prompt: image.prompt || '',
    model: image.model || 'unknown',
    ratio: image.ratio || '1:1',
    dataUrl: image.dataUrl || null,
    referenceUrl: image.referenceUrl || null,
    chatId: image.chatId || null,
    createdAt: Date.now()
  };
  return await dbPut('images', data);
}

export async function deleteImage(id) {
  await dbDelete('images', id);
}

// ========================================
// TASKS
// ========================================

export async function getTasks(options = {}) {
  let tasks = await dbGetAll('tasks');

  if (options.status) {
    tasks = tasks.filter(t => t.status === options.status);
  }

  tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return tasks;
}

export async function getTask(id) {
  return await dbGet('tasks', id);
}

export async function addTask(task) {
  const data = {
    title: task.title || 'Untitled Task',
    description: task.description || '',
    status: task.status || 'pending',   // 'pending' | 'in_progress' | 'completed' | 'failed'
    priority: task.priority || 'normal', // 'low' | 'normal' | 'high'
    result: task.result || null,
    chatId: task.chatId || null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  return await dbPut('tasks', data);
}

export async function updateTask(id, updates) {
  const existing = await dbGet('tasks', id);
  if (!existing) return null;
  const data = { ...existing, ...updates, id, updatedAt: Date.now() };
  await dbPut('tasks', data);
  return data;
}

export async function deleteTask(id) {
  await dbDelete('tasks', id);
}

// ========================================
// TEMPLATES
// ========================================

export async function getTemplates() {
  return await dbGetAll('templates');
}

export async function getTemplate(id) {
  return await dbGet('templates', id);
}

export async function addTemplate(template) {
  const data = {
    label: template.label || '',
    icon: template.icon || '💬',
    prompt: template.prompt || ''
  };
  return await dbPut('templates', data);
}

export async function deleteTemplate(id) {
  await dbDelete('templates', id);
}

// ========================================
// UTILITY: Count records in a store
// ========================================

export async function count(storeName) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========================================
// UTILITY: Export all data (for backup)
// ========================================

export async function exportAll() {
  const storeNames = [
    'profile', 'settings', 'providers', 'models',
    'chats', 'messages', 'memories', 'images',
    'tasks', 'templates'
  ];

  const backup = {};
  for (const name of storeNames) {
    backup[name] = await dbGetAll(name);
  }
  return backup;
}

// ========================================
// UTILITY: Import data (from backup)
// ========================================

export async function importAll(data) {
  for (const [storeName, items] of Object.entries(data)) {
    if (!db.objectStoreNames.contains(storeName)) continue;
    await dbClear(storeName);
    for (const item of items) {
      await dbPut(storeName, item);
    }
  }
}