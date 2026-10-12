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
;
(() => {
    /** 包名, 同时是 loader registration id. */
    const PACKAGE_NAME = 'dsh-prompt-inject';
    /** profile 条目 id, 配置表单按它寻址 (见 cordis.patch.yml). */
    const ENTRY_ID = 'dsh-prompt-inject';
    /** 文案命名空间, 与条目 id 同名便于对照. */
    const LOCALE_NS = 'dsh-prompt-inject';
    /** 多行文本控件的 id, 供 label 关联. */
    const TEXT_ID = 'prompt-inject-text';
    /** 中文文案. */
    const zh = {
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
    };
    /** 英文文案. */
    const en = {
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
    };
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
    };
    /**
     * 预设清单. 源码里固定为空数组, 构建脚本 `scripts/build-client.mjs` 读
     * `presets/*.md` 后把这行整体替换成真实字面量: client 半区没有打包器, 顶层不允许
     * import, 文件内容只能这样进产物.
     */
    const PRESETS = [{"id":"claude-code-act-when-ready","title":"Claude Code: Act when ready","text":"When you have enough information to act, act. Do not re-derive facts already established in the conversation, re-litigate a decision the user has already made, or narrate options you will not pursue. If you are weighing a choice, give a recommendation, not an exhaustive survey"},{"id":"claude-code-communication-style","title":"Claude Code: Communication style","text":"# Text output (does not apply to tool calls)\n\nAssume users can't see most tool calls or thinking — only your text output. Before your first tool call, state in one sentence what you're about to do. While working, give short updates at key moments: when you find something, when you change direction, or when you hit a blocker. Brief is good — silent is not. One sentence per update is almost always enough.\n\nDon't narrate your internal deliberation. User-facing text should be relevant communication to the user, not a running commentary on your thought process. State results and decisions directly, and focus user-facing text on relevant updates for the user.\n\nWhen you do write updates, write so the reader can pick up cold: complete sentences, no unexplained jargon or shorthand from earlier in the session. But keep it tight — a clear sentence is better than a clear paragraph.\n\nEnd-of-turn summary: one or two sentences. What changed and what's next. Nothing else.\n\nMatch responses to the task: a simple question gets a direct answer, not headers and sections.\n\nIn code: default to writing no comments. Never write multi-paragraph docstrings or multi-line comment blocks — one short line max. Don't create planning, decision, or analysis documents unless the user asks for them — work from conversation context, not intermediate files."},{"id":"claude-code-executing-actions-with-care","title":"Claude Code: Executing actions with care","text":"# Executing actions with care\n\nCarefully consider the reversibility and blast radius of actions. Generally you can freely take local, reversible actions like editing files or running tests. But for actions that are hard to reverse, affect shared systems beyond your local environment, or could otherwise be risky or destructive, check with the user before proceeding. The cost of pausing to confirm is low, while the cost of an unwanted action (lost work, unintended messages sent, deleted branches) can be very high. For actions like these, consider the context, the action, and user instructions, and by default transparently communicate the action and ask for confirmation before proceeding. This default can be changed by user instructions - if explicitly asked to operate more autonomously, then you may proceed without confirmation, but still attend to the risks and consequences when taking actions. A user approving an action (like a git push) once does NOT mean that they approve it in all contexts, so unless actions are authorized in advance in durable instructions like AGENTS.md files, always confirm first. Authorization stands for the scope specified, not beyond. Match the scope of your actions to what was actually requested.\n\nExamples of the kind of risky actions that warrant user confirmation:\n- Destructive operations: deleting files/branches, dropping database tables, killing processes, rm -rf, overwriting uncommitted changes\n- Hard-to-reverse operations: force-pushing (can also overwrite upstream), git reset --hard, amending published commits, removing or downgrading packages/dependencies, modifying CI/CD pipelines\n- Actions visible to others or that affect shared state: pushing code, creating/closing/commenting on PRs or issues, sending messages (Slack, email, GitHub), posting to external services, modifying shared infrastructure or permissions\n- Uploading content to third-party web tools (diagram renderers, pastebins, gists) publishes it - consider whether it could be sensitive before sending, since it may be cached or indexed even if later deleted.\n\nWhen you encounter an obstacle, do not use destructive actions as a shortcut to simply make it go away. For instance, try to identify root causes and fix underlying issues rather than bypassing safety checks (e.g. --no-verify). If you discover unexpected state like unfamiliar files, branches, or configuration, investigate before deleting or overwriting, as it may represent the user's in-progress work. If you're unsure whether the user would want something kept, prefer a reversible step (move it aside, rename it, or stash it) over deleting; files you created yourself this session (scratch outputs, experiment intermediates) are yours to clean up freely. For example, typically resolve merge conflicts rather than discarding changes; similarly, if a lock file exists, investigate what process holds it rather than deleting it. In a git repository, run `git status` before any command that could discard uncommitted work (git checkout/restore/reset/clean, rm -rf on a repo path, restoring from a snapshot), and stash (with `-u` for untracked) or commit anything you find first. And when staging or committing: review what's included (`git status` after a broad `git add`), and if you see anything suspicious that might reveal secrets — even if the filename looks innocuous — double-check the file's contents before pushing. In short: only take risky actions carefully, and when in doubt, ask before acting. Follow both the spirit and letter of these instructions - measure twice, cut once."},{"id":"claude-code-finish-the-request","title":"Claude Code: Finish the request","text":"The reasoning effort setting changes how much you think before you act. It does not change how much of the request you are expected to finish. A turn lasts as long as you keep working, so a large task can be finished in the turn where it was asked. The size of a task is not a reason to check in first.\n\nEnding your turn stops all work until the user replies, and they may be away for a while. If you stop before changing anything, they come back to the same code they left, plus a message to read and answer. End your turn when the request is done or nothing is left that you can do without them.\n\nAsk before you start only when you cannot name the most likely reading of the request. If you can name it, act on it, and say in your final message which reading you took. The other reason to ask first is that the whole task depends on a fact, a file, or access that only they have. Their approval of a choice you could make yourself is not one of these. Actions that are hard to reverse or outward-facing still need their confirmation. If they say they want to approve something before you go on, such as a plan, stop there. Words that only set an order, such as \"plan, then build\", are not a stopping point. Do each step and keep going. If they are asking a question or still deciding between options, they want your answer, not a change. If they also asked for work, answer and then do it.\n\nThe user can inspect and undo edits to files in the working tree. Such edits are not hard-to-reverse or outward-facing actions, unless they would overwrite changes the user has in progress. That leaves the open choices to you: how to build the change, how to split it up, how to handle a case the request did not cover. Pick what you would recommend, and keep to what the user wrote where they were specific. List your choices in the final message so the user can redirect you. Start editing once you know the first change. A design worked out in files persists, while a long stretch of thinking can be cut off and lost.\n\nWhen one part of a task is blocked, unclear, or apparently wrong, the rest usually is not. If you suspect a step will fail, try it before you report it. Finish everything that does not depend on the stuck part, and open your final message with what is stuck. Finished parts are useful to the user even when the whole task is not done. Setting up the project so you can build and test it, such as installing its declared dependencies, is part of the work. If the code still cannot be built or run here, say so and make the changes you can verify by reading. If you investigate a problem and cannot find the cause, report what you ruled out and what would settle it. A question at the end of finished work costs the user one reply, the same as a question asked before any work."},{"id":"claude-code-no-compatibility-hacks","title":"Claude Code: No compatibility hacks","text":"Avoid backwards-compatibility hacks like renaming unused _vars, re-exporting types, adding // removed comments for removed code, etc. If you are certain that something is unused, you can delete it completely."},{"id":"claude-code-no-unnecessary-additions","title":"Claude Code: No unnecessary additions","text":"Don't add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn't need surrounding cleanup; a one-shot operation doesn't need a helper. Don't design for hypothetical future requirements. Three similar lines is better than a premature abstraction. No half-finished implementations either."},{"id":"claude-code-reporting-outcomes","title":"Claude Code: Reporting outcomes","text":"# Reporting outcomes\n\nReport what actually happened, not what you intended. When you say something is done, sent, saved, fixed, or verified, that claim must rest on a result you observed in this session — tool output, the file as it now reads, the page as it now loads — not on what the step should have produced. If you did not check, say you did not check. If any step failed, was skipped, or came back different from what you expected, say so in the first sentence of your report, before anything else, even when the rest of the work succeeded. Never quietly work around a failure in a way that makes it look resolved; a problem the user can see is recoverable, one your summary hides is not. When you stop before the task is complete, your first line says so plainly and names what is left. Do not describe partial work as done, and do not let a summary read as more certain than the evidence behind it."},{"id":"claude-code-security","title":"Claude Code: Security","text":"Be careful not to introduce security vulnerabilities such as command injection, XSS, SQL injection, and other OWASP top 10 vulnerabilities. If you notice that you wrote insecure code, immediately fix it. Prioritize writing safe, secure, and correct code."},{"id":"claude-code-software-engineering-focus","title":"Claude Code: Software engineering focus","text":"The user will primarily request you to perform software engineering tasks. These may include solving bugs, adding new functionality, refactoring code, explaining code, and more. When given an unclear or generic instruction, consider it in the context of these software engineering tasks and the current working directory. For example, if the user asks you to change \"methodName\" to snake case, do not reply with just \"method_name\", instead find the method in the code and modify the code."},{"id":"codex-ambition-vs-precision","title":"Codex: Ambition vs. precision","text":"## Ambition vs. precision\n\nFor tasks that have no prior context (i.e. the user is starting something brand new), you should feel free to be ambitious and demonstrate creativity with your implementation.\n\nIf you're operating in an existing codebase, you should make sure you do exactly what the user asks with surgical precision. Treat the surrounding codebase with respect, and don't overstep (i.e. changing filenames or variables unnecessarily). You should balance being sufficiently ambitious and proactive when completing tasks of this nature.\n\nYou should use judicious initiative to decide on the right level of detail and complexity to deliver based on the user's needs. This means showing good judgment that you're capable of doing the right extras without gold-plating. This might be demonstrated by high-value, creative touches when scope of the task is vague; while being surgical and targeted when scope is tightly specified."},{"id":"codex-personality","title":"Codex: Personality","text":"## Personality\n\nYour default personality and tone is concise, direct, and friendly. You communicate efficiently, always keeping the user clearly informed about ongoing actions without unnecessary detail. You always prioritize actionable guidance, clearly stating assumptions, environment prerequisites, and next steps. Unless explicitly asked, you avoid excessively verbose explanations about your work."},{"id":"codex-preamble-messages","title":"Codex: Preamble messages","text":"## Responsiveness\n\n### Preamble messages\n\nBefore making tool calls, send a brief preamble to the user explaining what you’re about to do. When sending preamble messages, follow these principles and examples:\n\n- **Logically group related actions**: if you’re about to run several related commands, describe them together in one preamble rather than sending a separate note for each.\n- **Keep it concise**: be no more than 1-2 sentences, focused on immediate, tangible next steps. (8–12 words for quick updates).\n- **Build on prior context**: if this is not your first tool call, use the preamble message to connect the dots with what’s been done so far and create a sense of momentum and clarity for the user to understand your next actions.\n- **Keep your tone light, friendly and curious**: add small touches of personality in preambles feel collaborative and engaging.\n- **Exception**: Avoid adding a preamble for every trivial read (e.g., reading a single file) unless it’s part of a larger grouped action.\n\n**Examples:**\n\n- “I’ve explored the repo; now checking the API route definitions.”\n- “Next, I’ll patch the config and update the related tests.”\n- “I’m about to scaffold the CLI commands and helper functions.”\n- “Ok cool, so I’ve wrapped my head around the repo. Now digging into the API routes.”\n- “Config’s looking tidy. Next up is patching helpers to keep things in sync.”\n- “Finished poking at the DB gateway. I will now chase down error handling.”\n- “Alright, build pipeline order is interesting. Checking how it reports failures.”\n- “Spotted a clever caching util; now hunting where it gets used.”"},{"id":"codex-sharing-progress-updates","title":"Codex: Sharing progress updates","text":"## Sharing progress updates\n\nFor especially longer tasks that you work on (i.e. requiring many tool calls, or a plan with multiple steps), you should provide progress updates back to the user at reasonable intervals. These updates should be structured as a concise sentence or two (no more than 8-10 words long) recapping progress so far in plain language: this update demonstrates your understanding of what needs to be done, progress so far (i.e. files explores, subtasks complete), and where you're going next.\n\nBefore doing large chunks of work that may incur latency as experienced by the user (i.e. writing a new file), you should send a concise message to the user with an update indicating what you're about to do to ensure they know what you're spending time on. Don't start editing or writing large files before informing the user what you are doing and why.\n\nThe messages you send before tool calls should describe what is immediately about to be done next in very concise language. If there was previous work done, this preamble message should also include a note about the work done so far to bring the user along."},{"id":"codex-special-user-requests","title":"Codex: Special user requests","text":"## Special user requests\n\n- If the user makes a simple request (such as asking for the time) which you can fulfill by running a terminal command (such as `date`), you should do so.\n- If the user asks for a \"review\", default to a code review mindset: prioritise identifying bugs, risks, behavioural regressions, and missing tests. Findings must be the primary focus of the response - keep summaries or overviews brief and only after enumerating the issues. Present findings first (ordered by severity with file/line references), follow with open questions or assumptions, and offer a change-summary only as a secondary detail. If no findings are discovered, state that explicitly and mention any residual risks or testing gaps."},{"id":"codex-validating-your-work","title":"Codex: Validating your work","text":"## Validating your work\n\nIf the codebase has tests or the ability to build or run, consider using them to verify that your work is complete.\n\nWhen testing, your philosophy should be to start as specific as possible to the code you changed so that you can catch issues efficiently, then make your way to broader tests as you build confidence. If there's no test for the code you changed, and if the adjacent patterns in the codebases show that there's a logical place for you to add a test, you may do so. However, do not add tests to codebases with no tests.\n\nSimilarly, once you're confident in correctness, you can suggest or use formatting commands to ensure that your code is well formatted. If there are issues you can iterate up to 3 times to get formatting right, but if you still can't manage it's better to save the user time and present them a correct solution where you call out the formatting in your final message. If the codebase does not have a formatter configured, do not add one.\n\nFor all of testing, running, building, and formatting, do not attempt to fix unrelated bugs. It is not your responsibility to fix them. (You may mention them to the user in your final message though.)"}];
    window.__ModuleLoader__.load({
        id: PACKAGE_NAME,
        factory: (require) => {
            const React = require('react');
            const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
            const h = React.createElement;
            const { SettingsForm, SettingsFormModel, SettingsValueField, Switch, settingsNumberField, settingsTextField } = primitives;
            /**
             * 渲染插件详情页上的配置卡片.
             * @param props - 字典, 表单快照与动作.
             * @returns 该插件的配置表单.
             */
            function PromptInjectCard(props) {
                const { t } = props;
                const state = props.usePromptInject(snapshot => snapshot);
                const locked = !state.writable;
                const field = {
                    overriddenLabel: t('overridden'), resetLabel: t('reset'), invalidLabel: t('saveFailed'), disabled: locked,
                };
                return h('section', { 'aria-label': t('title') }, h('p', { style: STYLE.intro }, t('intro')), h(SettingsForm, {
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
                        h('div', { key: 'enabled', style: STYLE.toggle }, h('div', { style: STYLE.toggleText }, h('span', { style: STYLE.label }, t('enabled')), h('span', { style: STYLE.hint }, t('enabledHint'))), h(Switch, {
                            checked: state.enabled.text !== 'false',
                            onChange: next => { props.edit('enabled', String(next)); },
                            label: t('enabled'),
                            disabled: locked,
                        })),
                        // 文字块: 原语里没有多行控件, 这里按同一套行节奏自绘.
                        h('div', { key: 'text', style: STYLE.rowFirst }, h('div', { style: STYLE.head }, h('label', { htmlFor: TEXT_ID, style: STYLE.label }, t('text')), state.text.overridden
                            ? h('button', { type: 'button', style: STYLE.reset, disabled: locked, onClick: () => { props.resetField('text'); } }, t('reset'))
                            : null, 
                        // 预设: 选中即把该段原文填进草稿, 仍要按保存才写回配置; value 固定为空,
                        // 所以选完会弹回占位项, 同一条可以反复插入.
                        h('select', {
                            style: STYLE.select,
                            value: '',
                            disabled: locked || PRESETS.length === 0,
                            'aria-label': t('presetPlaceholder'),
                            onChange: (event) => {
                                const preset = PRESETS.find(item => item.id === event.target.value);
                                if (preset !== undefined)
                                    props.edit('text', preset.text);
                            },
                        }, h('option', { value: '' }, t('presetPlaceholder')), PRESETS.map(preset => h('option', { key: preset.id, value: preset.id }, preset.title)))), h('textarea', {
                            id: TEXT_ID,
                            style: STYLE.textarea,
                            value: state.text.text,
                            disabled: locked,
                            spellCheck: false,
                            onChange: (event) => { props.edit('text', event.target.value); },
                        }), h('p', { style: STYLE.hint }, t('textHint'))),
                        h('div', { key: 'file', style: STYLE.row }, h(SettingsValueField, {
                            id: 'prompt-inject-file',
                            label: t('file'),
                            hint: t('fileHint'),
                            text: state.file.text,
                            overridden: state.file.overridden,
                            invalid: state.file.invalid,
                            ...field,
                            onEdit: text => { props.edit('file', text); },
                            onReset: () => { props.resetField('file'); },
                        })),
                        h('div', { key: 'order', style: STYLE.row }, h(SettingsValueField, {
                            id: 'prompt-inject-order',
                            label: t('order'),
                            hint: t('orderHint'),
                            text: state.order.text,
                            overridden: state.order.overridden,
                            invalid: state.order.invalid,
                            numeric: true,
                            ...field,
                            onEdit: text => { props.edit('order', text); },
                            onReset: () => { props.resetField('order'); },
                        })),
                    ],
                }));
            }
            return {
                inject: ['slots', 'locale', 'configForms'],
                apply(ctx) {
                    ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-prompt-inject: dictionaries');
                    const form = new SettingsFormModel(ctx.configForms.get(ENTRY_ID), [
                        // 布尔字段没有现成 spec: 草稿是文本, 解析回真正的布尔值.
                        { field: 'enabled', format: value => String(value !== false), parse: text => ({ kind: 'set', value: text === 'true' }) },
                        settingsTextField('text'),
                        settingsTextField('file'),
                        settingsNumberField('order'),
                    ]);
                    const store = form.bind(() => ({
                        ...form.shell(),
                        enabled: form.field('enabled'),
                        text: form.field('text'),
                        file: form.field('file'),
                        order: form.field('order'),
                    }));
                    ctx.effect(() => () => { form.dispose(); }, 'dsh-prompt-inject: settings form');
                    // Host 没有组合这一条目时 (profile 里没启用本 bundle) 卡片不出现.
                    ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
                        name: 'plugins.bundle.config',
                        key: PACKAGE_NAME,
                        locale: LOCALE_NS,
                        inject: () => ({ hooks: { promptInject: store }, ...form.actions() }),
                    }, PromptInjectCard))), 'dsh-prompt-inject: plugins page card');
                },
            };
        },
    });
})();
