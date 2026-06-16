// SnapTweak Content Script — Injection entry point
import './style.css'
import { SelectionOverlay } from './SelectionOverlay'
import { InlineInput } from './InlineInput'
import type { FeedbackItem, SelectionArea } from '../shared/types'
import { generateId } from '../shared/utils'

class SnapTweak {
  private overlay: SelectionOverlay | null = null
  private inlineInput: InlineInput | null = null
  private isActive = false
  private currentSelection: SelectionArea | null = null
  private screenshot = ''
  private selectionViewportRect: { x: number; y: number; width: number; height: number } | null = null

  constructor() {
    this.listenForMessages()
  }

  private listenForMessages(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'START_SELECTION':
          this.activate()
          sendResponse({ ok: true })
          break
        case 'CANCEL_SELECTION':
          this.deactivate()
          sendResponse({ ok: true })
          break
        case 'RESTART_SELECTION':
          this.deactivate()
          setTimeout(() => this.activate(), 50)
          sendResponse({ ok: true })
          break
      }
    })
  }

  private activate(): void {
    if (this.isActive) return
    this.isActive = true

    this.overlay = new SelectionOverlay({
      onSelect: (area, element) => this.handleSelection(area, element),
      onCancel: () => this.deactivate(),
    })

    document.body.classList.add('snaptweak-active')
  }

  private deactivate(): void {
    this.isActive = false
    this.overlay?.destroy()
    this.inlineInput?.destroy()
    this.overlay = null
    this.inlineInput = null
    this.currentSelection = null
    this.selectionViewportRect = null
    document.body.classList.remove('snaptweak-active')
  }

  private async handleSelection(area: SelectionArea, _element: Element): Promise<void> {
    this.currentSelection = area
    this.selectionViewportRect = {
      x: area.x - window.scrollX,
      y: area.y - window.scrollY,
      width: area.width,
      height: area.height,
    }

    // Destroy the overlay so its UI doesn't appear in the screenshot
    this.overlay?.destroy()
    this.overlay = null

    // Capture screenshot of the selected area (best-effort; failures are non-fatal)
    this.screenshot = await this.captureArea(area)

    // Show the inline input right next to the selection
    if (!this.selectionViewportRect) return
    this.inlineInput = new InlineInput({
      anchorRect: this.selectionViewportRect,
      onSubmit: (description, useAI) => this.handleSubmit(description, useAI),
      onCancel: () => this.deactivate(),
    })
  }

  private async handleSubmit(description: string, useAI: boolean): Promise<void> {
    if (!this.currentSelection) return

    this.inlineInput?.showLoading(useAI)

    const feedbackItem: FeedbackItem = {
      id: generateId(),
      timestamp: Date.now(),
      screenshot: this.screenshot,
      annotations: [],
      selection: this.currentSelection,
      description,
      pageUrl: window.location.href,
      pageTitle: document.title,
    }

    const messageType = useAI ? 'AI_AUTO_FIX' : 'GENERATE_PROMPT'
    chrome.runtime.sendMessage({ type: messageType, data: feedbackItem }, (response) => {
      if (chrome.runtime.lastError) {
        this.inlineInput?.showResult(`Error: ${chrome.runtime.lastError.message}`)
        return
      }
      if (response?.prompt) {
        feedbackItem.generatedPrompt = response.prompt
        this.inlineInput?.showResult(response.prompt, response.error, useAI)
      } else if (response?.error) {
        this.inlineInput?.showResult(`Error: ${response.error}`)
      } else {
        this.inlineInput?.showResult('No response received. Please try again.')
      }
    })

    // Save to history (fire and forget)
    chrome.runtime.sendMessage({ type: 'SAVE_FEEDBACK', data: feedbackItem })
  }

  private captureArea(area: SelectionArea): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response) => {
        if (chrome.runtime.lastError || !response?.dataUrl) {
          resolve('')
          return
        }
        try {
          const canvas = document.createElement('canvas')
          const dpr = window.devicePixelRatio || 1
          canvas.width = area.width * dpr
          canvas.height = area.height * dpr
          const ctx = canvas.getContext('2d')!
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(
              img,
              (area.x - window.scrollX) * dpr,
              (area.y - window.scrollY) * dpr,
              area.width * dpr,
              area.height * dpr,
              0,
              0,
              area.width * dpr,
              area.height * dpr
            )
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve('')
          img.src = response.dataUrl
        } catch {
          resolve('')
        }
      })
    })
  }
}

new SnapTweak()
