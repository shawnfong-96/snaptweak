<script setup lang="ts">
import { ref, onMounted } from 'vue'

const historyCount = ref(0)
const blockedReason = ref('')

// URLs where Chrome forbids content-script injection
function getRestrictedReason(url: string): string {
  if (!url) return '无法读取当前页面地址'
  if (/^(chrome|edge|brave|about|chrome-extension|devtools|view-source):/i.test(url)) {
    return '这是浏览器的内部页面，出于安全限制无法注入工具'
  }
  if (/^https?:\/\/chrome\.google\.com\/webstore/i.test(url) ||
      /^https?:\/\/chromewebstore\.google\.com/i.test(url)) {
    return 'Chrome 应用商店页面禁止扩展运行'
  }
  if (/^https?:\/\/microsoftedge\.microsoft\.com\/addons/i.test(url)) {
    return 'Edge 扩展商店页面禁止扩展运行'
  }
  return ''
}

onMounted(() => {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
    if (response?.history) historyCount.value = response.history.length
  })
})

function startSelection() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0]
    if (!tab?.id) return
    const reason = getRestrictedReason(tab.url || '')
    if (reason) {
      blockedReason.value = reason
      return
    }
    // Try to message the content script; if it isn't there (e.g. the page was
    // open before install), show a friendly hint to reload the page.
    chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' }, () => {
      if (chrome.runtime.lastError) {
        blockedReason.value = '当前页面尚未加载工具，请刷新此网页后重试'
        return
      }
      window.close()
    })
  })
}

function dismissBlocked() {
  blockedReason.value = ''
}

function openOptions() {
  chrome.runtime.openOptionsPage()
}
</script>

<template>
  <div class="popup">
    <div class="popup-header">
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="8" fill="#6366f1"/>
          <circle cx="14" cy="14" r="6" stroke="#fff" stroke-width="2.5" fill="none"/>
          <circle cx="14" cy="14" r="2" fill="#fff"/>
          <path d="M14 5v3M14 20v3M5 14h3M20 14h3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div class="logo-text">
          <h1>SnapTweak</h1>
          <p>Circle · Describe · Iterate</p>
        </div>
      </div>
    </div>

    <div class="popup-body">
      <div v-if="blockedReason" class="blocked-notice">
        <div class="blocked-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#d97706">
            <path d="M10 1a9 9 0 100 18 9 9 0 000-18zm-1 5h2v6H9V6zm0 8h2v2H9v-2z"/>
          </svg>
        </div>
        <div class="blocked-text">
          <strong>这个页面用不了 SnapTweak</strong>
          <span>{{ blockedReason }}。</span>
          <span class="blocked-hint">请在普通网页（你自己的项目、本地 HTML、任意 http/https 站点）上使用。</span>
        </div>
        <button class="blocked-dismiss" @click="dismissBlocked">知道了</button>
      </div>

      <button v-else class="start-btn" @click="startSelection">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="10" cy="10" r="7"/>
          <path d="M10 6v8M6 10h8" stroke-linecap="round"/>
        </svg>
        <span>Start Selection</span>
        <kbd>Click on page</kbd>
      </button>

      <div class="quick-guide">
        <h3>How it works</h3>
        <div class="steps">
          <div class="step">
            <div class="step-icon">1</div>
            <div class="step-text">Click an element or drag to select an area</div>
          </div>
          <div class="step">
            <div class="step-icon">2</div>
            <div class="step-text">Drag the handles to fine-tune the selection</div>
          </div>
          <div class="step">
            <div class="step-icon">3</div>
            <div class="step-text">Describe what you want changed</div>
          </div>
          <div class="step">
            <div class="step-icon">4</div>
            <div class="step-text">Get a precise prompt (free) or AI auto-fix</div>
          </div>
        </div>
      </div>

      <div class="popup-footer">
        <button class="settings-btn" @click="openOptions">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm6.32-1.906l-1.087-.628a5.453 5.453 0 000-1.932l1.088-.628a.29.29 0 00.13-.322 6.57 6.57 0 00-1.44-2.494.289.289 0 00-.344-.065L11.58 2.65a5.38 5.38 0 00-1.673-.966V.53a.289.289 0 00-.227-.282 6.62 6.62 0 00-2.88 0 .289.289 0 00-.227.282v1.156a5.44 5.44 0 00-1.673.965l-1.088-.624a.287.287 0 00-.344.065A6.536 6.536 0 002.03 4.586a.289.289 0 00.13.322l1.087.628a5.453 5.453 0 000 1.932L2.16 8.096a.29.29 0 00-.13.322 6.57 6.57 0 001.44 2.493.289.289 0 00.344.066l1.088-.625a5.38 5.38 0 001.673.966v1.156c0 .138.098.256.227.282a6.62 6.62 0 002.88 0 .289.289 0 00.227-.282v-1.156a5.44 5.44 0 001.673-.966l1.088.625a.287.287 0 00.344-.066 6.536 6.536 0 001.44-2.493.289.289 0 00-.13-.322z"/>
          </svg>
          Settings
        </button>
        <span class="history-count" v-if="historyCount > 0">{{ historyCount }} items saved</span>
      </div>
    </div>
  </div>
</template>
