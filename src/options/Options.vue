<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Settings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'

const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
const saved = ref(false)
const testResult = ref('')

onMounted(() => {
  chrome.storage.sync.get('settings', (result) => {
    if (result.settings) {
      settings.value = { ...DEFAULT_SETTINGS, ...result.settings }
    }
  })
})

function saveSettings() {
  chrome.storage.sync.set({ settings: settings.value }, () => {
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  })
}

async function testConnection() {
  testResult.value = 'Testing...'
  try {
    const provider = settings.value.aiProvider
    let endpoint = ''
    let headers: Record<string, string> = {}
    let body = {}

    if (provider === 'openai') {
      endpoint = 'https://api.openai.com/v1/models'
      headers = { Authorization: `Bearer ${settings.value.apiKey}` }
      const resp = await fetch(endpoint, { headers })
      if (resp.ok) testResult.value = '✅ Connection successful!'
      else testResult.value = `❌ Error: ${resp.status} ${resp.statusText}`
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a models endpoint, so test with a minimal request
      endpoint = 'https://api.anthropic.com/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': settings.value.apiKey,
        'anthropic-version': '2023-06-01',
      }
      body = { model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
      const resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
      if (resp.ok) testResult.value = '✅ Connection successful!'
      else testResult.value = `❌ Error: ${resp.status} ${resp.statusText}`
    } else if (provider === 'custom') {
      const resp = await fetch(settings.value.apiEndpoint, {
        headers: { Authorization: `Bearer ${settings.value.apiKey}` },
      })
      testResult.value = resp.ok ? '✅ Endpoint reachable!' : `❌ Error: ${resp.status}`
    } else {
      testResult.value = 'Select an AI provider first'
    }
  } catch (err: unknown) {
    testResult.value = `❌ ${(err as Error).message}`
  }
}

function resetTemplate() {
  settings.value.promptTemplate = DEFAULT_SETTINGS.promptTemplate
}
</script>

<template>
  <div class="options-page">
    <header class="options-header">
      <div class="header-inner">
        <div class="brand">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#6366f1"/>
            <circle cx="14" cy="14" r="6" stroke="#fff" stroke-width="2.5" fill="none"/>
            <circle cx="14" cy="14" r="2" fill="#fff"/>
          </svg>
          <div>
            <h1>SnapTweak Settings</h1>
            <p>Configure your AI provider and preferences</p>
          </div>
        </div>
      </div>
    </header>

    <main class="options-content">
      <!-- AI Provider Section -->
      <section class="settings-section">
        <h2>🤖 AI Provider</h2>
        <p class="section-desc">Configure an AI provider to enable auto-fix mode. Without this, SnapTweak will generate prompts you can paste into any AI tool.</p>

        <div class="form-group">
          <label>Provider</label>
          <select v-model="settings.aiProvider">
            <option value="none">None (Prompt generation only)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </select>
        </div>

        <template v-if="settings.aiProvider !== 'none'">
          <div class="form-group">
            <label>API Key</label>
            <input type="password" v-model="settings.apiKey" placeholder="sk-..." />
          </div>

          <div class="form-group" v-if="settings.aiProvider === 'custom'">
            <label>API Endpoint</label>
            <input type="url" v-model="settings.apiEndpoint" placeholder="https://your-api.com/v1/chat/completions" />
          </div>

          <div class="form-group">
            <label>Model</label>
            <input type="text" v-model="settings.model" :placeholder="settings.aiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'" />
          </div>

          <div class="form-row">
            <button class="btn-secondary" @click="testConnection">Test Connection</button>
            <span class="test-result" v-if="testResult">{{ testResult }}</span>
          </div>
        </template>
      </section>

      <!-- Prompt Template Section -->
      <section class="settings-section">
        <h2>📝 Prompt Template</h2>
        <p class="section-desc">Customize the generated prompt template. Use placeholders like {{pageUrl}}, {{selector}}, {{description}}, etc.</p>

        <div class="form-group">
          <div class="textarea-header">
            <label>Template</label>
            <button class="btn-text" @click="resetTemplate">Reset to default</button>
          </div>
          <textarea v-model="settings.promptTemplate" rows="12"></textarea>
        </div>
      </section>

      <!-- UI Preferences -->
      <section class="settings-section">
        <h2>🎨 UI Preferences</h2>

        <div class="form-group">
          <label>Default Annotation Color</label>
          <div class="color-picker">
            <input type="color" v-model="settings.annotationColor" />
            <span>{{ settings.annotationColor }}</span>
          </div>
        </div>

        <div class="form-group">
          <label>Stroke Width: {{ settings.strokeWidth }}px</label>
          <input type="range" v-model.number="settings.strokeWidth" min="1" max="8" step="1" />
        </div>

        <div class="form-group">
          <label>Language</label>
          <select v-model="settings.language">
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>
      </section>

      <!-- Save Button -->
      <div class="save-bar">
        <button class="btn-primary" @click="saveSettings">
          {{ saved ? '✅ Saved!' : 'Save Settings' }}
        </button>
      </div>
    </main>
  </div>
</template>
