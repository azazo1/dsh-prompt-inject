# dsh-prompt-inject

DeepSeek Harness Host 插件: 把一份你自己维护的文字块注入系统提示词, 每次组装时重新读取, 改完下一轮生效.

默认内容是一份**响应性规范**, 也就是工具调用之间的进度汇报 (改写自 Codex 的 `Preamble messages`): 第一次调用工具前说明目标与下一步, 之后每完成一个有意义的子步骤补一句进度, 每句一两句话. 装上它就能明显提高 agent message 的输出频率.

插件只有 `src/index.ts` (Host) 与 `src/client.ts` (客户端配置页) 两个源文件, 不注册服务, 不注册工具, 不做网络访问.

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

设置页 -> 插件 -> 本插件卡片进入详情页, 里面有四个控件:

- **启用注入**: 关掉后段落为空, 组装阶段直接丢掉, 文本本身保留;
- **注入的文字块**: 多行编辑器, 清空即回落为内置的响应性规范 (卡片上会给"已覆盖"与"恢复默认");
- **外部 Markdown 文件**: 填了路径就改读这个文件, 每次组装重新读取, 在编辑器里改完下一轮生效;
- **段落顺序**: 默认 100.

表单骨架是官方 `SettingsForm`, 单行文本与数字用官方 `SettingsValueField`, 开关用官方 `Switch`, 多行文本块自绘 textarea, 颜色与圆角全走 `--dsw-*` token. 草稿只活在页面里, 离开即丢弃, 只有保存才写进 profile 的 patch 层.

## 配置

配置表单按 profile 条目 id (`dsh-prompt-inject`) 寻址, 在 Settings 里改, 也可以在自己 profile 的 `cordis.patch.yml` 里按 id 覆盖:

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
| `text` | 内置的响应性规范 | 注入的文本, 可直接在表单里改 |
| `file` | `''` | 非空时改读这个 Markdown 文件 (支持 `~`), 优先于 `text` |

`enabled`, `text`, `file` 是 volatile 字段, 改完立刻生效; `order` 改完会重挂载插件, 段落按新顺序重新注册.

想让它更靠后, 可以给 `10250`, 也就是人设后缀 (10200) 之后, 对偏好类指令的结尾强调更强.

## 三个细节

- 段落以 `interpolate: false` 注册, 所以文本里的 `{{...}}` 原样保留, 不会被当成提示词变量而让组装失败.
- `file` 读不到时退回 `text` 并记一条 warn, 不静默丢内容.
- `enabled`, `text`, `file` 是 volatile 字段, 保存后立刻生效; `order` 改完会重挂载插件, 段落按新顺序重新注册.

## 开发

```shell
just install
just verify
```

两半都用 `tsc` 构建, 没有打包器: Client 顶层只做 `__ModuleLoader__.load`, 运行时值全部经 factory 注入的 `require` 从平台模块表取, 所以 `lib/client.js` 里不允许出现 `import`/`export`. 类型侧导入会被 `tsc` 抹掉, 但模块标记 `export {};` 会留下来, 构建脚本末尾把它删掉 (dsh 用普通 `<script>` 加载 client bundle, 留着它会直接语法报错).

`just verify` 里的 `scripts/check.mjs` 是产物入口自检: 在假浏览器里跑一遍 client 产物, 断言注册 id 与平台模块表; 再用假 ctx 调一次 Host 的 `apply`, 断言段落名, 顺序, 关闭时的空段落与文件读不到时的回退.
