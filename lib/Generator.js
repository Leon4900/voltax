const fs = require('fs-extra')
const path = require('path')
const ejs = require('ejs')
const { execSync, spawn } = require('child_process')
const ora = require('ora')
const logger = require('./utils/logger')
const { resolveVersions, FALLBACK } = require('./utils/versions')

// 始终跳过的目录/文件（无论配置如何，都不应进入生成的项目）
const IGNORE = new Set(['node_modules', 'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'])

class Generator {
    /**
     * @param {string} projectName 项目名（写入 package.json 的 name）
     * @param {string} targetDir   目标目录绝对路径
     * @param {object} config      { template, variant, features, plugins, immediate }
     */
    constructor(projectName, targetDir, config = {}) {
        this.projectName = projectName
        this.targetDir = targetDir
        this.config = config
        this.templateDir = path.resolve(__dirname, '..', 'templates', config.template === 'vue' ? 'vue-ts' : config.template)

        const features = config.features || []
        const plugins = config.plugins || []

        // 把数组配置归一化为布尔 flags，供模板与裁剪判断使用
        this.flags = {
            router: features.includes('Vue Router'),
            pinia: features.includes('Pinia'),
            eslint: features.includes('ESLint'),
            tailwind: features.includes('tailwindcss'),
            autoImport: plugins.includes('unplugin-auto-import'),
            components: plugins.includes('unplugin-vue-components'),
            svgIcons: plugins.includes('vite-plugin-svg-icons'),
        }

        // EJS 渲染时注入的数据
        this.data = {
            projectName,
            variant: config.variant,
            // 当前运行的 Node 主版本，写入 .nvmrc
            nodeVersion: process.versions.node.split('.')[0],
            // 解析后的版本表（在 generate() 中填充）
            versions: {},
            // 模板取版本的辅助函数：优先用解析结果，回退到兜底版本
            v: (name) => (this.data.versions && this.data.versions[name]) || FALLBACK[name] || 'latest',
            ...this.flags,
        }
    }

    /**
     * 根据启用的功能/插件，列出本次生成实际需要的依赖包名
     * @returns {string[]}
     */
    requiredPackages() {
        const f = this.flags
        const names = [
            // 基础依赖（始终需要）
            'vue',
            '@vitejs/plugin-vue',
            '@vue/tsconfig',
            '@types/node',
            'typescript',
            'vue-tsc',
            'vite',
        ]
        if (f.router) names.push('vue-router')
        if (f.pinia) names.push('pinia', 'pinia-plugin-persistedstate')
        if (f.tailwind) names.push('tailwindcss', '@tailwindcss/vite')
        if (f.autoImport) names.push('unplugin-auto-import')
        if (f.components) names.push('unplugin-vue-components')
        if (f.svgIcons) names.push('vite-plugin-svg-icons', 'fast-glob')
        return names
    }

    /**
     * 查询所需依赖的最新版本并写入 this.data.versions，供模板渲染使用
     */
    async resolveDependencyVersions() {
        // --no-latest：跳过联网，直接用兜底版本（v() 会回退到 FALLBACK）
        if (this.config.latest === false) {
            logger.info('已跳过最新版本检查，使用内置兜底版本')
            this.data.versions = {}
            return
        }

        const spinner = ora('正在检查依赖最新版本...').start()
        try {
            this.data.versions = await resolveVersions(this.requiredPackages())
            spinner.succeed('依赖版本检查完成')
        } catch (err) {
            spinner.warn('依赖版本检查失败，将使用兜底版本')
            this.data.versions = {}
        }
    }

    /**
     * 判断某个模板内的相对路径是否应当因配置未启用而跳过
     * @param {string} relPath 相对 templateDir 的 POSIX 风格路径
     */
    shouldSkip(relPath) {
        const f = this.flags
        const conditionalPaths = [
            { on: f.router, paths: ['src/router'] },
            { on: f.pinia, paths: ['src/store'] },
            { on: f.autoImport, paths: ['src/types/auto-imports.d.ts'] },
            { on: f.components, paths: ['src/types/components.d.ts'] },
            { on: f.svgIcons, paths: ['src/components/SvgIcon.vue', 'src/assets/icons'] },
        ]
        for (const { on, paths } of conditionalPaths) {
            if (on) continue
            for (const p of paths) {
                if (relPath === p || relPath.startsWith(p + '/')) return true
            }
        }
        return false
    }

    /**
     * 递归处理模板目录
     * @param {string} dir     当前绝对目录
     * @param {string} relBase 相对 templateDir 的路径
     */
    async walk(dir, relBase = '') {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
            if (IGNORE.has(entry.name)) continue

            const rel = relBase ? `${relBase}/${entry.name}` : entry.name
            if (this.shouldSkip(rel)) continue

            const srcPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
                await this.walk(srcPath, rel)
                continue
            }

            if (entry.name.endsWith('.ejs')) {
                // EJS 模板：渲染后写入，去掉 .ejs 后缀
                const tpl = await fs.readFile(srcPath, 'utf-8')
                const content = ejs.render(tpl, this.data)
                const destRel = rel.slice(0, -'.ejs'.length)
                const destPath = path.join(this.targetDir, destRel)
                await fs.ensureDir(path.dirname(destPath))
                await fs.writeFile(destPath, content)
            } else {
                // 普通文件：原样拷贝
                const destPath = path.join(this.targetDir, rel)
                await fs.ensureDir(path.dirname(destPath))
                await fs.copy(srcPath, destPath)
            }
        }
    }

    async generate() {
        if (!fs.existsSync(this.templateDir)) {
            throw new Error(`模板不存在：${this.templateDir}`)
        }

        // 渲染前先解析依赖最新版本，注入 this.data.versions
        await this.resolveDependencyVersions()

        const spinner = ora('正在生成项目文件...').start()
        try {
            await this.walk(this.templateDir)
            spinner.succeed('项目文件生成完成')
        } catch (err) {
            spinner.fail('项目文件生成失败')
            throw err
        }

        if (this.config.immediate) {
            await this.installAndRun()
        }
    }

    async installAndRun() {
        const spinner = ora('正在安装依赖...').start()
        try {
            execSync('npm install', { cwd: this.targetDir, stdio: 'ignore' })
            spinner.succeed('依赖安装完成')
        } catch (err) {
            spinner.fail('依赖安装失败')
            throw err
        }

        logger.info('\n🚀 启动开发服务器...\n')
        // 继承 stdio，让 vite 输出直接显示给用户
        spawn('npm', ['run', 'dev'], { cwd: this.targetDir, stdio: 'inherit', shell: true })
    }
}

module.exports = Generator
