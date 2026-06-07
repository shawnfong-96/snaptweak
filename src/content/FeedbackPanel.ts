// FeedbackPanel — natural language input + result display

interface FeedbackPanelOptions {
  screenshot: string
  onSubmit: (description: string) => void
  onCancel: () => void
}

export class FeedbackPanel {
  private options: FeedbackPanelOptions
  private panel: HTMLDivElement

  constructor(options: FeedbackPanelOptions) {
    this.options = options
    this.panel = this.createPanel()
    this.bindEvents()
    this.focusInput()
  }

  private createPanel(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'snaptweak-feedback-panel'
    el.innerHTML = `
      <div class="snaptweak-panel-inner">
        <div class="snaptweak-panel-header">
          <div class="snaptweak-panel-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#6366f1" stroke-width="2"/>
              <path d="M7 10l2 2 4-4" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Describe your changes</span>
          </div>
          <button class="snaptweak-panel-close">&times;</button>
        </div>

        ${this.options.screenshot ? `
        <div class="snaptweak-screenshot-preview">
          <img src="${this.options.screenshot}" alt="Selected area" />
        </div>
        ` : ''}

        <div class="snaptweak-input-area">
          <textarea
            class="snaptweak-description-input"
            placeholder="Describe what you want to change... e.g., 'Make this button larger and change color to blue' or '把这个标题改成红色，字号放大一倍'"
            rows="4"
          ></textarea>
          <div class="snaptweak-input-hints">
            <span class="snaptweak-hint">💡 Be specific about colors, sizes, positions, or content changes</span>
          </div>
        </div>

        <div class="snaptweak-panel-actions">
          <button class="snaptweak-submit-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2l12 6-12 6V9l8-1-8-1V2z"/>
            </svg>
            Generate Prompt
          </button>
          <button class="snaptweak-ai-fix-btn" title="Requires API key in Settings">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a2.5 2.5 0 012.5 2.5c0 1.1-.6 1.7-1.2 2.2-.4.3-.8.6-.8 1V9.5H7.5v-.8c0-.8.5-1.3 1-1.7.5-.4.8-.7.8-1.5A1.5 1.5 0 008 4a1.5 1.5 0 00-1.5 1.5H5.5A2.5 2.5 0 018 3zm-.5 8h1v1h-1v-1z"/>
            </svg>
            AI Auto-Fix
          </button>
        </div>

        <div class="snaptweak-result-area" style="display:none">
          <div class="snaptweak-result-header">
            <span>Generated Prompt</span>
            <button class="snaptweak-copy-btn">📋 Copy</button>
          </div>
          <pre class="snaptweak-result-content"></pre>
          <div class="snaptweak-result-actions">
            <button class="snaptweak-new-btn">New Selection</button>
            <button class="snaptweak-download-btn">💾 Download</button>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(el)
    return el
  }

  private bindEvents(): void {
    // Close
    this.panel.querySelector('.snaptweak-panel-close')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    // Submit
    this.panel.querySelector('.snaptweak-submit-btn')?.addEventListener('click', () => {
      const textarea = this.panel.querySelector('.snaptweak-description-input') as HTMLTextAreaElement
      const description = textarea.value.trim()
      if (description) {
        this.options.onSubmit(description)
        this.showLoading()
      }
    })

    // AI Fix button
    this.panel.querySelector('.snaptweak-ai-fix-btn')?.addEventListener('click', () => {
      const textarea = this.panel.querySelector('.snaptweak-description-input') as HTMLTextAreaElement
      const description = textarea.value.trim()
      if (description) {
        this.options.onSubmit(description)
        this.showLoading()
      }
    })

    // Copy
    this.panel.querySelector('.snaptweak-copy-btn')?.addEventListener('click', () => {
      const content = this.panel.querySelector('.snaptweak-result-content')?.textContent || ''
      navigator.clipboard.writeText(content).then(() => {
        const btn = this.panel.querySelector('.snaptweak-copy-btn')!
        btn.textContent = '✅ Copied!'
        setTimeout(() => { btn.textContent = '📋 Copy' }, 2000)
      })
    })

    // Download
    this.panel.querySelector('.snaptweak-download-btn')?.addEventListener('click', () => {
      const content = this.panel.querySelector('.snaptweak-result-content')?.textContent || ''
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `snaptweak-prompt-${Date.now()}.md`
      a.click()
      URL.revokeObjectURL(url)
    })

    // Keyboard shortcut
    const textarea = this.panel.querySelector('.snaptweak-description-input') as HTMLTextAreaElement
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        ;(this.panel.querySelector('.snaptweak-submit-btn') as HTMLButtonElement)?.click()
      }
    })
  }

  private focusInput(): void {
    setTimeout(() => {
      const textarea = this.panel.querySelector('.snaptweak-description-input') as HTMLTextAreaElement
      textarea?.focus()
    }, 100)
  }

  private showLoading(): void {
    const resultArea = this.panel.querySelector('.snaptweak-result-area') as HTMLElement
    const resultContent = this.panel.querySelector('.snaptweak-result-content') as HTMLElement
    resultArea.style.display = 'block'
    resultContent.textContent = 'Generating...'
    resultContent.classList.add('loading')
  }

  showResult(prompt: string): void {
    const resultArea = this.panel.querySelector('.snaptweak-result-area') as HTMLElement
    const resultContent = this.panel.querySelector('.snaptweak-result-content') as HTMLElement
    resultArea.style.display = 'block'
    resultContent.textContent = prompt
    resultContent.classList.remove('loading')
  }

  destroy(): void {
    this.panel.remove()
  }
}
