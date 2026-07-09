/* ===== AquaLab - AI Model Testing Lab ===== */

(() => {
    'use strict';

    // ===== Model Registry =====
    const MODELS = {
        text: {
            standard: [
                { id: 'agnes', name: 'Agnes 2.0 Flash' },
                { id: 'gpt-5.4-nano', name: 'GPT 5.4 Nano' },
                { id: 'gemini-3', name: 'Gemini 3.0 Flash' },
                { id: 'grok', name: 'Grok 4.2 Fast' },
                { id: 'nova', name: 'Amazon Nova Fast' },
                { id: 'grok-4.2-thinking', name: 'Grok 4.2 Reasoning' },
                { id: 'gpt-oss', name: 'GPT-OSS 120B' },
                { id: 'glm-5.1', name: 'GLM 5.1' },
                { id: 'deepseek-v3.2', name: 'DeepSeek V3.2' },
                { id: 'kimi-k2.5', name: 'Kimi K2.5' },
                { id: 'kimi-k2.6', name: 'Kimi K2.6' },
                { id: 'qwen', name: 'Qwen Coder' },
                { id: 'mistral', name: 'Mistral' },
                { id: 'mistral-3.5', name: 'Mistral 3.5 128B' },
                { id: 'step-3.7', name: 'Step 3.7 Flash' },
                { id: 'qwen-3.7', name: 'Qwen 3.7 Plus' },
                { id: 'llama-4', name: 'Llama 4 Maverick' },
                { id: 'deepseek-v3', name: 'DeepSeek V3' },
                { id: 'deepseek-v4', name: 'DeepSeek V4 Flash' },
                { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
                { id: 'deepseek-v3.1', name: 'DeepSeek V3.1 Terminus' },
                { id: 'gemini-3.1-lite', name: 'Gemini 3.1 Flash Lite' },
                { id: 'nemotron', name: 'Nemotron 3 Ultra' },
                { id: 'llama-3.1', name: 'Llama 3.1 8B' },
                { id: 'minimax-m2.7', name: 'MiniMax M2.7' },
                { id: 'minimax-m3', name: 'MiniMax M3' },
                { id: 'gemma-4', name: 'Gemma 4 31B' },
                { id: 'qwen-3.6', name: 'Qwen 3.6 Plus' },
                { id: 'mimo-v2.5', name: 'Mimo V2.5' },
                { id: 'mimo-v2.5-pro', name: 'Mimo V2.5 Pro' },
                { id: 'grok-4.3', name: 'Grok 4.3' },
                { id: 'hermes', name: 'Hermes 4 70B' },
                { id: 'mercury', name: 'Mercury 2' },
                { id: 'diffusion-gemma', name: 'Diffusion Gemma 26B' },
            ],
            premium: [
                { id: 'kimi-k2.7', name: 'Kimi K2.7 Code' },
                { id: 'haiku-4.5', name: 'Claude Haiku 4.5' },
                { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' },
                { id: 'gpt-5.4', name: 'GPT 5.4' },
                { id: 'gpt-5.4-mini', name: 'GPT 5.4 Mini' },
                { id: 'glm-5.2', name: 'GLM 5.2' },
                { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
                { id: 'gemini-3.5', name: 'Gemini 3.5 Flash' },
                { id: 'sonnet-4.6', name: 'Claude Sonnet 4.6' },
                { id: 'opus-4.5', name: 'Claude Opus 4.5' },
                { id: 'opus-4.6', name: 'Claude Opus 4.6' },
                { id: 'opus-4.7', name: 'Claude Opus 4.7' },
                { id: 'opus-4.8', name: 'Claude Opus 4.8' },
                { id: 'gpt-5.5', name: 'GPT 5.5' },
                { id: 'sonar', name: 'Perplexity Sonar' },
            ]
        },
        image: [
            { id: 'qwen-image', name: 'Qwen Image' },
            { id: 'ideogram', name: 'Ideogram V4' },
            { id: 'gptimage-2', name: 'GPT Image 2' },
            { id: 'agnes-image', name: 'Agnes Image 2.1 Flash' },
        ],
        tts: [
            { id: 'mimo-v2.5-tts', name: 'MiMo V2.5 TTS' },
            { id: 'mimo-v2.5-tts-voicedesign', name: 'MiMo TTS Voice Design' },
            { id: 'mimo-v2.5-tts-voiceclone', name: 'MiMo TTS Voice Clone' },
        ],
        ratios: [
            { id: 'square', name: 'Square (1:1)' },
            { id: 'portrait', name: 'Portrait (3:4)' },
            { id: 'landscape', name: 'Landscape (4:3)' },
        ]
    };

    // ===== State =====
    const state = {
        settings: {
            apiKey: '',
            baseUrl: 'https://api.aquadevs.com/v1',
            systemPrompt: 'You are a helpful assistant.',
        },
        chat: {
            model: 'gpt-5.4-nano',
            messages: [],
            temp: 0.7,
            maxTokens: 2048,
            streaming: false,
            controller: null,
        },
        image: {
            model: 'qwen-image',
            ratio: 'square',
            history: [],
        },
        tts: {
            model: 'mimo-v2.5-tts',
            voiceName: 'Alloy',
            voiceDescription: '',
            audioBlob: null,
        },
        activeTab: 'chat',
        sidebarOpen: true,
    };

    // ===== DOM Refs =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ===== Init =====
    function init() {
        loadSettings();
        setupNavigation();
        setupSidebar();
        setupChat();
        setupImage();
        setupTTS();
        setupSettings();
        setupCustomSelects();
        setupMobile();
        showEmptyState();
    }

    // ===== Settings =====
    function loadSettings() {
        try {
            const saved = localStorage.getItem('aqualab_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(state.settings, parsed);
            }
            const chatModel = localStorage.getItem('aqualab_chat_model');
            if (chatModel) state.chat.model = chatModel;
            const imageModel = localStorage.getItem('aqualab_image_model');
            if (imageModel) state.image.model = imageModel;
            const ttsModel = localStorage.getItem('aqualab_tts_model');
            if (ttsModel) state.tts.model = ttsModel;
            const systemPrompt = localStorage.getItem('aqualab_system_prompt');
            if (systemPrompt) state.settings.systemPrompt = systemPrompt;
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('aqualab_settings', JSON.stringify({
                apiKey: state.settings.apiKey,
                baseUrl: state.settings.baseUrl,
            }));
            localStorage.setItem('aqualab_system_prompt', state.settings.systemPrompt);
            localStorage.setItem('aqualab_chat_model', state.chat.model);
            localStorage.setItem('aqualab_image_model', state.image.model);
            localStorage.setItem('aqualab_tts_model', state.tts.model);
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    // ===== Navigation =====
    function setupNavigation() {
        $$('.nav-item[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab === state.activeTab) return;

                // Update nav
                $$('.nav-item[data-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update panels
                $$('.panel').forEach(p => p.classList.remove('active'));
                $(`#panel-${tab}`).classList.add('active');

                state.activeTab = tab;

                // Focus appropriate input
                if (tab === 'chat') $('#chat-input').focus();
                if (tab === 'image') $('#image-input').focus();
                if (tab === 'tts') $('#tts-input').focus();

                // Close mobile sidebar
                closeMobileSidebar();
            });
        });
    }

    // ===== Sidebar =====
    function setupSidebar() {
        $('#sidebar-toggle').addEventListener('click', () => {
            const sidebar = $('#sidebar');
            sidebar.classList.toggle('collapsed');
            state.sidebarOpen = !sidebar.classList.contains('collapsed');
        });
    }

    // ===== Mobile =====
    function setupMobile() {
        $('#mobile-menu-btn').addEventListener('click', () => {
            $('#sidebar').classList.add('open');
            $('#sidebar-overlay').classList.add('open');
        });

        $('#sidebar-overlay').addEventListener('click', closeMobileSidebar);
    }

    function closeMobileSidebar() {
        $('#sidebar').classList.remove('open');
        $('#sidebar-overlay').classList.remove('open');
    }

    // ===== Custom Select System =====
    function setupCustomSelects() {
        setupModelSelect('chat-model', MODELS.text.standard.concat(MODELS.text.premium), state.chat.model, (id) => {
            state.chat.model = id;
            saveSettings();
        }, true);

        setupModelSelect('image-model', MODELS.image, state.image.model, (id) => {
            state.image.model = id;
            saveSettings();
        }, false);

        setupModelSelect('tts-model', MODELS.tts, state.tts.model, (id) => {
            state.tts.model = id;
            updateTTSVisibility();
            saveSettings();
        }, false);

        setupModelSelect('ratio', MODELS.ratios, state.image.ratio, (id) => {
            state.image.ratio = id;
        }, false);

        // Close all dropdowns on outside click
        document.addEventListener('click', (e) => {
            $$('.select-dropdown').forEach(dd => {
                if (!dd.parentElement.contains(e.target)) {
                    dd.classList.remove('open');
                }
            });
        });
    }

    function setupModelSelect(prefix, models, currentId, onSelect, searchable) {
        const trigger = $(`#${prefix}-trigger`);
        const dropdown = $(`#${prefix}-dropdown`);
        const label = $(`#${prefix}-label`);

        // Set initial label
        const initial = models.find(m => m.id === currentId);
        if (initial) label.textContent = initial.id;

        // Build dropdown content
        renderDropdown(dropdown, models, currentId, onSelect, searchable);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            $$('.select-dropdown').forEach(dd => dd.classList.remove('open'));
            if (!isOpen) {
                dropdown.classList.add('open');
                // Focus search if searchable
                const search = dropdown.querySelector('.select-search');
                if (search) {
                    setTimeout(() => search.focus(), 50);
                }
            }
        });
    }

    function renderDropdown(dropdown, models, currentId, onSelect, searchable) {
        dropdown.innerHTML = '';

        // Search input for chat model
        if (searchable) {
            const search = document.createElement('input');
            search.type = 'text';
            search.className = 'select-search';
            search.placeholder = 'Search models...';
            search.addEventListener('input', () => {
                const q = search.value.toLowerCase();
                dropdown.querySelectorAll('.select-option').forEach(opt => {
                    const match = opt.dataset.id.includes(q) || opt.textContent.toLowerCase().includes(q);
                    opt.style.display = match ? '' : 'none';
                });
                // Show/hide dividers
                dropdown.querySelectorAll('.select-divider').forEach(div => {
                    const next = div.nextElementSibling;
                    if (!next || next.classList.contains('select-divider')) {
                        div.style.display = 'none';
                    } else {
                        let hasVisible = false;
                        let sibling = div.nextElementSibling;
                        while (sibling && !sibling.classList.contains('select-divider')) {
                            if (sibling.style.display !== 'none') hasVisible = true;
                            sibling = sibling.nextElementSibling;
                        }
                        div.style.display = hasVisible ? '' : 'none';
                    }
                });
            });
            dropdown.appendChild(search);

            // Divider for standard
            const stdDiv = document.createElement('span');
            stdDiv.className = 'select-divider';
            stdDiv.textContent = 'Standard Models';
            dropdown.appendChild(stdDiv);
        }

        models.forEach((model, i) => {
            // Add premium divider
            if (searchable && i === MODELS.text.standard.length) {
                const premDiv = document.createElement('span');
                premDiv.className = 'select-divider';
                premDiv.textContent = 'Premium Models (Invite Required)';
                dropdown.appendChild(premDiv);
            }

            const btn = document.createElement('button');
            btn.className = 'select-option' + (model.id === currentId ? ' selected' : '');
            btn.dataset.id = model.id;

            let tier = '';
            if (searchable) {
                if (i < MODELS.text.standard.length) {
                    tier = '<span class="model-tier tier-standard">STD</span>';
                } else {
                    tier = '<span class="model-tier tier-premium">PREM</span>';
                }
            }

            btn.innerHTML = `<span>${model.id}</span>${tier}`;

            btn.addEventListener('click', () => {
                dropdown.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
                btn.classList.add('selected');
                const label = dropdown.parentElement.querySelector('span[id$="-label"]');
                if (label) label.textContent = model.id;
                dropdown.classList.remove('open');
                onSelect(model.id);
            });

            dropdown.appendChild(btn);
        });
    }

    // ===== Chat =====
    function setupChat() {
        const input = $('#chat-input');
        const sendBtn = $('#chat-send');
        const stopBtn = $('#chat-stop');
        const clearBtn = $('#chat-clear');

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 160) + 'px';
        });

        // Send on Enter (Shift+Enter for newline)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        stopBtn.addEventListener('click', stopStream);
        clearBtn.addEventListener('click', clearChat);
    }

    function showEmptyState() {
        const container = $('#chat-messages');
        container.innerHTML = `
            <div class="chat-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <h3>AquaLab Chat</h3>
                <p>Choose a model and start chatting. All 49+ models are available with streaming responses.</p>
            </div>
        `;
    }

    function clearChat() {
        state.chat.messages = [];
        state.chat.streaming = false;
        if (state.chat.controller) {
            state.chat.controller.abort();
            state.chat.controller = null;
        }
        showEmptyState();
        toggleChatButtons(false);
    }

    function toggleChatButtons(streaming) {
        $('#chat-send').classList.toggle('hidden', streaming);
        $('#chat-stop').classList.toggle('hidden', !streaming);
        $('#chat-send').disabled = streaming;
        $('#chat-input').disabled = streaming;
    }

    function addMessage(role, content, model) {
        // Remove empty state if present
        const empty = $('#chat-messages .chat-empty');
        if (empty) empty.remove();

        const container = $('#chat-messages');
        const div = document.createElement('div');
        div.className = `msg msg-${role}`;

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let metaHtml = `<span>${time}</span>`;
        if (model) metaHtml += `<span class="model-tag">${model}</span>`;

        div.innerHTML = `
            <div class="msg-content">${escapeHtml(content)}</div>
            <div class="msg-meta">${metaHtml}</div>
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    function addStreamingMessage(model) {
        const empty = $('#chat-messages .chat-empty');
        if (empty) empty.remove();

        const container = $('#chat-messages');
        const div = document.createElement('div');
        div.className = 'msg msg-assistant';

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
            <div class="msg-content"><span class="typing-cursor"></span></div>
            <div class="msg-meta"><span>${time}</span><span class="model-tag">${model}</span></div>
        `;

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    async function sendMessage() {
        const input = $('#chat-input');
        const content = input.value.trim();
        if (!content || state.chat.streaming) return;

        if (!state.settings.apiKey) {
            showSettings();
            flashSettingsStatus('Please set your API key first.', 'error');
            return;
        }

        // Add user message
        addMessage('user', content);
        state.chat.messages.push({ role: 'user', content });

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Start streaming
        state.chat.streaming = true;
        toggleChatButtons(true);

        const msgDiv = addStreamingMessage(state.chat.model);
        const contentDiv = msgDiv.querySelector('.msg-content');

        try {
            state.chat.controller = new AbortController();

            const messages = [];
            if (state.settings.systemPrompt) {
                messages.push({ role: 'system', content: state.settings.systemPrompt });
            }
            messages.push(...state.chat.messages);

            const response = await fetch(`${state.settings.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.settings.apiKey}`,
                },
                body: JSON.stringify({
                    model: state.chat.model,
                    messages: messages,
                    temperature: state.chat.temp,
                    max_tokens: state.chat.maxTokens,
                    stream: true,
                }),
                signal: state.chat.controller.signal,
            });

            if (!response.ok) {
                const errBody = await response.text();
                let errMsg = `API Error: ${response.status}`;
                try {
                    const errJson = JSON.parse(errBody);
                    errMsg = errJson.error?.message || errJson.message || errMsg;
                } catch {}
                throw new Error(errMsg);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const data = trimmed.slice(5).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullContent += delta;
                            contentDiv.innerHTML = renderMarkdown(fullContent) + '<span class="typing-cursor"></span>';
                            const container = $('#chat-messages');
                            container.scrollTop = container.scrollHeight;
                        }
                    } catch {}
                }
            }

            // Finalize
            contentDiv.innerHTML = renderMarkdown(fullContent);
            state.chat.messages.push({ role: 'assistant', content: fullContent, model: state.chat.model });

        } catch (err) {
            if (err.name === 'AbortError') {
                contentDiv.innerHTML = renderMarkdown(contentDiv.textContent || '') + '<em style="color:var(--text-muted);font-size:0.8rem"> [stopped]</em>';
            } else {
                contentDiv.innerHTML = `<span style="color:var(--accent-red)">${escapeHtml(err.message)}</span>`;
            }
        } finally {
            state.chat.streaming = false;
            state.chat.controller = null;
            toggleChatButtons(false);
            $('#chat-input').focus();
        }
    }

    function stopStream() {
        if (state.chat.controller) {
            state.chat.controller.abort();
        }
    }

    // ===== Image =====
    function setupImage() {
        const input = $('#image-input');
        const btn = $('#image-generate');

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 160) + 'px';
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generateImage();
            }
        });

        btn.addEventListener('click', generateImage);
    }

    async function generateImage() {
        const input = $('#image-input');
        const prompt = input.value.trim();
        if (!prompt) return;

        if (!state.settings.apiKey) {
            showSettings();
            flashSettingsStatus('Please set your API key first.', 'error');
            return;
        }

        const placeholder = $('#image-placeholder');
        const grid = $('#image-grid');

        // Show loading
        placeholder.innerHTML = `
            <div class="image-generating">
                <div class="spinner"></div>
                <p style="color:var(--text-secondary)">Generating with ${state.image.model}...</p>
            </div>
        `;
        placeholder.classList.remove('hidden');
        placeholder.querySelector('.image-generating') || placeholder.classList.add('hidden');

        // Replace placeholder content
        placeholder.innerHTML = `
            <div class="image-generating">
                <div class="spinner"></div>
                <p style="color:var(--text-secondary)">Generating with ${escapeHtml(state.image.model)}...</p>
                <p style="color:var(--text-muted);font-size:0.8rem">${escapeHtml(prompt)}</p>
            </div>
        `;

        const btn = $('#image-generate');
        btn.disabled = true;

        try {
            const response = await fetch(`${state.settings.baseUrl}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.settings.apiKey}`,
                },
                body: JSON.stringify({
                    model: state.image.model,
                    prompt: prompt,
                    ratio: state.image.ratio,
                }),
            });

            if (!response.ok) {
                const errBody = await response.text();
                let errMsg = `API Error: ${response.status}`;
                try {
                    const errJson = JSON.parse(errBody);
                    errMsg = errJson.error?.message || errJson.message || errMsg;
                } catch {}
                throw new Error(errMsg);
            }

            const data = await response.json();

            // Handle different response formats
            let imageUrl = '';
            if (data.data && data.data[0]) {
                imageUrl = data.data[0].url || data.data[0].b64_json || '';
                if (data.data[0].b64_json && !data.data[0].url) {
                    imageUrl = 'data:image/png;base64,' + data.data[0].b64_json;
                }
            }

            if (!imageUrl) throw new Error('No image URL in response');

            // Add to grid
            addToImageGrid(imageUrl, prompt, state.image.model);

            // Store in history
            state.image.history.push({ url: imageUrl, prompt, model: state.image.model, time: Date.now() });

            // Clear input
            input.value = '';
            input.style.height = 'auto';

        } catch (err) {
            placeholder.innerHTML = `
                <div style="text-align:center;color:var(--accent-red)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px">
                        <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                    </svg>
                    <p>${escapeHtml(err.message)}</p>
                </div>
            `;
        } finally {
            btn.disabled = false;
        }
    }

    function addToImageGrid(url, prompt, model) {
        const placeholder = $('#image-placeholder');
        const grid = $('#image-grid');

        placeholder.classList.add('hidden');

        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="${url}" alt="${escapeHtml(prompt)}" loading="lazy">
            <div class="image-card-info">
                <span class="model-name">${escapeHtml(model)}</span>
                <div class="image-actions">
                    <button class="icon-btn" title="Download" onclick="event.stopPropagation(); window.aqualabDownload('${url}', '${escapeHtml(model)}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => openLightbox(url));

        grid.prepend(card);
    }

    // Global download helper for inline onclick
    window.aqualabDownload = async (url, model) => {
        try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `aqualab_${model}_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            window.open(url, '_blank');
        }
    };

    function openLightbox(url) {
        const lb = $('#lightbox');
        const img = $('#lightbox-img');
        const dl = $('#lightbox-download');

        img.src = url;
        dl.href = url;
        dl.download = `aqualab_${Date.now()}.png`;
        lb.classList.remove('hidden');

        // Close handlers
        const close = () => {
            lb.classList.add('hidden');
            lb.removeEventListener('click', closeBg);
        };
        const closeBg = (e) => {
            if (e.target === lb) close();
        };

        lb.querySelector('.lightbox-close').onclick = close;
        lb.addEventListener('click', closeBg);

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    // ===== TTS =====
    function setupTTS() {
        const btn = $('#tts-generate');
        const downloadBtn = $('#tts-download');

        btn.addEventListener('click', generateSpeech);
        downloadBtn.addEventListener('click', downloadAudio);

        updateTTSVisibility();
    }

    function updateTTSVisibility() {
        const isVoiceDesign = state.tts.model === 'mimo-v2.5-tts-voicedesign';
        const isVoiceClone = state.tts.model === 'mimo-v2.5-tts-voiceclone';

        $('#tts-voice-design-row').style.display = (isVoiceDesign || isVoiceClone) ? '' : 'none';
        $('#voice-name-group').style.display = (isVoiceDesign || isVoiceClone) ? 'none' : '';

        // Update description placeholder based on model
        const descInput = $('#tts-voice-description');
        if (isVoiceDesign) {
            descInput.placeholder = 'Describe the voice you want... e.g. "A warm, friendly female voice with a British accent"';
        } else if (isVoiceClone) {
            descInput.placeholder = 'Enter the voice clone identifier or description...';
        }
    }

    async function generateSpeech() {
        const input = $('#tts-input');
        const text = input.value.trim();
        if (!text) return;

        if (!state.settings.apiKey) {
            showSettings();
            flashSettingsStatus('Please set your API key first.', 'error');
            return;
        }

        const btn = $('#tts-generate');
        const status = $('#tts-status');
        const playerContainer = $('#tts-player-container');

        btn.disabled = true;
        status.textContent = 'Generating...';
        status.style.color = 'var(--accent-pink)';

        try {
            const body = {
                model: state.tts.model,
                input: text,
            };

            // Add voice params based on model
            if (state.tts.model === 'mimo-v2.5-tts') {
                body.voice = state.tts.voiceName || 'Alloy';
            } else {
                const desc = $('#tts-voice-description').value.trim();
                if (desc) body.voice = desc;
            }

            const response = await fetch(`${state.settings.baseUrl}/audio/speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.settings.apiKey}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errBody = await response.text();
                let errMsg = `API Error: ${response.status}`;
                try {
                    const errJson = JSON.parse(errBody);
                    errMsg = errJson.error?.message || errJson.message || errMsg;
                } catch {}
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            state.tts.audioBlob = blob;

            const audioUrl = URL.createObjectURL(blob);
            const audio = $('#tts-audio');
            audio.src = audioUrl;

            playerContainer.classList.remove('hidden');
            status.textContent = 'Ready - Click play to listen';
            status.style.color = 'var(--accent-green)';

            // Auto-play
            audio.play().catch(() => {});

        } catch (err) {
            status.textContent = `Error: ${err.message}`;
            status.style.color = 'var(--accent-red)';
        } finally {
            btn.disabled = false;
        }
    }

    function downloadAudio() {
        if (!state.tts.audioBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(state.tts.audioBlob);
        a.download = `aqualab_tts_${state.tts.model}_${Date.now()}.mp3`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ===== Settings Modal =====
    function setupSettings() {
        const modal = $('#settings-modal');
        const openBtn = $('#settings-btn');
        const closeBtn = $('#settings-close');
        const saveBtn = $('#settings-save');
        const toggleKeyBtn = $('#toggle-key-visibility');

        openBtn.addEventListener('click', showSettings);
        closeBtn.addEventListener('click', hideSettings);
        saveBtn.addEventListener('click', saveSettingsFromModal);
        toggleKeyBtn.addEventListener('click', () => {
            const input = $('#api-key-input');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideSettings();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                hideSettings();
            }
        });
    }

    function showSettings() {
        const modal = $('#settings-modal');
        $('#api-key-input').value = state.settings.apiKey;
        $('#api-base-input').value = state.settings.baseUrl;
        $('#system-prompt-input').value = state.settings.systemPrompt;
        modal.classList.remove('hidden');
    }

    function hideSettings() {
        $('#settings-modal').classList.add('hidden');
        $('#settings-status').classList.add('hidden');
    }

    function saveSettingsFromModal() {
        const key = $('#api-key-input').value.trim();
        const base = $('#api-base-input').value.trim();
        const prompt = $('#system-prompt-input').value.trim();

        if (!key) {
            flashSettingsStatus('API key is required.', 'error');
            return;
        }

        // Validate base URL
        try {
            new URL(base);
        } catch {
            flashSettingsStatus('Invalid base URL.', 'error');
            return;
        }

        state.settings.apiKey = key;
        state.settings.baseUrl = base.replace(/\/+$/, '');
        state.settings.systemPrompt = prompt || 'You are a helpful assistant.';

        saveSettings();
        flashSettingsStatus('Settings saved!', 'success');

        setTimeout(hideSettings, 1200);
    }

    function flashSettingsStatus(msg, type) {
        const el = $('#settings-status');
        el.textContent = msg;
        el.className = `setting-status ${type}`;
        el.classList.remove('hidden');
    }

    // ===== Helpers =====
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderMarkdown(text) {
        // Basic markdown: bold, italic, code, code blocks, links
        let html = escapeHtml(text);

        // Code blocks (```)
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code>${code.trim()}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Links
        html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent-cyan)">$1</a>');

        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    // ===== Start =====
    document.addEventListener('DOMContentLoaded', init);

})();
