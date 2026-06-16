// End-to-end logic test for SnapTweak's AI-fix pipeline.
// Spins up a tiny mock LLM server that mimics OpenAI + Anthropic response shapes,
// then runs the SAME request-building / response-parsing logic the extension uses.
// Verifies: prompt templating, OpenAI path, Anthropic path, error fallback, empty fallback.

import http from 'node:http'

const DEFAULT_SETTINGS = {
  aiProvider: 'none',
  apiKey: '',
  apiEndpoint: '',
  model: 'gpt-4o',
  promptTemplate: `You are helping me modify a web page element.

## Context
- Page URL: {{pageUrl}}
- Element: {{selector}} ({{tagName}})
- Current text: {{elementText}}

## Selection Area
Position: ({{x}}, {{y}}) Size: {{width}}x{{height}}

## User's Request
{{description}}`,
}

function fillTemplate(template, item) {
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

// Mirror of background handleAiFix (endpoints overridable for testing)
async function handleAiFix(item, settings, endpoints) {
  if (settings.aiProvider === 'none' || !settings.apiKey) {
    return { prompt: fillTemplate(settings.promptTemplate, item), error: 'AI provider not configured — generated a prompt instead.' }
  }
  try {
    const filledPrompt = fillTemplate(settings.promptTemplate, item)
    const hasImage = !!item.screenshot && item.screenshot.startsWith('data:image')
    let endpoint, headers, body
    if (settings.aiProvider === 'anthropic') {
      endpoint = endpoints.anthropic
      headers = { 'Content-Type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01' }
      const content = [{ type: 'text', text: filledPrompt }]
      if (hasImage) {
        const [meta, b64] = item.screenshot.split(',')
        const mediaType = meta.match(/data:(.*?);/)?.[1] || 'image/png'
        content.unshift({ type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } })
      }
      body = { model: settings.model || 'claude-sonnet-4-20250514', max_tokens: 4096, messages: [{ role: 'user', content }] }
    } else {
      endpoint = settings.aiProvider === 'openai' ? endpoints.openai : settings.apiEndpoint
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` }
      const userContent = hasImage
        ? [{ type: 'text', text: filledPrompt }, { type: 'image_url', image_url: { url: item.screenshot } }]
        : filledPrompt
      body = { model: settings.model || 'gpt-4o', messages: [{ role: 'system', content: 'You are an expert frontend developer.' }, { role: 'user', content: userContent }], max_tokens: 4096 }
    }
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!response.ok) {
      const errText = await response.text()
      return { prompt: fillTemplate(settings.promptTemplate, item), error: `API Error (${response.status}): ${errText.slice(0, 300)}` }
    }
    const data = await response.json()
    let code = settings.aiProvider === 'anthropic' ? (data.content?.[0]?.text || '') : (data.choices?.[0]?.message?.content || '')
    if (!code) return { prompt: fillTemplate(settings.promptTemplate, item), error: 'Empty AI response — showing prompt instead.' }
    return { prompt: code }
  } catch (error) {
    return { prompt: fillTemplate(settings.promptTemplate, item), error: `Request failed: ${error.message}` }
  }
}

// ---- Mock LLM server ----
const server = http.createServer((req, res) => {
  let bodyStr = ''
  req.on('data', (c) => (bodyStr += c))
  req.on('end', () => {
    const url = req.url || ''
    const body = JSON.parse(bodyStr || '{}')
    // Simulate auth failure path
    const auth = req.headers['authorization'] || req.headers['x-api-key']
    if (auth && String(auth).includes('BAD_KEY')) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Invalid API key' } }))
      return
    }
    if (url.includes('chat/completions')) {
      // Echo back that it received the user's request, OpenAI shape
      const userMsg = body.messages?.find((m) => m.role === 'user')
      const text = Array.isArray(userMsg?.content) ? userMsg.content.find((c) => c.type === 'text')?.text : userMsg?.content
      const sawImage = Array.isArray(userMsg?.content) && userMsg.content.some((c) => c.type === 'image_url')
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: `/* AI fix */\n.cta { padding: 16px 32px; background: #2563EB; }\n[received ${text?.length || 0} chars, image=${sawImage}]` } }],
      }))
    } else if (url.includes('messages')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ content: [{ type: 'text', text: 'Anthropic fix: set .cta background to #2563EB; padding 16px 32px;' }] }))
    } else {
      res.writeHead(404); res.end('not found')
    }
  })
})

const sampleItem = {
  pageUrl: 'http://localhost:9876/test.html',
  screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANS',
  selection: { x: 120, y: 340, width: 200, height: 56, selector: '.cta', tagName: 'button', elementText: 'Click me', computedStyles: {} },
  description: 'Make this button bigger and blue (#2563EB)',
}

let pass = 0, fail = 0
function assert(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS: ${name}`) }
  else { fail++; console.log(`  FAIL: ${name} ${extra}`) }
}

await new Promise((resolve) => server.listen(0, resolve))
const port = server.address().port
const endpoints = { openai: `http://localhost:${port}/v1/chat/completions`, anthropic: `http://localhost:${port}/v1/messages` }

console.log('\n=== SnapTweak AI flow tests ===\n')

// 1. Template filling
const filled = fillTemplate(DEFAULT_SETTINGS.promptTemplate, sampleItem)
assert('template injects selector', filled.includes('.cta (button)'))
assert('template injects size', filled.includes('200x56'))
assert('template injects description', filled.includes('bigger and blue'))
assert('no leftover placeholders', !filled.includes('{{'))

// 2. No API key -> fallback to prompt
const r1 = await handleAiFix(sampleItem, { ...DEFAULT_SETTINGS, aiProvider: 'none', apiKey: '' }, endpoints)
assert('no-key returns prompt fallback', r1.prompt.includes('bigger and blue') && !!r1.error)

// 3. OpenAI happy path (with image)
const r2 = await handleAiFix(sampleItem, { ...DEFAULT_SETTINGS, aiProvider: 'openai', apiKey: 'sk-good', model: 'gpt-4o' }, endpoints)
assert('openai returns AI code', r2.prompt.includes('AI fix') && !r2.error)
assert('openai forwarded image', r2.prompt.includes('image=true'))

// 4. OpenAI without screenshot (text-only content)
const r3 = await handleAiFix({ ...sampleItem, screenshot: '' }, { ...DEFAULT_SETTINGS, aiProvider: 'openai', apiKey: 'sk-good' }, endpoints)
assert('openai works without image', r3.prompt.includes('AI fix') && r3.prompt.includes('image=false'))

// 5. Anthropic happy path
const r4 = await handleAiFix(sampleItem, { ...DEFAULT_SETTINGS, aiProvider: 'anthropic', apiKey: 'sk-ant-good', model: 'claude-sonnet-4-20250514' }, endpoints)
assert('anthropic returns AI code', r4.prompt.includes('Anthropic fix') && !r4.error)

// 6. Auth error -> graceful fallback with error + prompt
const r5 = await handleAiFix(sampleItem, { ...DEFAULT_SETTINGS, aiProvider: 'openai', apiKey: 'sk-BAD_KEY' }, endpoints)
assert('auth error falls back to prompt', r5.prompt.includes('bigger and blue'))
assert('auth error surfaces 401', (r5.error || '').includes('401'))

// 7. Network failure -> graceful fallback
const r6 = await handleAiFix(sampleItem, { ...DEFAULT_SETTINGS, aiProvider: 'custom', apiKey: 'k', apiEndpoint: 'http://localhost:1/nope' }, endpoints)
assert('network error falls back to prompt', r6.prompt.includes('bigger and blue') && !!r6.error)

server.close()
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`)
process.exit(fail === 0 ? 0 : 1)
