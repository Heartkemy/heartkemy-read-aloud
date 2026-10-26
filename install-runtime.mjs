import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ReadAloudPlugin = createRequire(import.meta.url)('./main.js')

/** Resolve the saved settings through the same code Obsidian uses. */
export function installedRuntime(pluginRoot) {
  const plugin = Object.create(ReadAloudPlugin.prototype)
  plugin.manifest = { dir: path.resolve(pluginRoot) }
  plugin.app = { vault: { adapter: { getBasePath: () => pluginRoot } } }
  const settingsFile = path.join(pluginRoot, 'data.json')
  plugin.settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) ?? {} : {}

  const bundled = path.join(pluginRoot, 'node_modules', '@athanor-code', 'read-aloud')
  assert.ok(fs.existsSync(path.join(bundled, 'src', 'server', 'index.js')), `missing local library at ${bundled}; follow INSTALL.md first`)
  const libraryRoot = plugin.libraryRoot()
  assert.equal(
    fs.realpathSync(libraryRoot),
    fs.realpathSync(bundled),
    `Library path resolves to ${libraryRoot}, outside the installed tarball at ${bundled}. Clear the saved Library path in plugin settings and rerun this check to verify the manual install.`,
  )
  return { libraryRoot, pythonPath: plugin.pythonPath() }
}
