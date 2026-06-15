const https = require('https')
const logger = require('./logger')

// 所有可能用到的依赖及其兜底版本（network 不可用时使用）
// key 为包名，value 为兜底的版本范围
const FALLBACK = {
    // dependencies
    'vue': '^3.5.30',
    'vue-router': '^5.0.4',
    'pinia': '^3.0.4',
    'pinia-plugin-persistedstate': '^4.7.1',
    // devDependencies
    '@vitejs/plugin-vue': '^6.0.5',
    '@vue/tsconfig': '^0.9.0',
    '@types/node': '^24.12.0',
    'typescript': '~5.9.3',
    'vue-tsc': '^3.2.5',
    'vite': '^8.0.1',
    'tailwindcss': '^4.2.2',
    '@tailwindcss/vite': '^4.2.2',
    'unplugin-auto-import': '^21.0.0',
    'unplugin-vue-components': '^31.0.0',
    'vite-plugin-svg-icons': '^2.0.1',
    'fast-glob': '^3.3.2',
}

// typescript 习惯用 ~ 锁定 minor，其余用 ^
const RANGE_PREFIX = (name) => (name === 'typescript' ? '~' : '^')

/**
 * 查询单个包在 npm registry 上的最新版本
 * @param {string} name 包名
 * @param {number} timeout 超时（毫秒）
 * @returns {Promise<string|null>} 纯版本号（如 3.5.30），失败返回 null
 */
function fetchLatest(name, timeout = 5000) {
    return new Promise((resolve) => {
        // 只取 dist-tags，体积小、速度快
        const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`
        const req = https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
            if (res.statusCode !== 200) {
                res.resume()
                return resolve(null)
            }
            let raw = ''
            res.on('data', (c) => (raw += c))
            res.on('end', () => {
                try {
                    resolve(JSON.parse(raw).version || null)
                } catch {
                    resolve(null)
                }
            })
        })
        req.on('error', () => resolve(null))
        req.setTimeout(timeout, () => {
            req.destroy()
            resolve(null)
        })
    })
}

/**
 * 解析一组依赖的版本范围（并发查询，失败回退到 FALLBACK）
 * @param {string[]} names 需要解析的包名列表
 * @returns {Promise<Record<string,string>>} { 包名: '^1.2.3' }
 */
async function resolveVersions(names) {
    const results = await Promise.all(
        names.map(async (name) => {
            const latest = await fetchLatest(name)
            if (latest) return [name, `${RANGE_PREFIX(name)}${latest}`]
            logger.warn(`未能获取 ${name} 的最新版本，使用兜底版本 ${FALLBACK[name] || 'latest'}`)
            return [name, FALLBACK[name] || 'latest']
        })
    )
    return Object.fromEntries(results)
}

module.exports = { resolveVersions, FALLBACK }
