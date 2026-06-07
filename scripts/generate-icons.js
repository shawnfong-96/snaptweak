#!/usr/bin/env node
/**
 * Generate PNG icons from SVG logo for Chrome extension.
 * Run: node scripts/generate-icons.js
 *
 * For development, you can also manually export SVGs as PNGs using any tool.
 * The SVG source is at docs/logo.svg
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sizes = [16, 32, 48, 128]

// Simple SVG-based placeholder icons (since we can't use canvas in pure Node without deps)
for (const size of sizes) {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <circle cx="64" cy="64" r="28" stroke="#FFF" stroke-width="5" fill="none"/>
  <circle cx="64" cy="64" r="6" fill="#FFF"/>
  <line x1="64" y1="26" x2="64" y2="36" stroke="#FFF" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="64" y1="92" x2="64" y2="102" stroke="#FFF" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="26" y1="64" x2="36" y2="64" stroke="#FFF" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="92" y1="64" x2="102" y2="64" stroke="#FFF" stroke-width="3.5" stroke-linecap="round"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="128" y2="128"><stop stop-color="#6366F1"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>
</svg>`

  const outPath = resolve(__dirname, '..', 'public', 'icons', `icon-${size}.svg`)
  writeFileSync(outPath, svg)
  console.log(`Generated: icons/icon-${size}.svg (${size}x${size})`)
}

console.log('\nNote: For production, convert these SVGs to PNGs using:')
console.log('  npx svg2png-many public/icons/ --sizes 16,32,48,128')
console.log('  or use https://cloudconvert.com/svg-to-png')
