/**
 * Client 半区: 在本 bundle 的插件详情页上注册配置卡片.
 *
 * 落点固定为 `plugins.bundle.config` (keyed slot, 键等于包名), 与官方及其它外部插件的
 * 做法一致: 卡片渲染在 设置 -> 插件 -> 本插件 的页面上, 描述与"包含的组件"之间.
 * 不占用 `settings.section`: 那是官方功能插件给自己开的独立设置页 (账号 / 预设 / 聊天),
 * 外部插件的配置不该在那里另起一页.
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
/** 卡片文案的键. */
type LocaleKey = 'title' | 'intro' | 'enabled' | 'enabledHint' | 'text' | 'textHint' | 'textPlaceholder' | 'presetPlaceholder' | 'file' | 'fileHint' | 'order' | 'orderHint' | 'overridden' | 'reset' | 'unavailable' | 'readOnly' | 'saveFailed' | 'save' | 'saving';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-prompt-inject 配置页的文案. */
        'dsh-prompt-inject': LocaleKey;
    }
}
declare global {
    interface Window {
        /** DSH Web 的懒加载模块表: 顶层注册本插件的 client 半区. */
        __ModuleLoader__: {
            load(entry: {
                id: string;
                factory: (require: (specifier: string) => unknown) => unknown;
            }): void;
        };
    }
}
export {};
