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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SETTINGS':
      chrome.storage.sync.get('settings', (result) => {
        sendResponse({ settings: result.settings || DEFAULT_SETTINGS })
      })
      return true // async response

    case 'GENERATE_PROMPT':
      handleGeneratePrompt(message.data).then(sendResponse)
      return true

    case 'AI_FIX':
      handleAiFix(message.data).then(sendResponse)
      return true

    case 'SAVE_FEEDBACK':
      saveFeedbackHistory(message.data).then(sendResponse)
      return true

    case 'GET_HISTORY':
      getFeedbackHistory().then(sendResponse)
      return true
  }
})

async function handleGeneratePrompt(item: FeedbackItem): Promise<{ prompt: string }> {
  const result = await chrome.storage.sync.get('settings')
  const settings: Settings = result.settings || DEFAULT_SETTINGS

  const prompt = settings.promptTemplate
    .replace('{{pageUrl}}', item.pageUrl)
    .replace('{{selector}}', item.selection.selector)
    .replace('{{tagName}}', item.selection.tagName)
    .replace('{{elementText}}', item.selection.elementText.slice(0, 200))
    .replace('{{x}}', String(Math.round(item.selection.x)))
    .replace('{{y}}', String(Math.round(item.selection.y)))
    .replace('{{width}}', String(Math.round(item.selection.width)))
    .replace('{{height}}', String(Math.round(item.selection.height)))
    .replace('{{description}}', item.description)

  return { prompt }
}

async function handleAiFix(item: FeedbackItem): Promise<{ code: string; error?: string }> {
  const result = await chrome.storage.sync.get('settings')
  const settings: Settings = result.settings || DEFAULT_SETTINGS

  if (settings.aiProvider === 'none' || !settings.apiKey) {
    return { code: '', error: 'AI provider not configured. Go to Settings to add your API key.' }
  }

  try {
    const promptResult = await handleGeneratePrompt(item)
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a frontend developer. Given a screenshot and description of desired changes to a web page element, provide the exact code modifications needed. Be concise and specific.',
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text', text: promptResult.prompt },
          ...(item.screenshot
            ? [{ type: 'image_url', image_url: { url: item.screenshot } }]
            : []),
        ],
      },
    ]

    let endpoint: string
    let headers: Record<string, string>
    let body: unknown

    if (settings.aiProvider === 'openai') {
      endpoint = 'https://api.openai.com/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      }
      body = { model: settings.model || 'gpt-4o', messages, max_tokens: 4096 }
    } else if (settings.aiProvider === 'anthropic') {
      endpoint = 'https://api.anthropic.com/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      }
      body = {
        model: settings.model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: promptResult.prompt }],
      }
    } else {
      endpoint = settings.apiEndpoint
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      }
      body = { model: settings.model, messages, max_tokens: 4096 }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      return { code: '', error: `API Error (${response.status}): ${errText}` }
    }

    const data = await response.json()
    let code = ''

    if (settings.aiProvider === 'anthropic') {
      code = data.content?.[0]?.text || ''
    } else {
      code = data.choices?.[0]?.message?.content || ''
    }

    return { code }
  } catch (error: unknown) {
    return { code: '', error: `Request failed: ${(error as Error).message}` }
  }
}

async function saveFeedbackHistory(item: FeedbackItem): Promise<void> {
  const result = await chrome.storage.local.get('history')
  const history: FeedbackItem[] = result.history || []
  history.unshift(item)
  // Keep only last 50 items
  if (history.length > 50) history.length = 50
  await chrome.storage.local.set({ history })
}

async function getFeedbackHistory(): Promise<{ history: FeedbackItem[] }> {
  const result = await chrome.storage.local.get('history')
  return { history: result.history || [] }
}
