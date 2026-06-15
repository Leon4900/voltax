const path = require('path')
const fs = require('fs-extra')
const inquirer = require('inquirer')
const Generator = require('./Generator')
const logger = require('./utils/logger')

async function create(directory, options = {}) {
    const cwd = process.cwd()
    let { template, immediate, overwrite, latest } = options

    // 未传目录：询问项目名称，默认 vpax-app
    if (!directory) {
        const ans = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: '请输入项目名称：',
                default: 'vpax-app',
            },
        ])
        directory = ans.projectName
    }

    // directory 为 '.' 时在当前目录创建，项目名取当前目录名
    const isCurrent = directory === '.'
    const targetDir = isCurrent ? cwd : path.join(cwd, directory)
    const projectName = isCurrent ? path.basename(cwd) : directory

    // 目标目录非空时才确认覆盖；不存在或为空则直接使用
    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        if (!overwrite) {
            const { confirmOverwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirmOverwrite',
                    message: `目标目录 ${targetDir} 不为空，是否覆盖（清空目录）？`,
                    default: false,
                },
            ])
            if (!confirmOverwrite) {
                logger.warn('已取消')
                return
            }
        }
        await fs.emptyDir(targetDir)
    } else {
        await fs.ensureDir(targetDir)
    }

    // 选择框架（命令行未指定 -t 时才询问）
    if (!template) {
        const ans = await inquirer.prompt([
            {
                type: 'list',
                name: 'template',
                message: '请选择项目框架：',
                choices: [{ name: 'Vue', value: 'vue' }],
            },
        ])
        template = ans.template
    }

    // 选择语言、功能、插件
    const { variant, features, plugins } = await inquirer.prompt([
        {
            type: 'list',
            name: 'variant',
            message: '是否使用 TypeScript：',
            choices: [
                { name: 'TypeScript', value: 'TypeScript' },
                { name: 'JavaScript', value: 'JavaScript' },
            ],
        },
        {
            type: 'checkbox',
            name: 'features',
            message: '请选择需要的功能：',
            choices: [
                { name: 'Vue Router', value: 'Vue Router' },
                { name: 'Pinia', value: 'Pinia' },
                { name: 'ESLint', value: 'ESLint' },
                { name: 'tailwindcss', value: 'tailwindcss' },
            ],
        },
        {
            type: 'checkbox',
            name: 'plugins',
            message: '请选择需要的插件：',
            choices: [
                { name: 'unplugin-auto-import', value: 'unplugin-auto-import' },
                { name: 'unplugin-vue-components', value: 'unplugin-vue-components' },
                { name: 'vite-plugin-svg-icons', value: 'vite-plugin-svg-icons' },
            ],
        },
    ])

    logger.info(`\n🚀 正在创建项目 ${projectName} ...\n`)

    const generator = new Generator(projectName, targetDir, {
        template,
        variant,
        features,
        plugins,
        immediate,
        // --no-latest 时为 false，跳过联网检查直接用兜底版本
        latest,
    })
    await generator.generate()

    logger.success(`\n✅ 项目 ${projectName} 创建成功！`)
    logger.log('\n请执行以下命令开始开发：\n')
    logger.info(`  cd ${projectName}`)
    logger.info('  npm install')
    logger.info('  npm run dev\n')
}

module.exports = create
