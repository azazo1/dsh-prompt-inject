/**
 * Client 半区: 在本 bundle 的插件详情页上注册配置卡片.
 *
 * 这一半不打包. 顶层只做 `__ModuleLoader__.load`, 运行时值全部经 factory 注入的
 * `require` 从平台模块表取, 所以构建只是 `tsc`, 产物里不允许出现 import/export.
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

/** 包名, 同时是 loader registration id 与配置槽位的键. */
const PACKAGE_NAME = 'dsh-prompt-inject'
/** profile 条目 id, 配置表单按它寻址 (见 cordis.patch.yml). */
const ENTRY_ID = 'dsh-prompt-inject'
/** 文案命名空间, 与条目 id 同名便于对照. */
const LOCALE_NS = 'dsh-prompt-inject'
/** 多行文本控件的 id, 供 label 关联. */
const TEXT_ID = 'prompt-inject-text'

/** 卡片文案的键. */
type LocaleKey =
  | 'summary'
  | 'enabled' | 'enabledHint'
  | 'text' | 'textHint'
  | 'file' | 'fileHint'
  | 'order' | 'orderHint'
  | 'overridden' | 'reset' | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-prompt-inject 配置页的文案. */
    'dsh-prompt-inject': LocaleKey
  }
}

/** 中文文案. */
const zh: Record<LocaleKey, string> = {
  summary: '往系统提示词里注入一段你自己维护的文字块.',
  enabled: '启用注入',
  enabledHint: '关掉后段落为空, 组装阶段直接丢掉; 文本本身保留, 随时可以再打开.',
  text: '注入的文字块',
  textHint: '清空后回落为内置的响应性规范.',
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
  summary: 'Inject a text block you maintain yourself into the system prompt.',
  enabled: 'Enable the injection',
  enabledHint: 'Turning this off leaves the section empty and assembly drops it; the text stays for later.',
  text: 'Injected block',
  textHint: 'Clearing this falls back to the built-in responsiveness spec.',
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
  toggle: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '12px 0' },
  toggleText: { flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: '96px', resize: 'vertical', padding: '8px 12px', borderRadius: 'var(--dsw-radius-md)', border: '0.5px solid var(--dsw-alias-border-l4)', background: 'var(--dsw-alias-bg-layer-3)', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: '13px', lineHeight: 1.6 },
} as const

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

/** 卡片拿到的全部 props. */
type CardProps =
  PropsRuntime<'plugins.bundle.config'>
  & PropsLocale<'dsh-prompt-inject'>
  & InjectFace<CardFace>

declare global {
  interface Window {
    /** DSH Web 的懒加载模块表: 顶层注册本插件的 client 半区. */
    __ModuleLoader__: {
      load(entry: { id: string; factory: (require: (specifier: string) => unknown) => unknown }): void
    }
  }
}

window.__ModuleLoader__.load({
  id: PACKAGE_NAME,
  factory: (require) => {
    const React = require('react') as typeof import('react')
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives') as typeof import('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const { SettingsForm, SettingsFormModel, SettingsValueField, Switch, settingsNumberField, settingsTextField } = primitives

    /**
     * 渲染本 bundle 的配置页; bundle 配置槽只会要 `page`, 简介分支是为了稳妥.
     * @param props - 页面视图, 字典, 表单快照与动作.
     * @returns 简介文本或配置表单.
     */
    function PromptInjectCard(props: CardProps) {
      const { t } = props
      const state = props.usePromptInject(snapshot => snapshot)
      if (props.view === 'summary') return h('span', null, t('summary'))
      const locked = !state.writable
      const field = {
        overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('saveFailed'), disabled: locked,
      }
      return h(
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
                  : null),
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
      )
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
