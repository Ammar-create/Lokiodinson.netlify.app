// ============================================================
// Voyage AI — js/tools.js
// 16 Callable Tools
// ============================================================
// Exports:
//   TOOL_DEFINITIONS        — Array of tool objects
//   getToolDefinitions()    — Returns API-formatted tool array
//   executeTool(name, params) — Dispatches and runs a tool
// ============================================================

import { EventBus } from './app.js'
import * as store from './store.js'
import { getActiveProvider } from './providers.js'

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/({[\s\S]*})/)
  if (match) {
    try { return JSON.parse(match[1]) } catch {}
  }
  try { return JSON.parse(text) } catch {}
  return null
}

function truncateText(text, maxLen = 12000) {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '\n\n[...truncated...]'
}

// ─────────────────────────────────────────────────────
// Tool 1: Image Generation
// ─────────────────────────────────────────────────────

const imageGeneration = {
  name: 'image_generation',
  description: 'Generate an image from a text prompt using AI image models. Returns the generated image displayed inline.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed text description of the image to generate'
      },
      aspect_ratio: {
        type: 'string',
        enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        description: 'Aspect ratio of the generated image'
      },
      model: {
        type: 'string',
        description: 'Image model to use (e.g. flux-2, gptimage-2, midjourney)'
      }
    },
    required: ['prompt']
  },

  async execute({ prompt, aspect_ratio = '1:1', model }) {
    const provider = getActiveProvider()
    const settings = await store.getAllSettings()
    const imgModel = model || settings.image_model || 'flux-2'

    const result = await provider.generateImage(prompt, {
      model: imgModel,
      aspectRatio: aspect_ratio
    })

    const imageRecord = {
      prompt,
      model: imgModel,
      ratio: aspect_ratio,
      dataUrl: result.dataUrl,
      createdAt: Date.now()
    }
    const imageId = await store.addImage(imageRecord)

    EventBus.emit('image:generated', { id: imageId, ...imageRecord })

    return {
      type: 'image',
      dataUrl: result.dataUrl,
      prompt,
      model: imgModel,
      imageId,
      revisedPrompt: result.revisedPrompt || null
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 2: Video Generation
// ─────────────────────────────────────────────────────

const videoGeneration = {
  name: 'video_generation',
  description: 'Generate a short video clip from a text prompt using AI video models.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed text description of the video to generate'
      },
      duration: {
        type: 'number',
        description: 'Video duration in seconds (default: 5)',
        default: 5
      },
      model: {
        type: 'string',
        description: 'Video model to use'
      }
    },
    required: ['prompt']
  },

  async execute({ prompt, duration = 5, model }) {
    const provider = getActiveProvider()
    const settings = await store.getAllSettings()
    const vidModel = model || settings.video_model || 'default'

    const result = await provider.generateVideo(prompt, {
      model: vidModel,
      duration
    })

    return {
      type: 'video',
      dataUrl: result.dataUrl,
      prompt,
      duration,
      model: vidModel
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 3: Web Search
// ─────────────────────────────────────────────────────

const webSearch = {
  name: 'web_search',
  description: 'Search the web for up-to-date information. Returns relevant search results with titles, URLs, and snippets.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string'
      },
      count: {
        type: 'number',
        description: 'Number of results to return (default: 5)',
        default: 5
      }
    },
    required: ['query']
  },

  async execute({ query, count = 5 }) {
    const provider = getActiveProvider()
    const results = await provider.search(query)

    const trimmed = results.slice(0, count).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet || r.text || ''
    }))

    return {
      type: 'search_results',
      query,
      results: trimmed,
      count: trimmed.length
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 4: URL Extract
// ─────────────────────────────────────────────────────

const urlExtract = {
  name: 'url_extract',
  description: 'Extract and read the content of a webpage by URL. Returns the text content for analysis.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to extract content from'
      }
    },
    required: ['url']
  },

  async execute({ url }) {
    const provider = getActiveProvider()
    const result = await provider.extract(url)

    const content = truncateText(result.content || '', 12000)

    return {
      type: 'url_content',
      url,
      title: result.title || '',
      content,
      wordCount: content.split(/\s+/).length
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 5: Text-to-Speech (TTS)
// ─────────────────────────────────────────────────────

const textToSpeech = {
  name: 'text_to_speech',
  description: 'Convert text to spoken audio. Plays the audio inline in the chat.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to convert to speech'
      },
      voice: {
        type: 'string',
        description: 'Voice to use (provider-specific, e.g. alloy, echo, nova)'
      },
      model: {
        type: 'string',
        description: 'TTS model to use'
      }
    },
    required: ['text']
  },

  async execute({ text, voice, model }) {
    const provider = getActiveProvider()
    const settings = await store.getAllSettings()

    const audioBlob = await provider.textToSpeech(text, {
      model: model || settings.tts_model || 'default',
      voice: voice || 'alloy'
    })

    const audioUrl = URL.createObjectURL(audioBlob)

    return {
      type: 'audio',
      audioUrl,
      text,
      voice: voice || 'alloy',
      duration: null
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 6: Speech-to-Text (STT)
// ─────────────────────────────────────────────────────

const speechToText = {
  name: 'speech_to_text',
  description: 'Record audio from the microphone and convert it to text. Prompts the user to speak.',
  parameters: {
    type: 'object',
    properties: {
      duration: {
        type: 'number',
        description: 'Maximum recording duration in seconds (default: 30)',
        default: 30
      },
      model: {
        type: 'string',
        description: 'STT model to use'
      }
    },
    required: []
  },

  async execute({ duration = 30, model }) {
    const provider = getActiveProvider()
    const settings = await store.getAllSettings()

    const audioBlob = await recordMicrophone(duration)
    if (!audioBlob) {
      return { type: 'error', message: 'No audio recorded or microphone access denied' }
    }

    const result = await provider.speechToText(audioBlob, {
      model: model || settings.stt_model || 'whisper-1'
    })

    return {
      type: 'transcription',
      text: result.text,
      model: model || 'whisper-1'
    }
  }
}

async function recordMicrophone(maxDuration) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks = []

    return new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data)

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        resolve(blob.size > 0 ? blob : null)
      }

      recorder.start()
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, maxDuration * 1000)

      // Expose stop function globally so UI can trigger it
      window.__voyageStopRecording = () => {
        if (recorder.state === 'recording') recorder.stop()
      }
    })
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────
// Tool 7: Code Interpreter
// ─────────────────────────────────────────────────────

const codeInterpreter = {
  name: 'code_interpreter',
  description: 'Execute JavaScript code in a sandboxed environment. Use for calculations, data processing, and generating output. Returns console output and any errors.',
  parameters: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'JavaScript code to execute'
      },
      max_attempts: {
        type: 'number',
        description: 'Maximum retry attempts on error (default: 3)',
        default: 3
      }
    },
    required: ['code']
  },

  async execute({ code, max_attempts = 3 }) {
    let attempts = 0
    let lastError = null

    while (attempts < max_attempts) {
      attempts++
      try {
        const result = await runInSandbox(code)
        if (result.error) {
          lastError = result.error
          // If it's the last attempt, return the error
          if (attempts >= max_attempts) {
            return {
              type: 'code_result',
              code,
              output: result.output || '',
              error: result.error,
              attempts
            }
          }
          continue
        }
        return {
          type: 'code_result',
          code,
          output: result.output,
          returnValue: result.returnValue,
          error: null,
          attempts
        }
      } catch (err) {
        lastError = err.message
        if (attempts >= max_attempts) {
          return {
            type: 'code_result',
            code,
            output: '',
            error: lastError,
            attempts
          }
        }
      }
    }

    return {
      type: 'code_result',
      code,
      output: '',
      error: lastError || 'Execution failed',
      attempts
    }
  }
}

function runInSandbox(code) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.sandbox = 'allow-scripts'
    iframe.id = 'v-sandbox-' + Date.now()
    document.body.appendChild(iframe)

    const timeout = setTimeout(() => {
      cleanup()
      resolve({ output: '', error: 'Execution timed out (10s)' })
    }, 10000)

    function cleanup() {
      clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      setTimeout(() => iframe.remove(), 100)
    }

    function onMessage(event) {
      if (event.source !== iframe.contentWindow) return
      cleanup()
      resolve(event.data)
    }

    window.addEventListener('message', onMessage)

    const html = `<!DOCTYPE html>
<html><head><script>
const __logs = [];
const __origConsole = console.log;
console.log = (...args) => __logs.push(args.map(a =>
  typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
).join(' '));
console.error = console.log;
console.warn = console.log;
console.info = console.log;

try {
  const __result = eval(${JSON.stringify(code)});
  const __returnValue = typeof __result !== 'undefined' ?
    (typeof __result === 'object' ? JSON.stringify(__result, null, 2) : String(__result)) : undefined;
  parent.postMessage({
    output: __logs.join('\\n'),
    returnValue: __returnValue,
    error: null
  }, '*');
} catch(e) {
  parent.postMessage({
    output: __logs.join('\\n'),
    returnValue: undefined,
    error: e.name + ': ' + e.message
  }, '*');
}
</script></head><body></body></html>`

    iframe.srcdoc = html
  })
}

// ─────────────────────────────────────────────────────
// Tool 8: File Processor
// ─────────────────────────────────────────────────────

const fileProcessor = {
  name: 'file_processor',
  description: 'Read and extract content from uploaded files (PDF, CSV, JSON, DOCX, TXT). Returns parsed text content.',
  parameters: {
    type: 'object',
    properties: {
      file_name: {
        type: 'string',
        description: 'Name of the file to process'
      },
      content: {
        type: 'string',
        description: 'Base64 encoded file content or raw text for text files'
      },
      file_type: {
        type: 'string',
        description: 'File extension (pdf, csv, json, txt, docx)'
      }
    },
    required: ['content', 'file_type']
  },

  async execute({ file_name, content, file_type }) {
    const type = (file_type || '').toLowerCase().replace('.', '')

    try {
      let text = ''

      switch (type) {
        case 'txt':
        case 'md':
        case 'html':
        case 'js':
        case 'py':
        case 'css':
        case 'xml':
          text = atob(content) || content
          break

        case 'json':
          try {
            const parsed = JSON.parse(atob(content) || content)
            text = JSON.stringify(parsed, null, 2)
          } catch {
            text = atob(content) || content
          }
          break

        case 'csv':
          text = parseCSV(atob(content) || content)
          break

        case 'pdf':
          text = await parsePDF(content)
          break

        default:
          text = atob(content) || content
      }

      text = truncateText(text, 12000)

      return {
        type: 'file_content',
        fileName: file_name || 'file',
        fileType: type,
        content: text,
        wordCount: text.split(/\s+/).length,
        charCount: text.length
      }
    } catch (err) {
      return {
        type: 'error',
        message: `Failed to process ${type} file: ${err.message}`
      }
    }
  }
}

function parseCSV(raw) {
  const lines = raw.trim().split('\n')
  if (lines.length === 0) return ''

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] || '' })
    return obj
  })

  const summary = `CSV with ${headers.length} columns and ${rows.length} rows.\n\n`
  const preview = `Columns: ${headers.join(', ')}\n\n`
  const tablePreview = rows.slice(0, 10).map(r =>
    headers.map(h => `${h}: ${r[h]}`).join(' | ')
  ).join('\n')

  const more = rows.length > 10 ? `\n\n...and ${rows.length - 10} more rows` : ''
  return summary + preview + tablePreview + more
}

async function parsePDF(base64Content) {
  try {
    const binary = atob(base64Content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // Simple PDF text extraction (basic — works for most text PDFs)
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const textChunks = []
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
    let match
    while ((match = streamRegex.exec(text)) !== null) {
      const chunk = match[1]
      const readable = chunk.replace(/[^\x20-\x7E\n]/g, '').trim()
      if (readable.length > 10) textChunks.push(readable)
    }

    if (textChunks.length > 0) {
      return textChunks.join('\n\n')
    }

    return '[PDF file detected — text extraction limited. For complex PDFs, consider converting to text first.]'
  } catch {
    return '[Unable to parse PDF content]'
  }
}

// ─────────────────────────────────────────────────────
// Tool 9: GitHub Agent
// ─────────────────────────────────────────────────────

const githubAgent = {
  name: 'github_agent',
  description: 'Interact with GitHub. Read repository info, list files, view commits, pull requests, and file contents.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['repo_info', 'list_files', 'file_content', 'commits', 'pull_requests', 'search_code'],
        description: 'GitHub action to perform'
      },
      owner: {
        type: 'string',
        description: 'Repository owner (e.g. "octocat")'
      },
      repo: {
        type: 'string',
        description: 'Repository name (e.g. "hello-world")'
      },
      path: {
        type: 'string',
        description: 'File path within the repo (for file_content and list_files)'
      },
      query: {
        type: 'string',
        description: 'Search query (for search_code)'
      },
      branch: {
        type: 'string',
        description: 'Branch name (default: main)',
        default: 'main'
      },
      count: {
        type: 'number',
        description: 'Number of results (default: 10)',
        default: 10
      }
    },
    required: ['action', 'owner', 'repo']
  },

  async execute({ action, owner, repo, path, query, branch = 'main', count = 10 }) {
    const base = `https://api.github.com/repos/${owner}/${repo}`
    const headers = { 'Accept': 'application/vnd.github.v3+json' }

    // Check for stored GitHub token
    const settings = await store.getAllSettings()
    if (settings.github_token) {
      headers['Authorization'] = `token ${settings.github_token}`
    }

    try {
      switch (action) {
        case 'repo_info': {
          const res = await fetch(base, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          return {
            type: 'github_result',
            action: 'repo_info',
            data: {
              name: data.full_name,
              description: data.description,
              stars: data.stargazers_count,
              forks: data.forks_count,
              language: data.language,
              defaultBranch: data.default_branch,
              updatedAt: data.updated_at,
              topics: data.topics
            }
          }
        }

        case 'list_files': {
          const url = `${base}/contents/${path || ''}?ref=${branch}`
          const res = await fetch(url, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          const files = (Array.isArray(data) ? data : [data]).map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            path: f.path
          }))
          return {
            type: 'github_result',
            action: 'list_files',
            path: path || '/',
            branch,
            files
          }
        }

        case 'file_content': {
          if (!path) throw new Error('Path is required for file_content')
          const url = `${base}/contents/${path}?ref=${branch}`
          const res = await fetch(url, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          let content = ''
          if (data.encoding === 'base64') {
            content = atob(data.content.replace(/\s/g, ''))
          } else {
            content = data.content
          }
          content = truncateText(content, 12000)
          return {
            type: 'github_result',
            action: 'file_content',
            path,
            branch,
            content,
            size: data.size,
            sha: data.sha
          }
        }

        case 'commits': {
          const url = `${base}/commits?sha=${branch}&per_page=${count}`
          const res = await fetch(url, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          const commits = data.slice(0, count).map(c => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split('\n')[0],
            author: c.commit.author.name,
            date: c.commit.author.date
          }))
          return {
            type: 'github_result',
            action: 'commits',
            branch,
            commits
          }
        }

        case 'pull_requests': {
          const url = `${base}/pulls?state=open&per_page=${count}`
          const res = await fetch(url, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          const prs = data.slice(0, count).map(pr => ({
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            state: pr.state,
            createdAt: pr.created_at,
            labels: pr.labels.map(l => l.name)
          }))
          return {
            type: 'github_result',
            action: 'pull_requests',
            pullRequests: prs
          }
        }

        case 'search_code': {
          if (!query) throw new Error('Query is required for search_code')
          const url = `https://api.github.com/search/code?q=${encodeURIComponent(query + ' repo:' + owner + '/' + repo)}&per_page=${count}`
          const res = await fetch(url, { headers })
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
          const data = await res.json()
          const results = (data.items || []).map(item => ({
            name: item.name,
            path: item.path,
            url: item.html_url
          }))
          return {
            type: 'github_result',
            action: 'search_code',
            query,
            results,
            totalCount: data.total_count
          }
        }

        default:
          return { type: 'error', message: `Unknown GitHub action: ${action}` }
      }
    } catch (err) {
      return {
        type: 'error',
        message: `GitHub error: ${err.message}`
      }
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 10: DOM Scraper
// ─────────────────────────────────────────────────────

const domScraper = {
  name: 'dom_scraper',
  description: 'Extract structured data from a webpage. Parse HTML and extract specific elements by CSS selector or get full page structure.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to scrape'
      },
      selector: {
        type: 'string',
        description: 'CSS selector to extract specific elements (optional — if omitted, returns page structure)'
      },
      attribute: {
        type: 'string',
        description: 'HTML attribute to extract (e.g. "href", "src", "textContent"). Default: textContent'
      }
    },
    required: ['url']
  },

  async execute({ url, selector, attribute = 'textContent' }) {
    const provider = getActiveProvider()

    try {
      const result = await provider.extract(url)
      const html = result.content || ''

      if (!selector) {
        // Return a structured summary of the page
        const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const truncated = truncateText(textContent, 8000)

        // Extract links
        const links = []
        const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
        let linkMatch
        while ((linkMatch = linkRegex.exec(html)) !== null) {
          if (links.length >= 20) break
          links.push({ url: linkMatch[1], text: linkMatch[2].trim() })
        }

        // Extract images
        const images = []
        const imgRegex = /<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi
        let imgMatch
        while ((imgMatch = imgRegex.exec(html)) !== null) {
          if (images.length >= 10) break
          images.push({ src: imgMatch[1], alt: imgMatch[2] || '' })
        }

        return {
          type: 'scrape_result',
          url,
          title: result.title || '',
          text: truncated,
          links,
          images,
          wordCount: textContent.split(/\s+/).length
        }
      }

      // Targeted extraction with selector
      // Since we're working with HTML strings, use regex-based extraction
      const tagMatch = selector.match(/^([a-z]+)(?:\.([a-z0-9_-]+))?(?:#([a-z0-9_-]+))?$/i)
      let extracted = []

      if (tagMatch) {
        const [, tag, className, id] = tagMatch
        let regex
        if (id) {
          regex = new RegExp(`<${tag}[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
        } else if (className) {
          regex = new RegExp(`<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
        } else {
          regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
        }

        let m
        while ((m = regex.exec(html)) !== null) {
          if (extracted.length >= 30) break
          let content = m[1]
          if (attribute === 'textContent') {
            content = content.replace(/<[^>]+>/g, '').trim()
          }
          extracted.push(content)
        }
      }

      return {
        type: 'scrape_result',
        url,
        selector,
        attribute,
        results: extracted,
        count: extracted.length
      }
    } catch (err) {
      return {
        type: 'error',
        message: `Scraping error: ${err.message}`
      }
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 11: Document Generator
// ─────────────────────────────────────────────────────

const documentGenerator = {
  name: 'document_generator',
  description: 'Generate and export a document from content. Supports Markdown, HTML, and plain text formats. Downloads the file to the user.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Document title'
      },
      content: {
        type: 'string',
        description: 'Document content (Markdown or HTML)'
      },
      format: {
        type: 'string',
        enum: ['markdown', 'html', 'text'],
        description: 'Output format',
        default: 'markdown'
      }
    },
    required: ['title', 'content']
  },

  async execute({ title, content, format = 'markdown' }) {
    const safeTitle = (title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')

    const extensions = {
      markdown: '.md',
      html: '.html',
      text: '.txt'
    }
    const mimeTypes = {
      markdown: 'text/markdown',
      html: 'text/html',
      text: 'text/plain'
    }

    let output = content

    if (format === 'html' && !content.includes('<html')) {
      output = wrapInHtml(title, content)
    }

    const blob = new Blob([output], { type: mimeTypes[format] || 'text/plain' })
    const url = URL.createObjectURL(blob)

    // Trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = `${safeTitle}${extensions[format] || '.txt'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    return {
      type: 'document',
      title,
      format,
      fileName: `${safeTitle}${extensions[format]}`,
      size: blob.size,
      downloaded: true
    }
  }
}

function wrapInHtml(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #1a1a1a; }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 8px; }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 3px solid #ddd; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f9f9f9; }
  </style>
</head>
<body>
${content}
</body>
</html>`
}

// ─────────────────────────────────────────────────────
// Tool 12: Reasoning Chain
// ─────────────────────────────────────────────────────

const reasoningChain = {
  name: 'reasoning_chain',
  description: 'Break down a complex problem into step-by-step reasoning. Plans the approach, executes each step, and synthesizes a final answer.',
  parameters: {
    type: 'object',
    properties: {
      problem: {
        type: 'string',
        description: 'The complex problem or question to reason through'
      },
      context: {
        type: 'string',
        description: 'Additional context or constraints'
      },
      max_steps: {
        type: 'number',
        description: 'Maximum reasoning steps (default: 5)',
        default: 5
      }
    },
    required: ['problem']
  },

  async execute({ problem, context, max_steps = 5 }) {
    const provider = getActiveProvider()
    const steps = []
    const messages = []

    // Step 1: Plan
    messages.push({
      role: 'system',
      content: 'You are a reasoning engine. Break down complex problems into clear steps. Return your plan as a JSON array of steps, each with "step" (number) and "description" (what to figure out).'
    })
    messages.push({
      role: 'user',
      content: `Problem: ${problem}${context ? `\nContext: ${context}` : ''}\n\nCreate a ${max_steps}-step reasoning plan. Return ONLY a JSON array.`
    })

    try {
      const planResponse = await provider.chat(messages, { model: 'default', stream: false })
      const planContent = planResponse.content || ''
      const plan = extractJson(planContent) || []

      steps.push({
        step: 0,
        type: 'plan',
        description: 'Created reasoning plan',
        content: Array.isArray(plan) ? plan.map(p => `Step ${p.step}: ${p.description}`).join('\n') : planContent
      })

      // Execute each step
      const stepResults = []
      const planSteps = Array.isArray(plan) ? plan : []

      for (let i = 0; i < Math.min(planSteps.length, max_steps); i++) {
        const step = planSteps[i]
        const stepMessages = [
          {
            role: 'system',
            content: 'You are a reasoning engine executing one step of a multi-step analysis. Be thorough but concise. Return your analysis as clear text.'
          },
          {
            role: 'user',
            content: `Problem: ${problem}\n\nPrevious steps:\n${stepResults.map((r, j) => `Step ${j + 1}: ${r}`).join('\n')}\n\nCurrent step: ${step.description || step}\n\nProvide your analysis for this step.`
          }
        ]

        const stepResponse = await provider.chat(stepMessages, { model: 'default', stream: false })
        const stepContent = stepResponse.content || ''
        stepResults.push(stepContent)

        steps.push({
          step: i + 1,
          type: 'reasoning',
          description: step.description || step,
          content: stepContent
        })
      }

      // Final synthesis
      const synthMessages = [
        {
          role: 'system',
          content: 'You are a reasoning engine. Synthesize all analysis steps into a clear, comprehensive final answer.'
        },
        {
          role: 'user',
          content: `Problem: ${problem}\n\nAnalysis steps:\n${stepResults.map((r, j) => `Step ${j + 1}: ${r}`).join('\n\n')}\n\nProvide the final answer, synthesizing all insights.`
        }
      ]

      const finalResponse = await provider.chat(synthMessages, { model: 'default', stream: false })

      steps.push({
        step: steps.length,
        type: 'synthesis',
        description: 'Final synthesis',
        content: finalResponse.content
      })

      return {
        type: 'reasoning_chain',
        problem,
        steps,
        totalSteps: steps.length,
        finalAnswer: finalResponse.content
      }
    } catch (err) {
      return {
        type: 'error',
        message: `Reasoning chain error: ${err.message}`,
        partialSteps: steps
      }
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool 13: Data Visualizer
// ─────────────────────────────────────────────────────

const dataVisualizer = {
  name: 'data_visualizer',
  description: 'Create interactive data visualizations (charts, graphs) from data. Renders charts inline using Canvas API.',
  parameters: {
    type: 'object',
    properties: {
      chart_type: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar'],
        description: 'Type of chart to create'
      },
      title: {
        type: 'string',
        description: 'Chart title'
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels for data points (categories)'
      },
      datasets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            data: { type: 'array', items: { type: 'number' } },
            color: { type: 'string' }
          }
        },
        description: 'Data datasets with label, values, and optional color'
      },
      data: {
        type: 'array',
        items: { type: 'number' },
        description: 'Simple data array (alternative to datasets for single-series charts)'
      },
      x_label: {
        type: 'string',
        description: 'X-axis label'
      },
      y_label: {
        type: 'string',
        description: 'Y-axis label'
      }
    },
    required: ['chart_type', 'title']
  },

  async execute({ chart_type, title, labels, datasets, data, x_label, y_label }) {
    // Normalize datasets
    let chartDatasets = datasets
    if (!chartDatasets && data && labels) {
      chartDatasets = [{
        label: title,
        data,
        color: getChartColor(0)
      }]
    }
    if (!chartDatasets || chartDatasets.length === 0) {
      return { type: 'error', message: 'No data provided for visualization' }
    }

    // Assign colors if missing
    chartDatasets = chartDatasets.map((ds, i) => ({
      ...ds,
      color: ds.color || getChartColor(i)
    }))

    const config = {
      type: chart_type,
      title,
      labels: labels || [],
      datasets: chartDatasets,
      xLabel: x_label,
      yLabel: y_label
    }

    // Render to canvas and capture as data URL
    const dataUrl = renderChart(config)

    return {
      type: 'chart',
      chartType: chart_type,
      title,
      dataUrl,
      config
    }
  }
}

function getChartColor(index) {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'
  ]
  return colors[index % colors.length]
}

function renderChart(config) {
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  const { type, title, labels, datasets } = config

  // Background
  ctx.fillStyle = '#131316'
  ctx.fillRect(0, 0, 600, 400)

  // Title
  ctx.fillStyle = '#F4F4F5'
  ctx.font = 'bold 16px DM Sans, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, 300, 30)

  const chartArea = { x: 60, y: 60, w: 480, h: 300 }

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = chartArea.y + (chartArea.h / 5) * i
    ctx.beginPath()
    ctx.moveTo(chartArea.x, y)
    ctx.lineTo(chartArea.x + chartArea.w, y)
    ctx.stroke()
  }

  if (!labels || labels.length === 0) return canvas.toDataURL()

  const primaryDataset = datasets[0]
  const values = primaryDataset.data || []

  if (values.length === 0) return canvas.toDataURL()

  const maxVal = Math.max(...values) * 1.1 || 1

  switch (type) {
    case 'bar': {
      const barWidth = Math.min(40, (chartArea.w / labels.length) * 0.6)
      const gap = chartArea.w / labels.length

      values.forEach((val, i) => {
        const barH = (val / maxVal) * chartArea.h
        const x = chartArea.x + gap * i + (gap - barWidth) / 2
        const y = chartArea.y + chartArea.h - barH

        ctx.fillStyle = primaryDataset.color || getChartColor(0)
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0])
        ctx.fill()

        // Label
        ctx.fillStyle = '#A1A1AA'
        ctx.font = '11px DM Sans, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(labels[i] || '', x + barWidth / 2, chartArea.y + chartArea.h + 16)

        // Value
        ctx.fillStyle = '#F4F4F5'
        ctx.font = '11px JetBrains Mono, monospace'
        ctx.fillText(String(val), x + barWidth / 2, y - 6)
      })
      break
    }

    case 'line': {
      const stepX = chartArea.w / Math.max(labels.length - 1, 1)

      datasets.forEach((ds, di) => {
        const dsValues = ds.data || []
        ctx.strokeStyle = ds.color || getChartColor(di)
        ctx.lineWidth = 2
        ctx.beginPath()

        dsValues.forEach((val, i) => {
          const x = chartArea.x + stepX * i
          const y = chartArea.y + chartArea.h - (val / maxVal) * chartArea.h
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Dots
        dsValues.forEach((val, i) => {
          const x = chartArea.x + stepX * i
          const y = chartArea.y + chartArea.h - (val / maxVal) * chartArea.h
          ctx.fillStyle = ds.color || getChartColor(di)
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fill()
        })
      })

      // X labels
      labels.forEach((label, i) => {
        const x = chartArea.x + stepX * i
        ctx.fillStyle = '#A1A1AA'
        ctx.font = '10px DM Sans, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(label || '', x, chartArea.y + chartArea.h + 16)
      })
      break
    }

    case 'pie':
    case 'doughnut': {
      const total = values.reduce((s, v) => s + v, 0) || 1
      const cx = 300
      const cy = chartArea.y + chartArea.h / 2
      const radius = Math.min(chartArea.w, chartArea.h) / 2 - 20
      let startAngle = -Math.PI / 2

      values.forEach((val, i) => {
        const sliceAngle = (val / total) * Math.PI * 2
        ctx.fillStyle = getChartColor(i)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fill()

        // Label
        const midAngle = startAngle + sliceAngle / 2
        const labelR = radius * 0.7
        const lx = cx + Math.cos(midAngle) * labelR
        const ly = cy + Math.sin(midAngle) * labelR
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px DM Sans, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (sliceAngle > 0.3) {
          ctx.fillText(`${Math.round(val / total * 100)}%`, lx, ly)
        }

        startAngle += sliceAngle
      })

      // Hole for doughnut
      if (type === 'doughnut') {
        ctx.fillStyle = '#131316'
        ctx.beginPath()
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Legend
      let legendY = chartArea.y + 10
      labels.forEach((label, i) => {
        ctx.fillStyle = getChartColor(i)
        ctx.fillRect(chartArea.x + chartArea.w + 10, legendY, 10, 10)
        ctx.fillStyle = '#A1A1AA'
        ctx.font = '11px DM Sans, sans-serif'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(label || `Series ${i + 1}`, chartArea.x + chartArea.w + 25, legendY)
        legendY += 18
      })
      break
    }

    case 'scatter': {
      datasets.forEach((ds, di) => {
        const pts = ds.data || []
        ctx.fillStyle = ds.color || getChartColor(di)
        for (let i = 0; i < pts.length - 1; i += 2) {
          const x = chartArea.x + (pts[i] / Math.max(...values)) * chartArea.w
          const y = chartArea.y + chartArea.h - (pts[i + 1] / maxVal) * chartArea.h
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      break
    }

    default: {
      // Fallback: render as bar
      const barWidth = Math.min(40, (chartArea.w / labels.length) * 0.6)
      const gap = chartArea.w / labels.length
      values.forEach((val, i) => {
        const barH = (val / maxVal) * chartArea.h
        const x = chartArea.x + gap * i + (gap - barWidth) / 2
        const y = chartArea.y + chartArea.h - barH
        ctx.fillStyle = getChartColor(i)
        ctx.fillRect(x, y, barWidth, barH)
      })
    }
  }

  return canvas.toDataURL()
}

// ─────────────────────────────────────────────────────
// Tool 14: Scheduler / Reminder
// ─────────────────────────────────────────────────────

const scheduler = {
  name: 'scheduler',
  description: 'Create scheduled reminders and tasks. Uses browser notifications and stores tasks in IndexedDB.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'complete', 'delete', 'update'],
        description: 'Action to perform'
      },
      title: {
        type: 'string',
        description: 'Task or reminder title'
      },
      description: {
        type: 'string',
        description: 'Task description or notes'
      },
      due_at: {
        type: 'string',
        description: 'Due date/time as ISO string (e.g. "2026-05-09T10:00:00")'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Task priority',
        default: 'medium'
      },
      task_id: {
        type: 'number',
        description: 'Task ID (for complete, delete, update actions)'
      }
    },
    required: ['action']
  },

  async execute({ action, title, description, due_at, priority = 'medium', task_id }) {
    switch (action) {
      case 'create': {
        if (!title) return { type: 'error', message: 'Title is required' }

        const task = {
          title,
          description: description || '',
          dueAt: due_at ? new Date(due_at).getTime() : null,
          priority,
          status: 'pending',
          createdAt: Date.now()
        }
        const id = await store.addTask(task)

        // Schedule browser notification if due_at is set
        if (task.dueAt) {
          scheduleNotification(id, task)
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission()
        }

        return {
          type: 'task_created',
          taskId: id,
          title,
          dueAt: due_at || null,
          priority,
          message: `Task "${title}" created${due_at ? ` (due: ${new Date(due_at).toLocaleString()})` : ''}`
        }
      }

      case 'list': {
        const tasks = await store.getTasks()
        const pending = tasks.filter(t => t.status === 'pending')
        const completed = tasks.filter(t => t.status === 'completed')

        return {
          type: 'task_list',
          pending: pending.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            dueAt: t.dueAt ? new Date(t.dueAt).toISOString() : null,
            priority: t.priority,
            createdAt: t.createdAt
          })),
          completed: completed.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority
          })),
          total: tasks.length
        }
      }

      case 'complete': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        await store.updateTask(task_id, { status: 'completed', completedAt: Date.now() })
        return {
          type: 'task_completed',
          taskId: task_id,
          message: `Task #${task_id} marked as completed`
        }
      }

      case 'delete': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        await store.deleteTask(task_id)
        return {
          type: 'task_deleted',
          taskId: task_id,
          message: `Task #${task_id} deleted`
        }
      }

      case 'update': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        const updates = {}
        if (title) updates.title = title
        if (description) updates.description = description
        if (due_at) updates.dueAt = new Date(due_at).getTime()
        if (priority) updates.priority = priority
        await store.updateTask(task_id, updates)
        return {
          type: 'task_updated',
          taskId: task_id,
          updates,
          message: `Task #${task_id} updated`
        }
      }

      default:
        return { type: 'error', message: `Unknown scheduler action: ${action}` }
    }
  }
}

function scheduleNotification(taskId, task) {
  const delay = task.dueAt - Date.now()
  if (delay <= 0) {
    fireNotification(task.title, task.description || 'Task is due!')
    return
  }
  setTimeout(() => {
    fireNotification(task.title, task.description || 'Task is due!')
  }, delay)
}

function fireNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }
  EventBus.emit('toast:show', { message: `⏰ ${title}`, type: 'warning' })
}

// ─────────────────────────────────────────────────────
// Tool 15: Embeddings Search
// ─────────────────────────────────────────────────────

const embeddingsSearch = {
  name: 'embeddings_search',
  description: 'Search through stored memories and knowledge using semantic vector search. Finds the most relevant information based on meaning, not just keywords.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        default: 5
      },
      threshold: {
        type: 'number',
        description: 'Minimum similarity score 0-1 (default: 0.3)',
        default: 0.3
      }
    },
    required: ['query']
  },

  async execute({ query, limit = 5, threshold = 0.3 }) {
    const provider = getActiveProvider()

    try {
      // Generate query embedding
      const queryEmbedding = await provider.embeddings(query)

      // Get all memories
      const memories = await store.getMemories()

      if (memories.length === 0) {
        return {
          type: 'search_results',
          query,
          results: [],
          message: 'No memories stored yet'
        }
      }

      // Calculate cosine similarity
      const scored = memories
        .filter(m => m.vector && m.vector.length > 0)
        .map(memory => ({
          id: memory.id,
          content: memory.content,
          createdAt: memory.createdAt,
          similarity: cosineSimilarity(queryEmbedding, memory.vector)
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      return {
        type: 'search_results',
        query,
        results: scored.map(r => ({
          id: r.id,
          content: r.content,
          similarity: Math.round(r.similarity * 100) / 100,
          createdAt: new Date(r.createdAt).toISOString()
        })),
        totalSearched: memories.length,
        returned: scored.length
      }
    } catch (err) {
      return {
        type: 'error',
        message: `Embeddings search error: ${err.message}`
      }
    }
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dotProduct / denom
}

// ─────────────────────────────────────────────────────
// Tool 16: Task Manager
// ─────────────────────────────────────────────────────

const taskManager = {
  name: 'task_manager',
  description: 'Create, track, and manage tasks and to-do items. Supports priorities, status tracking, and batch operations.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'list', 'update', 'complete', 'delete', 'clear_completed', 'stats'],
        description: 'Action to perform'
      },
      title: {
        type: 'string',
        description: 'Task title'
      },
      description: {
        type: 'string',
        description: 'Task description'
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      task_id: {
        type: 'number',
        description: 'Task ID'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization'
      }
    },
    required: ['action']
  },

  async execute({ action, title, description, priority = 'medium', task_id, tags }) {
    switch (action) {
      case 'create': {
        if (!title) return { type: 'error', message: 'Title is required' }
        const task = {
          title,
          description: description || '',
          priority,
          tags: tags || [],
          status: 'pending',
          createdAt: Date.now()
        }
        const id = await store.addTask(task)
        return {
          type: 'task_created',
          taskId: id,
          title,
          priority,
          tags: tags || [],
          message: `Task "${title}" created`
        }
      }

      case 'list': {
        const tasks = await store.getTasks()
        const grouped = {
          pending: [],
          in_progress: [],
          completed: []
        }
        tasks.forEach(t => {
          const status = t.status || 'pending'
          if (grouped[status]) grouped[status].push({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            tags: t.tags || [],
            status: t.status,
            createdAt: t.createdAt,
            completedAt: t.completedAt
          })
        })

        return {
          type: 'task_list',
          tasks: grouped,
          total: tasks.length,
          pending: grouped.pending.length,
          completed: grouped.completed.length
        }
      }

      case 'update': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        const updates = {}
        if (title) updates.title = title
        if (description) updates.description = description
        if (priority) updates.priority = priority
        if (tags) updates.tags = tags
        updates.updatedAt = Date.now()
        await store.updateTask(task_id, updates)
        return {
          type: 'task_updated',
          taskId: task_id,
          updates,
          message: `Task #${task_id} updated`
        }
      }

      case 'complete': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        await store.updateTask(task_id, {
          status: 'completed',
          completedAt: Date.now()
        })
        return {
          type: 'task_completed',
          taskId: task_id,
          message: `Task #${task_id} completed ✓`
        }
      }

      case 'delete': {
        if (!task_id) return { type: 'error', message: 'task_id is required' }
        await store.deleteTask(task_id)
        return {
          type: 'task_deleted',
          taskId: task_id,
          message: `Task #${task_id} deleted`
        }
      }

      case 'clear_completed': {
        const tasks = await store.getTasks()
        const completed = tasks.filter(t => t.status === 'completed')
        for (const t of completed) {
          await store.deleteTask(t.id)
        }
        return {
          type: 'tasks_cleared',
          count: completed.length,
          message: `Cleared ${completed.length} completed tasks`
        }
      }

      case 'stats': {
        const tasks = await store.getTasks()
        const pending = tasks.filter(t => t.status === 'pending')
        const completed = tasks.filter(t => t.status === 'completed')
        const highPri = pending.filter(t => t.priority === 'high')

        return {
          type: 'task_stats',
          total: tasks.length,
          pending: pending.length,
          completed: completed.length,
          highPriority: highPri.length,
          completionRate: tasks.length > 0
            ? Math.round((completed.length / tasks.length) * 100) + '%'
            : '0%',
          oldestPending: pending.length > 0
            ? new Date(Math.min(...pending.map(t => t.createdAt))).toISOString()
            : null
        }
      }

      default:
        return { type: 'error', message: `Unknown task action: ${action}` }
    }
  }
}

// ─────────────────────────────────────────────────────
// Tool Registry
// ─────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  imageGeneration,      // T1
  videoGeneration,      // T2
  webSearch,            // T3
  urlExtract,           // T4
  textToSpeech,         // T5
  speechToText,         // T6
  codeInterpreter,      // T7
  fileProcessor,        // T8
  githubAgent,          // T9
  domScraper,           // T10
  documentGenerator,    // T11
  reasoningChain,       // T12
  dataVisualizer,       // T13
  scheduler,            // T14
  embeddingsSearch,     // T15
  taskManager           // T16
]

/**
 * Returns tool definitions formatted for the API's tool_calls format.
 * Each tool is wrapped as { type: 'function', function: { ... } }
 */
export function getToolDefinitions() {
  return TOOL_DEFINITIONS.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

/**
 * Execute a tool by name with given parameters.
 * @param {string} name - Tool name (e.g. 'image_generation')
 * @param {object} params - Parameters for the tool
 * @returns {Promise<object>} Tool result
 */
export async function executeTool(name, params) {
  const tool = TOOL_DEFINITIONS.find(t => t.name === name)
  if (!tool) {
    return {
      type: 'error',
      message: `Unknown tool: ${name}. Available: ${TOOL_DEFINITIONS.map(t => t.name).join(', ')}`
    }
  }

  try {
    console.log(`[Tools] Executing: ${name}`, params)
    const result = await tool.execute(params || {})
    console.log(`[Tools] Result:`, result)
    return result
  } catch (err) {
    console.error(`[Tools] Error in ${name}:`, err)
    return {
      type: 'error',
      tool: name,
      message: `Tool execution failed: ${err.message}`
    }
  }
}