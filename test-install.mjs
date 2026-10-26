/**
 * Runtime check for the documented manual install.
 *
 * Run only after INSTALL.md has installed a local @athanor-code/read-aloud
 * tarball and created this plugin's .venv/read-aloud. It avoids a Kokoro model
 * download by rendering one synthetic macOS `say` clip instead.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { installedRuntime } from './install-runtime.mjs'

const pluginRoot = path.dirname(fileURLToPath(import.meta.url))
const { libraryRoot, pythonPath } = installedRuntime(pluginRoot)
assert.ok(pythonPath, 'missing plugin-local Python; follow INSTALL.md step 3 first')
const sidecar = path.join(pluginRoot, 'sidecar.cjs')
const appOrigin = 'app://obsidian.md'

for (const required of [
  sidecar,
  path.join(libraryRoot, 'src', 'server', 'index.js'),
  path.join(libraryRoot, 'src', 'style.css'),
  pythonPath,
]) {
  assert.ok(fs.existsSync(required), `missing ${required}; follow INSTALL.md first`)
}

const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'))
assert.equal(manifest.id, 'heartkemy-read-aloud')
assert.equal(manifest.isDesktopOnly, true)
const libraryPackage = JSON.parse(fs.readFileSync(path.join(libraryRoot, 'package.json'), 'utf8'))
assert.equal(libraryPackage.name, '@athanor-code/read-aloud')
assert.equal(libraryPackage.version, '0.1.0')
console.log(`installed library: ${libraryRoot}`)

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('sidecar did not announce readiness within 20 seconds')), 20_000)
    const finish = (fn, value) => {
      clearTimeout(timeout)
      fn(value)
    }
    const lines = readline.createInterface({ input: child.stdio[3] })
    lines.once('line', (line) => {
      try {
        const hello = JSON.parse(line)
        assert.equal(hello.ready, true)
        assert.equal(hello.basePath, '/api/read-aloud')
        assert.ok(Number.isInteger(hello.port) && hello.port > 0)
        finish(resolve, hello)
      } catch (err) {
        finish(reject, err)
      }
    })
    child.once('error', (err) => finish(reject, err))
    child.once('exit', (code, signal) => finish(reject, new Error(`sidecar exited before ready (${signal ?? code})`)))
  })
}

function request(port, { method = 'GET', pathname = '/api/read-aloud', headers = {}, body } = {}) {
  const payload = body === undefined ? null : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method,
        path: pathname,
        headers: {
          Host: `127.0.0.1:${port}`,
          ...headers,
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
      },
    )
    req.on('error', reject)
    req.end(payload ?? undefined)
  })
}

async function stop(child) {
  if (child.exitCode !== null) return
  const exited = once(child, 'exit')
  child.stdin.end()
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error('sidecar did not shut down')), 5_000)),
  ])
}

const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heartkemy-read-aloud-install-'))
const child = spawn(process.execPath, [sidecar, libraryRoot, cacheDir, 'say:Alex', appOrigin, pythonPath], {
  stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
  // Match the production plugin: the library's markdown normalizer consults
  // READ_ALOUD_PYTHON while the Kokoro engine receives the argv path above.
  env: { ...process.env, READ_ALOUD_PYTHON: pythonPath },
})

try {
  const { port } = await waitForReady(child)

  const preflight = await request(port, {
    method: 'OPTIONS',
    headers: { Origin: appOrigin, 'Access-Control-Request-Method': 'POST' },
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers['access-control-allow-origin'], appOrigin)

  const rejected = await request(port, { headers: { Origin: 'app://not-obsidian.md' } })
  assert.equal(rejected.status, 403)

  const info = await request(port)
  assert.equal(info.status, 200, info.body)
  const sayVoice = JSON.parse(info.body).voices.find((voice) => voice.id.startsWith('say:'))
  assert.ok(sayVoice, 'no macOS say voice is available')

  const rendered = await request(port, {
    method: 'POST',
    headers: { Origin: appOrigin },
    body: { text: 'Synthetic read aloud installation check.', voice: sayVoice.id, segment: true },
  })
  assert.equal(rendered.status, 200, rendered.body)
  const result = JSON.parse(rendered.body)
  assert.ok(result.segments?.length, 'service returned no rendered segment')
  assert.match(result.voice, /^say:/)
  const clipName = path.basename(result.segments[0].url)
  assert.match(clipName, /^[a-f0-9]{20}\.wav$/)
  assert.equal(fs.statSync(cacheDir).mode & 0o777, 0o700)
  assert.equal(fs.statSync(path.join(cacheDir, clipName)).mode & 0o777, 0o600)

  await stop(child)
  console.log('manual install sidecar check passed')
} finally {
  if (child.exitCode === null) child.kill('SIGTERM')
  fs.rmSync(cacheDir, { recursive: true, force: true })
}
