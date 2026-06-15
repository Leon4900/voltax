const chalk = require('chalk')

const logger = {
    log: (msg) => console.log(msg),
    info: (msg) => console.log(chalk.cyan(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    warn: (msg) => console.log(chalk.yellow(msg)),
    error: (msg) => console.log(chalk.red(msg)),
}

module.exports = logger
