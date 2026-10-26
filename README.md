# Heartkemy Read Aloud

Read the active note, a selection, or one heading section aloud with voices
that run on the local Mac. This repository is a **manual desktop beta**: it is
not a mobile plugin, Community Plugin directory entry, BRAT installation, npm
package, or automatic-update channel.

The plugin uses the compatible local package
[`@athanor-code/read-aloud`](https://github.com/Heartkemy/read-aloud) at version
`0.1.0`, built from the pinned public commit documented in
[INSTALL.md](INSTALL.md). The package is built and packed from that source
checkout, then installed into this plugin folder. Nothing is published to npm.

## Supported setup

- macOS desktop Obsidian only. `isDesktopOnly` is intentional because the
  plugin starts a local Node sidecar.
- Node 18 or newer for the sidecar and local package install.
- macOS `say` voices work without a neural-model download.
- The optional Kokoro voice needs Apple Silicon and the plugin-local Python
  environment described in [INSTALL.md](INSTALL.md). Its model downloads on
  the first real neural synthesis.

Opening the plugin only inventories voices; it does not prewarm or download the
optional neural model. Background note pre-rendering is off for new installs.
If you enable it, opening a note can synthesize speech and download the neural
model before you press Play; existing saved choices are preserved.

The sidecar listens only on `127.0.0.1` with an OS-selected port. It supplies
Obsidian's exact `app://` renderer origin to the library in addition to the
library's loopback host and peer checks. Rendered clips stay outside the vault
at `~/.cache/read-aloud/obsidian`; they are private, regenerable local data.

## Install and verify

Follow [INSTALL.md](INSTALL.md) for the public, no-account manual flow. It
installs every runtime requirement into the plugin folder:

- `main.js`, `manifest.json`, `styles.css`, and `sidecar.cjs`;
- `node_modules/@athanor-code/read-aloud` from a local `0.1.0` tarball; and
- optional `.venv/read-aloud` for neural voices.

Existing users' saved **Library path** setting continues to take priority. New
installs leave it empty and use the packaged library automatically; the former
`~/.local/share/read-aloud` checkout remains a compatibility fallback.

The plugin ID is `heartkemy-read-aloud`. Users of the former manual beta must
follow the [migration steps](INSTALL.md#migrating-the-former-manual-beta) to
preserve settings and avoid the unrelated directory plugin with the old ID.

## Use

After enabling the plugin in Obsidian's Community plugins settings, use:

| Command | Effect |
| --- | --- |
| `Read aloud: note` | Reads the active note. |
| `Read aloud: selection` | Reads selected editor text. |
| `Read aloud: stop` | Stops playback and clears the player. |

Reading view also adds a speaker button to each heading. The player can change
voice and speed, seek, skip, and enable the slower **Calm** reading mode.

## Development

The source-only checks need no package install:

```sh
node --check main.js
node --check sidecar.cjs
node test.mjs
```

After following the local-tarball setup, run `node test-install.mjs`. It starts
the sidecar against the installed package, verifies the approved app origin and
loopback rejection, synthesizes one synthetic `say` clip, and verifies clean
shutdown/cache permissions. It does not prove Obsidian's visual UI; use the
disposable-vault check in [INSTALL.md](INSTALL.md) for that.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the public contribution path,
[SUPPORT.md](SUPPORT.md) for ordinary help, and [SECURITY.md](SECURITY.md) for
private vulnerability reporting.

## License

This repository's original code is MIT-licensed. The `@athanor-code/read-aloud`
package, its Python dependencies, voices, and model weights retain their own
licenses and terms; this license does not relicense them.
