// SnapTweak Content Script — Injection entry point
import './style.css'
import { SelectionOverlay } from './SelectionOverlay'
import { AnnotationCanvas } from './AnnotationCanvas'
import { InlineInput } from './InlineInput'
import type { FeedbackItem, SelectionArea, Annotation } from '../shared/types'
import { generateId } from '../shared/utils'

class SnapTweak {
  private overlay: SelectionOverlay | null = null
  private canvas: AnnotationCanvas | null = null
  private inlineInput: InlineInput | null = null
  private isActive = false
  private currentSelection: SelectionArea | null = null
  private screenshot: string = ''
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

    // Create overlay for element selection
    this.overlay = new SelectionOverlay({
      onSelect: (area, element) => this.handleSelection(area, element),
      onCancel: () => this.deactivate(),
    })

    document.body.classList.add('snaptweak-active')
  }

  private deactivate(): void {
    this.isActive = false
    this.overlay?.destroy()
    this.canvas?.destroy()
    this.inlineInput?.destroy()
    this.overlay = null
    this.canvas = null
    this.inlineInput = null
    this.currentSelection = null
    this.selectionViewportRect = null
    document.body.classList.remove('snaptweak-active')
  }

  private async handleSelection(area: SelectionArea, _element: Element): Promise<void> {
    this.currentSelection = area
    // Store viewport-relative rect for positioning the inline input
    this.selectionViewportRect = {
      x: area.x - window.scrollX,
      y: area.y - window.scrollY,
      width: area.width,
      height: area.height,
    }

    this.overlay?.destroy()
    this.overlay = null

    // Capture screenshot of the selected area
    this.screenshot = await this.captureArea(area)

    // Show annotation canvas (optional step — user can skip by clicking Done immediately)
    this.canvas = new AnnotationCanvas({
      area,
      onDone: (annotations) => this.handleAnnotationsDone(annotations),
      onCancel: () => this.deactivate(),
    })
  }

  private handleAnnotationsDone(annotations: Annotation[]): void {
    // Get final screenshot with annotations
    if (this.canvas) {
      this.screenshot = this.canvas.getScreenshotWithAnnotations()
    }
    this.canvas?.destroy()
    this.canvas = null

    // Show inline input right next to the selected area
    if (!this.selectionViewportRect) return

    this.inlineInput = new InlineInput({
      anchorRect: this.selectionViewportRect,
      onSubmit: (description, useAI) => this.handleSubmit(description, annotations, useAI),
      onCancel: () => this.deactivate(),
    })
  }

  private async handleSubmit(description: string, annotations: Annotation[], useAI: boolean): Promise<void> {
    if (!this.currentSelection) return

    // Show loading state
    this.inlineInput?.showLoading()

    const feedbackItem: FeedbackItem = {
      id: generateId(),
      timestamp: Date.now(),
      screenshot: this.screenshot,
      annotations,
      selection: this.currentSelection,
      description,
      pageUrl: window.location.href,
      pageTitle: document.title,
    }

    if (useAI) {
      // Send to background for AI auto-fix
      chrome.runtime.sendMessage(
        { type: 'AI_AUTO_FIX', data: feedbackItem },
        (response) => {
          if (response?.prompt) {
            feedbackItem.generatedPrompt = response.prompt
            this.inlineInput?.showResult(response.prompt)
          } else if (response?.error) {
            this.inlineInput?.showResult(`Error: ${response.error}\n\nFalling back to prompt generation...`)
          }
        }
      )
    } else {
      // Generate structured prompt
      chrome.runtime.sendMessage(
        { type: 'GENERATE_PROMPT', data: feedbackItem },
        (response) => {
          if (response?.prompt) {
            feedbackItem.generatedPrompt = response.prompt
            this.inlineInput?.showResult(response.prompt)
          }
        }
      )
    }

    // Save to history
    chrome.runtime.sendMessage({ type: 'SAVE_FEEDBACK', data: feedbackItem })
  }

  private captureArea(area: SelectionArea): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const dpr = window.devicePixelRatio || 1
      canvas.width = area.width * dpr
      canvas.height = area.height * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)

      // Capture using the visible tab screenshot API via background
      chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (response) => {
        if (response?.dataUrl) {
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
              area.width,
              area.height
            )
            resolve(canvas.toDataURL('image/png'))
          }
          img.src = response.dataUrl
        } else {
          resolve('')
        }
      })
    })
  }
}

// Initialize
new SnapTweak()
