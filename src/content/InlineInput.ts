// InlineInput — lightweight input that appears right next to the selection area

interface InlineInputOptions {
  /** Bounding rect of the selected area (viewport coordinates) */
  anchorRect: { x: number; y: number; width: number; height: number }
  /** Called when user submits their description */
  onSubmit: (description: string, useAI: boolean) => void
  /** Called when user cancels */
  onCancel: () => void
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
      const result = await chrome.storage.sync.get(['apiKey', 'apiProvider'])
      this.hasApiKey = !!(result.apiKey && result.apiKey.trim())
      this.updateAIButtonState()
    } catch {
      this.hasApiKey = false
    }
  }

  private updateAIButtonState(): void {
    const aiBtn = this.container.querySelector('.snaptweak-inline-ai-btn') as HTMLButtonElement
    const aiHint = this.container.querySelector('.snaptweak-ai-hint') as HTMLElement
    if (!aiBtn || !aiHint) return

    if (this.hasApiKey) {
      aiBtn.classList.remove('disabled')
      aiBtn.title = 'Use AI to auto-fix this'
      aiHint.style.display = 'none'
    } else {
      aiBtn.classList.add('disabled')
      aiBtn.title = 'API Key not configured'
      aiHint.style.display = 'flex'
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
            placeholder="Describe what to change... / 描述你想修改什么..."
            rows="2"
          ></textarea>
        </div>
        <div class="snaptweak-inline-actions">
          <button class="snaptweak-inline-submit-btn" title="Generate Prompt (Ctrl+Enter)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2l12 6-12 6V9l8-1-8-1V2z"/>
            </svg>
            Generate Prompt
          </button>
          <button class="snaptweak-inline-ai-btn disabled" title="API Key not configured">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6 6.5A2 2 0 118 8.5a.75.75 0 00-.75.75v.75h-1.5v-.75A2.25 2.25 0 018 7a.5.5 0 10-.5-.5H6zm1.25 5.5h1.5v1.5h-1.5V12z"/>
            </svg>
            AI Auto-Fix
          </button>
        </div>
        <div class="snaptweak-ai-hint" style="display:flex">
          <div class="snaptweak-ai-hint-content">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="#f59e0b">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3h1.5v5h-1.5V4zm0 6.5h1.5V12h-1.5v-1.5z"/>
            </svg>
            <span>AI Auto-Fix requires an API Key.</span>
            <button class="snaptweak-inline-setup-btn">Configure now</button>
          </div>
        </div>
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

    // AI Fix button
    this.container.querySelector('.snaptweak-inline-ai-btn')?.addEventListener('click', () => {
      if (!this.hasApiKey) {
        // Show setup hint prominently
        this.showApiKeySetup()
        return
      }
      this.submit(true)
    })

    // Setup button in hint
    this.container.querySelector('.snaptweak-inline-setup-btn')?.addEventListener('click', () => {
      this.showApiKeySetup()
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

      // Save to chrome.storage
      await chrome.storage.sync.set({ apiKey, apiProvider: provider })
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

    // Help link
    hint.querySelector('.snaptweak-api-help-link')?.addEventListener('click', (e) => {
      e.preventDefault()
      chrome.runtime.sendMessage({ type: 'OPEN_API_HELP' })
    })
  }

  focusInput(): void {
    setTimeout(() => {
      const textarea = this.container.querySelector('.snaptweak-inline-textarea') as HTMLTextAreaElement
      textarea?.focus()
    }, 100)
  }

  showResult(prompt: string): void {
    const inner = this.container.querySelector('.snaptweak-inline-input-inner') as HTMLElement
    inner.innerHTML = `
      <div class="snaptweak-inline-result">
        <div class="snaptweak-inline-result-header">
          <span>Generated Prompt</span>
          <div class="snaptweak-inline-result-btns">
            <button class="snaptweak-inline-copy-btn">Copy</button>
            <button class="snaptweak-inline-close-btn">&times;</button>
          </div>
        </div>
        <pre class="snaptweak-inline-result-content">${this.escapeHtml(prompt)}</pre>
        <div class="snaptweak-inline-result-footer">
          <button class="snaptweak-inline-new-btn">New Selection</button>
          <span class="snaptweak-inline-result-tip">Paste this into ChatGPT, Claude, or Cursor</span>
        </div>
      </div>
    `

    // Bind copy
    inner.querySelector('.snaptweak-inline-copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(prompt).then(() => {
        const btn = inner.querySelector('.snaptweak-inline-copy-btn')!
        btn.textContent = 'Copied!'
        btn.classList.add('copied')
        setTimeout(() => {
          btn.textContent = 'Copy'
          btn.classList.remove('copied')
        }, 2000)
      })
    })

    // Bind close
    inner.querySelector('.snaptweak-inline-close-btn')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    // Bind new selection
    inner.querySelector('.snaptweak-inline-new-btn')?.addEventListener('click', () => {
      this.options.onCancel()
      // Re-activate after a short delay
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'RESTART_SELECTION' })
      }, 100)
    })
  }

  showLoading(): void {
    const submitBtn = this.container.querySelector('.snaptweak-inline-submit-btn') as HTMLButtonElement
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.innerHTML = `
        <span class="snaptweak-spinner"></span>
        Generating...
      `
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
