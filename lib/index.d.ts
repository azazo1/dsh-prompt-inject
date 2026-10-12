/**
 * 把用户维护的文字块注入 DSH 系统提示词, 每次组装时重新读取, 改完下一轮生效.
 *
 * 1. 默认块 (`text`) 是工具调用之间的进度汇报规范, 也就是本插件存在的理由;
 * 2. `file` 非空时改读那个 Markdown 文件, 于是可以在编辑器里维护提示词;
 * 3. `enabled` 关掉或文本读空时返回空串, 组装阶段会把空段丢掉, 不留痕迹;
 * 4. `order` 不是 volatile 字段, 改它会重挂载插件, 段落按新顺序重新注册.
 *
 * 段落以 `interpolate: false` 注册, 所以块里的 `{{...}}` 原样保留, 不会被当成
 * 提示词变量而让组装失败. 文件读不到时退回 `text`, 不静默丢内容.
 *
 * @module dsh-prompt-inject
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "dsh-prompt-inject";
/** 段落名带命名空间, 避免与第一方段落或其它插件相撞. */
export declare const SECTION_NAME = "prompt-inject:main";
/** 配置在 profile patch 与配置表单里的输入形态. */
interface ConfigInput {
    enabled?: boolean;
    order?: number;
    text?: string;
    file?: string;
}
/** 解析后的配置: volatile 字段在这里是稳定引用, 用 `.get()` 读最新值. */
export interface Config {
    /** 是否注入; 关掉后段落为空, 组装时被丢掉. */
    enabled: Volatile<boolean>;
    /**
     * 段落顺序. 默认 100: 紧跟部署人设前缀 (0), 在第一方工具引导 (500 起) 之前.
     * 想让它更靠后可以给 10250, 也就是人设后缀 (10200) 之后.
     */
    order: number;
    /** 注入的文本, 默认空; `file` 非空时它只在文件读不到时作为退路. */
    text: Volatile<string>;
    /** 可选的外部 Markdown 文件路径, 支持 `~` 前缀; 非空时优先于 `text`. */
    file: Volatile<string>;
}
export declare const Config: z<ConfigInput, Config>;
export declare function apply(ctx: Context, config: Config): void;
export {};
