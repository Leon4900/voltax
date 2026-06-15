#!/usr/bin/env node
const { program } = require('commander')
const pkg = require('../package.json')

const create = require('../lib/create')
// const logger = require('../lib/utils/logger')

program
    .name('voltax')
    // .usage('[OPTION]... [DIRECTORY]')
    .description('vue3 + Vite 项目脚手架搭建')
    .version(pkg.version, '-v, --version', '当前版本号')
    .helpOption('-h, --help', '查看命令帮助')

program
    .command('create', { isDefault: true })
    .option('-o, --overwrite', '如果目标目录不为空，则删除现有文件')
    .option('-i, --immediate', '安装依赖项并启动dev')
    .option('-t, --template <NAME>', '使用特定的模板')
    .option('--no-latest', '不联网检查最新版本，使用内置兜底版本')
    .argument('[DIRECTORY]', '目标目录（同时作为项目名，传 . 表示当前目录）',)
    .action((directory, options) => {
        create(directory, options)
    })

program.parse()
// const options = program.opts()
// console.log(program.args);
