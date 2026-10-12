# dsh-prompt-inject

DeepSeek Harness 插件: 把一份你自己维护的文字块注入系统提示词, 每次组装时重新读取, 改完下一轮生效.

**默认不注入任何内容**: 文字块留空时段落为空, 组装阶段直接丢掉. 想用时在插件页的配置卡片里从预设里挑一段插入, 也可以直接自己写.

插件只有 `src/index.ts` (Host) 与 `src/client.ts` (设置页) 两个源文件, 不注册服务, 不注册工具, 不做网络访问.

## 安装

在插件目录:

```shell
dsh plugin --profile web add "link:$(pwd)"
```

装完重启 `dsh web`. 卸载:

```shell
dsh plugin --profile web remove dsh-prompt-inject
```

## 配置页面

设置 -> 插件 -> `dsh-prompt-inject` 卡片, 页面上的配置区里有四个控件:

- **启用注入**: 关掉后段落为空, 组装阶段直接丢掉, 文本本身保留, 随时可以再打开;
- **注入的文字块**: 多行编辑器, 右侧的下拉是预设, 选中即把该段原文填进草稿 (仍要按保存才写回);
- **外部 Markdown 文件**: 填了路径就改读这个文件, 每次组装重新读取, 在编辑器里改完下一轮生效;
- **段落顺序**: 默认 100.

## 预设

预设放在 [presets/](presets), **一个文件一条**, front matter 给标题与来源 URL, 正文是逐字保留的原文 (包括原文里的弯引号与破折号). 想加一条就丢一个 `.md` 进去再重新构建, 构建脚本会把它们一起注入 client 产物.

当前 15 条:

- Codex: `Personality`, `Preamble messages`, `Sharing progress updates`, `Validating your work`, `Ambition vs. precision`, `Special user requests`
- Claude Code: `Communication style`, `Act when ready`, `Finish the request`, `Executing actions with care`, `Reporting outcomes`, `Software engineering focus`, `No unnecessary additions`, `No compatibility hacks`, `Security`

来源: [openai/codex](https://github.com/openai/codex) 的 `codex-rs/protocol/src/prompts/base_instructions/default.md` 与 `codex-rs/core/gpt_5_codex_prompt.md`; Claude Code 部分取自社区整理的 [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts), 每条预设的 front matter 里都写了具体文件。

不必全用: 挑中意的插进去, 拼成一份正合自己口味的文字块即可.

### 两条取舍

- **只做必要的名称适配**: 原文提到别的 harness 的专名时改成 dsh 的说法, 比如持久指令文件写成 AGENTS.md, 读单个文件的例子不用 `cat`. 每条改动都在该文件的 front matter `note` 里写明.
- **不搬与 dsh 内置系统提示词重复或冲突的内容**: Codex 的 `rg` 偏好与 dsh 的 grep / glob 工具相冲; Codex 的 Plan tool 与 Claude Code 的 Task management 讲的是怎么用待办工具, 而 dsh 的 `todo_write` 工具说明里已经写了 "Add one todo per concrete step before you start" 与 "Mark each todo `completed` as soon as it is done". 这三条没有保留.

## 配置

配置表单按 profile 条目 id (`dsh-prompt-inject`) 寻址, 在插件页的配置卡片里改, 也可以在自己 profile 的 `cordis.patch.yml` 里按 id 覆盖:

```yaml
- id: dsh-prompt-inject
  config:
    order: 400
    file: ~/notes/agent-style.md
```

| 字段 | 默认值 | 说明 |
|---|---|---|
| `enabled` | `true` | 关掉后注入空段落, 组装阶段直接丢掉 |
| `order` | `100` | 段落顺序; 100 紧跟人设前缀 (0), 在第一方工具引导 (500 起) 之前 |
| `text` | `''` | 注入的文本, 默认空; 在配置卡片里插入预设或自己写 |
| `file` | `''` | 非空时改读这个 Markdown 文件 (支持 `~`), 优先于 `text` |

`enabled`, `text`, `file` 是 volatile 字段, 保存后立刻生效; `order` 改完会重挂载插件, 段落按新顺序重新注册.

想让它更靠后, 可以给 `10250`, 也就是人设后缀 (10200) 之后, 对偏好类指令的结尾强调更强.

## 三个细节

- 段落以 `interpolate: false` 注册, 所以文本里的 `{{...}}` 原样保留, 不会被当成提示词变量而让组装失败.
- `file` 读不到时退回 `text` 并记一条 warn, 不静默丢内容.
- 文字块与文件都为空时注入空段落, 不留任何痕迹.

## 开发

```shell
just install
just verify
```
