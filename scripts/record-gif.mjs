// Records docs/record-demo.html by capturing frames with Playwright, then
// encodes them into an optimized GIF using pure-JS gifenc (no ffmpeg needed,
// since Playwright's bundled ffmpeg lacks scale/palettegen filters).
import pw from '/Users/shawnfong/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js'
import { GIFEncoder, quantize, applyPalette } from '/Users/shawnfong/.workbuddy/binaries/node/workspace/node_modules/gifenc/dist/gifenc.esm.js'
import { PNG } from '/Users/shawnfong/.workbuddy/binaries/node/workspace/node_modules/pngjs/lib/png.js'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { chromium } = pw
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const demoPath = 'file://' + path.join(root, 'docs', 'record-demo.html')
const outGif = path.join(root, 'docs', 'demo.gif')

const W = 760, H = 475 // 960x600 scaled to 760 wide keeps ~1.6 ratio (600*760/960=475)
const FPS = 12
const DURATION_MS = 15000
const frameInterval = 1000 / FPS
const totalFrames = Math.floor(DURATION_MS / frameInterval)

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.goto(demoPath)
await page.waitForTimeout(150)

console.log(`Capturing ${totalFrames} frames @ ${FPS}fps ...`)
const frames = []
const start = Date.now()
for (let i = 0; i < totalFrames; i++) {
  const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 960, height: 600 } })
  frames.push(buf)
  // pace capture to roughly match wall clock so animation timing is natural
  const targetElapsed = (i + 1) * frameInterval
  const actualElapsed = Date.now() - start
  const wait = targetElapsed - actualElapsed
  if (wait > 0) await page.waitForTimeout(wait)
  const done = await page.evaluate('window.__done === true')
  if (done && i > totalFrames * 0.7) { console.log('animation done at frame', i); break }
}
await context.close()
await browser.close()

// Downscale 960x600 -> 760x475 with simple box sampling, encode GIF
console.log('Encoding GIF from', frames.length, 'frames ...')
const enc = GIFEncoder()
const sx = 960 / W, sy = 600 / H

for (const buf of frames) {
  const png = PNG.sync.read(buf)
  const src = png.data // RGBA, 960x600
  const out = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) {
    const syi = Math.min(599, (y * sy) | 0)
    for (let x = 0; x < W; x++) {
      const sxi = Math.min(959, (x * sx) | 0)
      const si = (syi * 960 + sxi) * 4
      const di = (y * W + x) * 4
      out[di] = src[si]; out[di + 1] = src[si + 1]; out[di + 2] = src[si + 2]; out[di + 3] = 255
    }
  }
  const palette = quantize(out, 256)
  const index = applyPalette(out, palette)
  enc.writeFrame(index, W, H, { palette, delay: Math.round(1000 / FPS) })
}
enc.finish()
writeFileSync(outGif, Buffer.from(enc.bytes()))
console.log('GIF written:', outGif)
