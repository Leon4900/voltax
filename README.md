# voltax

> Vue3 + Vite 项目脚手架 CLI，交互式选择 TypeScript / Vue Router / Pinia / ESLint / Tailwind CSS 等，一条命令生成开箱即用的工程。

仓库地址：https://github.com/Leon4900/voltax

## 安装

全局安装：

```bash
npm install -g voltax
```

或免安装直接使用：

```bash
npx voltax create my-app
```

## 使用

### 创建项目

```bash
# 交互式创建（会询问项目名）
voltax create

# 指定项目名（目录名即项目名）
voltax create my-app

# 在当前目录创建
voltax create .
```

`create` 是默认命令，可省略：

```bash
voltax my-app
```

创建过程中会依次询问：

- 项目框架（Vue）
- 是否使用 TypeScript / JavaScript
- 需要的功能：Vue Router、Pinia、ESLint、tailwindcss
- 需要的插件：unplugin-auto-import、unplugin-vue-components、vite-plugin-svg-icons

### 选项

| 选项 | 说明 |
| --- | --- |
| `-t, --template <NAME>` | 使用特定的模板（跳过框架选择） |
| `-o, --overwrite` | 目标目录非空时直接清空覆盖，不再询问 |
| `-i, --immediate` | 创建后自动安装依赖并启动 dev |
| `-v, --version` | 查看当前版本号 |
| `-h, --help` | 查看命令帮助 |

### 示例

```bash
# 用 vue 模板创建，目录非空时强制覆盖
voltax create my-app -t vue -o

# 创建后立即安装依赖并启动开发服务器
voltax create my-app -i
```

## 创建完成后

```bash
cd my-app
npm install
npm run dev
```

## 环境要求

- Node.js >= 18

## License

ISC © LYC
