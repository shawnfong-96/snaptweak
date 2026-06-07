import type { Settings, FeedbackItem } from './types'
import { DEFAULT_SETTINGS } from './types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result.settings })
    })
  })
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  const merged = { ...current, ...settings }
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings: merged }, resolve)
  })
}

export function generatePrompt(item: FeedbackItem, template: string): string {
  return template
    .replace('{{pageUrl}}', item.pageUrl)
    .replace('{{selector}}', item.selection.selector)
    .replace('{{tagName}}', item.selection.tagName)
    .replace('{{elementText}}', item.selection.elementText)
    .replace('{{x}}', String(item.selection.x))
    .replace('{{y}}', String(item.selection.y))
    .replace('{{width}}', String(item.selection.width))
    .replace('{{height}}', String(item.selection.height))
    .replace('{{description}}', item.description)
}

export function getCssSelector(element: Element): string {
  if (element.id) return `#${element.id}`

  const path: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith('snaptweak-'))
        .slice(0, 2)
      if (classes.length) {
        selector += '.' + classes.join('.')
      }
    }

    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (el) => el.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
