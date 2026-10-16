# workflows

Shared GitHub Actions workflows and composite actions for while-coder projects.

Call reusable workflows from project repositories with `uses: while-coder/workflows/.github/workflows/<name>.yml@main`.

Call composite actions with `uses: while-coder/workflows/.github/actions/<name>@main`.

## Actions

- `resolve-release-info`: resolve tag, version, and release notes from `package.json` and `CHANGELOG.md`.
- `recreate-github-release`: delete an existing GitHub Release for a tag, then optionally create a fresh release without deleting the tag.
- `setup-pnpm`: set up the shared Node 24 and pnpm 10.33.0 release toolchain.
- `rename-tauri-assets`: rename Tauri desktop release assets to consistent OS/architecture names.
- `generate-tauri-updater-manifest`: generate and publish Tauri updater manifests.

`tauri-desktop-release.yml` centrally defines the release toolchain and platforms: Node 24, pnpm 10.33.0, macOS 26 universal, Ubuntu 24.04 x64, Windows x64, and Windows ARM64. If a caller contains `scripts/mac-import-signing-cert.sh`, the macOS job runs it automatically before the Tauri build.

Android and iOS toolchain versions are also fixed here instead of being overridden by callers. When the Tauri `productName` differs from the public asset prefix, pass `source-product-name` to `tauri-updater-manifest.yml`.

## Secrets

Reusable workflow code lives here, but secrets are resolved from the caller repository when a project uses `secrets: inherit`.

Set one `BUILD_SIGNING_JSON` Actions secret in each caller repository (or use an organization secret):

```json
{
  "ANDROID_KEYSTORE_BASE64": "base64-encoded existing release keystore",
  "ANDROID_KEYSTORE_PASSWORD": "keystore password",
  "ANDROID_KEY_ALIAS": "key alias",
  "ANDROID_KEY_PASSWORD": "key password",
  "TAURI_SIGNING_PRIVATE_KEY": "existing Tauri updater private key",
  "TAURI_SIGNING_PRIVATE_KEY_PASSWORD": ""
}
```

Keep `secrets: inherit` on the caller's Android and desktop workflow jobs; no other caller changes are needed. Store this JSON as a **Secret**, not a repository variable or a committed file. Use the existing keystore and private key so updates remain compatible with installed apps.

Both workflows prefer each non-empty JSON field, then fall back to the same-named individual secret. Existing individual secrets continue to work without `BUILD_SIGNING_JSON`; fields unrelated to the target platform may be omitted. Android requires all four Android fields and skips its build if signing configuration is incomplete. The Tauri private-key password is optional for an unencrypted key.

The JSON must be valid and smaller than GitHub's 48 KB per-secret limit. Escape embedded newlines as `\n`, quotes as `\"`, and backslashes as `\\` in JSON string values. Invalid JSON fails workflow evaluation. Signing fields are explicitly masked before use because automatic masking of fields inside a JSON secret is not guaranteed.

GitHub does not allow reading saved secret values back. Keep your original values in a secure password manager when assembling or updating the JSON. Once migrated successfully, the corresponding individual secrets can be removed. Other secrets such as `PUBLIC_RELEASE_TOKEN`, `APPLE_CERTIFICATE`, and `BUILD_ENV_SECRETS` remain separate.

Do not rely on secrets stored only in this `workflows` repository for caller repositories. GitHub does not expose the called workflow repository's secrets to callers.

## Private Repository Access

This repository can be private, but GitHub Actions access must be enabled from the repository settings:

`Settings -> Actions -> General -> Access -> Accessible from repositories owned by while-coder`

After that, private repositories owned by `while-coder` can call these workflows and actions.
