// AnnotationCanvas — drawing tools for marking up the selection
import type { Annotation, SelectionArea } from '../shared/types'
import { generateId } from '../shared/utils'

interface AnnotationCanvasOptions {
  area: SelectionArea
  onDone: (annotations: Annotation[]) => void
  onCancel: () => void
}

type DrawingTool = 'rect' | 'freehand' | 'arrow' | 'text'

export class AnnotationCanvas {
  private options: AnnotationCanvasOptions
  private container: HTMLDivElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private toolbar: HTMLDivElement
  private annotations: Annotation[] = []
  private currentTool: DrawingTool = 'rect'
  private isDrawing = false
  private startX = 0
  private startY = 0
  private currentPoints: { x: number; y: number }[] = []
  private color = '#FF4444'
  private strokeWidth = 3

  constructor(options: AnnotationCanvasOptions) {
    this.options = options
    this.container = this.createContainer()
    this.canvas = this.container.querySelector('canvas')!
    this.ctx = this.canvas.getContext('2d')!
    this.toolbar = this.container.querySelector('.snaptweak-annotation-toolbar') as HTMLDivElement
    this.bindEvents()
  }

  private createContainer(): HTMLDivElement {
    const { area } = this.options
    const el = document.createElement('div')
    el.className = 'snaptweak-annotation-container'
    el.style.left = `${area.x - window.scrollX}px`
    el.style.top = `${area.y - window.scrollY}px`
    el.style.width = `${area.width}px`
    el.style.height = `${area.height}px`

    const dpr = window.devicePixelRatio || 1
    el.innerHTML = `
      <canvas
        width="${area.width * dpr}"
        height="${area.height * dpr}"
        style="width:${area.width}px;height:${area.height}px"
      ></canvas>
      <div class="snaptweak-annotation-toolbar">
        <div class="snaptweak-tool-group">
          <button class="snaptweak-tool-btn active" data-tool="rect" title="Rectangle">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="12" height="12" rx="1"/>
            </svg>
          </button>
          <button class="snaptweak-tool-btn" data-tool="freehand" title="Freehand">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 15c3-4 5-8 6-10s2-2 3-1 0 4-1 6-3 5-5 5"/>
            </svg>
          </button>
          <button class="snaptweak-tool-btn" data-tool="arrow" title="Arrow">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 15L15 3M15 3l-5 1M15 3l-1 5"/>
            </svg>
          </button>
          <button class="snaptweak-tool-btn" data-tool="text" title="Text Label">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M3 4h12v2H10v9H8V6H3V4z"/>
            </svg>
          </button>
        </div>
        <div class="snaptweak-color-group">
          <button class="snaptweak-color-btn active" data-color="#FF4444" style="background:#FF4444"></button>
          <button class="snaptweak-color-btn" data-color="#FFB800" style="background:#FFB800"></button>
          <button class="snaptweak-color-btn" data-color="#00C853" style="background:#00C853"></button>
          <button class="snaptweak-color-btn" data-color="#2979FF" style="background:#2979FF"></button>
        </div>
        <div class="snaptweak-action-group">
          <button class="snaptweak-undo-btn" title="Undo">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 8l-3-3 3-3M1 5h10a5 5 0 010 10H6"/>
            </svg>
          </button>
          <button class="snaptweak-done-btn">Done ✓</button>
          <button class="snaptweak-cancel-ann-btn">Cancel</button>
        </div>
      </div>
    `
    document.body.appendChild(el)

    // Set canvas DPR scale
    const canvas = el.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    return el
  }

  private bindEvents(): void {
    // Tool selection
    this.toolbar.querySelectorAll('.snaptweak-tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentTool = (btn as HTMLElement).dataset.tool as DrawingTool
        this.toolbar.querySelectorAll('.snaptweak-tool-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })

    // Color selection
    this.toolbar.querySelectorAll('.snaptweak-color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.color = (btn as HTMLElement).dataset.color!
        this.toolbar.querySelectorAll('.snaptweak-color-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })

    // Undo
    this.toolbar.querySelector('.snaptweak-undo-btn')?.addEventListener('click', () => {
      this.annotations.pop()
      this.redraw()
    })

    // Done
    this.toolbar.querySelector('.snaptweak-done-btn')?.addEventListener('click', () => {
      this.options.onDone(this.annotations)
    })

    // Cancel
    this.toolbar.querySelector('.snaptweak-cancel-ann-btn')?.addEventListener('click', () => {
      this.options.onCancel()
    })

    // Drawing events
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.startX = e.clientX - rect.left
    this.startY = e.clientY - rect.top
    this.isDrawing = true

    if (this.currentTool === 'freehand') {
      this.currentPoints = [{ x: this.startX, y: this.startY }]
    }

    if (this.currentTool === 'text') {
      this.isDrawing = false
      const text = prompt('Enter label text:')
      if (text) {
        this.annotations.push({
          id: generateId(),
          type: 'text',
          x: this.startX,
          y: this.startY,
          text,
          color: this.color,
          strokeWidth: this.strokeWidth,
        })
        this.redraw()
      }
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (this.currentTool === 'freehand') {
      this.currentPoints.push({ x, y })
    }

    // Preview current drawing
    this.redraw()
    this.drawPreview(x, y)
  }

  private handleMouseUp = (e: MouseEvent): void => {
    if (!this.isDrawing) return
    this.isDrawing = false

    const rect = this.canvas.getBoundingClientRect()
    const endX = e.clientX - rect.left
    const endY = e.clientY - rect.top

    if (this.currentTool === 'rect') {
      const x = Math.min(this.startX, endX)
      const y = Math.min(this.startY, endY)
      const w = Math.abs(endX - this.startX)
      const h = Math.abs(endY - this.startY)
      if (w > 5 || h > 5) {
        this.annotations.push({
          id: generateId(),
          type: 'rect',
          x,
          y,
          width: w,
          height: h,
          color: this.color,
          strokeWidth: this.strokeWidth,
        })
      }
    } else if (this.currentTool === 'arrow') {
      if (Math.abs(endX - this.startX) > 5 || Math.abs(endY - this.startY) > 5) {
        this.annotations.push({
          id: generateId(),
          type: 'arrow',
          x: this.startX,
          y: this.startY,
          width: endX - this.startX,
          height: endY - this.startY,
          color: this.color,
          strokeWidth: this.strokeWidth,
        })
      }
    } else if (this.currentTool === 'freehand') {
      if (this.currentPoints.length > 2) {
        this.annotations.push({
          id: generateId(),
          type: 'freehand',
          x: 0,
          y: 0,
          points: [...this.currentPoints],
          color: this.color,
          strokeWidth: this.strokeWidth,
        })
      }
      this.currentPoints = []
    }

    this.redraw()
  }

  private drawPreview(currentX: number, currentY: number): void {
    this.ctx.save()
    this.ctx.strokeStyle = this.color
    this.ctx.lineWidth = this.strokeWidth
    this.ctx.setLineDash([5, 5])

    if (this.currentTool === 'rect') {
      const x = Math.min(this.startX, currentX)
      const y = Math.min(this.startY, currentY)
      const w = Math.abs(currentX - this.startX)
      const h = Math.abs(currentY - this.startY)
      this.ctx.strokeRect(x, y, w, h)
    } else if (this.currentTool === 'arrow') {
      this.ctx.beginPath()
      this.ctx.moveTo(this.startX, this.startY)
      this.ctx.lineTo(currentX, currentY)
      this.ctx.stroke()
    } else if (this.currentTool === 'freehand') {
      this.ctx.setLineDash([])
      this.ctx.beginPath()
      this.currentPoints.forEach((p, i) => {
        if (i === 0) this.ctx.moveTo(p.x, p.y)
        else this.ctx.lineTo(p.x, p.y)
      })
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  private redraw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    for (const ann of this.annotations) {
      this.ctx.save()
      this.ctx.strokeStyle = ann.color
      this.ctx.fillStyle = ann.color
      this.ctx.lineWidth = ann.strokeWidth

      switch (ann.type) {
        case 'rect':
          this.ctx.strokeRect(ann.x, ann.y, ann.width!, ann.height!)
          break
        case 'freehand':
          if (ann.points && ann.points.length > 1) {
            this.ctx.beginPath()
            ann.points.forEach((p, i) => {
              if (i === 0) this.ctx.moveTo(p.x, p.y)
              else this.ctx.lineTo(p.x, p.y)
            })
            this.ctx.stroke()
          }
          break
        case 'arrow':
          this.drawArrow(ann.x, ann.y, ann.x + ann.width!, ann.y + ann.height!)
          break
        case 'text':
          this.ctx.font = '14px sans-serif'
          this.ctx.fillText(ann.text || '', ann.x, ann.y)
          break
      }

      this.ctx.restore()
    }
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
    const headLen = 12
    const angle = Math.atan2(toY - fromY, toX - fromX)

    this.ctx.beginPath()
    this.ctx.moveTo(fromX, fromY)
    this.ctx.lineTo(toX, toY)
    this.ctx.stroke()

    // Arrow head
    this.ctx.beginPath()
    this.ctx.moveTo(toX, toY)
    this.ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    )
    this.ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    )
    this.ctx.closePath()
    this.ctx.fill()
  }

  getScreenshotWithAnnotations(): string {
    return this.canvas.toDataURL('image/png')
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.container.remove()
  }
}
