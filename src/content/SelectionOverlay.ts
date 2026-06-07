// SelectionOverlay — handles element hovering and area selection
import type { SelectionArea } from '../shared/types'
import { getCssSelector } from '../shared/utils'

interface SelectionOverlayOptions {
  onSelect: (area: SelectionArea, element: Element) => void
  onCancel: () => void
}

export class SelectionOverlay {
  private options: SelectionOverlayOptions
  private overlay: HTMLDivElement
  private highlight: HTMLDivElement
  private selectionBox: HTMLDivElement
  private tooltip: HTMLDivElement
  private isDrawing = false
  private startX = 0
  private startY = 0
  private mode: 'element' | 'area' = 'element'
  private hoveredElement: Element | null = null

  constructor(options: SelectionOverlayOptions) {
    this.options = options
    this.overlay = this.createOverlay()
    this.highlight = this.createHighlight()
    this.selectionBox = this.createSelectionBox()
    this.tooltip = this.createTooltip()
    this.bindEvents()
  }

  private createOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'snaptweak-overlay'
    el.innerHTML = `
      <div class="snaptweak-toolbar-top">
        <div class="snaptweak-mode-switch">
          <button class="snaptweak-mode-btn active" data-mode="element">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h5v2H4v3H2V2zm7 0h5v5h-2V4H9V2zM4 9v3h3v2H2V9h2zm8 0v3h-3v2h5V9h-2z"/>
            </svg>
            Element
          </button>
          <button class="snaptweak-mode-btn" data-mode="area">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 1h14v14H1V1zm2 2v10h10V3H3z"/>
            </svg>
            Area
          </button>
        </div>
        <button class="snaptweak-cancel-btn">ESC Cancel</button>
      </div>
    `
    document.body.appendChild(el)
    return el
  }

  private createHighlight(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'snaptweak-highlight'
    document.body.appendChild(el)
    return el
  }

  private createSelectionBox(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'snaptweak-selection-box'
    el.style.display = 'none'
    document.body.appendChild(el)
    return el
  }

  private createTooltip(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'snaptweak-tooltip'
    document.body.appendChild(el)
    return el
  }

  private bindEvents(): void {
    // Mode switch buttons
    this.overlay.querySelectorAll('.snaptweak-mode-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        this.mode = target.dataset.mode as 'element' | 'area'
        this.overlay.querySelectorAll('.snaptweak-mode-btn').forEach((b) => b.classList.remove('active'))
        target.classList.add('active')
      })
    })

    // Cancel button
    this.overlay.querySelector('.snaptweak-cancel-btn')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    // Mouse events
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mousedown', this.handleMouseDown)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isDrawing) {
      // Update selection box
      const x = Math.min(e.clientX, this.startX)
      const y = Math.min(e.clientY, this.startY)
      const w = Math.abs(e.clientX - this.startX)
      const h = Math.abs(e.clientY - this.startY)
      this.selectionBox.style.left = `${x}px`
      this.selectionBox.style.top = `${y}px`
      this.selectionBox.style.width = `${w}px`
      this.selectionBox.style.height = `${h}px`
      return
    }

    if (this.mode === 'element') {
      // Highlight hovered element
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target && !target.closest('.snaptweak-overlay, .snaptweak-highlight, .snaptweak-tooltip')) {
        this.hoveredElement = target
        const rect = target.getBoundingClientRect()
        this.highlight.style.left = `${rect.left + window.scrollX}px`
        this.highlight.style.top = `${rect.top + window.scrollY}px`
        this.highlight.style.width = `${rect.width}px`
        this.highlight.style.height = `${rect.height}px`
        this.highlight.style.display = 'block'

        // Update tooltip
        const selector = getCssSelector(target)
        this.tooltip.textContent = `${target.tagName.toLowerCase()} — Click to select`
        this.tooltip.style.left = `${e.clientX + 12}px`
        this.tooltip.style.top = `${e.clientY + 12}px`
        this.tooltip.style.display = 'block'
      }
    } else {
      this.highlight.style.display = 'none'
      this.tooltip.textContent = 'Drag to select area'
      this.tooltip.style.left = `${e.clientX + 12}px`
      this.tooltip.style.top = `${e.clientY + 12}px`
      this.tooltip.style.display = 'block'
    }
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.snaptweak-overlay')) return

    if (this.mode === 'area') {
      this.isDrawing = true
      this.startX = e.clientX
      this.startY = e.clientY
      this.selectionBox.style.display = 'block'
      this.selectionBox.style.left = `${e.clientX}px`
      this.selectionBox.style.top = `${e.clientY}px`
      this.selectionBox.style.width = '0px'
      this.selectionBox.style.height = '0px'
      e.preventDefault()
    }
  }

  private handleMouseUp = (e: MouseEvent): void => {
    if ((e.target as HTMLElement).closest('.snaptweak-overlay')) return

    if (this.mode === 'element' && this.hoveredElement) {
      e.preventDefault()
      e.stopPropagation()
      const rect = this.hoveredElement.getBoundingClientRect()
      const area: SelectionArea = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        selector: getCssSelector(this.hoveredElement),
        tagName: this.hoveredElement.tagName.toLowerCase(),
        elementText: (this.hoveredElement.textContent || '').trim().slice(0, 500),
        computedStyles: this.getRelevantStyles(this.hoveredElement),
      }
      this.options.onSelect(area, this.hoveredElement)
    } else if (this.mode === 'area' && this.isDrawing) {
      this.isDrawing = false
      const x = Math.min(e.clientX, this.startX)
      const y = Math.min(e.clientY, this.startY)
      const w = Math.abs(e.clientX - this.startX)
      const h = Math.abs(e.clientY - this.startY)

      if (w > 10 && h > 10) {
        // Find the element at center of selection
        const centerEl = document.elementFromPoint(x + w / 2, y + h / 2)
        const area: SelectionArea = {
          x: x + window.scrollX,
          y: y + window.scrollY,
          width: w,
          height: h,
          selector: centerEl ? getCssSelector(centerEl) : 'body',
          tagName: centerEl?.tagName.toLowerCase() || 'div',
          elementText: (centerEl?.textContent || '').trim().slice(0, 500),
          computedStyles: centerEl ? this.getRelevantStyles(centerEl) : {},
        }
        this.options.onSelect(area, centerEl || document.body)
      }
      this.selectionBox.style.display = 'none'
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.options.onCancel()
    }
  }

  private getRelevantStyles(element: Element): Record<string, string> {
    const computed = window.getComputedStyle(element)
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      padding: computed.padding,
      margin: computed.margin,
      border: computed.border,
      borderRadius: computed.borderRadius,
      display: computed.display,
      position: computed.position,
    }
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mouseup', this.handleMouseUp)
    document.removeEventListener('keydown', this.handleKeyDown)
    this.overlay.remove()
    this.highlight.remove()
    this.selectionBox.remove()
    this.tooltip.remove()
  }
}
