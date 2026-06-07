// Core types for SnapTweak

export interface Annotation {
  id: string
  type: 'rect' | 'freehand' | 'arrow' | 'text'
  // Coordinates relative to the page
  x: number
  y: number
  width?: number
  height?: number
  // For freehand drawings
  points?: { x: number; y: number }[]
  // For text annotations
  text?: string
  // Style
  color: string
  strokeWidth: number
}

export interface SelectionArea {
  x: number
  y: number
  width: number
  height: number
  // DOM context
  selector: string
  tagName: string
  elementText: string
  computedStyles: Record<string, string>
}

export interface FeedbackItem {
  id: string
  timestamp: number
  // Visual context
  screenshot: string // base64 data URL
  annotations: Annotation[]
  selection: SelectionArea
  // User's request
  description: string
  // Page context
  pageUrl: string
  pageTitle: string
  // Generated output
  generatedPrompt?: string
}

export interface Settings {
  // AI provider config
  aiProvider: 'none' | 'openai' | 'anthropic' | 'custom'
  apiKey: string
  apiEndpoint: string
  model: string
  // UI preferences
  annotationColor: string
  strokeWidth: number
  // Prompt template
  promptTemplate: string
  // Language
  language: 'zh' | 'en'
}

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: 'none',
  apiKey: '',
  apiEndpoint: '',
  model: 'gpt-4o',
  annotationColor: '#FF4444',
  strokeWidth: 3,
  promptTemplate: `You are helping me modify a web page element.

## Context
- Page URL: {{pageUrl}}
- Element: {{selector}} ({{tagName}})
- Current text: {{elementText}}

## Screenshot
[Screenshot with annotations is attached]

## Selection Area
Position: ({{x}}, {{y}}) Size: {{width}}x{{height}}

## User's Request
{{description}}

## Instructions
Please provide the exact code changes needed to fulfill this request. Include:
1. What file(s) to modify
2. The specific CSS/HTML/JS changes
3. Any considerations or trade-offs`,
  language: 'zh',
}

// Messages between content script and background/popup
export type MessageType =
  | { type: 'START_SELECTION' }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'SELECTION_COMPLETE'; data: FeedbackItem }
  | { type: 'GENERATE_PROMPT'; data: FeedbackItem }
  | { type: 'PROMPT_GENERATED'; prompt: string }
  | { type: 'AI_FIX'; data: FeedbackItem }
  | { type: 'AI_FIX_RESULT'; code: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_RESPONSE'; settings: Settings }
