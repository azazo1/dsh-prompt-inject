[private]
default:
    @just --list

# 安装项目依赖.
install:
    pnpm install

# 执行 TypeScript 类型检查, 不生成文件.
typecheck:
    pnpm run typecheck

# 编译 Host 与 Client 到 lib/.
build:
    pnpm run build

# 类型检查, 构建, 产物入口自检与打包预览.
verify:
    just typecheck
    just build
    node scripts/check.mjs
    pnpm pack --dry-run
