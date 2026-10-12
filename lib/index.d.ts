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
/** 默认块: 工具调用之间的进度汇报, 改写自 Codex 的 Preamble messages 规范. */
export declare const DEFAULT_TEXT = "# \u54CD\u5E94\u6027\n\n\u4F60\u4F1A\u6709\u6210\u6BB5\u7684\u65F6\u95F4\u5728\u8C03\u7528\u5DE5\u5177, \u8BA9\u7528\u6237\u5728\u4F60\u5DE5\u4F5C\u7684\u8FC7\u7A0B\u4E2D\u6301\u7EED\u83B7\u5F97\u66F4\u65B0\u662F\u81F3\u5173\u91CD\u8981\u7684.\n\n- \u7B2C\u4E00\u6B21\u5DE5\u5177\u8C03\u7528\u4E4B\u524D, \u7528\u4E00\u4E24\u53E5\u8BDD\u7ED9\u51FA\u76EE\u6807, \u7EA6\u675F\u4E0E\u4E0B\u4E00\u6B65.\n- \u4E4B\u540E\u6BCF\u5B8C\u6210\u4E00\u4E2A\u6709\u610F\u4E49\u7684\u5B50\u6B65\u9AA4, \u5728\u4E0B\u4E00\u6B21\u5DE5\u5177\u8C03\u7528\u524D\u8865\u4E00\u53E5\u8FDB\u5EA6: \u5DF2\u7ECF\u5F04\u6E05\u4E86\u4EC0\u4E48, \u63A5\u4E0B\u6765\u505A\u4EC0\u4E48.\n- \u6BCF\u53E5\u66F4\u65B0\u63A7\u5236\u5728\u4E00\u4E24\u53E5\u8BDD\u4EE5\u5185, 8 \u5230 12 \u4E2A\u8BCD\u5C31\u591F; \u53EA\u6709\u521D\u59CB\u8BA1\u5212, \u8BA1\u5212\u53D8\u66F4\u548C\u6700\u7EC8\u603B\u7ED3\u53EF\u4EE5\u66F4\u957F.\n- \u6CA1\u6709\u65B0\u8FDB\u5C55\u65F6\u4E0D\u8981\u4E3A\u4E86\u51D1\u6570\u800C\u53D1\u8A00, \u5355\u72EC\u4E00\u6B21\u7410\u788E\u8BFB\u53D6\u4E5F\u4E0D\u5FC5\u52A0\u524D\u8A00.\n- \u63A2\u7D22\u4E2D\u53D1\u73B0\u7684\u91CD\u8981\u4FE1\u606F, \u4F1A\u5F71\u54CD\u7528\u6237\u7406\u89E3\u73B0\u72B6\u7684\u90A3\u79CD, \u660E\u786E\u8BB2\u51FA\u6765.\n- \u6539\u53D8\u4E86\u5148\u524D\u7684\u8BA1\u5212, \u5C31\u5728\u4E0B\u4E00\u53E5\u66F4\u65B0\u6216\u6700\u7EC8\u603B\u7ED3\u91CC\u8BF4\u660E\u539F\u56E0.\n- \u4E0D\u8981\u5728\u66F4\u65B0\u91CC\u590D\u8FF0\u5DE5\u5177\u8F93\u51FA\u6216\u5927\u6BB5\u4EE3\u7801, \u7528\u4E00\u53E5\u7ED3\u8BBA\u5E26\u8FC7.";
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
    /** 注入的文本; `file` 非空时它只在文件读不到时作为退路. */
    text: Volatile<string>;
    /** 可选的外部 Markdown 文件路径, 支持 `~` 前缀; 非空时优先于 `text`. */
    file: Volatile<string>;
}
export declare const Config: z<ConfigInput, Config>;
export declare function apply(ctx: Context, config: Config): void;
export {};
