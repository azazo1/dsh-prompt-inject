/**
 * 产物入口自检.
 *
 * 1. Client: 把 lib/client.js 放进一个假浏览器里跑一遍, 断言它顶层完成了
 *    `__ModuleLoader__.load` 注册, 注册 id 等于包名, 且 factory 只向平台模块表要东西.
 * 2. Host: 用假 ctx 调一次 apply, 断言段落名, 顺序, 文本回退与关闭时的空段落.
 *
 * 不 require 任何宿主真实包: 平台模块表的传递依赖在本仓 node_modules 里不一定解析得到,
 * 那会把检查变成环境问题.
 */

import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { apply, Config, DEFAULT_TEXT, name, SECTION_NAME } from '../lib/index.js'

/** 平台模块表里可用的模块 (与 dsh 的 staticModules 对齐). */
const PLATFORM_MODULES = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
])

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

function fail(message) {
  console.error(`check: ${message}`)
  process.exit(1)
}

function expect(condition, message) {
  if (!condition) fail(message)
}

/** 收集 apply 注册的段落, 并回放一次文本求值. */
function mountHost(config) {
  const sections = []
  const warnings = []
  const ctx = {
    inject: (deps, callback) => { callback({ systemPrompt: { section: (section) => { sections.push(section); return () => {} } } }) },
    logger: { warn: (...args) => { warnings.push(args) } },
  }
  apply(ctx, config)
  return { sections, warnings }
}

/** volatile 字段的假引用. */
const volatileOf = value => ({ get: () => value })

// --- Client 半区: 顶层注册 ---
const registrations = []
vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'),
  { window: { __ModuleLoader__: { load: entry => { registrations.push(entry) } } } },
  { filename: 'lib/client.js' })

expect(registrations.length === 1, `expected exactly one registration, got ${String(registrations.length)}`)
const entry = registrations[0]
expect(entry.id === pkg.name, `registration id ${entry.id} does not match package name ${pkg.name}`)
expect(typeof entry.factory === 'function', 'registration has no factory')
const plugin = entry.factory((specifier) => {
  expect(PLATFORM_MODULES.has(specifier), `factory requested a module outside the platform table: ${specifier}`)
  return {}
})
expect(JSON.stringify(plugin.inject) === JSON.stringify(['slots', 'locale', 'configForms']),
  `inject list is ${JSON.stringify(plugin.inject)}`)
expect(typeof plugin.apply === 'function', 'factory result has no apply')

// --- Host 半区: 段落注册 ---
expect(name === pkg.name, `plugin module name ${name} does not match package name ${pkg.name}`)
const defaults = Config({})
expect(defaults.order === 100, `default order is ${String(defaults.order)}, expected 100`)

const inline = mountHost({
  enabled: volatileOf(true), order: 100, text: volatileOf('  自定义块  '), file: volatileOf(''),
})
expect(inline.sections.length === 1, `expected one section, got ${String(inline.sections.length)}`)
expect(inline.sections[0].name === SECTION_NAME, `section name is ${inline.sections[0].name}`)
expect(inline.sections[0].order === 100, `section order is ${String(inline.sections[0].order)}`)
expect(inline.sections[0].interpolate === false, 'the section must keep its text literal')
expect(inline.sections[0].text() === '自定义块', `inline text read back as ${inline.sections[0].text()}`)

const muted = mountHost({
  enabled: volatileOf(false), order: 100, text: volatileOf(DEFAULT_TEXT), file: volatileOf(''),
})
expect(muted.sections[0].text() === '', 'a disabled section must render empty so assembly drops it')

const missingFile = mountHost({
  enabled: volatileOf(true), order: 100, text: volatileOf('退路'), file: volatileOf('~/__dsh_prompt_inject_missing__.md'),
})
expect(missingFile.sections[0].text() === '退路', 'an unreadable file must fall back to the inline text')
expect(missingFile.warnings.length === 1, 'an unreadable file must be reported once')

console.log(`check: ok, ${pkg.name} host section + client registration both verified`)
