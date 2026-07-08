# workflows

Shared GitHub Actions workflows and composite actions for while-coder projects.

Call reusable workflows from project repositories with `uses: while-coder/workflows/.github/workflows/<name>.yml@main`.

Call composite actions with `uses: while-coder/workflows/.github/actions/<name>@main`.

## Actions

- `resolve-release-info`: resolve tag, version, and release notes from `package.json` and `CHANGELOG.md`.
- `recreate-github-release`: delete an existing GitHub Release for a tag, then optionally create a fresh release without deleting the tag.
- `rename-tauri-assets`: rename Tauri desktop release assets to consistent OS/architecture names.
- `generate-tauri-updater-manifest`: generate and publish Tauri updater manifests.

## Secrets

Reusable workflow code lives here, but secrets are resolved from the caller repository when a project uses `secrets: inherit`.

Set these as organization secrets, or repeat them as repository secrets in each app repository:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Do not rely on secrets stored only in this `workflows` repository for caller repositories. GitHub does not expose the called workflow repository's secrets to callers.

## Private Repository Access

This repository can be private, but GitHub Actions access must be enabled from the repository settings:

`Settings -> Actions -> General -> Access -> Accessible from repositories owned by while-coder`

After that, private repositories owned by `while-coder` can call these workflows and actions.
