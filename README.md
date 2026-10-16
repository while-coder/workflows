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

## Docker / GHCR

`docker-ghcr-release.yml` builds an image in the caller repository and pushes version and `latest` tags to GHCR. The default image name is `ghcr.io/<caller-owner>/<caller-repository>`, normalized to lowercase. It uses the caller's `GITHUB_TOKEN`; no Docker Hub account or extra secret is needed.

```yaml
jobs:
  docker:
    permissions:
      contents: write
      packages: write
    uses: while-coder/workflows/.github/workflows/docker-ghcr-release.yml@main
    with:
      version: '1.2.3'
      context: apps/server/dist
      dockerfile: apps/server/Dockerfile
      setup-pnpm: true
      build-command: pnpm build:server
      release-tag: v1.2.3
      archive-name: server.tar
```

Inputs:

| Input | Default | Purpose |
| --- | --- | --- |
| `version` | Required | Image version tag, normally without the release's `v` prefix. |
| `image-name` | Caller repository | Image path without `ghcr.io/`, for example `while-coder/my-server`. |
| `context` | `.` | Docker build context relative to the caller repository root. |
| `dockerfile` | `Dockerfile` | Dockerfile path relative to the caller repository root. |
| `setup-pnpm` | `false` | Set up shared Node/pnpm versions and install dependencies. |
| `build-command` | Empty | Command to run before building the image, from the repository root. |
| `release-tag` | Empty | Upload a Docker archive to this existing caller-repository Release; omitted means no archive. |
| `archive-name` | `docker-image.tar` | Archive filename; includes both version and `latest` tags. |

For projects that only need `docker build`, omit `setup-pnpm` and `build-command`. If uploading an archive, make the caller job depend on its release-creation job. Allow `packages: write` and `contents: write` in the caller as shown above; a called workflow cannot raise the caller's token permissions.

After the first publish, set the package visibility to **Public** in GitHub Packages to allow anonymous pulls. A public source repository does not automatically make a new container package public. Existing packages must grant the caller repository Actions write access. The workflow adds the OCI source label to associate the image with the caller repository.

Publishing the finished image to GHCR does not change the registry used by the Dockerfile's `FROM` image. The workflow currently builds for the Ubuntu runner's native architecture (Linux amd64).

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
