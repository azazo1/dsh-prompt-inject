/**
 * Client 产物的构建后处理, 由 `build:client` 在 `tsc` 之后调用.
 *
 * 1. 读 `presets/*.md`, 把正文与标题注入 `lib/client.js` 的 `PRESETS` 常量. client
 *    半区没有打包器 (顶层不允许 import), 预设只能以字面量形式进产物.
 * 2. 删掉 `tsc` 为纯类型导入留下的模块标记 `export {};`: dsh 用普通 `<script>`
 *    加载 client bundle, 留着它会直接语法报错.
 *
 * 标记找不到或一条预设都没有时直接失败, 不产出"看起来正常但预设是空的"的产物.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

/** `tsc` 编译后留在产物里的那行常量, 会被替换成真实的预设数组. */
const MARKER = 'const PRESETS = [];'

function fail(message) {
  console.error(`build-client: ${message}`)
  process.exit(1)
}

/** 解析一个预设文件: 极简 front matter (只认 `key: value`) 加正文. */
function parsePreset(file) {
  const source = readFileSync(new URL(`../presets/${file}`, import.meta.url), 'utf8')
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source)
  if (match === null) fail(`presets/${file} 缺少 front matter`)
  const fields = new Map()
  for (const line of match[1].split('\n')) {
    const at = line.indexOf(':')
    if (at > 0) fields.set(line.slice(0, at).trim(), line.slice(at + 1).trim())
  }
  const title = fields.get('title')
  if (title === undefined || title === '') fail(`presets/${file} 缺少 title`)
  return { id: file.replace(/\.md$/, ''), title, text: match[2].trimEnd() }
}

const files = readdirSync(new URL('../presets/', import.meta.url))
  .filter(name => name.endsWith('.md'))
  .sort()
if (files.length === 0) fail('presets/ 下没有 .md 文件')

const presets = files.map(parsePreset)
const artifact = new URL('../lib/client.js', import.meta.url)
let output = readFileSync(artifact, 'utf8')
if (!output.includes(MARKER)) fail(`lib/client.js 里找不到 ${MARKER}`)

output = output.replace(MARKER, `const PRESETS = ${JSON.stringify(presets)};`)
output = output.split('\n').filter(line => line.trim() !== 'export {};').join('\n')
writeFileSync(artifact, output)

console.log(`build-client: 注入 ${String(presets.length)} 条预设 (${presets.map(preset => preset.id).join(', ')}) 并去掉模块标记`)
