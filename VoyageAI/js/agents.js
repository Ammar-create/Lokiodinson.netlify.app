// js/agents.js — Intelligence Layer
// Chat completion orchestration, memory engine, workflow engine, MCP client

import {
  getSetting, getAllSettings, getMemories, addMemory as storeAddMemory,
  deleteMemory as storeDeleteMemory, getActiveModel, getModels
} from './store.js';

import { getActiveProvider } from './providers.js';
import { executeTool, getToolDefinitions } from './tools.js';

// ── Event Bus (injected from app.js to avoid circular imports) ──
let bus = null;
export function setBus(eventBus) {
  bus = eventBus;
}
function emit(event, data) { bus?.emit(event, data); }

// ── Constants ──

const MAX_TOOL_LOOPS = 10;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

// ── Helpers ──

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function safeText(val, fallback = '') {
  return typeof val === 'string' ? val : fallback;
}

function safeNum(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function stripEmojis(text) {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/gu, '');
}

function charFromTemp(temp) {
  if (temp <= 0.2) return 'a robot';
  if (temp <= 0.4) return 'a precise professional';
  if (temp <= 0.6) return 'a balanced conversationalist';
  if (temp <= 0.8) return 'a friendly creative';
  return 'a spontaneous and playful spirit';
}

// ── Settings Loader ──

async function loadUserSettings() {
  try {
    const all = await getAllSettings();
    return {
      tone:            safeText(all.tone, 'default'),
      warmth:          safeNum(all.warmth, 1),
      enthusiasm:      safeNum(all.enthusiasm, 1),
      emojiUsage:      safeNum(all.emoji_usage, 1),
      headersUsage:    safeNum(all.headers_usage, 1),
      customInstructions: safeText(all.custom_instructions),
      streamingEnabled: all.streaming_enabled !== false,
      referenceMemories:  all.reference_memories !== false,
      referenceHistory:   all.reference_chat_history !== false,
      nickname:        safeText(all.nickname),
      occupation:      safeText(all.occupation),
      additionalInfo:  safeText(all.additional_info),
    };
  } catch {
    return {
      tone: 'default', warmth: 1, enthusiasm: 1,
      emojiUsage: 1, headersUsage: 1,
      customInstructions: '', streamingEnabled: true,
      referenceMemories: true, referenceHistory: true,
      nickname: '', occupation: '', additionalInfo: '',
    };
  }
}

// ── System Prompt Builder ──

async function buildSystemPrompt(settings) {
  const parts = [];

  // Base identity
  parts.push(
    'You are Voyage AI, a highly capable AI assistant running inside a browser-based workstation.'
  );
  parts.push(
    'You have access to tools that extend your capabilities. Use them when they would help the user.'
  );

  // Personalization: tone
  const toneMap = {
    'default':     'Respond in a balanced, helpful tone.',
    'professional':'Maintain a formal, businesslike tone. Be structured and precise.',
    'friendly':    'Be warm, approachable, and conversational. Use casual language when appropriate.',
    'concise':     'Be extremely brief. Answer in as few words as possible. No filler, no pleasantries.',
    'creative':    'Be expressive, imaginative, and use vivid language. Surprise the user with interesting angles.',
  };
  parts.push(toneMap[settings.tone] || toneMap['default']);

  // Personalization: warmth
  if (settings.warmth === 0) {
    parts.push('Be direct and impersonal. Skip greetings and small talk.');
  } else if (settings.warmth === 2) {
    parts.push('Be especially warm and empathetic. Show genuine interest in the user.');
  }

  // Personalization: enthusiasm
  if (settings.enthusiasm === 0) {
    parts.push('Be measured and calm. Avoid exclamation marks.');
  } else if (settings.enthusiasm === 2) {
    parts.push('Show enthusiasm and energy. Express excitement about interesting ideas.');
  }

  // Personalization: emoji usage
  if (settings.emojiUsage === 0) {
    parts.push('Do not use any emojis in your responses.');
  } else if (settings.emojiUsage === 2) {
    parts.push('Use emojis generously to add personality and visual clarity to your responses.');
  }

  // Personalization: headers/lists
  if (settings.headersUsage === 0) {
    parts.push('Prefer flowing paragraphs over structured lists and headers.');
  } else if (settings.headersUsage === 2) {
    parts.push('Use headers (##), bullet lists, and numbered lists extensively for clarity.');
  }

  // User profile context
  const profileParts = [];
  if (settings.nickname) {
    profileParts.push(`The user's name/nickname is "${settings.nickname}". Address them by this name naturally.`);
  }
  if (settings.occupation) {
    profileParts.push(`Their occupation: ${settings.occupation}. Tailor technical depth accordingly.`);
  }
  if (settings.additionalInfo) {
    profileParts.push(`Additional context: ${settings.additionalInfo}`);
  }
  if (profileParts.length > 0) {
    parts.push('\nUser profile:\n' + profileParts.join('\n'));
  }

  // Custom instructions
  if (settings.customInstructions?.trim()) {
    parts.push('\nCustom instructions from the user:\n' + settings.customInstructions.trim());
  }

  return parts.join('\n');
}

// ── Context Builder ──

async function buildContext(settings) {
  const contextParts = [];

  // Memory context
  if (settings.referenceMemories) {
    try {
      const memories = await getMemories();
      if (memories.length > 0) {
        const recent = memories.slice(-20);
        const memoryText = recent
          .map((m, i) => `${i + 1}. ${m.content}`)
          .join('\n');
        contextParts.push(
          'Relevant memories about this user:\n' + memoryText
        );
      }
    } catch { /* ignore memory errors */ }
  }

  return contextParts.join('\n\n');
}

// ── Sanitize messages for API ──

function sanitizeMessages(messages) {
  return messages
    .filter(m => m && m.role && m.content != null)
    .map(m => ({
      role: m.role,
      content: safeText(m.content),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
    }));
}

// ── Parse assistant response chunk ──

function parseAssistantMessage(data) {
  const choice = data.choices?.[0];
  if (!choice) return null;

  const delta = choice.delta;
  const message = choice.message;
  const source = delta || message;
  if (!source) return null;

  return {
    content:      source.content ?? null,
    toolCalls:    source.tool_calls ?? null,
    finishReason: choice.finish_reason ?? null,
  };
}

// ═══════════════════════════════════════════════════════
// PUBLIC: Chat Completion (non-streaming)
// ═══════════════════════════════════════════════════════

export async function chatCompletion(messages, options = {}) {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No active provider configured');

  const settings = await loadUserSettings();
  const systemPrompt = await buildSystemPrompt(settings);
  const memoryContext = await buildContext(settings);

  // Build message array: system → memory → chat
  const apiMessages = [{ role: 'system', content: systemPrompt }];
  if (memoryContext) {
    apiMessages.push({ role: 'system', content: memoryContext });
  }
  apiMessages.push(...sanitizeMessages(messages));

  // Tool definitions
  const toolDefs = getToolDefinitions();

  // Temperature from settings
  const temp = clamp(
    options.temperature ?? DEFAULT_TEMPERATURE,
    0, 2
  );

  let loopCount = 0;

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;
    const startTime = performance.now();

    const response = await provider.chat(apiMessages, {
      model:       options.model,
      stream:      false,
      tools:       toolDefs.length > 0 ? toolDefs : undefined,
      temperature: temp,
      maxTokens:   options.maxTokens ?? DEFAULT_MAX_TOKENS,
    });

    const elapsed = performance.now() - startTime;

    // Extract usage stats
    const usage = response.usage || {};
    const result = {
      content:       safeText(response.content),
      toolCalls:     response.toolCalls || [],
      usage: {
        promptTokens:     usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens:      usage.total_tokens || 0,
      },
      speed:         usage.completion_tokens
        ? ((usage.completion_tokens / elapsed) * 1000).toFixed(1)
        : '0',
      elapsedMs:     Math.round(elapsed),
      finishReason:  response.finishReason,
      model:         options.model,
    };

    // If no tool calls, we're done
    if (!result.toolCalls.length) return result;

    // Append assistant message with tool_calls
    apiMessages.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: result.toolCalls,
    });

    // Execute each tool and append results
    for (const tc of result.toolCalls) {
      const fn = tc.function;
      let params = {};
      try {
        params = typeof fn.arguments === 'string'
          ? JSON.parse(fn.arguments)
          : fn.arguments || {};
      } catch { params = {}; }

      const toolResult = await executeTool(fn.name, params);

      apiMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: typeof toolResult === 'string'
          ? toolResult
          : JSON.stringify(toolResult),
      });

      emit('tool:invoked', { tool: fn.name, result: toolResult });
    }
    // Loop continues — provider will see tool results
  }

  throw new Error('Max tool call loops exceeded');
}

// ═══════════════════════════════════════════════════════
// PUBLIC: Streaming Chat Completion
// ═══════════════════════════════════════════════════════

export async function* streamChatCompletion(messages, options = {}) {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No active provider configured');

  const settings = await loadUserSettings();
  const systemPrompt = await buildSystemPrompt(settings);
  const memoryContext = await buildContext(settings);

  // Build message array
  const apiMessages = [{ role: 'system', content: systemPrompt }];
  if (memoryContext) {
    apiMessages.push({ role: 'system', content: memoryContext });
  }
  apiMessages.push(...sanitizeMessages(messages));

  const toolDefs = getToolDefinitions();
  const temp = clamp(options.temperature ?? DEFAULT_TEMPERATURE, 0, 2);
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  const streamStart = performance.now();
  let loopCount = 0;

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;
    let fullContent = '';
    let toolCalls = [];
    let finishReason = null;

    // Stream chunks from provider
    for await (const chunk of provider.chat(apiMessages, {
      model:       options.model,
      stream:      true,
      tools:       toolDefs.length > 0 ? toolDefs : undefined,
      temperature: temp,
      maxTokens:   options.maxTokens ?? DEFAULT_MAX_TOKENS,
    })) {
      const parsed = parseAssistantMessage(chunk);
      if (!parsed) continue;

      // Accumulate content
      if (parsed.content) {
        fullContent += parsed.content;
        emit('message:stream-chunk', {
          messageId: options.messageId,
          chunk: parsed.content,
        });
        yield { type: 'chunk', content: parsed.content };
      }

      // Accumulate tool calls (streamed incrementally)
      if (parsed.toolCalls) {
        for (const tc of parsed.toolCalls) {
          const idx = tc.index ?? 0;
          if (!toolCalls[idx]) {
            toolCalls[idx] = {
              id: tc.id || '',
              type: 'function',
              function: { name: '', arguments: '' },
            };
          }
          if (tc.id)               toolCalls[idx].id = tc.id;
          if (tc.function?.name)    toolCalls[idx].function.name = tc.function.name;
          if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
        }
      }

      // Usage from final chunk
      if (chunk.usage) {
        totalUsage = {
          promptTokens:     chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens:      chunk.usage.total_tokens || 0,
        };
      }

      if (parsed.finishReason) finishReason = parsed.finishReason;
    }

    // If no tool calls, emit final and return
    if (!toolCalls.length) {
      const elapsed = performance.now() - streamStart;
      const stats = {
        content: fullContent,
        toolCalls: [],
        usage: totalUsage,
        speed: totalUsage.completionTokens
          ? ((totalUsage.completionTokens / elapsed) * 1000).toFixed(1)
          : '0',
        elapsedMs: Math.round(elapsed),
        finishReason,
        model: options.model,
      };
      emit('message:stream-done', { messageId: options.messageId, stats });
      yield { type: 'done', ...stats };
      return;
    }

    // Append assistant message with tool calls
    apiMessages.push({
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCalls,
    });

    // Execute tools
    for (const tc of toolCalls) {
      const fn = tc.function;
      let params = {};
      try {
        params = typeof fn.arguments === 'string'
          ? JSON.parse(fn.arguments)
          : fn.arguments || {};
      } catch { params = {}; }

      yield { type: 'tool_start', tool: fn.name, params };
      const toolResult = await executeTool(fn.name, params);
      yield { type: 'tool_result', tool: fn.name, result: toolResult };

      apiMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: typeof toolResult === 'string'
          ? toolResult
          : JSON.stringify(toolResult),
      });

      emit('tool:invoked', { tool: fn.name, result: toolResult });
    }
  }

  throw new Error('Max tool call loops exceeded during streaming');
}

// ═══════════════════════════════════════════════════════
// MEMORY ENGINE
// ═══════════════════════════════════════════════════════

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Save a memory with its embedding vector.
 */
export async function saveMemory(content) {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No active provider for embeddings');

  let vector = null;
  try {
    vector = await provider.embeddings(content);
  } catch {
    // Embeddings may not be supported — store without vector
    vector = null;
  }

  const id = await storeAddMemory(content, vector);
  emit('memory:added', { id, content });
  return id;
}

/**
 * Delete a memory by ID.
 */
export async function deleteMemory(id) {
  await storeDeleteMemory(id);
  emit('memory:deleted', { id });
}

/**
 * Semantic search across stored memories.
 * Returns top `limit` memories sorted by cosine similarity.
 * Falls back to substring matching if no vectors available.
 */
export async function searchMemory(query, limit = 5) {
  try {
    const provider = getActiveProvider();
    const allMemories = await getMemories();
    if (!allMemories.length) return [];

    // Try vector search first
    if (provider) {
      try {
        const queryVector = await provider.embeddings(query);
        if (queryVector?.length) {
          const scored = allMemories
            .filter(m => m.vector?.length)
            .map(m => ({
              ...m,
              similarity: cosineSimilarity(queryVector, m.vector),
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

          if (scored.length > 0) return scored;
        }
      } catch { /* fall through to substring */ }
    }

    // Fallback: substring/keyword matching
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);

    return allMemories
      .map(m => {
        const contentLower = m.content.toLowerCase();
        let score = 0;
        if (contentLower.includes(queryLower)) score += 10;
        for (const w of words) {
          if (contentLower.includes(w)) score += 1;
        }
        return { ...m, similarity: score / (words.length + 1) };
      })
      .filter(m => m.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Auto-salvage important information from a conversation
 * and save it as a memory.
 */
export async function extractAndSaveMemory(conversationText) {
  try {
    const provider = getActiveProvider();
    if (!provider) return;

    const response = await provider.chat([{
      role: 'system',
      content: `You are a memory extraction system. Analyze the conversation and extract
important facts about the user that should be remembered for future conversations.
Output ONLY a JSON array of strings, each being one memory.
Focus on: preferences, opinions, projects, tools used, personal facts, recurring themes.
Do NOT include: temporary context, specific code snippets, or ephemeral details.
If nothing worth remembering, output an empty array [].`,
    }, {
      role: 'user',
      content: conversationText.slice(-8000), // limit context
    }], { stream: false });

    let memories = [];
    try {
      const text = response.content || '[]';
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) memories = JSON.parse(jsonMatch[0]);
    } catch { return; }

    if (!Array.isArray(memories) || !memories.length) return;

    for (const memory of memories) {
      if (typeof memory === 'string' && memory.trim().length > 5) {
        await saveMemory(memory.trim());
      }
    }
  } catch { /* extraction is best-effort */ }
}

// ═══════════════════════════════════════════════════════
// ORCHESTRATOR — Multi-agent task routing
// ═══════════════════════════════════════════════════════

/**
 * Orchestrates a complex task by breaking it into sub-tasks
 * and routing each to the most appropriate "agent persona".
 */
export async function orchestrate(task, agents = []) {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No active provider');

  // If no agents defined, use built-in roles
  const agentRoles = agents.length > 0 ? agents : [
    {
      role: 'researcher',
      instructions: 'Find and summarize relevant information. Focus on accuracy and sources.',
      tools: ['web_search', 'url_extract'],
    },
    {
      role: 'analyst',
      instructions: 'Analyze information, identify patterns, and draw conclusions.',
      tools: ['data_visualizer', 'code_interpreter'],
    },
    {
      role: 'coder',
      instructions: 'Write clean, working code. Include error handling and comments.',
      tools: ['code_interpreter', 'file_processor'],
    },
    {
      role: 'reviewer',
      instructions: 'Review work for errors, suggest improvements, ensure quality.',
      tools: [],
    },
  ];

  // Step 1: Plan the task breakdown
  const planResponse = await provider.chat([{
    role: 'system',
    content: `You are a task planning system. Break down the given task into sequential sub-tasks.
Output ONLY a JSON array of objects with these fields:
- "step": step number (1-based)
- "agent": which role handles this (${agentRoles.map(a => `"${a.role}"`).join(', ')})
- "task": clear description of what this step should accomplish
- "depends_on": array of step numbers this depends on (empty array if none)

Keep it concise — 2-6 steps maximum.`,
  }, {
    role: 'user',
    content: task,
  }], { stream: false });

  let steps = [];
  try {
    const text = planResponse.content || '[]';
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) steps = JSON.parse(jsonMatch[0]);
  } catch { throw new Error('Failed to parse orchestration plan'); }

  if (!steps.length) {
    // Fallback: single step with the first agent
    steps = [{ step: 1, agent: agentRoles[0].role, task, depends_on: [] }];
  }

  // Step 2: Execute each step
  const results = {};

  for (const step of steps) {
    const agent = agentRoles.find(a => a.role === step.agent) || agentRoles[0];

    // Build context from dependencies
    const depContext = (step.depends_on || [])
      .map(dep => results[dep])
      .filter(Boolean)
      .map((r, i) => `Context from step ${step.depends_on[i]}:\n${r}`)
      .join('\n\n');

    const response = await provider.chat([{
      role: 'system',
      content: `You are the "${agent.role}" agent. ${agent.instructions}\n
You are part of a multi-agent system working on a larger task.
Complete ONLY your assigned step. Be thorough but focused.`,
    }, {
      role: 'user',
      content: (depContext ? `${depContext}\n\n` : '') + `Your task:\n${step.task}`,
    }], {
      stream: false,
      tools: agent.tools?.length ? getToolDefinitions().filter(t =>
        agent.tools.includes(t.name)
      ) : undefined,
    });

    results[step.step] = response.content || '';
    emit('orchestrator:step-complete', {
      step: step.step,
      agent: agent.role,
      result: results[step.step],
    });
  }

  return {
    steps: steps.map(s => ({
      ...s,
      result: results[s.step],
    })),
    summary: Object.values(results).join('\n\n'),
  };
}

// ═══════════════════════════════════════════════════════
// WORKFLOW ENGINE — Task queues, retry, branching
// ═══════════════════════════════════════════════════════

export class WorkflowEngine {
  constructor() {
    this.steps      = [];
    this.results    = {};
    this.status     = 'idle';       // idle | running | completed | failed
    this.currentStep = 0;
  }

  /**
   * Add a step to the workflow.
   * @param {string} agent — Agent role
   * @param {string} task — Task description
   * @param {object} opts — { dependsOn: [], retries: 0, condition: null }
   * @returns {number} Step index
   */
  addStep(agent, task, opts = {}) {
    const idx = this.steps.length;
    this.steps.push({
      agent,
      task,
      dependsOn:  opts.dependsOn || [],
      retries:    opts.retries ?? 1,
      condition:  opts.condition || null,  // fn(results) → bool
      result:     null,
      error:      null,
      status:     'pending',  // pending | running | completed | failed | skipped
    });
    return idx;
  }

  /**
   * Execute all steps in order, respecting dependencies.
   */
  async execute() {
    this.status = 'running';
    emit('workflow:start', { stepCount: this.steps.length });

    try {
      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        const step = this.steps[i];

        // Check condition (branching)
        if (step.condition && !step.condition(this.results)) {
          step.status = 'skipped';
          emit('workflow:step-skipped', { step: i, agent: step.agent });
          continue;
        }

        // Resolve dependency context
        const depContext = this._resolveDependencies(step);
        step.status = 'running';
        emit('workflow:step-start', { step: i, agent: step.agent });

        // Execute with retry
        let attempts = 0;
        const maxAttempts = step.retries + 1;

        while (attempts < maxAttempts) {
          try {
            const result = await this._executeStep(step, depContext);
            step.result = result;
            step.status = 'completed';
            this.results[i] = result;
            emit('workflow:step-complete', { step: i, result });
            break;
          } catch (err) {
            attempts++;
            step.error = err.message;
            if (attempts >= maxAttempts) {
              step.status = 'failed';
              emit('workflow:step-failed', { step: i, error: err.message });
              this.status = 'failed';
              throw new Error(`Workflow step ${i} failed: ${err.message}`);
            }
            emit('workflow:step-retry', { step: i, attempt: attempts });
          }
        }
      }

      this.status = 'completed';
      emit('workflow:complete', { results: this.results });
    } catch (err) {
      this.status = 'failed';
      emit('workflow:error', { error: err.message });
      throw err;
    }
  }

  /** Get current workflow state. */
  getStatus() {
    return {
      status:      this.status,
      currentStep: this.currentStep,
      steps:       this.steps.map((s, i) => ({
        step:   i,
        agent:  s.agent,
        status: s.status,
        result: s.result,
        error:  s.error,
      })),
      results: this.results,
    };
  }

  // ── Internal ──

  _resolveDependencies(step) {
    return step.dependsOn
      .map(dep => this.results[dep])
      .filter(Boolean)
      .join('\n\n---\n\n');
  }

  async _executeStep(step, depContext) {
    const provider = getActiveProvider();
    if (!provider) throw new Error('No active provider');

    const messages = [{
      role: 'system',
      content: `You are the "${step.agent}" agent in a workflow.
Complete your assigned task. If previous context is provided, build upon it.`,
    }];
    if (depContext) {
      messages.push({
        role: 'user',
        content: `Previous results:\n${depContext}\n\nYour task:\n${step.task}`,
      });
    } else {
      messages.push({ role: 'user', content: step.task });
    }

    const response = await provider.chat(messages, { stream: false });
    return response.content || '';
  }
}

// ═══════════════════════════════════════════════════════
// MCP SESSION — Model Context Protocol client
// ═══════════════════════════════════════════════════════

export class MCPSession {
  constructor(url, options = {}) {
    this.url           = url;
    this.apiKey        = options.apiKey || '';
    this.timeout       = options.timeout || 30000;
    this.connected     = false;
    this.tools         = [];
    this._requestId    = 0;
    this._pending      = new Map();   // id → { resolve, reject, timer }
    this._eventHandlers = new Map();  // event → Set<callback>
  }

  /** Connect to the MCP server and discover tools. */
  async connect() {
    try {
      const response = await this._sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Voyage AI', version: '1.0.0' },
      });

      this.connected = true;
      emit('mcp:connected', { url: this.url, server: response.serverInfo });

      // Discover tools
      try {
        const toolsResponse = await this._sendRequest('tools/list', {});
        this.tools = toolsResponse.tools || [];
      } catch { this.tools = []; }

      return { connected: true, tools: this.tools.length };
    } catch (err) {
      this.connected = false;
      throw new Error(`MCP connection failed: ${err.message}`);
    }
  }

  /** List available tools from the MCP server. */
  async listTools() {
    if (!this.connected) throw new Error('Not connected');
    try {
      const response = await this._sendRequest('tools/list', {});
      this.tools = response.tools || [];
      return this.tools;
    } catch { return this.tools; }
  }

  /** Call a tool on the MCP server. */
  async callTool(name, args = {}) {
    if (!this.connected) throw new Error('Not connected');
    const response = await this._sendRequest('tools/call', {
      name,
      arguments: args,
    });
    return response.content || response;
  }

  /** Subscribe to server-initiated events. */
  on(event, callback) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event).add(callback);
  }

  /** Unsubscribe from events. */
  off(event, callback) {
    this._eventHandlers.get(event)?.delete(callback);
  }

  /** Disconnect and clean up. */
  disconnect() {
    for (const { timer } of this._pending.values()) {
      clearTimeout(timer);
    }
    this._pending.clear();
    this._eventHandlers.clear();
    this.connected = false;
    this.tools = [];
    emit('mcp:disconnected', { url: this.url });
  }

  // ── Internal: Send JSON-RPC request via HTTP (browser-compatible) ──

  async _sendRequest(method, params) {
    const id = ++this._requestId;
    const body = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await this._parseResponse(response);

      if (data.error) {
        throw new Error(data.error.message || 'MCP error');
      }

      return data.result || {};
    } catch (err) {
      clearTimeout(timer);
      this._pending.delete(id);
      throw err;
    }
  }

  /**
   * Parse response — handle both JSON and SSE (Server-Sent Events).
   * Some MCP servers use SSE for streaming responses.
   */
  async _parseResponse(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    if (contentType.includes('text/event-stream')) {
      const text = await response.text();
      const lines = text.split('\n');
      let lastData = {};

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            lastData = JSON.parse(line.slice(6));
          } catch { /* skip malformed */ }
        }
      }

      return lastData;
    }

    // Fallback: try JSON anyway
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { result: { raw: text } };
    }
  }
}