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
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';
import z from '@deepseek-ai/schemastery';
/** 默认块: 工具调用之间的进度汇报, 改写自 Codex 的 Preamble messages 规范. */
export const DEFAULT_TEXT = `# 响应性

你会有成段的时间在调用工具, 让用户在你工作的过程中持续获得更新是至关重要的.

- 第一次工具调用之前, 用一两句话给出目标, 约束与下一步.
- 之后每完成一个有意义的子步骤, 在下一次工具调用前补一句进度: 已经弄清了什么, 接下来做什么.
- 每句更新控制在一两句话以内, 8 到 12 个词就够; 只有初始计划, 计划变更和最终总结可以更长.
- 没有新进展时不要为了凑数而发言, 单独一次琐碎读取也不必加前言.
- 探索中发现的重要信息, 会影响用户理解现状的那种, 明确讲出来.
- 改变了先前的计划, 就在下一句更新或最终总结里说明原因.
- 不要在更新里复述工具输出或大段代码, 用一句结论带过.`;
export const name = 'dsh-prompt-inject';
/** 段落名带命名空间, 避免与第一方段落或其它插件相撞. */
export const SECTION_NAME = 'prompt-inject:main';
export const Config = z.object({
    enabled: z.boolean().default(true).volatile(),
    order: z.number().default(100),
    text: z.string().default(DEFAULT_TEXT).volatile(),
    file: z.string().default('').volatile(),
});
export function apply(ctx, config) {
    /*
     * systemPrompt 是可选的: 没有提示词服务时插件什么也不做, 而不是让加载失败.
     * 文本闭包每次组装都重读配置与文件, 所以这三项都能热改.
     */
    ctx.inject(['systemPrompt'], (promptCtx) => {
        const systemPrompt = promptCtx.systemPrompt;
        if (systemPrompt === undefined)
            return;
        systemPrompt.section({
            name: SECTION_NAME,
            order: config.order,
            interpolate: false,
            text: () => readBlock(ctx, config),
        });
    });
}
/** 当前该注入的文本; 关掉时返回空串. */
function readBlock(ctx, config) {
    if (!config.enabled.get())
        return '';
    const file = config.file.get().trim();
    if (file === '')
        return config.text.get().trim();
    const path = resolvePath(file);
    try {
        return readFileSync(path, 'utf8').trim();
    }
    catch (error) {
        ctx.logger.warn('prompt-inject: 读不到 %s, 退回 text 字段: %o', path, error);
        return config.text.get().trim();
    }
}
/** 展开 `~` 与相对路径; 相对路径按进程工作目录解析. */
function resolvePath(path) {
    if (path === '~')
        return homedir();
    if (path.startsWith('~/'))
        return resolve(homedir(), path.slice(2));
    return isAbsolute(path) ? path : resolve(process.cwd(), path);
}
