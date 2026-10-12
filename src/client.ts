/**
 * Client 半区: 在本 bundle 的插件详情页上注册配置卡片.
 *
 * 落点固定为 `plugins.bundle.config` (keyed slot, 键等于包名), 与官方及其它外部插件的
 * 做法一致: 卡片渲染在 设置 -> 插件 -> 本插件 的页面上, 描述与"包含的组件"之间.
 * 不占用 `settings.section`: 那是官方功能插件给自己开的独立设置页 (账号 / 预设 / 聊天),
 * 外部插件的配置不该在那里另起一页.
 *
 * 这一半不打包. 顶层只留一个立即执行调用, 运行时值全部经 factory 注入的 `require`
 * 从平台模块表取, 所以构建只是 `tsc`, 产物里不允许出现 import/export. 整个 bundle 必须
 * 自隔离 (见文件下半部分的 IIFE 注释): 拼接进同一个脚本的其它插件不能被我们的顶层声明撞到.
 *
 * 骨架是官方 `SettingsForm`: 单行文本与数字用官方 `SettingsValueField`, 布尔用官方
 * `Switch`, 多行文本块自绘 textarea (原语里没有多行控件), 颜色与圆角全走 `--dsw-*`
 * token, 行节奏对齐官方设置表单 (每行 12px 内边距, 行间 0.5px hairline).
 *
 * 草稿只活在页面里, 离开即丢弃, 只有保存才写 profile 的 patch 层.
 * @module dsh-prompt-inject/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ChangeEvent } from 'react'
import type { SettingsFieldState, SettingsFormActions } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
// 以下都是类型侧导入: 它们把 ctx.locale / ctx.configForms / ctx.slots 与
// `plugins.bundle.config` 槽位的类型并进 Context, 运行时不需要这些包.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** 卡片文案的键. */
type LocaleKey =
  | 'title' | 'intro'
  | 'enabled' | 'enabledHint'
  | 'text' | 'textHint' | 'textPlaceholder'
  | 'presetPlaceholder'
  | 'file' | 'fileHint'
  | 'order' | 'orderHint'
  | 'overridden' | 'reset' | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-prompt-inject 配置页的文案. */
    'dsh-prompt-inject': LocaleKey
  }
}

declare global {
  interface Window {
    /** DSH Web 的懒加载模块表: 注册本插件的 client 半区. */
    __ModuleLoader__: {
      load(entry: { id: string; factory: (require: (specifier: string) => unknown) => unknown }): void
    }
  }
}

/**
 * 运行时值全部关在这个 IIFE 里.
 *
 * combo 把同一批次里多个插件的 bundle 源码首尾拼接进同一个 classic script, 而脚本顶层的
 * `const` / `let` / `function` 会落进共享的全局词法环境: 两个插件各写一个 `zh` 就是
 * `SyntaxError: Identifier 'zh' has already been declared`, 整批插件一个都注册不上.
 * 所以脚本顶层只留这个立即执行调用, 声明一律留在函数体里.
 *
 * 上面两个 `declare` 块不产生代码, 且按语言规则只能写在模块顶层, 故留在 IIFE 外面.
 */
;(() => {

/** 包名, 同时是 loader registration id. */
const PACKAGE_NAME = 'dsh-prompt-inject'
/** profile 条目 id, 配置表单按它寻址 (见 cordis.patch.yml). */
const ENTRY_ID = 'dsh-prompt-inject'
/** 文案命名空间, 与条目 id 同名便于对照. */
const LOCALE_NS = 'dsh-prompt-inject'
/** 多行文本控件的 id, 供 label 关联. */
const TEXT_ID = 'prompt-inject-text'

/** 中文文案. */
const zh: Record<LocaleKey, string> = {
  title: '提示词注入',
  intro: '这里维护的文字块会作为一个独立的系统提示词段落注入, 每次组装时重新读取.',
  enabled: '启用注入',
  enabledHint: '关掉后段落为空, 组装阶段直接丢掉; 文本本身保留, 随时可以再打开.',
  text: '注入的文字块',
  textHint: '默认留空: 空段落会在组装阶段被丢掉, 也就是什么都不注入.',
  textPlaceholder: '用右侧预设插入, 或直接写在这里.',
  presetPlaceholder: '插入预设...',
  file: '外部 Markdown 文件',
  fileHint: '填了路径就改读这个文件, 每次组装重新读取, 在编辑器里改完下一轮生效.',
  order: '段落顺序',
  orderHint: '默认 100, 紧跟人设前缀, 在第一方工具引导之前; 想压到最后可以给 10250.',
  overridden: '已覆盖',
  reset: '恢复默认',
  unavailable: '当前组合里没有这个插件, 配置不可用.',
  readOnly: '这份配置是只读的, 改动不会写回.',
  saveFailed: '保存没有被接受, 草稿已保留, 改完再存一次.',
  save: '保存',
  saving: '保存中',
}

/** 英文文案. */
const en: Record<LocaleKey, string> = {
  title: 'Prompt blocks',
  intro: 'The block you maintain here is injected as its own system prompt section and re-read at every assembly.',
  enabled: 'Enable the injection',
  enabledHint: 'Turning this off leaves the section empty and assembly drops it; the text stays for later.',
  text: 'Injected block',
  textHint: 'Left empty by default: an empty section is dropped at assembly, so nothing is injected.',
  textPlaceholder: 'Insert a preset on the right, or write your own block here.',
  presetPlaceholder: 'Insert a preset...',
  file: 'External Markdown file',
  fileHint: 'When set, this file is read at every assembly, so edits apply on the next round.',
  order: 'Section order',
  orderHint: 'Defaults to 100, right after the persona prefix and before the first-party tool guidance; 10250 puts it last.',
  overridden: 'Overridden',
  reset: 'Reset',
  unavailable: 'This plugin is not composed right now, so its configuration is unavailable.',
  readOnly: 'This configuration document is read-only; edits are not written back.',
  saveFailed: 'The save was not accepted; your draft is kept, fix it and save again.',
  save: 'Save',
  saving: 'Saving',
}

/** 段落顺序的行内控件样式, 与官方字段行节奏一致. */
const STYLE = {
  rowFirst: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0' },
  row: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px 0', borderTop: '0.5px solid var(--dsw-alias-border-l2)' },
  head: { display: 'flex', alignItems: 'center', gap: '8px' },
  label: { flex: '1', minWidth: 0, fontSize: '13px', fontWeight: 500, lineHeight: 1.5, color: 'var(--dsw-alias-label-primary)' },
  reset: { padding: 0, border: 'none', background: 'none', color: 'var(--dsw-alias-label-secondary)', font: 'inherit', fontSize: '12px', lineHeight: 1.5, cursor: 'pointer' },
  hint: { margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
  intro: { margin: '0 0 4px', fontSize: '12px', lineHeight: 1.6, color: 'var(--dsw-alias-label-tertiary)' },
  select: { maxWidth: '240px', height: '28px', padding: '0 6px', borderRadius: 'var(--dsw-radius-md)', border: '0.5px solid var(--dsw-alias-border-l4)', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '12px' },
  toggle: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '12px 0' },
  toggleText: { flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: '96px', resize: 'vertical', padding: '8px 12px', borderRadius: 'var(--dsw-radius-md)', border: '0.5px solid var(--dsw-alias-border-l4)', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '13px', lineHeight: 1.6 },
} as const

/** 一条可以一键插入文字块的预设, 来自 `presets/*.md`. */
interface Preset {
  /** 文件名去掉 `.md`, 用作 <option> 的 value. */
  id: string
  /** 预设标题, 中英同形 (都是产品名与段落名), 直接显示. */
  title: string
  /** 预设正文, 逐字保留原文, 插入到文字块里. */
  text: string
}

/**
 * 预设清单. 源码里固定为空数组, 构建脚本 `scripts/build-client.mjs` 读
 * `presets/*.md` 后把这行整体替换成真实字面量: client 半区没有打包器, 顶层不允许
 * import, 文件内容只能这样进产物.
 */
const PRESETS: readonly Preset[] = []

/** Host 段落注册时读的那份配置. */
interface PromptInjectSettings {
  enabled?: boolean
  order?: number
  text?: string
  file?: string
}

/** 卡片读到的快照: 表单外壳状态加四个字段. */
interface CardState {
  available: boolean
  writable: boolean
  dirty: boolean
  invalid: boolean
  saving: boolean
  failed: boolean
  enabled: SettingsFieldState
  text: SettingsFieldState
  file: SettingsFieldState
  order: SettingsFieldState
}

/** 注册侧注入给卡片的能力. */
type CardFace = { hooks: { promptInject: SnapshotStore<CardState> } } & SettingsFormActions

/** 设置页拿到的全部 props. */
type CardProps =
  PropsRuntime<'plugins.bundle.config'>
  & PropsLocale<'dsh-prompt-inject'>
  & InjectFace<CardFace>

window.__ModuleLoader__.load({
  id: PACKAGE_NAME,
  factory: (require) => {
    const React = require('react') as typeof import('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives') as typeof import('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const { SettingsForm, SettingsFormModel, SettingsValueField, Switch, settingsNumberField, settingsTextField } = primitives

    /**
     * 渲染插件详情页上的配置卡片.
     * @param props - 字典, 表单快照与动作.
     * @returns 该插件的配置表单.
     */
    function PromptInjectCard(props: CardProps) {
      const { t } = props
      const state = props.usePromptInject(snapshot => snapshot)
      const locked = !state.writable
      const field = {
        overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('saveFailed'), disabled: locked,
      }
      return h('section', { 'aria-label': t('title') },
        h('p', { style: STYLE.intro }, t('intro')),
        h(
        SettingsForm,
        {
          labels: {
            unavailable: t('unavailable'), readOnly: t('readOnly'), saveFailed: t('saveFailed'), save: t('save'), saving: t('saving'),
          },
          state,
          onSave: props.save,
          onDiscard: props.discard,
          // children 走 props 而不是 createElement 的可变参数: SettingsForm 的
          // props 里 children 是必填项, 显式传才能命中正确的重载.
          children: [
            // 布尔行: 标签与说明在左, 开关在右.
            h('div', { key: 'enabled', style: STYLE.toggle },
              h('div', { style: STYLE.toggleText },
                h('span', { style: STYLE.label }, t('enabled')),
                h('span', { style: STYLE.hint }, t('enabledHint'))),
              h(Switch, {
                checked: state.enabled.text !== 'false',
                onChange: next => { props.edit('enabled', String(next)) },
                label: t('enabled'),
                disabled: locked,
              })),
            // 文字块: 原语里没有多行控件, 这里按同一套行节奏自绘.
            h('div', { key: 'text', style: STYLE.rowFirst },
              h('div', { style: STYLE.head },
                h('label', { htmlFor: TEXT_ID, style: STYLE.label }, t('text')),
                state.text.overridden
                  ? h('button', { type: 'button', style: STYLE.reset, disabled: locked, onClick: () => { props.resetField('text') } }, t('reset'))
                  : null,
                // 预设: 选中即把该段原文填进草稿, 仍要按保存才写回配置; value 固定为空,
                // 所以选完会弹回占位项, 同一条可以反复插入.
                h('select', {
                  style: STYLE.select,
                  value: '',
                  disabled: locked || PRESETS.length === 0,
                  'aria-label': t('presetPlaceholder'),
                  onChange: (event: ChangeEvent<HTMLSelectElement>) => {
                    const preset = PRESETS.find(item => item.id === event.target.value)
                    if (preset !== undefined) props.edit('text', preset.text)
                  },
                },
                h('option', { value: '' }, t('presetPlaceholder')),
                PRESETS.map(preset => h('option', { key: preset.id, value: preset.id }, preset.title)))),
              h('textarea', {
                id: TEXT_ID,
                style: STYLE.textarea,
                value: state.text.text,
                disabled: locked,
                spellCheck: false,
                onChange: (event: ChangeEvent<HTMLTextAreaElement>) => { props.edit('text', event.target.value) },
              }),
              h('p', { style: STYLE.hint }, t('textHint'))),
            h('div', { key: 'file', style: STYLE.row },
              h(SettingsValueField, {
                id: 'prompt-inject-file',
                label: t('file'),
                hint: t('fileHint'),
                text: state.file.text,
                overridden: state.file.overridden,
                invalid: state.file.invalid,
                ...field,
                onEdit: text => { props.edit('file', text) },
                onReset: () => { props.resetField('file') },
              })),
            h('div', { key: 'order', style: STYLE.row },
              h(SettingsValueField, {
                id: 'prompt-inject-order',
                label: t('order'),
                hint: t('orderHint'),
                text: state.order.text,
                overridden: state.order.overridden,
                invalid: state.order.invalid,
                numeric: true,
                ...field,
                onEdit: text => { props.edit('order', text) },
                onReset: () => { props.resetField('order') },
              })),
          ],
        },
      ))
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx: ClientContext): void {
        ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-prompt-inject: dictionaries')
        const form = new SettingsFormModel<PromptInjectSettings>(
          ctx.configForms.get<PromptInjectSettings>(ENTRY_ID),
          [
            // 布尔字段没有现成 spec: 草稿是文本, 解析回真正的布尔值.
            { field: 'enabled', format: value => String(value !== false), parse: text => ({ kind: 'set', value: text === 'true' }) },
            settingsTextField('text'),
            settingsTextField('file'),
            settingsNumberField('order'),
          ],
        )
        const store = form.bind(() => ({
          ...form.shell(),
          enabled: form.field('enabled'),
          text: form.field('text'),
          file: form.field('file'),
          order: form.field('order'),
        }))
        ctx.effect(() => () => { form.dispose() }, 'dsh-prompt-inject: settings form')
        // Host 没有组合这一条目时 (profile 里没启用本 bundle) 卡片不出现.
        ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject(
          'plugins.bundle.config',
          () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE_NAME,
            locale: LOCALE_NS,
            inject: () => ({ hooks: { promptInject: store }, ...form.actions() }),
          }, PromptInjectCard),
        )), 'dsh-prompt-inject: plugins page card')
      },
    }
  },
})
})()
