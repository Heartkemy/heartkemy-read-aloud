# Manual desktop-beta installation

This is the supported install path for the public beta. It needs no GitHub
account, private repository access, personal access token, BRAT, or published
release asset. Use a **disposable vault** for the first run; do not test in an
owner's active vault.

## Prerequisites

- macOS with Obsidian desktop. For the build below, use Node `20.19.6` with
  npm `10.8.2`; Node `26.5.0` with npm `11.17.0` also passed install, tests,
  build, and packing for the pinned artifact. Other combinations are unverified.
- Git and enough disk space for the optional neural environment and model.
- Apple Silicon only for the optional Kokoro neural voice. macOS `say` voices
  are the basic smoke-test path on any supported Mac.

## 1. Build the compatible public library tarball

Choose an empty working directory outside the vault:

```sh
workdir="$(mktemp -d "${TMPDIR:-/tmp}/read-aloud-beta.XXXXXX")"
library="$workdir/read-aloud"
library_commit="db15cb941188f90946cd5ee2a8a8549e8cd1a083"

git clone --no-checkout https://github.com/Heartkemy/read-aloud.git "$library"
git -C "$library" checkout --detach "$library_commit"
cd "$library"
npm ci --ignore-scripts
npm run build
tarball="$library/$(npm pack --silent)"
```

The expected package is `@athanor-code/read-aloud` version `0.1.0` at the
detached `library_commit` above. The library's committed lockfile makes its
build toolchain reproducible; do not substitute a later `main` revision just
because it reports the same package version. `npm pack` creates a local tarball
only; it does not publish anything.

## 2. Install the plugin and local package into a disposable vault

Set `vault` to a new, disposable folder. The clone itself is the plugin folder,
which ensures the sidecar, package, and optional venv stay together:

```sh
vault="/absolute/path/to/a/disposable-vault"
plugin="$vault/.obsidian/plugins/heartkemy-read-aloud"

mkdir -p "$vault/.obsidian/plugins"
git clone https://github.com/Heartkemy/heartkemy-read-aloud.git "$plugin"
cd "$plugin"
npm install --no-save --no-package-lock --ignore-scripts --omit=peer "$tarball"
```

The required runtime files are now `main.js`, `manifest.json`, `styles.css`,
`sidecar.cjs`, and `node_modules/@athanor-code/read-aloud`. Do not copy or
commit `data.json`; it is per-user Obsidian state.

`--omit=peer` is intentional: the sidecar uses the package's local server
files, not its optional React peer dependencies. That avoids resolving an
unlocked registry dependency during the beta install; the pinned tarball is the
only package installed into the plugin folder.

## 3. Optional neural voice setup

Run the package's local setup command from the plugin checkout:

```sh
npx --no-install read-aloud-setup --venv "$PWD/.venv/read-aloud"
READ_ALOUD_PYTHON="$PWD/.venv/read-aloud/bin/python" \
  "$PWD/.venv/read-aloud/bin/python" -c "import espeakng_loader, misaki, mlx_audio, spacy; print('neural dependencies import')"
```

The plugin gives its sidecar that exact `READ_ALOUD_PYTHON` path when the venv
exists, so a Finder-launched Obsidian does not rely on inheriting shell state.
Opening the plugin only inventories voices; the first actual `kokoro:`
synthesis downloads the model. The dependency import above deliberately does
not. Leave **Pre-render the note you open** off for a playback-only download;
enabling that option makes opening a note count as synthesis.

## 4. Verify the installed runtime before opening Obsidian

From the plugin directory:

```sh
node test.mjs
node test-install.mjs
cp examples/synthetic-install-note.md "$vault/synthetic-install-note.md"
```

`test-install.mjs` reads the saved `data.json` settings and uses the plugin's
production resolver to check the actual library path. It rejects a valid
external **Library path** override, even if that checkout has the same package
version. Clear that setting and rerun the check to validate the plugin-local
tarball; the check never changes your settings. A symlink to that same installed
package is accepted.

It also checks the installed tarball, the sidecar's fd-3 handshake,
the exact `app://obsidian.md` origin, loopback-only rejection, a synthetic
macOS `say` render, cache permissions, and shutdown. It uses temporary cache
data and does not read vault content. It requires the optional venv from step
3 because the normalizer is part of the installed runtime.

## 5. Cold desktop check

Open the disposable `vault` in Obsidian desktop. If prompted, turn off
Restricted mode, enable **Heartkemy Read Aloud**, open `synthetic-install-note.md` in
Reading view, and check all of the following:

- the three `Read aloud:` commands appear in the command palette;
- each heading has a speaker button;
- selecting a macOS `say` voice produces a player and audible synthetic speech;
- **Stop** ends playback;
- closing or disabling the plugin stops the sidecar; and
- `~/.cache/read-aloud/obsidian` contains only regenerable local clips, not
  vault files.

The synthetic `say` check proves the desktop/plugin path but not neural audio.
For neural validation, complete step 3, select a `kokoro:` voice in the plugin,
and confirm a real synthetic playback after the first model download. If that
is unavailable, report it as a neural-runtime limitation rather than claiming
the desktop smoke test proved it.

## Migrating the former manual beta

This plugin now uses the ID `heartkemy-read-aloud` and the name **Heartkemy
Read Aloud**. The old ID `read-aloud` belongs to a different project in
Obsidian's community directory, so using its **Update** or **View details**
controls can select that other project.

If you previously installed this project's manual beta, disable it and close
Obsidian before migrating. Back up the old plugin folder. Confirm it is this
project's build by checking that its `main.js` identifies
`@athanor-code/read-aloud` and it has `sidecar.cjs`; the directory plugin using
calibre/Piper is a different product and must not be migrated this way.

Follow the installation above into `.obsidian/plugins/heartkemy-read-aloud`.
Copy only your own `data.json` from the backed-up folder to the new plugin
folder to retain settings, and review any saved **Library path** if that
checkout moved. Recreate the optional venv at its new path. Enable **Heartkemy
Read Aloud** and verify playback before removing the old manual installation.
Leave notes and `~/.cache/read-aloud/obsidian` in place. Existing custom hotkeys
must be assigned again because command IDs include the plugin ID.

## Updating or removing

There is no automatic update channel. To update, rebuild and pack the chosen
public library revision, then repeat the local `npm install` step in the plugin
checkout and rerun the checks. To remove the beta, delete its plugin folder,
its optional `.venv/read-aloud`, and the selected cache directory if desired.
Deleting the cache removes rendered audio only; it does not alter notes.
