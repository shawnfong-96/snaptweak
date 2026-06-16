// SelectionOverlay — element hovering, area drawing, and adjustable selection box
import type { SelectionArea } from '../shared/types'
import { getCssSelector } from '../shared/utils'

interface SelectionOverlayOptions {
  onSelect: (area: SelectionArea, element: Element) => void
  onCancel: () => void
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'

// Viewport-relative rect used while editing
interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export class SelectionOverlay {
  private options: SelectionOverlayOptions
  private overlay: HTMLDivElement
  private highlight: HTMLDivElement
  private selectionBox: HTMLDivElement
  private tooltip: HTMLDivElement
  private adjustBox: HTMLDivElement | null = null

  private isDrawing = false
  private startX = 0
  private startY = 0
  private mode: 'element' | 'area' = 'element'
  private hoveredElement: Element | null = null

  // Editing state
  private editing = false
  private editRect: Rect = { x: 0, y: 0, width: 0, height: 0 }
  private baseElement: Element | null = null
  private activeHandle: Handle | null = null
  private dragStartMouse = { x: 0, y: 0 }
  private dragStartRect: Rect = { x: 0, y: 0, width: 0, height: 0 }

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
        <span class="snaptweak-toolbar-hint">Click an element or drag to select — then drag the handles to adjust</span>
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
    this.overlay.querySelectorAll('.snaptweak-mode-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (this.editing) return
        const target = e.currentTarget as HTMLElement
        this.mode = target.dataset.mode as 'element' | 'area'
        this.overlay.querySelectorAll('.snaptweak-mode-btn').forEach((b) => b.classList.remove('active'))
        target.classList.add('active')
      })
    })

    this.overlay.querySelector('.snaptweak-cancel-btn')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    document.addEventListener('mousemove', this.handleMouseMove, true)
    document.addEventListener('mousedown', this.handleMouseDown, true)
    document.addEventListener('mouseup', this.handleMouseUp, true)
    document.addEventListener('keydown', this.handleKeyDown, true)
  }

  // ---------- Picking phase ----------

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.editing) {
      this.handleEditMouseMove(e)
      return
    }

    if (this.isDrawing) {
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
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target && !this.isOwnElement(target)) {
        this.hoveredElement = target
        const rect = target.getBoundingClientRect()
        this.highlight.style.left = `${rect.left + window.scrollX}px`
        this.highlight.style.top = `${rect.top + window.scrollY}px`
        this.highlight.style.width = `${rect.width}px`
        this.highlight.style.height = `${rect.height}px`
        this.highlight.style.display = 'block'

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
    const targetEl = e.target as HTMLElement
    if (targetEl.closest('.snaptweak-overlay')) return

    // While editing, mousedown is handled by handle/move listeners (see startEditDrag)
    if (this.editing) return

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
      e.stopPropagation()
    }
  }

  private handleMouseUp = (e: MouseEvent): void => {
    // End any active resize/move drag
    if (this.editing) {
      if (this.activeHandle) {
        this.activeHandle = null
        document.body.style.userSelect = ''
      }
      return
    }
    if ((e.target as HTMLElement).closest('.snaptweak-overlay')) return

    if (this.mode === 'element' && this.hoveredElement) {
      e.preventDefault()
      e.stopPropagation()
      const rect = this.hoveredElement.getBoundingClientRect()
      this.baseElement = this.hoveredElement
      this.highlight.style.display = 'none'
      this.tooltip.style.display = 'none'
      this.enterEditMode({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
    } else if (this.mode === 'area' && this.isDrawing) {
      this.isDrawing = false
      const x = Math.min(e.clientX, this.startX)
      const y = Math.min(e.clientY, this.startY)
      const w = Math.abs(e.clientX - this.startX)
      const h = Math.abs(e.clientY - this.startY)
      this.selectionBox.style.display = 'none'

      if (w > 8 && h > 8) {
        const centerEl = document.elementFromPoint(x + w / 2, y + h / 2)
        this.baseElement = centerEl && !this.isOwnElement(centerEl) ? centerEl : document.body
        this.enterEditMode({ x, y, width: w, height: h })
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.options.onCancel()
    } else if (e.key === 'Enter' && this.editing) {
      e.preventDefault()
      this.confirmSelection()
    }
  }

  // ---------- Editing phase (adjustable box) ----------

  private enterEditMode(rect: Rect): void {
    this.editing = true
    this.editRect = { ...rect }
    this.tooltip.style.display = 'none'
    this.highlight.style.display = 'none'
    this.renderAdjustBox()
  }

  private renderAdjustBox(): void {
    if (!this.adjustBox) {
      const box = document.createElement('div')
      box.className = 'snaptweak-adjust-box'
      box.innerHTML = `
        <div class="snaptweak-adjust-handle" data-handle="nw"></div>
        <div class="snaptweak-adjust-handle" data-handle="n"></div>
        <div class="snaptweak-adjust-handle" data-handle="ne"></div>
        <div class="snaptweak-adjust-handle" data-handle="e"></div>
        <div class="snaptweak-adjust-handle" data-handle="se"></div>
        <div class="snaptweak-adjust-handle" data-handle="s"></div>
        <div class="snaptweak-adjust-handle" data-handle="sw"></div>
        <div class="snaptweak-adjust-handle" data-handle="w"></div>
        <div class="snaptweak-adjust-size"></div>
        <div class="snaptweak-adjust-actions">
          <button class="snaptweak-adjust-confirm">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M6.5 11.5L3 8l1.4-1.4 2.1 2.1L11.6 4 13 5.4z"/></svg>
            Confirm
          </button>
          <button class="snaptweak-adjust-cancel">Cancel</button>
        </div>
      `
      document.body.appendChild(box)
      this.adjustBox = box

      // Handles
      box.querySelectorAll('.snaptweak-adjust-handle').forEach((h) => {
        h.addEventListener('mousedown', (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          this.startEditDrag((h as HTMLElement).dataset.handle as Handle, ev as MouseEvent)
        })
      })

      // Move (drag body, but not on handles/actions)
      box.addEventListener('mousedown', (ev) => {
        const t = ev.target as HTMLElement
        if (t.closest('.snaptweak-adjust-handle') || t.closest('.snaptweak-adjust-actions')) return
        ev.preventDefault()
        ev.stopPropagation()
        this.startEditDrag('move', ev as MouseEvent)
      })

      box.querySelector('.snaptweak-adjust-confirm')?.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        this.confirmSelection()
      })
      box.querySelector('.snaptweak-adjust-cancel')?.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        this.options.onCancel()
      })
    }
    this.updateAdjustBox()
  }

  private updateAdjustBox(): void {
    if (!this.adjustBox) return
    const r = this.editRect
    this.adjustBox.style.left = `${r.x}px`
    this.adjustBox.style.top = `${r.y}px`
    this.adjustBox.style.width = `${r.width}px`
    this.adjustBox.style.height = `${r.height}px`
    const sizeLabel = this.adjustBox.querySelector('.snaptweak-adjust-size')
    if (sizeLabel) sizeLabel.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`
  }

  private startEditDrag(handle: Handle, e: MouseEvent): void {
    this.activeHandle = handle
    this.dragStartMouse = { x: e.clientX, y: e.clientY }
    this.dragStartRect = { ...this.editRect }
    document.body.style.userSelect = 'none'
  }

  private handleEditMouseMove = (e: MouseEvent): void => {
    if (!this.activeHandle) return
    const dx = e.clientX - this.dragStartMouse.x
    const dy = e.clientY - this.dragStartMouse.y
    const s = this.dragStartRect
    let { x, y, width, height } = s
    const minSize = 16

    switch (this.activeHandle) {
      case 'move':
        x = s.x + dx
        y = s.y + dy
        break
      case 'n':
        y = s.y + dy
        height = s.height - dy
        break
      case 's':
        height = s.height + dy
        break
      case 'e':
        width = s.width + dx
        break
      case 'w':
        x = s.x + dx
        width = s.width - dx
        break
      case 'ne':
        y = s.y + dy
        height = s.height - dy
        width = s.width + dx
        break
      case 'nw':
        x = s.x + dx
        y = s.y + dy
        width = s.width - dx
        height = s.height - dy
        break
      case 'se':
        width = s.width + dx
        height = s.height + dy
        break
      case 'sw':
        x = s.x + dx
        width = s.width - dx
        height = s.height + dy
        break
    }

    // Enforce minimum size without flipping
    if (width < minSize) {
      if (this.activeHandle.includes('w')) x = s.x + s.width - minSize
      width = minSize
    }
    if (height < minSize) {
      if (this.activeHandle.includes('n')) y = s.y + s.height - minSize
      height = minSize
    }

    this.editRect = { x, y, width, height }
    this.updateAdjustBox()
  }

  private confirmSelection(): void {
    const r = this.editRect
    // Re-detect the element under the center of the (possibly adjusted) box,
    // hiding our own UI so elementFromPoint sees the real page element.
    const prevAdjustDisplay = this.adjustBox?.style.display
    if (this.adjustBox) this.adjustBox.style.display = 'none'
    const overlayDisplay = this.overlay.style.display
    this.overlay.style.display = 'none'

    const centerEl = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)

    if (this.adjustBox && prevAdjustDisplay !== undefined) this.adjustBox.style.display = prevAdjustDisplay
    this.overlay.style.display = overlayDisplay

    const targetEl =
      centerEl && !this.isOwnElement(centerEl)
        ? centerEl
        : this.baseElement && !this.isOwnElement(this.baseElement)
          ? this.baseElement
          : document.body

    const area: SelectionArea = {
      x: r.x + window.scrollX,
      y: r.y + window.scrollY,
      width: r.width,
      height: r.height,
      selector: getCssSelector(targetEl),
      tagName: targetEl.tagName.toLowerCase(),
      elementText: (targetEl.textContent || '').trim().slice(0, 500),
      computedStyles: this.getRelevantStyles(targetEl),
    }
    this.options.onSelect(area, targetEl)
  }

  private isOwnElement(el: Element): boolean {
    return !!el.closest(
      '.snaptweak-overlay, .snaptweak-highlight, .snaptweak-tooltip, .snaptweak-selection-box, .snaptweak-adjust-box, .snaptweak-inline-input, .snaptweak-annotation-container'
    )
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
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', this.handleMouseMove, true)
    document.removeEventListener('mousedown', this.handleMouseDown, true)
    document.removeEventListener('mouseup', this.handleMouseUp, true)
    document.removeEventListener('keydown', this.handleKeyDown, true)
    this.overlay.remove()
    this.highlight.remove()
    this.selectionBox.remove()
    this.tooltip.remove()
    this.adjustBox?.remove()
    this.adjustBox = null
  }
}
