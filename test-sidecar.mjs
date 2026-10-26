import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sidecar = fileURLToPath(new URL('./sidecar.cjs', import.meta.url))
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'heartkemy-sidecar-'))
try {
  const library = path.join(root, 'library')
  const cache = path.join(root, 'cache')
  const python = path.join(root, 'plugin-python')
  fs.mkdirSync(path.join(library, 'src', 'server'), { recursive: true })
  fs.mkdirSync(cache)
  fs.writeFileSync(path.join(library, 'package.json'), '{"type":"module"}')
  fs.writeFileSync(path.join(library, 'src', 'server', 'index.js'), `
    import fs from 'node:fs'
    import path from 'node:path'
    export function createReadAloudService(options) {
      fs.writeFileSync(path.join(options.cacheDir, 'options.json'), JSON.stringify({
        ...options,
        normalizerPython: process.env.READ_ALOUD_PYTHON3,
        enginePython: process.env.READ_ALOUD_PYTHON,
      }))
      return { handleRequest(req, res) { res.end() }, shutdown() {} }
    }
  `)

  for (const [pythonArg, warmOnLoad] of [[python, undefined], [python, 'true'], ['', undefined]]) {
    const args = [sidecar, library, cache, 'kokoro:bm_george', 'app://obsidian.md', pythonArg]
    if (warmOnLoad) args.push(warmOnLoad)
    const result = spawnSync(process.execPath, args, {
      input: '',
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
      env: { ...process.env, READ_ALOUD_PYTHON3: 'inherited-normalizer', READ_ALOUD_PYTHON: 'inherited-engine' },
    })
    assert.equal(result.status, 0, result.stderr || String(result.error))
    assert.equal(JSON.parse(result.output[3]).ready, true)
    const options = JSON.parse(fs.readFileSync(path.join(cache, 'options.json'), 'utf8'))
    assert.equal(options.warmOnLoad, warmOnLoad === 'true')
    assert.equal(options.pythonPath, pythonArg || undefined)
    assert.equal(options.normalizerPython, pythonArg || 'inherited-normalizer')
    assert.equal(options.enginePython, pythonArg || 'inherited-engine')
    assert.deepEqual(options.allowedOrigins, ['app://obsidian.md'])
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
console.log('sidecar startup checks passed')
