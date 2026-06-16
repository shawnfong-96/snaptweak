// SnapTweak Background Service Worker
import type { Settings, FeedbackItem } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS })
    }
  })
})

// Read settings, merging in any flat keys (apiKey/apiProvider) saved by the
// inline quick-setup form so both storage shapes stay consistent.
async function readSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(['settings', 'apiKey', 'apiProvider', 'model', 'apiEndpoint'])
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) }
  // Flat keys (written by InlineInput quick setup) take precedence if present
  if (result.apiKey) settings.apiKey = result.apiKey
  if (result.apiProvider) settings.aiProvider = result.apiProvider
  if (result.model) settings.model = result.model
  if (result.apiEndpoint) settings.apiEndpoint = result.apiEndpoint
  return settings
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SETTINGS':
      readSettings().then((settings) => sendResponse({ settings }))
      return true

    case 'GENERATE_PROMPT':
      handleGeneratePrompt(message.data).then(sendResponse)
      return true

    // Accept both names for backward/forward compatibility
    case 'AI_AUTO_FIX':
    case 'AI_FIX':
      handleAiFix(message.data).then(sendResponse)
      return true

    case 'CAPTURE_TAB':
      handleCaptureTab(sender).then(sendResponse)
      return true

    case 'SAVE_FEEDBACK':
      saveFeedbackHistory(message.data).then(() => sendResponse({ ok: true }))
      return true

    case 'GET_HISTORY':
      getFeedbackHistory().then(sendResponse)
      return true

    case 'OPEN_API_HELP':
      chrome.tabs.create({ url: 'https://platform.openai.com/api-keys' })
      sendResponse({ ok: true })
      return true
  }
})

async function handleCaptureTab(sender: chrome.runtime.MessageSender): Promise<{ dataUrl?: string; error?: string }> {
  try {
    const windowId = sender.tab?.windowId
    const dataUrl = await chrome.tabs.captureVisibleTab(
      windowId as number,
      { format: 'png' }
    )
    return { dataUrl }
  } catch (error: unknown) {
    return { error: (error as Error).message }
  }
}

function fillTemplate(template: string, item: FeedbackItem): string {
  return template
    .replace(/\{\{pageUrl\}\}/g, item.pageUrl)
    .replace(/\{\{selector\}\}/g, item.selection.selector)
    .replace(/\{\{tagName\}\}/g, item.selection.tagName)
    .replace(/\{\{elementText\}\}/g, item.selection.elementText.slice(0, 200))
    .replace(/\{\{x\}\}/g, String(Math.round(item.selection.x)))
    .replace(/\{\{y\}\}/g, String(Math.round(item.selection.y)))
    .replace(/\{\{width\}\}/g, String(Math.round(item.selection.width)))
    .replace(/\{\{height\}\}/g, String(Math.round(item.selection.height)))
    .replace(/\{\{description\}\}/g, item.description)
}

async function handleGeneratePrompt(item: FeedbackItem): Promise<{ prompt: string }> {
  const settings = await readSettings()
  const prompt = fillTemplate(settings.promptTemplate, item)
  return { prompt }
}

// Returns { prompt } so the content script (which reads response.prompt) can
// display the AI output uniformly, whether it's a generated prompt or AI code.
async function handleAiFix(item: FeedbackItem): Promise<{ prompt: string; error?: string }> {
  const settings = await readSettings()

  if (settings.aiProvider === 'none' || !settings.apiKey) {
    // Graceful fallback: return the structured prompt instead of an error
    const fallback = await handleGeneratePrompt(item)
    return {
      prompt: fallback.prompt,
      error: 'AI provider not configured — generated a prompt instead.',
    }
  }

  try {
    const filledPrompt = fillTemplate(settings.promptTemplate, item)
    const hasImage = !!item.screenshot && item.screenshot.startsWith('data:image')

    let endpoint: string
    let headers: Record<string, string>
    let body: unknown

    if (settings.aiProvider === 'anthropic') {
      endpoint = 'https://api.anthropic.com/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      }
      const content: unknown[] = [{ type: 'text', text: filledPrompt }]
      if (hasImage) {
        const [meta, b64] = item.screenshot.split(',')
        const mediaType = meta.match(/data:(.*?);/)?.[1] || 'image/png'
        content.unshift({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: b64 },
        })
      }
      body = {
        model: settings.model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }
    } else {
      // OpenAI-compatible (openai or custom)
      endpoint = settings.aiProvider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : settings.apiEndpoint
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      }
      const userContent: unknown = hasImage
        ? [
            { type: 'text', text: filledPrompt },
            { type: 'image_url', image_url: { url: item.screenshot } },
          ]
        : filledPrompt
      body = {
        model: settings.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert frontend developer. Given a screenshot and a description of desired changes to a web page element, provide the exact, copy-pasteable code modifications needed (HTML/CSS/JS). Be concise and specific. Start with a one-line summary, then the code.',
          },
          { role: 'user', content: userContent },
        ],
        max_tokens: 4096,
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      const fallback = await handleGeneratePrompt(item)
      return {
        prompt: fallback.prompt,
        error: `API Error (${response.status}): ${errText.slice(0, 300)}`,
      }
    }

    const data = await response.json()
    let code = ''
    if (settings.aiProvider === 'anthropic') {
      code = data.content?.[0]?.text || ''
    } else {
      code = data.choices?.[0]?.message?.content || ''
    }

    if (!code) {
      const fallback = await handleGeneratePrompt(item)
      return { prompt: fallback.prompt, error: 'Empty AI response — showing prompt instead.' }
    }

    return { prompt: code }
  } catch (error: unknown) {
    const fallback = await handleGeneratePrompt(item)
    return {
      prompt: fallback.prompt,
      error: `Request failed: ${(error as Error).message}`,
    }
  }
}

async function saveFeedbackHistory(item: FeedbackItem): Promise<void> {
  const result = await chrome.storage.local.get('history')
  const history: FeedbackItem[] = result.history || []
  history.unshift(item)
  if (history.length > 50) history.length = 50
  await chrome.storage.local.set({ history })
}

async function getFeedbackHistory(): Promise<{ history: FeedbackItem[] }> {
  const result = await chrome.storage.local.get('history')
  return { history: result.history || [] }
}
