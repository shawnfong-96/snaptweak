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

1. **Circle & adjust** — click an element or drag a region, then fine-tune the selection box by dragging its handles to pin down *exactly* the area you mean
2. **Describe** what you want in plain language, right next to your selection
3. **Get a precise, token-efficient prompt** — copy it into any AI chat (WorkBuddy, ChatGPT, Claude, Cursor…) and the AI changes *exactly* the right element, first try

> 💡 **No API key required.** The default flow generates a ready-to-paste prompt — completely free. Power users can optionally plug in their own API key for in-extension auto-fix.

### Why it matters: pinpoint targeting + fewer wasted tokens

When you paste "make my site better" into an AI, it has no idea *which* element you mean — so it asks follow-up questions, guesses wrong, or rewrites half your page. That's wasted back-and-forth and **wasted tokens**.

SnapTweak hands the AI a tightly-scoped, context-rich instruction instead:

- 🎯 **Adjustable selection** — resize and move the box until it frames the precise element, so there's zero ambiguity about *what* to change
- 🧠 **Precise prompt** — the generated prompt carries the exact **DOM selector**, current CSS, element text, and position, so the AI edits the *right* node without scanning your whole page
- 💸 **Lower token cost** — because the target is unambiguous and self-contained, the AI needs no clarifying rounds and reads no irrelevant context — meaning **fewer tokens, lower cost, faster results**

<a name="demo"></a>

## Demo

<p align="center">
  <img src="docs/demo.gif" width="720" alt="SnapTweak Demo" />
</p>

<a name="features"></a>

## ✨ Features

### 🎯 Pinpoint Selection — *you* decide the exact boundary
- **Element Mode**: hover and click to snap to any element with precise DOM targeting
- **Area Mode**: drag to capture any rectangular region
- **Adjustable box**: after selecting, drag the 8 resize handles or move the whole box to frame *exactly* what you mean — no more "the AI changed the wrong thing"
- **Persistent marker**: your selection stays highlighted while you type, and the page locks so it never drifts out of place

### 🧠 Precise, Token-Efficient Prompts
- Captures the exact **DOM selector**, CSS properties, element text, and position
- Produces a self-contained, unambiguous instruction so the AI edits the **right node on the first try** — no clarifying questions, no scanning your whole page
- **Fewer tokens, lower cost**: a tight, scoped prompt means the AI reads less and guesses less
- **Auto-copied & one-click paste** — drop it straight into WorkBuddy, ChatGPT, Claude, or Cursor

### 💸 Free by Default
- The prompt flow needs **no API key and costs nothing** — just copy and paste into the AI chat you already use
- Want fully automated edits? Optionally add your own key for in-extension Auto-Fix

### 🤖 AI Auto-Fix (Optional / Advanced)
- Plug in your own API key (OpenAI, Anthropic, or any compatible endpoint)
- Get code modifications generated directly within the extension

### 🌍 Multilingual
- Full English and Chinese UI
- Accepts descriptions in any language

<a name="installation"></a>

## 📦 Installation

### From Source (Development)

```bash
# Clone the repo
git clone https://github.com/shawnfong-96/snaptweak.git
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
│  │  1. Click / drag to      │                           │
│  │     select an element    │──┐                        │
│  └─────────────────────────┘  │                        │
│                                │                        │
│  ┌─────────────────────────┐  │                        │
│  │  2. Drag the handles to  │──┤                        │
│  │     fine-tune the box    │  │                        │
│  └─────────────────────────┘  │                        │
│                                ▼                        │
│  ┌─────────────────────────────────────────┐           │
│  │  3. Describe what you want, inline       │           │
│  │     "Make this section's background blue"│           │
│  └──────────────────┬──────────────────────┘           │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────────────┐
     │  SnapTweak builds a PRECISE prompt:     │
     │  • Exact DOM selector & CSS context     │
     │  • Element text + position + screenshot │
     │  • Scoped → fewer tokens, no guessing   │
     └────────────────┬───────────────────────┘
                      │
          ┌───────────┴───────────────┐
          ▼                           ▼
   ┌────────────────────┐   ┌──────────────────┐
   │ Copy → paste into  │   │  AI Auto-Fix     │
   │ WorkBuddy/ChatGPT/ │   │  (optional key)  │
   │ Claude  (FREE)     │   │                  │
   └────────────────────┘   └──────────────────┘
```

<a name="ai-providers"></a>

## 🤖 AI Providers

SnapTweak works in two modes:

| Mode | Requirement | Cost | How it works |
|------|-------------|------|--------------|
| **Prompt Mode** (default) | None | **Free** | Generates a precise, token-efficient prompt; you paste it into WorkBuddy / ChatGPT / Claude / Cursor |
| **Auto-Fix Mode** | Your API Key | Pay-per-use | Calls the AI directly and shows code changes inline |

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
