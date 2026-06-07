<p align="center">
  <img src="docs/logo.svg" width="80" height="80" alt="SnapTweak Logo" />
</p>

<h1 align="center">SnapTweak</h1>

<p align="center">
  <strong>Circle anything. Describe what you want. Let AI handle the code.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#installation">Install</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#ai-providers">AI Providers</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/Vue%203-TypeScript-42b883?logo=vue.js" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
  <img src="https://img.shields.io/badge/AI-Powered-blueviolet" />
</p>

---

## The Problem

You've got an AI to build you a website or app, but now you're staring at the result thinking:

> *"The button should be bigger... the color is wrong... this section needs to move..."*

You **know** what you want to change, but you don't know how to express it in code terms. And pasting a generic "make it better" into ChatGPT gets you nowhere.

## The Solution

**SnapTweak** bridges the gap between "I can see what's wrong" and "here's the exact fix."

1. **Circle** the element directly on the page
2. **Annotate** with arrows, highlights, and labels
3. **Describe** what you want in plain language
4. **Get** a precise, context-rich prompt — or let AI auto-fix it

<a name="demo"></a>

## Demo

<p align="center">
  <img src="docs/demo.gif" width="720" alt="SnapTweak Demo" />
</p>

<a name="features"></a>

## ✨ Features

### 🎯 Smart Selection
- **Element Mode**: Hover and click to select any element with precise DOM targeting
- **Area Mode**: Drag to capture any rectangular region on the page

### 🖊️ Rich Annotation Tools
- Rectangle highlighting
- Freehand drawing
- Arrow pointers
- Text labels
- Multiple colors & stroke widths

### 🧠 Intelligent Prompt Generation
- Captures **DOM selector**, CSS properties, element text, and position
- Includes annotated screenshot for visual context
- Generates structured prompts optimized for AI tools (ChatGPT, Claude, Cursor, etc.)
- **One-click copy** — paste directly into any AI assistant

### 🤖 AI Auto-Fix (Advanced Mode)
- Connect your own API key (OpenAI, Anthropic, or any compatible endpoint)
- Get code modifications generated directly within the extension
- Preview changes before applying

### 🌍 Multilingual
- Full English and Chinese language support
- Accepts descriptions in any language

<a name="installation"></a>

## 📦 Installation

### From Source (Development)

```bash
# Clone the repo
git clone https://github.com/your-username/snaptweak.git
cd snaptweak

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

<a name="how-it-works"></a>

## 🔧 How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Your Web Page                                          │
│                                                         │
│  ┌─────────────────────────┐                           │
│  │  1. Click/Drag to       │                           │
│  │     select element      │──┐                        │
│  └─────────────────────────┘  │                        │
│                                │                        │
│  ┌─────────────────────────┐  │                        │
│  │  2. Draw annotations    │──┤                        │
│  │     (rect/arrow/text)   │  │                        │
│  └─────────────────────────┘  │                        │
│                                ▼                        │
│  ┌─────────────────────────────────────────┐           │
│  │  3. Describe what you want              │           │
│  │     "Make this button blue and larger"   │           │
│  └──────────────────┬──────────────────────┘           │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  SnapTweak generates:          │
     │  • Screenshot + Annotations    │
     │  • DOM selector & CSS context  │
     │  • Structured AI prompt        │
     └────────────────┬───────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐      ┌──────────────┐
   │ Copy Prompt │      │  AI Auto-Fix │
   │ (Default)   │      │  (API Key)   │
   └─────────────┘      └──────────────┘
```

<a name="ai-providers"></a>

## 🤖 AI Providers

SnapTweak works in two modes:

| Mode | Requirement | How it works |
|------|-------------|--------------|
| **Prompt Mode** (default) | None | Generates a rich prompt; you paste into ChatGPT/Claude/Cursor |
| **Auto-Fix Mode** | API Key | Calls the AI directly and shows code changes inline |

### Supported Providers

- **OpenAI** — GPT-4o, GPT-4-turbo (supports vision)
- **Anthropic** — Claude Sonnet 4, Claude Opus (via messages API)
- **Custom** — Any OpenAI-compatible endpoint (vLLM, Ollama, etc.)

## 🏗️ Tech Stack

- **Vue 3** + TypeScript — UI components
- **Vite** — Lightning-fast builds
- **Chrome Extension Manifest V3** — Modern extension APIs
- **Canvas API** — Annotation drawing

## 📁 Project Structure

```
snaptweak/
├── public/
│   ├── manifest.json        # Extension manifest
│   └── icons/               # Extension icons
├── src/
│   ├── background/          # Service worker
│   ├── content/             # Content script (selection, canvas, panel)
│   ├── popup/               # Extension popup (Vue)
│   ├── options/             # Settings page (Vue)
│   └── shared/              # Types, utils
├── docs/                    # Docs & screenshots
├── vite.config.ts
└── package.json
```

<a name="contributing"></a>

## 🤝 Contributing

Contributions welcome! Here's how:

1. Fork the repo
2. Create your branch (`git checkout -b feature/awesome`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome`)
5. Open a Pull Request

## 📄 License

[MIT](LICENSE) — do whatever you want with it.

---

<p align="center">
  <sub>Built with ❤️ for everyone who knows what they want but not how to code it.</sub>
</p>
