// InlineInput — lightweight input that appears right next to the selection area

interface InlineInputOptions {
  /** Bounding rect of the selected area (viewport coordinates) */
  anchorRect: { x: number; y: number; width: number; height: number }
  /** Called when user submits their description */
  onSubmit: (description: string, useAI: boolean) => void
  /** Called when user cancels */
  onCancel: () => void
}

const PROVIDER_HELP: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  custom: 'https://platform.openai.com/api-keys',
}

export class InlineInput {
  private options: InlineInputOptions
  private container: HTMLDivElement
  private hasApiKey = false

  constructor(options: InlineInputOptions) {
    this.options = options
    this.container = this.createContainer()
    this.checkApiKey()
    this.bindEvents()
    this.focusInput()
  }

  private async checkApiKey(): Promise<void> {
    try {
      // Check both flat keys (inline setup) and nested settings (options page)
      const result = await chrome.storage.sync.get(['apiKey', 'apiProvider', 'settings'])
      const flatKey = result.apiKey && String(result.apiKey).trim()
      const settingsKey = result.settings?.apiKey && String(result.settings.apiKey).trim()
      this.hasApiKey = !!(flatKey || settingsKey)
      this.updateAIButtonState()
    } catch {
      this.hasApiKey = false
    }
  }

  private updateAIButtonState(): void {
    const aiBtn = this.container.querySelector('.snaptweak-inline-ai-btn') as HTMLButtonElement
    if (!aiBtn) return

    if (this.hasApiKey) {
      aiBtn.classList.remove('disabled')
      aiBtn.title = '使用 AI 自动改代码'
      aiBtn.querySelector('.snaptweak-ai-btn-label')
      aiBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z"/>
        </svg>
        AI 自动改代码
      `
    } else {
      aiBtn.classList.add('disabled')
      aiBtn.title = '高级：配置 API Key 后可自动改代码'
    }
  }

  private createContainer(): HTMLDivElement {
    const { anchorRect } = this.options
    const el = document.createElement('div')
    el.className = 'snaptweak-inline-input'

    // Position: try to place below the selection, if not enough space, place above
    const spaceBelow = window.innerHeight - (anchorRect.y + anchorRect.height)
    const spaceAbove = anchorRect.y
    let top: number
    let placement: 'below' | 'above'

    if (spaceBelow >= 220) {
      top = anchorRect.y + anchorRect.height + 12
      placement = 'below'
    } else if (spaceAbove >= 220) {
      top = anchorRect.y - 220 - 12
      placement = 'above'
    } else {
      top = anchorRect.y + anchorRect.height + 12
      placement = 'below'
    }

    // Horizontal: align to left edge of selection, but ensure it stays on screen
    let left = anchorRect.x
    const inputWidth = 380
    if (left + inputWidth > window.innerWidth - 16) {
      left = window.innerWidth - inputWidth - 16
    }
    if (left < 16) left = 16

    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.dataset.placement = placement

    el.innerHTML = `
      <div class="snaptweak-inline-input-inner">
        <div class="snaptweak-inline-input-row">
          <textarea
            class="snaptweak-inline-textarea"
            placeholder="描述你想修改什么... / Describe what to change..."
            rows="2"
          ></textarea>
        </div>
        <div class="snaptweak-inline-actions">
          <button class="snaptweak-inline-submit-btn primary" title="生成提示词并复制 (Ctrl+Enter)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 1a.5.5 0 000 1H6v1.5a2 2 0 01-2 2H3.5a.5.5 0 000 1H4a2 2 0 012 2V11h-.5a.5.5 0 000 1H6v1.5a.5.5 0 001 0V12h.5a.5.5 0 000-1H7V9.5a2 2 0 012-2h.5a.5.5 0 000-1H9a2 2 0 01-2-2V2h.5a.5.5 0 000-1h-2z"/>
            </svg>
            生成提示词 · 复制到 AI
          </button>
        </div>
        <div class="snaptweak-inline-free-tip">
          免费 · 无需 API Key — 复制后粘贴到 WorkBuddy / ChatGPT / Claude 对话框即可
        </div>
        <div class="snaptweak-inline-advanced">
          <button class="snaptweak-inline-ai-btn disabled" title="高级：配置 API Key 后可自动改代码">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6 6.5A2 2 0 118 8.5a.75.75 0 00-.75.75v.75h-1.5v-.75A2.25 2.25 0 018 7a.5.5 0 10-.5-.5H6zm1.25 5.5h1.5v1.5h-1.5V12z"/>
            </svg>
            高级：AI 自动改代码（需 API Key）
          </button>
        </div>
        <div class="snaptweak-ai-hint" style="display:none"></div>
      </div>
      <div class="snaptweak-inline-arrow ${placement}"></div>
    `

    document.body.appendChild(el)
    return el
  }

  private bindEvents(): void {
    const textarea = this.container.querySelector('.snaptweak-inline-textarea') as HTMLTextAreaElement

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    })

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        this.submit(false)
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        this.options.onCancel()
      }
    })

    // Submit button (generate prompt)
    this.container.querySelector('.snaptweak-inline-submit-btn')?.addEventListener('click', () => {
      this.submit(false)
    })

    // AI Fix button (advanced)
    this.container.querySelector('.snaptweak-inline-ai-btn')?.addEventListener('click', () => {
      if (!this.hasApiKey) {
        this.showApiKeySetup()
        return
      }
      // Validate there's a description first
      const textarea = this.container.querySelector('.snaptweak-inline-textarea') as HTMLTextAreaElement
      if (!textarea.value.trim()) {
        textarea.classList.add('snaptweak-shake')
        setTimeout(() => textarea.classList.remove('snaptweak-shake'), 500)
        return
      }
      this.showAiConfirm()
    })

    // Click outside to cancel (but not on the selection itself)
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleOutsideClick)
    }, 200)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (!this.container.contains(e.target as Node)) {
      // Don't cancel if clicking in annotation area
      if ((e.target as HTMLElement).closest('.snaptweak-annotation-container')) return
      this.options.onCancel()
    }
  }

  private submit(useAI: boolean): void {
    const textarea = this.container.querySelector('.snaptweak-inline-textarea') as HTMLTextAreaElement
    const description = textarea.value.trim()
    if (!description) {
      textarea.classList.add('snaptweak-shake')
      setTimeout(() => textarea.classList.remove('snaptweak-shake'), 500)
      return
    }
    this.options.onSubmit(description, useAI)
  }

  // Before spending tokens on AI Auto-Fix, confirm with the user — and warn
  // when the page is clearly not their own editable source (can't apply the fix).
  private showAiConfirm(): void {
    const host = window.location.hostname
    const isLocal =
      location.protocol === 'file:' ||
      /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(host) ||
      /\.local$/i.test(host)
    const pageLabel = location.protocol === 'file:' ? '本地文件' : (host || '当前页面')

    const warnHtml = isLocal
      ? ''
      : `<div class="snaptweak-ai-confirm-warn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#d97706" style="flex-shrink:0;margin-top:1px"><path d="M8 1l7 13H1L8 1zm-.75 5h1.5v4h-1.5V6zm0 5h1.5v1.5h-1.5V11z"/></svg>
          <span><b>${this.escapeHtml(pageLabel)}</b> 看起来不是你自己的项目。AI 生成的代码<b>需要你能改这个页面的源码</b>才能用上——否则会白花 token。</span>
        </div>`

    const inner = this.container.querySelector('.snaptweak-inline-input-inner') as HTMLElement
    const overlay = document.createElement('div')
    overlay.className = 'snaptweak-ai-confirm'
    overlay.innerHTML = `
      <div class="snaptweak-ai-confirm-card">
        <div class="snaptweak-ai-confirm-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#6366f1"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z"/></svg>
          确认使用 AI 自动改代码？
        </div>
        <div class="snaptweak-ai-confirm-body">
          这会调用你配置的 AI API（<b>按你的额度计费</b>）。当前页面：<b>${this.escapeHtml(pageLabel)}</b>
        </div>
        ${warnHtml}
        <div class="snaptweak-ai-confirm-actions">
          <button class="snaptweak-ai-confirm-cancel">改用免费提示词</button>
          <button class="snaptweak-ai-confirm-ok">继续调用 AI</button>
        </div>
      </div>
    `
    inner.appendChild(overlay)

    overlay.querySelector('.snaptweak-ai-confirm-ok')?.addEventListener('click', () => {
      overlay.remove()
      this.submit(true)
    })
    overlay.querySelector('.snaptweak-ai-confirm-cancel')?.addEventListener('click', () => {
      overlay.remove()
      this.submit(false)
    })
  }

  private showApiKeySetup(): void {
    // Replace hint with inline API key form
    const hint = this.container.querySelector('.snaptweak-ai-hint') as HTMLElement
    hint.style.display = 'flex'
    hint.innerHTML = `
      <div class="snaptweak-api-setup-form">
        <div class="snaptweak-api-setup-header">
          <span>Configure AI API Key</span>
          <button class="snaptweak-api-setup-close">&times;</button>
        </div>
        <div class="snaptweak-api-setup-body">
          <label class="snaptweak-api-label">
            Provider
            <select class="snaptweak-api-provider-select">
              <option value="openai">OpenAI (GPT-4)</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom API</option>
            </select>
          </label>
          <label class="snaptweak-api-label">
            API Key
            <input type="password" class="snaptweak-api-key-input" placeholder="sk-... or your API key" />
          </label>
          <div class="snaptweak-api-setup-actions">
            <button class="snaptweak-api-save-btn">Save & Enable AI</button>
            <a href="#" class="snaptweak-api-help-link">How to get an API Key?</a>
          </div>
        </div>
      </div>
    `

    // Bind save
    hint.querySelector('.snaptweak-api-save-btn')?.addEventListener('click', async () => {
      const provider = (hint.querySelector('.snaptweak-api-provider-select') as HTMLSelectElement).value
      const apiKey = (hint.querySelector('.snaptweak-api-key-input') as HTMLInputElement).value.trim()

      if (!apiKey) {
        (hint.querySelector('.snaptweak-api-key-input') as HTMLInputElement).classList.add('snaptweak-shake')
        setTimeout(() => {
          (hint.querySelector('.snaptweak-api-key-input') as HTMLInputElement).classList.remove('snaptweak-shake')
        }, 500)
        return
      }

      // Save to chrome.storage — write both flat keys and into settings so
      // the background worker (which reads settings) picks it up immediately.
      const existing = (await chrome.storage.sync.get('settings')).settings || {}
      await chrome.storage.sync.set({
        apiKey,
        apiProvider: provider,
        settings: { ...existing, apiKey, aiProvider: provider },
      })
      this.hasApiKey = true
      this.updateAIButtonState()

      // Show success message
      hint.innerHTML = `
        <div class="snaptweak-api-setup-success">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="#10b981">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.25 5.28l-3.5 3.5a.75.75 0 01-1.06 0l-1.5-1.5a.75.75 0 111.06-1.06l.97.97 2.97-2.97a.75.75 0 111.06 1.06z"/>
          </svg>
          <span>AI enabled! You can now use AI Auto-Fix.</span>
        </div>
      `
      setTimeout(() => { hint.style.display = 'none' }, 2500)
    })

    // Bind close
    hint.querySelector('.snaptweak-api-setup-close')?.addEventListener('click', () => {
      hint.style.display = 'none'
    })

    // Help link — opens the selected provider's API key page
    hint.querySelector('.snaptweak-api-help-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      const provider = (hint.querySelector('.snaptweak-api-provider-select') as HTMLSelectElement)?.value || 'openai'
      window.open(PROVIDER_HELP[provider] || PROVIDER_HELP.openai, '_blank')
    })
  }

  focusInput(): void {
    setTimeout(() => {
      const textarea = this.container.querySelector('.snaptweak-inline-textarea') as HTMLTextAreaElement
      textarea?.focus()
    }, 100)
  }

  showResult(prompt: string, warning?: string, wasAI?: boolean): void {
    const inner = this.container.querySelector('.snaptweak-inline-input-inner') as HTMLElement
    const isAIResult = wasAI && !warning
    const title = isAIResult ? 'AI 给出的修改建议' : '提示词已生成'
    const warningHtml = warning
      ? `<div class="snaptweak-inline-result-warning">${this.escapeHtml(warning)}</div>`
      : ''
    // For the free (prompt) path, lead with a prominent "paste into chat" banner
    const guideHtml = isAIResult
      ? ''
      : `<div class="snaptweak-inline-paste-guide">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="#16a34a"><path d="M6.5 11.5L3 8l1.4-1.4 2.1 2.1L11.6 4 13 5.4z"/></svg>
          <span>已自动复制到剪贴板，去 <b>WorkBuddy / ChatGPT / Claude</b> 对话框粘贴即可（无需 API Key）</span>
        </div>`
    inner.innerHTML = `
      <div class="snaptweak-inline-result">
        <div class="snaptweak-inline-result-header">
          <span>${title}</span>
          <div class="snaptweak-inline-result-btns">
            <button class="snaptweak-inline-copy-btn">复制</button>
            <button class="snaptweak-inline-close-btn">&times;</button>
          </div>
        </div>
        ${warningHtml}
        ${guideHtml}
        <pre class="snaptweak-inline-result-content">${this.escapeHtml(prompt)}</pre>
        <div class="snaptweak-inline-result-footer">
          <button class="snaptweak-inline-new-btn">重新选择</button>
          <span class="snaptweak-inline-result-tip">${isAIResult ? '把这些改动应用到你的代码' : '提示：粘贴后 AI 会直接给你改好的代码'}</span>
        </div>
        <div class="snaptweak-inline-result-srctip">
          适用于你<b>拥有源码</b>的页面 — 改完后需自行更新文件并重新部署
        </div>
      </div>
    `

    const copyBtn = inner.querySelector('.snaptweak-inline-copy-btn') as HTMLElement
    const markCopied = () => {
      copyBtn.textContent = '已复制 ✓'
      copyBtn.classList.add('copied')
      setTimeout(() => {
        copyBtn.textContent = '复制'
        copyBtn.classList.remove('copied')
      }, 2000)
    }

    // Auto-copy immediately for the free prompt path so the user can paste right away
    if (!isAIResult) {
      navigator.clipboard.writeText(prompt).then(markCopied).catch(() => {})
    }

    // Manual copy button
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(prompt).then(markCopied).catch(() => {})
    })

    // Close
    inner.querySelector('.snaptweak-inline-close-btn')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    // New selection
    inner.querySelector('.snaptweak-inline-new-btn')?.addEventListener('click', () => {
      this.options.onCancel()
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'RESTART_SELECTION' })
      }, 100)
    })
  }

  showLoading(useAI = false): void {
    const submitBtn = this.container.querySelector('.snaptweak-inline-submit-btn') as HTMLButtonElement
    const aiBtn = this.container.querySelector('.snaptweak-inline-ai-btn') as HTMLButtonElement
    const label = useAI ? 'AI 处理中...' : '生成中...'
    const targetBtn = useAI ? aiBtn : submitBtn
    if (submitBtn) submitBtn.disabled = true
    if (aiBtn) aiBtn.classList.add('disabled')
    if (targetBtn) {
      targetBtn.innerHTML = `<span class="snaptweak-spinner"></span> ${label}`
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.handleOutsideClick)
    this.container.remove()
  }
}
