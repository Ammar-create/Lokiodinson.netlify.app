// ============================================
//  FILE 11: js/chat.js
//  Chat rendering, messages, markdown, streaming,
//  thinking block, actions, fork, private mode
// ============================================

import { EventBus } from './app.js';
import * as store from './store.js';
import { getActiveProvider, getActiveModel } from './providers.js';
import { executeTool } from './tools.js';
import { saveMemory, searchMemory, streamChatCompletion } from './agents.js';
import {
  escapeHtml, formatTimeAgo, formatDateGroup, formatTokenCount,
  formatDuration, copyToClipboard, shareContent, truncate, generateId
} from './utils.js';

// ──────────────────────────────────
//  State
// ──────────────────────────────────

let activeChatId = null;
let isPrivate = false;
let isStreaming = false;
let streamAbort = null;
let openMenuId = null;
let openMenuEl = null;

// ──────────────────────────────────
//  DOM References (lazy)
// ──────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const el = () => ({
  messages: $('#v-ch-messages'),
  anchor: $('#v-ch-scroll-anchor'),
  emptyState: $('#v-ch-empty-state'),
  typInput: $('#v-typ-input'),
  typSend: $('#v-typ-send'),
  typAttach: $('#v-typ-attach'),
  typBar: $('#v-typing-bar'),
  modelIndicator: $('#v-typ-model-indicator'),
  toolsContainer: $('#v-typ-tools'),
  chatTitle: $('#v-tb-chat-title'),
  chatModelInfo: $('#v-tb-chat-model-info'),
  privateBtn: $('#v-tb-private-btn'),
  editChatBtn: $('#v-tb-edit-chat'),
  pageChat: $('#v-page-chat'),
});

// ──────────────────────────────────
//  Init
// ──────────────────────────────────

export function init() {
  bindTypingBarEvents();
  bindGlobalEvents();
  bindPrivateToggle();
  bindEditChat();
  listenForStreamEvents();
}

// ──────────────────────────────────
//  Load / Switch Chat
// ──────────────────────────────────

export async function loadChat(chatId) {
  activeChatId = chatId;
  const chat = await store.getChat(chatId);
  if (!chat) return;

  isPrivate = !!chat.private;
  updatePrivateUI();
  updateTopbarTitle(chat);

  const messages = await store.getMessages(chatId);

  if (messages.length === 0) {
    const { emptyState, messages: msgEl } = el();
    if (emptyState) emptyState.style.display = '';
    if (msgEl) msgEl.innerHTML = '';
  } else {
    renderMessages(messages);
  }

  // Update model indicator
  const model = await store.getActiveModel();
  updateModelIndicator(model);

  // Focus input
  setTimeout(() => el().typInput?.focus(), 100);
}

// ──────────────────────────────────
//  Render Messages
// ──────────────────────────────────

export function renderMessages(messages) {
  const { emptyState, messages: msgContainer } = el();
  if (!msgContainer) return;

  // Hide empty state
  if (emptyState) emptyState.style.display = 'none';

  // Group by date
  const groups = groupByDate(messages);
  let html = '';

  for (const [dateLabel, msgs] of Object.entries(groups)) {
    html += `
      <div class="v-ch-date-group">
        <div class="v-ch-date-label">${escapeHtml(dateLabel)}</div>
        ${msgs.map(renderSingleMessage).join('')}
      </div>`;
  }

  msgContainer.innerHTML = html;
  bindMessageActions();
  scrollToBottom();
}

// ──────────────────────────────────
//  Append Single Message (streaming)
// ──────────────────────────────────

export function appendMessage(message) {
  const { emptyState, messages: msgContainer } = el();
  if (!msgContainer) return;

  if (emptyState) emptyState.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderSingleMessage(message);
  const msgEl = wrapper.firstElementChild;

  msgContainer.appendChild(msgEl);
  bindMessageActions();
  scrollToBottom();
  return msgEl;
}

// ──────────────────────────────────
//  Render Single Message (HTML)
// ──────────────────────────────────

function renderSingleMessage(msg) {
  if (msg.role === 'user') return renderUserMessage(msg);
  if (msg.role === 'assistant') return renderAssistantMessage(msg);
  if (msg.role === 'system') return renderSystemMessage(msg);
  return '';
}

function renderUserMessage(msg) {
  return `
    <div class="v-ch-msg-user" data-msg-id="${msg.id}">
      <div class="v-ch-msg-bubble">${escapeHtml(msg.content)}</div>
      <div class="v-ch-msg-actions">
        <button class="v-ch-action-btn" data-action="copy" data-msg-id="${msg.id}" title="Copy">📋</button>
        <button class="v-ch-action-btn" data-action="regenerate" data-msg-id="${msg.id}" title="Regenerate">⟳</button>
        <button class="v-ch-action-btn" data-action="menu" data-msg-id="${msg.id}" data-role="user" title="More">⋯</button>
      </div>
    </div>`;
}

function renderAssistantMessage(msg) {
  const model = msg.model || 'AI';
  const initial = model.charAt(0).toUpperCase();

  let thinkingHtml = '';
  if (msg.thinking) {
    const thinkDuration = msg.thinkingDuration
      ? `Thought for ${formatDuration(msg.thinkingDuration)}`
      : 'Show thinking';
    thinkingHtml = `
      <div class="v-th-pill" data-msg-id="${msg.id}">
        <span class="v-th-icon">💡</span>
        <span>${escapeHtml(thinkDuration)}</span>
        <span class="v-th-chevron">▾</span>
      </div>
      <div class="v-th-content">${escapeHtml(msg.thinking)}</div>`;
  }

  // Tool results
  let toolsHtml = '';
  if (msg.toolCalls?.length) {
    toolsHtml = msg.toolCalls.map(tc => `
      <div class="v-ch-tool-result">
        <div class="v-ch-tool-header">
          <span class="v-ch-tool-name">🔧 ${escapeHtml(tc.name)}</span>
          <span class="v-ch-tool-status">${tc.error ? '❌ Error' : '✅ Complete'}</span>
        </div>
        <div class="v-ch-tool-body"><pre>${escapeHtml(
          typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)
        )}</pre></div>
      </div>`).join('');
  }

  // Inline image
  let imageHtml = '';
  if (msg.imageData) {
    imageHtml = `
      <div class="v-ch-inline-image">
        <img src="${escapeHtml(msg.imageData.dataUrl)}" alt="${escapeHtml(msg.imageData.prompt || 'Generated image')}" loading="lazy">
        ${msg.imageData.prompt
          ? `<div class="v-ch-img-caption">"${truncate(escapeHtml(msg.imageData.prompt), 80)}"</div>`
          : ''}
      </div>`;
  }

  // Inline video
  let videoHtml = '';
  if (msg.videoData) {
    videoHtml = `
      <div class="v-ch-inline-video">
        <video controls preload="metadata">
          <source src="${escapeHtml(msg.videoData.dataUrl)}" type="video/mp4">
        </video>
        ${msg.videoData.prompt
          ? `<div class="v-ch-img-caption">"${truncate(escapeHtml(msg.videoData.prompt), 80)}"</div>`
          : ''}
      </div>`;
  }

  // Stats
  let statsHtml = '';
  if (msg.stats) {
    const s = msg.stats;
    statsHtml = `
      <div class="v-st-stats">
        ${s.inputTokens != null ? `<span>↑ ${formatTokenCount(s.inputTokens)} tokens</span>` : ''}
        ${s.outputTokens != null ? `<span>↓ ${formatTokenCount(s.outputTokens)} tokens</span>` : ''}
        ${s.tokensPerSec != null ? `<span>⚡ ${s.tokensPerSec.toFixed(1)} tok/s</span>` : ''}
        ${s.duration != null ? `<span>⏱ ${formatDuration(s.duration)}</span>` : ''}
      </div>`;
  }

  const bodyContent = msg.content ? parseMarkdown(msg.content) : '';

  return `
    <div class="v-ch-msg-ai" data-msg-id="${msg.id}">
      <div class="v-ch-msg-header">
        <div class="v-ch-msg-avatar" data-model="${escapeHtml(model)}">${escapeHtml(initial)}</div>
        <span class="v-ch-msg-model-name">${escapeHtml(model)}</span>
      </div>
      ${thinkingHtml}
      ${toolsHtml}
      ${bodyContent ? `<div class="v-ch-msg-body">${bodyContent}</div>` : ''}
      ${imageHtml}
      ${videoHtml}
      <div class="v-ch-msg-actions">
        <button class="v-ch-action-btn" data-action="copy" data-msg-id="${msg.id}" title="Copy">📋</button>
        <button class="v-ch-action-btn" data-action="regenerate" data-msg-id="${msg.id}" title="Regenerate">⟳</button>
        <button class="v-ch-action-btn" data-action="speak" data-msg-id="${msg.id}" title="Speak">🔊</button>
        <button class="v-ch-action-btn" data-action="share" data-msg-id="${msg.id}" title="Share">↗</button>
        <button class="v-ch-action-btn" data-action="menu" data-msg-id="${msg.id}" data-role="assistant" title="More">⋯</button>
      </div>
      ${statsHtml}
    </div>`;
}

function renderSystemMessage(msg) {
  return `
    <div class="v-ch-msg-system" data-msg-id="${msg.id}">
      <div class="v-ch-system-content">${escapeHtml(msg.content)}</div>
    </div>`;
}

// ──────────────────────────────────
//  Markdown Parser
// ──────────────────────────────────

function parseMarkdown(text) {
  if (!text) return '';

  // Phase 1: Extract and protect code blocks
  const codeBlocks = [];
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || 'text', code });
    return `\x00CODEBLOCK_${idx}\x00`;
  });

  // Phase 2: Extract and protect inline code
  const inlineCodes = [];
  processed = processed.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(code);
    return `\x00INLINE_${idx}\x00`;
  });

  // Phase 3: Escape HTML
  processed = escapeHtml(processed);

  // Phase 4: Block-level elements
  // Split into lines for block parsing
  const lines = processed.split('\n');
  let result = '';
  let inList = false;
  let listType = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code block placeholder
    if (line.includes('\x00CODEBLOCK_')) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      const match = line.match(/\x00CODEBLOCK_(\d+)\x00/);
      if (match) {
        const block = codeBlocks[parseInt(match[1])];
        result += `<div class="v-ch-code-block">
          <div class="v-ch-code-header">
            <span class="v-ch-code-lang">${escapeHtml(block.lang)}</span>
            <button class="v-ch-code-copy" onclick="navigator.clipboard.writeText(this.closest('.v-ch-code-block').querySelector('pre').textContent)">Copy</button>
          </div>
          <pre><code>${escapeHtml(block.code.trimEnd())}</code></pre>
        </div>`;
      }
      continue;
    }

    // Headings
    const h3Match = line.match(/^### (.+)$/);
    if (h3Match) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      result += `<h3>${h3Match[1]}</h3>`;
      continue;
    }
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      result += `<h2>${h2Match[1]}</h2>`;
      continue;
    }
    const h1Match = line.match(/^# (.+)$/);
    if (h1Match) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      result += `<h1>${h1Match[1]}</h1>`;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      result += '<hr>';
      continue;
    }

    // Blockquote
    if (line.startsWith('&gt; ') || line.startsWith('> ')) {
      if (inList) { result += listType === 'ul' ? '</ul>' : '</ol>'; inList = false; }
      const content = line.replace(/^(&gt;|>) /, '');
      result += `<blockquote>${content}</blockquote>`;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*] (.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result += listType === 'ul' ? '</ul>' : '</ol>';
        result += '<ul>';
        inList = true;
        listType = 'ul';
      }
      result += `<li>${applyInlineFormatting(ulMatch[2])}</li>`;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\. (.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result += listType === 'ul' ? '</ul>' : '</ol>';
        result += '<ol>';
        inList = true;
        listType = 'ol';
      }
      result += `<li>${applyInlineFormatting(olMatch[2])}</li>`;
      continue;
    }

    // Close list if we're in one and hit non-list content
    if (inList) {
      result += listType === 'ul' ? '</ul>' : '</ol>';
      inList = false;
    }

    // Empty line
    if (line.trim() === '') {
      continue;
    }

    // Regular paragraph
    result += `<p>${applyInlineFormatting(line)}</p>`;
  }

  // Close any open list
  if (inList) {
    result += listType === 'ul' ? '</ul>' : '</ol>';
  }

  // Phase 5: Restore inline code
  result = result.replace(/\x00INLINE_(\d+)\x00/g, (_, idx) => {
    return `<code>${inlineCodes[parseInt(idx)]}</code>`;
  });

  return result;
}

function applyInlineFormatting(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Images (standalone)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" style="max-width:100%;border-radius:8px">');
  return text;
}

// ──────────────────────────────────
//  Welcome / Empty State
// ──────────────────────────────────

export function renderWelcomeState() {
  const { emptyState, messages: msgContainer } = el();
  if (!msgContainer || !emptyState) return;

  msgContainer.innerHTML = '';
  emptyState.style.display = '';
}

async function renderTemplateCards() {
  const templates = await store.getTemplates();
  const container = el().emptyState;
  if (!container || !templates.length) return;

  const defaultTemplates = [
    { icon: '✍️', label: 'Write code', prompt: 'Help me write code for' },
    { icon: '🔍', label: 'Research', prompt: 'Research and explain' },
    { icon: '🎨', label: 'Generate image', prompt: 'Generate an image of' },
    { icon: '📊', label: 'Analyze data', prompt: 'Help me analyze this data:' },
  ];

  const items = templates.length ? templates : defaultTemplates;

  container.innerHTML = `
    <div class="v-ch-empty">
      <div class="v-ch-empty-icon">🧭</div>
      <div class="v-ch-empty-greeting">What are you working on?</div>
      <div class="v-ch-empty-sub">Start a conversation or try a template below</div>
      <div class="v-ch-templates">
        ${items.map((t, i) => `
          <div class="v-ch-template-card" data-template-index="${i}" data-prompt="${escapeHtml(t.prompt || '')}">
            <div class="v-ch-template-thumb">${t.icon}</div>
            <div class="v-ch-template-label">${escapeHtml(t.label)}</div>
          </div>`).join('')}
      </div>
    </div>`;

  // Bind template clicks
  container.querySelectorAll('.v-ch-template-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      const input = el().typInput;
      if (input && prompt) {
        input.value = prompt + ' ';
        input.focus();
      }
    });
  });
}

// ──────────────────────────────────
//  Sending Messages
// ──────────────────────────────────

async function handleSend() {
  const input = el().typInput;
  if (!input) return;

  const content = input.value.trim();
  if (!content || isStreaming) return;

  input.value = '';
  autoResizeInput(input);

  // Create or get chat
  if (!activeChatId) {
    const title = truncate(content, 50);
    activeChatId = await store.createChat(title, isPrivate);
    EventBus.emit('chat:created', { chatId: activeChatId });
  }

  // Save user message
  const userMsg = {
    chatId: activeChatId,
    role: 'user',
    content,
    createdAt: Date.now(),
  };
  userMsg.id = await store.addMessage(userMsg);
  appendMessage(userMsg);

  // Update chat timestamp
  await store.updateChat(activeChatId, { updatedAt: Date.now() });

  // Stream AI response
  await streamResponse(content);
}

async function streamResponse(userContent) {
  isStreaming = true;
  updateStreamingUI(true);

  const startTime = Date.now();
  const model = await store.getActiveModel();

  // Create placeholder AI message
  const aiMsg = {
    chatId: activeChatId,
    role: 'assistant',
    content: '',
    model: model?.name || 'AI',
    thinking: null,
    thinkingDuration: null,
    toolCalls: [],
    stats: null,
    createdAt: Date.now(),
  };
  aiMsg.id = await store.addMessage(aiMsg);

  // Render placeholder with typing indicator
  const msgEl = appendMessage({ ...aiMsg, content: '' });
  if (msgEl) {
    const body = msgEl.querySelector('.v-ch-msg-body');
    if (body) body.innerHTML = '<div class="v-ch-typing-dots"><span></span><span></span><span></span></div>';
  }

  try {
    // Build message history
    const history = await buildMessageHistory();

    // Stream
    let fullContent = '';
    let thinkingContent = '';
    let thinkingDone = false;
    let toolCalls = [];
    let tokenCount = 0;

    const stream = streamChatCompletion(history, {
      model: model?.name,
      stream: true,
    });

    // Store abort controller
    streamAbort = stream.abort?.bind?.(stream) || null;

    for await (const event of stream) {
      if (event.type === 'thinking') {
        thinkingContent += event.content;
        updateThinkingBlock(msgEl, thinkingContent, false);
      }

      if (event.type === 'thinking_done') {
        thinkingDone = true;
        aiMsg.thinking = thinkingContent;
        aiMsg.thinkingDuration = event.duration;
        updateThinkingBlock(msgEl, thinkingContent, true, event.duration);
      }

      if (event.type === 'content') {
        fullContent += event.content;
        tokenCount++;
        updateMessageBody(msgEl, fullContent);
        scrollToBottom();
      }

      if (event.type === 'tool_call') {
        // Show tool being executed
        toolCalls.push({ name: event.name, params: event.params, status: 'running' });
        updateToolResults(msgEl, toolCalls);

        // Execute tool
        try {
          const result = await executeTool(event.name, event.params);
          toolCalls[toolCalls.length - 1].result = result;
          toolCalls[toolCalls.length - 1].status = 'done';
        } catch (err) {
          toolCalls[toolCalls.length - 1].error = err.message;
          toolCalls[toolCalls.length - 1].status = 'error';
        }
        updateToolResults(msgEl, toolCalls);

        EventBus.emit('tool:invoked', { tool: event.name, result: toolCalls[toolCalls.length - 1] });
      }

      if (event.type === 'done') {
        break;
      }

      if (event.type === 'error') {
        throw new Error(event.message);
      }
    }

    // Finalize
    const duration = Date.now() - startTime;
    aiMsg.content = fullContent;
    aiMsg.thinking = thinkingContent || null;
    aiMsg.thinkingDuration = thinkingDone ? aiMsg.thinkingDuration : null;
    aiMsg.toolCalls = toolCalls.length ? toolCalls : null;
    aiMsg.stats = {
      inputTokens: event?.usage?.prompt_tokens || null,
      outputTokens: tokenCount,
      tokensPerSec: tokenCount / (duration / 1000),
      duration,
    };

    await store.updateMessage(aiMsg.id, aiMsg);
    await store.updateChat(activeChatId, { updatedAt: Date.now() });

    // Render final state
    rerenderMessage(msgEl, aiMsg);
    scrollToBottom();

    // Auto-memory: save key facts
    if (!isPrivate && fullContent.length > 200) {
      tryAutoMemory(userContent, fullContent);
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled — save partial content
      aiMsg.content = fullContent || '*[Cancelled]*';
      await store.updateMessage(aiMsg.id, aiMsg);
    } else {
      console.error('Stream error:', err);
      aiMsg.content = fullContent || `*Error: ${escapeHtml(err.message)}*`;
      await store.updateMessage(aiMsg.id, aiMsg);
      EventBus.emit('toast:show', { message: err.message, type: 'error' });
    }
    rerenderMessage(msgEl, aiMsg);
  } finally {
    isStreaming = false;
    streamAbort = null;
    updateStreamingUI(false);
    scrollToBottom();
  }
}

// ──────────────────────────────────
//  Build Message History for API
// ──────────────────────────────────

async function buildMessageHistory() {
  const messages = await store.getMessages(activeChatId);

  // Get system prompt from settings
  const settings = await store.getAllSettings();
  const memories = await searchMemory(messages[messages.length - 1]?.content || '', 5);

  const systemPrompt = buildSystemPrompt(settings, memories);

  const history = [{ role: 'system', content: systemPrompt }];

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      history.push({
        role: msg.role,
        content: msg.content || '',
      });
    }
  }

  return history;
}

function buildSystemPrompt(settings, memories) {
  const parts = ['You are Voyage AI, a helpful assistant.'];

  // Nickname
  const nickname = settings.nickname;
  if (nickname) {
    parts.push(`The user's name is ${nickname}. Address them by this name.`);
  }

  // Occupation
  const occupation = settings.occupation;
  if (occupation) {
    parts.push(`The user works as: ${occupation}.`);
  }

  // Tone
  const tone = settings.tone;
  if (tone && tone !== 'default') {
    const toneMap = {
      professional: 'Maintain a professional, polished tone.',
      friendly: 'Be warm, friendly, and approachable.',
      concise: 'Be brief and to the point. Minimize filler.',
      creative: 'Be creative and expressive. Use vivid language.',
    };
    parts.push(toneMap[tone] || '');
  }

  // Characteristics
  const warmth = settings.warmth;
  if (warmth === 'less') parts.push('Be direct and matter-of-fact.');
  if (warmth === 'more') parts.push('Be warm and empathetic.');

  const enthusiasm = settings.enthusiasm;
  if (enthusiasm === 'less') parts.push('Keep responses calm and measured.');
  if (enthusiasm === 'more') parts.push('Show enthusiasm and energy.');

  const emoji = settings.emoji_usage;
  if (emoji === 'less') parts.push('Avoid using emojis.');
  if (emoji === 'more') parts.push('Use emojis frequently to add personality.');

  const headers = settings.headers_usage;
  if (headers === 'less') parts.push('Use minimal formatting. Avoid headers unless essential.');
  if (headers === 'more') parts.push('Use headers, bullet points, and structured formatting liberally.');

  // Custom instructions
  const custom = settings.custom_instructions;
  if (custom) {
    parts.push(`Additional instructions: ${custom}`);
  }

  // Memories
  if (memories?.length) {
    const memText = memories.map(m => `- ${m.content}`).join('\n');
    parts.push(`Relevant memories:\n${memText}`);
  }

  return parts.filter(Boolean).join('\n');
}

// ──────────────────────────────────
//  Streaming UI Updates
// ──────────────────────────────────

function updateMessageBody(msgEl, content) {
  if (!msgEl) return;
  let body = msgEl.querySelector('.v-ch-msg-body');
  if (!body) {
    body = document.createElement('div');
    body.className = 'v-ch-msg-body';
    // Insert before actions
    const actions = msgEl.querySelector('.v-ch-msg-actions');
    if (actions) {
      msgEl.insertBefore(body, actions);
    } else {
      msgEl.appendChild(body);
    }
  }
  body.innerHTML = parseMarkdown(content);
}

function updateThinkingBlock(msgEl, content, isDone, duration) {
  if (!msgEl) return;

  let pill = msgEl.querySelector('.v-th-pill');
  let thinkEl = msgEl.querySelector('.v-th-content');

  if (!pill) {
    // Create thinking block
    const header = msgEl.querySelector('.v-ch-msg-header');
    if (!header) return;

    pill = document.createElement('div');
    pill.className = 'v-th-pill';
    pill.innerHTML = `
      <span class="v-th-icon">💡</span>
      <span>Thinking...</span>
      <span class="v-th-chevron">▾</span>`;
    pill.addEventListener('click', () => toggleThinking(pill));

    thinkEl = document.createElement('div');
    thinkEl.className = 'v-th-content';

    header.after(pill);
    pill.after(thinkEl);
  }

  // Update content
  thinkEl.textContent = content;

  // Update pill label
  const label = pill.querySelector('span:nth-child(2)');
  if (isDone && duration) {
    label.textContent = `Thought for ${formatDuration(duration)}`;
  } else {
    label.textContent = 'Thinking...';
  }
}

function updateToolResults(msgEl, toolCalls) {
  if (!msgEl) return;

  let container = msgEl.querySelector('.v-ch-tool-results');
  if (!container) {
    container = document.createElement('div');
    container.className = 'v-ch-tool-results';
    const header = msgEl.querySelector('.v-ch-msg-header') || msgEl.querySelector('.v-th-content') || msgEl.querySelector('.v-th-pill');
    if (header) {
      // Insert after thinking block if exists, otherwise after header
      let insertAfter = msgEl.querySelector('.v-th-content') || header;
      insertAfter.after(container);
    }
  }

  container.innerHTML = toolCalls.map(tc => `
    <div class="v-ch-tool-result">
      <div class="v-ch-tool-header">
        <span class="v-ch-tool-name">🔧 ${escapeHtml(tc.name)}</span>
        <span class="v-ch-tool-status">${
          tc.status === 'running' ? '⏳ Running...' :
          tc.status === 'error' ? '❌ Error' :
          '✅ Complete'
        }</span>
      </div>
      ${tc.result ? `<div class="v-ch-tool-body"><pre>${
        escapeHtml(typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2))
      }</pre></div>` : ''}
      ${tc.error ? `<div class="v-ch-tool-body v-ch-tool-error"><pre>${escapeHtml(tc.error)}</pre></div>` : ''}
    </div>`).join('');
}

function rerenderMessage(msgEl, msg) {
  if (!msgEl) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderSingleMessage(msg);
  const newEl = wrapper.firstElementChild;
  msgEl.replaceWith(newEl);
  bindMessageActions();

  // Re-bind thinking toggle
  const pill = newEl.querySelector('.v-th-pill');
  if (pill) pill.addEventListener('click', () => toggleThinking(pill));
}

function updateStreamingUI(streaming) {
  const input = el().typInput;
  const send = el().typSend;

  if (input) {
    input.placeholder = streaming ? 'AI is responding...' : 'Ask anything...';
    input.disabled = streaming;
  }
  if (send) {
    send.disabled = streaming;
    send.innerHTML = streaming ? '■' : '↑';
    if (streaming) {
      send.title = 'Stop generation';
      send.onclick = () => abortStream();
    } else {
      send.title = 'Send';
      send.onclick = handleSend;
    }
  }
}

function abortStream() {
  if (streamAbort) streamAbort();
  isStreaming = false;
  updateStreamingUI(false);
}

// ──────────────────────────────────
//  Thinking Toggle
// ──────────────────────────────────

function toggleThinking(pill) {
  pill.classList.toggle('v-th-expanded');
  const content = pill.nextElementSibling;
  if (content?.classList.contains('v-th-content')) {
    content.classList.toggle('v-th-show');
  }
}

// ──────────────────────────────────
//  Message Actions
// ──────────────────────────────────

function bindMessageActions() {
  document.querySelectorAll('.v-ch-action-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => handleAction(e));
  });

  // Thinking pills
  document.querySelectorAll('.v-th-pill:not([data-bound])').forEach(pill => {
    pill.dataset.bound = 'true';
    pill.addEventListener('click', () => toggleThinking(pill));
  });
}

async function handleAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const msgId = parseInt(btn.dataset.msgId);
  const role = btn.dataset.role;

  switch (action) {
    case 'copy':
      await handleCopy(msgId);
      break;
    case 'regenerate':
      await handleRegenerate(msgId);
      break;
    case 'speak':
      await handleSpeak(msgId);
      break;
    case 'share':
      await handleShare(msgId);
      break;
    case 'menu':
      showContextMenu(msgId, role, btn);
      break;
  }
}

async function handleCopy(msgId) {
  const msg = await store.dbGet('messages', msgId);
  if (!msg) return;
  await copyToClipboard(msg.content);
  EventBus.emit('toast:show', { message: 'Copied to clipboard', type: 'success' });
}

async function handleRegenerate(msgId) {
  if (isStreaming) return;

  const msg = await store.dbGet('messages', msgId);
  if (!msg) return;

  // Delete this message and everything after it
  await store.deleteMessagesFrom(activeChatId, msgId);

  // Re-render
  const messages = await store.getMessages(activeChatId);
  renderMessages(messages);

  // Re-send with last user message as context
  const lastUser = messages.filter(m => m.role === 'user').pop();
  if (lastUser) {
    await streamResponse(lastUser.content);
  }
}

async function handleSpeak(msgId) {
  const msg = await store.dbGet('messages', msgId);
  if (!msg) return;

  try {
    const provider = getActiveProvider();
    if (!provider?.textToSpeech) {
      EventBus.emit('toast:show', { message: 'TTS not available for this provider', type: 'warning' });
      return;
    }
    const audioBlob = await provider.textToSpeech(msg.content);
    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.play();
  } catch (err) {
    EventBus.emit('toast:show', { message: 'TTS failed: ' + err.message, type: 'error' });
  }
}

async function handleShare(msgId) {
  const msg = await store.dbGet('messages', msgId);
  if (!msg) return;
  await shareContent(msg.content);
}

// ──────────────────────────────────
//  Context Menus
// ──────────────────────────────────

function showContextMenu(msgId, role, anchorEl) {
  closeContextMenu();

  const menu = document.createElement('div');
  menu.className = 'v-cm-menu';
  menu.style.position = 'fixed';

  // Calculate position near the button
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  if (role === 'user') {
    menu.innerHTML = `
      <div class="v-cm-item" data-action="edit"><span class="v-cm-icon">✎</span> Edit</div>
      <div class="v-cm-item" data-action="fork"><span class="v-cm-icon">⑂</span> Fork from here</div>
      <div class="v-cm-divider"></div>
      <div class="v-cm-item v-cm-danger" data-action="delete"><span class="v-cm-icon">🗑</span> Delete</div>`;
  } else {
    menu.innerHTML = `
      <div class="v-cm-item" data-action="copy-select"><span class="v-cm-icon">✂</span> Copy & Select</div>
      <div class="v-cm-item" data-action="share"><span class="v-cm-icon">↗</span> Share</div>
      <div class="v-cm-divider"></div>
      <div class="v-cm-item v-cm-danger" data-action="delete"><span class="v-cm-icon">🗑</span> Delete</div>`;
  }

  document.body.appendChild(menu);
  openMenuEl = menu;
  openMenuId = msgId;

  // Position fix if overflowing
  const menuRect = menu.getBoundingClientRect();
  if (menuRect.bottom > window.innerHeight) {
    menu.style.top = `${rect.top - menuRect.height - 4}px`;
  }
  if (menuRect.left < 0) {
    menu.style.right = 'auto';
    menu.style.left = '8px';
  }

  // Bind menu actions
  menu.querySelectorAll('.v-cm-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      await handleMenuAction(msgId, role, action);
      closeContextMenu();
    });
  });
}

function closeContextMenu() {
  if (openMenuEl) {
    openMenuEl.remove();
    openMenuEl = null;
    openMenuId = null;
  }
}

async function handleMenuAction(msgId, role, action) {
  switch (action) {
    case 'edit':
      await handleEditMessage(msgId);
      break;
    case 'fork':
      await handleFork(activeChatId, msgId);
      break;
    case 'delete':
      await handleDeleteMessage(msgId);
      break;
    case 'copy-select': {
      const msg = await store.dbGet('messages', msgId);
      if (msg) {
        await copyToClipboard(msg.content);
        // Also select the text
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"] .v-ch-msg-body`);
        if (msgEl) {
          const range = document.createRange();
          range.selectNodeContents(msgEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        EventBus.emit('toast:show', { message: 'Copied and selected', type: 'success' });
      }
      break;
    }
    case 'share':
      await handleShare(msgId);
      break;
  }
}

// ──────────────────────────────────
//  Edit Message
// ──────────────────────────────────

export async function handleEditMessage(messageId) {
  const msg = await store.dbGet('messages', messageId);
  if (!msg || msg.role !== 'user') return;

  const msgEl = document.querySelector(`.v-ch-msg-user[data-msg-id="${messageId}"]`);
  if (!msgEl) return;

  const bubble = msgEl.querySelector('.v-ch-msg-bubble');
  const originalContent = msg.content;

  // Replace bubble with edit textarea
  bubble.innerHTML = `
    <div class="v-ch-edit-wrap">
      <textarea class="v-ch-edit-input">${escapeHtml(originalContent)}</textarea>
      <div class="v-ch-edit-actions">
        <button class="v-ct-btn v-ct-btn-primary v-ct-btn-sm v-ch-edit-save">Save & Regenerate</button>
        <button class="v-ct-btn v-ct-btn-ghost v-ct-btn-sm v-ch-edit-cancel">Cancel</button>
      </div>
    </div>`;

  const textarea = bubble.querySelector('.v-ch-edit-input');
  textarea.focus();
  textarea.selectionStart = textarea.value.length;

  // Auto resize
  textarea.addEventListener('input', () => autoResizeInput(textarea));

  // Cancel
  bubble.querySelector('.v-ch-edit-cancel').addEventListener('click', () => {
    bubble.textContent = originalContent;
  });

  // Save & Regenerate
  bubble.querySelector('.v-ch-edit-save').addEventListener('click', async () => {
    const newContent = textarea.value.trim();
    if (!newContent) return;

    // Update message
    await store.updateMessage(messageId, { content: newContent });

    // Delete all messages after this one
    await store.deleteMessagesFrom(activeChatId, messageId);

    // Re-render and stream new response
    const messages = await store.getMessages(activeChatId);
    renderMessages(messages);
    await streamResponse(newContent);
  });
}

// ──────────────────────────────────
//  Delete Message
// ──────────────────────────────────

export async function handleDeleteMessage(messageId) {
  await store.deleteMessage(messageId);

  // Remove from DOM
  const msgEl = document.querySelector(`[data-msg-id="${messageId}"]`);
  if (msgEl) {
    msgEl.style.transition = 'opacity 200ms ease, transform 200ms ease';
    msgEl.style.opacity = '0';
    msgEl.style.transform = 'translateX(-20px)';
    setTimeout(() => msgEl.remove(), 200);
  }

  // Check if chat is now empty
  const remaining = await store.getMessages(activeChatId);
  if (remaining.length === 0) {
    renderWelcomeState();
  }
}

// ──────────────────────────────────
//  Fork
// ──────────────────────────────────

export async function handleFork(chatId, messageId) {
  const messages = await store.getMessages(chatId);
  const forkMessages = messages.filter(m => {
    const idx = messages.findIndex(x => x.id === m.id);
    const targetIdx = messages.findIndex(x => x.id === messageId);
    return idx <= targetIdx;
  });

  if (forkMessages.length === 0) return;

  // Create new chat
  const newTitle = `Fork: ${truncate(forkMessages[0].content, 30)}`;
  const newChatId = await store.createChat(newTitle, isPrivate);

  // Copy messages
  for (const msg of forkMessages) {
    await store.addMessage({
      chatId: newChatId,
      role: msg.role,
      content: msg.content,
      model: msg.model,
      thinking: msg.thinking,
      thinkingDuration: msg.thinkingDuration,
      toolCalls: msg.toolCalls,
      stats: msg.stats,
      createdAt: Date.now(),
    });
  }

  // Navigate to new chat
  EventBus.emit('chat:created', { chatId: newChatId });
  EventBus.emit('chat:selected', { chatId: newChatId });
  EventBus.emit('toast:show', { message: 'Chat forked', type: 'success' });
}

// ──────────────────────────────────
//  Private Mode
// ──────────────────────────────────

export function togglePrivateMode() {
  isPrivate = !isPrivate;
  updatePrivateUI();

  if (activeChatId) {
    store.updateChat(activeChatId, { private: isPrivate });
  }

  EventBus.emit('private:toggled', { enabled: isPrivate });
  EventBus.emit('toast:show', {
    message: isPrivate ? 'Private mode enabled — messages won\'t be saved' : 'Private mode disabled',
    type: isPrivate ? 'warning' : 'success',
  });
}

function updatePrivateUI() {
  const btn = el().privateBtn;
  if (!btn) return;
  btn.style.display = '';
  btn.classList.toggle('v-pv-active', isPrivate);
  btn.innerHTML = isPrivate ? '🔒' : '🔓';
  btn.title = isPrivate ? 'Private mode ON — click to disable' : 'Private mode OFF — click to enable';
}

function bindPrivateToggle() {
  const btn = el().privateBtn;
  if (btn) {
    btn.addEventListener('click', togglePrivateMode);
  }
}

// ──────────────────────────────────
//  Edit Chat Name
// ──────────────────────────────────

function bindEditChat() {
  const btn = el().editChatBtn;
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!activeChatId) return;

    const chat = await store.getChat(activeChatId);
    if (!chat) return;

    const newTitle = prompt('Rename chat:', chat.title);
    if (newTitle && newTitle.trim()) {
      await store.updateChat(activeChatId, { title: newTitle.trim() });
      updateTopbarTitle({ ...chat, title: newTitle.trim() });
      EventBus.emit('chat:renamed', { chatId: activeChatId, title: newTitle.trim() });
    }
  });
}

function updateTopbarTitle(chat) {
  const titleEl = el().chatTitle;
  const modelEl = el().chatModelInfo;

  if (titleEl) titleEl.textContent = chat?.title || 'New Chat';
  if (modelEl) {
    const model = getActiveModel();
    modelEl.textContent = model ? `${model.name} · ${model.provider}` : '';
  }
}

function updateModelIndicator(model) {
  const indicator = el().modelIndicator;
  if (!indicator || !model) return;

  indicator.innerHTML = `
    <span class="v-typ-model-dot"></span>
    <span>${escapeHtml(model.name)}</span>`;
}

// ──────────────────────────────────
//  Typing Bar Events
// ──────────────────────────────────

function bindTypingBarEvents() {
  const input = el().typInput;
  const send = el().typSend;
  const attach = el().typAttach;

  if (send) {
    send.addEventListener('click', handleSend);
  }

  if (input) {
    // Enter to send (Shift+Enter for newline)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => autoResizeInput(input));

    // Paste handling for images
    input.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            EventBus.emit('media:pasted', { file });
          }
          break;
        }
      }
    });
  }

  if (attach) {
    attach.addEventListener('click', () => {
      EventBus.emit('media:open-picker', { context: 'chat' });
    });
  }

  // Tool chips
  bindToolChips();
}

function bindToolChips() {
  const container = el().toolsContainer;
  if (!container) return;

  container.addEventListener('click', (e) => {
    const chip = e.target.closest('.v-ct-chip');
    if (!chip) return;
    chip.classList.toggle('v-ct-chip-active');
    EventBus.emit('tool:toggled', {
      tool: chip.dataset.tool,
      active: chip.classList.contains('v-ct-chip-active'),
    });
  });
}

function autoResizeInput(input) {
  if (!input) return;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

// ──────────────────────────────────
//  Global Events
// ──────────────────────────────────

function bindGlobalEvents() {
  // Close context menu on outside click
  document.addEventListener('click', (e) => {
    if (openMenuEl && !openMenuEl.contains(e.target) && !e.target.closest('.v-ch-action-btn[data-action="menu"]')) {
      closeContextMenu();
    }
  });

  // Close context menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeContextMenu();
      if (isStreaming) abortStream();
    }
  });

  // Chat selection from sidebar
  EventBus.on('chat:selected', async ({ chatId }) => {
    await loadChat(chatId);
  });

  // New chat created
  EventBus.on('chat:created', async ({ chatId }) => {
    await loadChat(chatId);
  });

  // Model changed
  EventBus.on('model:changed', async (data) => {
    const model = await store.getActiveModel();
    updateModelIndicator(model);
    updateTopbarTitle(await store.getChat(activeChatId));
  });
}

function listenForStreamEvents() {
  // These are handled internally by streamChatCompletion
  // but we listen for external abort requests
  EventBus.on('chat:abort', () => {
    if (isStreaming) abortStream();
  });
}

// ──────────────────────────────────
//  Utility: Group by Date
// ──────────────────────────────────

function groupByDate(messages) {
  const groups = {};
  for (const msg of messages) {
    const date = new Date(msg.createdAt);
    const label = formatDateGroup(date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
  }
  return groups;
}

function scrollToBottom() {
  const anchor = el().anchor;
  if (anchor) {
    requestAnimationFrame(() => {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }
}

// ──────────────────────────────────
//  Auto Memory (background)
// ──────────────────────────────────

async function tryAutoMemory(userContent, aiContent) {
  try {
    // Simple heuristic: if user shared personal info, save it
    const personalPatterns = [
      /my name is (\w+)/i,
      /i work (?:as|at|for) (.+)/i,
      /i('m| am) a (.+)/i,
      /i live in (.+)/i,
      /i prefer (.+)/i,
      /my favorite (.+) is (.+)/i,
    ];

    for (const pattern of personalPatterns) {
      const match = userContent.match(pattern);
      if (match) {
        const existing = await store.getMemories();
        const isDuplicate = existing.some(m =>
          m.content.toLowerCase().includes(match[0].toLowerCase())
        );
        if (!isDuplicate) {
          await saveMemory(match[0]);
          EventBus.emit('memory:added', { content: match[0] });
        }
        break;
      }
    }
  } catch (err) {
    // Silent fail — auto-memory is non-critical
    console.warn('Auto-memory failed:', err);
  }
}