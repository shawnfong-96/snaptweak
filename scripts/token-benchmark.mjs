// Token benchmark: vague request vs SnapTweak's precise prompt.
// Uses gpt-tokenizer (o200k_base, the GPT-4o encoding) for real token counts.
// Models the REALISTIC end-to-end cost including AI clarifying rounds and
// the page context the model must read when the target is ambiguous.
import { encode } from '/Users/shawnfong/.workbuddy/binaries/node/workspace/node_modules/gpt-tokenizer/esm/model/gpt-4o.js'

const T = (s) => encode(s).length

// ---- Scenario: user wants the hero section background changed to blue ----

// The actual page the AI must reason about (a typical small landing page).
// When the request is vague, the AI has to ingest this whole thing to guess
// which element the user means.
const pageHtml = `<!DOCTYPE html><html><head><style>
.hero{padding:64px 24px;text-align:center;background:#eef2ff}
.hero h1{font-size:36px;margin-bottom:12px}
.hero p{font-size:18px;color:#6b7280;margin-bottom:24px}
.cta{padding:10px 20px;border:none;border-radius:6px;background:#9ca3af;color:#fff}
.features{max-width:900px;margin:48px auto;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px}
.card h3{font-size:17px;margin-bottom:8px}
.card p{font-size:14px;color:#6b7280;line-height:1.6}
.banner{max-width:900px;margin:24px auto;padding:20px;background:#fef3c7}
.footer{padding:32px;text-align:center;color:#9ca3af}
</style></head><body>
<section class="hero"><h1>My AI Website</h1><p>A sample landing page</p><button class="cta">Get Started</button></section>
<div class="banner">Welcome banner text here</div>
<section class="features">
<div class="card"><h3>Feature One</h3><p>Description one.</p></div>
<div class="card"><h3>Feature Two</h3><p>Description two.</p></div>
<div class="card"><h3>Feature Three</h3><p>Description three.</p></div>
</section>
<div class="footer">Copyright 2026</div>
</body></html>`

// === Path A: vague request (typical beginner, no tool) ===
const vagueUser = '把背景改成蓝色'
// AI can't tell WHICH background (hero? banner? cards? body?), so realistically:
//  - user must paste the whole page for context
//  - AI asks a clarifying question
//  - user answers
//  - AI finally responds
const vagueClarify = '你指的是哪个区域的背景？是顶部 hero 区、中间的 banner、卡片，还是整个页面的背景？请明确一下。'
const vagueAnswer = '就是最上面那个标题区域的背景'
const vagueFinalReply = `好的，修改 .hero 的背景：\n.hero{background:#2563EB}\n同时建议把标题和段落文字改成浅色以保证对比度：\n.hero h1{color:#fff}\n.hero p{color:#dbeafe}`

// === Path B: SnapTweak precise prompt (one shot) ===
const snaptweakPrompt = `You are helping me modify a web page element.

## Context
- Element: section.hero (section)
- Current background: #eef2ff
- Current text: My AI Website / A sample landing page

## Selection
Position: (0, 0) Size: 912x220

## Request
把这个区域的背景改成蓝色

## Instructions
Provide the exact CSS changes needed.`
const snaptweakFinalReply = `修改 .hero 背景：\n.hero{background:#2563EB}\n.hero h1{color:#fff}\n.hero p{color:#dbeafe}`

// --- Tally ---
// Path A total = page context + vague req + clarify + answer + final reply
const aPage = T(pageHtml)
const aReq = T(vagueUser)
const aClarify = T(vagueClarify)
const aAnswer = T(vagueAnswer)
const aReply = T(vagueFinalReply)
const aTotal = aPage + aReq + aClarify + aAnswer + aReply

// Path B total = precise prompt + final reply (no page dump, no clarifying round)
const bPrompt = T(snaptweakPrompt)
const bReply = T(snaptweakFinalReply)
const bTotal = bPrompt + bReply

const pad = (s, n) => String(s).padStart(n)
console.log('\n========== SnapTweak Token Benchmark (GPT-4o / o200k_base) ==========\n')
console.log('Scenario: change the hero section background to blue\n')

console.log('--- Path A: vague request, no tool (realistic multi-turn) ---')
console.log(`  Whole-page context dump : ${pad(aPage, 5)} tokens`)
console.log(`  Vague user request      : ${pad(aReq, 5)} tokens  ("${vagueUser}")`)
console.log(`  AI clarifying question  : ${pad(aClarify, 5)} tokens`)
console.log(`  User's answer           : ${pad(aAnswer, 5)} tokens`)
console.log(`  AI final reply          : ${pad(aReply, 5)} tokens`)
console.log(`  ----------------------------------------`)
console.log(`  TOTAL                   : ${pad(aTotal, 5)} tokens\n`)

console.log('--- Path B: SnapTweak precise prompt (one shot) ---')
console.log(`  Precise scoped prompt   : ${pad(bPrompt, 5)} tokens`)
console.log(`  AI final reply          : ${pad(bReply, 5)} tokens`)
console.log(`  ----------------------------------------`)
console.log(`  TOTAL                   : ${pad(bTotal, 5)} tokens\n`)

const saved = aTotal - bTotal
const pct = ((saved / aTotal) * 100).toFixed(1)
console.log('========================================')
console.log(`  Tokens saved            : ${pad(saved, 5)} tokens`)
console.log(`  Reduction               : ${pad(pct, 5)} %`)
console.log('========================================\n')

// Also report the pure "first message" comparison (prompt-only, no rounds)
console.log('Note — even comparing only the FIRST message:')
console.log(`  vague request alone     : ${aReq} tokens (but unusable → triggers clarification)`)
console.log(`  precise prompt alone    : ${bPrompt} tokens (immediately actionable)\n`)
console.log('The win is NOT a shorter first message — the precise prompt is')
console.log('longer. The win is eliminating the page-context dump and the')
console.log('clarify/answer round-trips that a vague request forces.\n')
