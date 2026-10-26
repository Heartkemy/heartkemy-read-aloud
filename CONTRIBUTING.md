# Contributing

This is a manual desktop beta. Keep changes small, preserve the `heartkemy-read-aloud`
plugin ID and user `data.json`, and do not add an automatic installer, BRAT,
directory-submission, or package-publication path.

## Local checks

Node 18 or later is required. The source-only checks need no dependencies:

```sh
node --check main.js
node --check sidecar.cjs
node test.mjs
```

For a change affecting setup or the sidecar, follow the disposable-vault flow
in [INSTALL.md](INSTALL.md) and run `node test-install.mjs` after installing
the locally packed `@athanor-code/read-aloud` tarball. Use only synthetic notes
and a disposable vault for that check.

## Changes

Use a Git Flow feature branch and conventional commits:

```sh
git flow feature start concise-change
git commit -m "fix: explain the user-visible correction"
```

Do not commit `node_modules`, `.venv`, generated audio, `data.json`, vault
content, model files, credentials, or personal note text. Report ordinary bugs
through the repository issue tracker; use [SECURITY.md](SECURITY.md) for
security-sensitive reports.
