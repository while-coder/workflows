import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const prefix = process.env.INPUT_PRODUCT_PREFIX;
const version = process.env.INPUT_VERSION;
const tag = process.env.INPUT_TAG;
const notes = process.env.INPUT_NOTES || `Release ${version}`;
const outputName = process.env.INPUT_OUTPUT_NAME || 'latest.json';
const repo = process.env.INPUT_REPO || process.env.GITHUB_REPOSITORY;
const target = process.env.INPUT_TARGET || process.env.GITHUB_SHA;
const updaterRelease = process.env.INPUT_UPDATER_RELEASE || 'updater';
const updaterTitle = process.env.INPUT_UPDATER_TITLE || 'Updater Manifests';
const cleanupAssets = (process.env.INPUT_CLEANUP_VERSION_RELEASE_ASSETS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function gh(args, options = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
}

const release = JSON.parse(gh(['api', `/repos/${repo}/releases/tags/${tag}`]));
const assets = new Map((release.assets || []).map((asset) => [asset.name, asset]));
const platforms = {};
const missing = [];

function signatureFor(assetName) {
  const sigName = `${assetName}.sig`;
  const sigAsset = assets.get(sigName);
  if (!sigAsset) {
    throw new Error(`missing signature asset: ${sigName}`);
  }
  return gh([
    'api',
    `/repos/${repo}/releases/assets/${sigAsset.id}`,
    '-H',
    'Accept: application/octet-stream',
  ]).trim();
}

function add(keys, candidates) {
  const asset = candidates.map((name) => assets.get(name)).find(Boolean);
  if (!asset) {
    missing.push(candidates.join(' or '));
    return;
  }
  const entry = {
    signature: signatureFor(asset.name),
    url: asset.browser_download_url,
  };
  for (const key of keys) {
    platforms[key] = entry;
  }
}

add(['darwin-x86_64', 'darwin-x86_64-app'], [
  `${prefix}_${version}_macos_x64.app.tar.gz`,
]);
add(['darwin-aarch64', 'darwin-aarch64-app'], [
  `${prefix}_${version}_macos_arm64.app.tar.gz`,
]);
add(['windows-x86_64', 'windows-x86_64-nsis'], [
  `${prefix}_${version}_windows_x64.nsis.zip`,
  `${prefix}_${version}_windows_x64.exe`,
]);
add(['windows-aarch64', 'windows-aarch64-nsis'], [
  `${prefix}_${version}_windows_arm64.nsis.zip`,
  `${prefix}_${version}_windows_arm64.exe`,
]);
add(['linux-x86_64', 'linux-x86_64-appimage'], [
  `${prefix}_${version}_linux_x64.AppImage.tar.gz`,
  `${prefix}_${version}_linux_x64.AppImage`,
]);

if (missing.length > 0) {
  throw new Error(`missing updater payload asset(s): ${missing.join(', ')}`);
}

fs.writeFileSync(
  outputName,
  `${JSON.stringify({
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms,
  }, null, 2)}\n`,
);

try {
  gh(['release', 'view', updaterRelease, '-R', repo], { stdio: ['ignore', 'ignore', 'ignore'] });
  gh(['release', 'upload', updaterRelease, outputName, '-R', repo, '--clobber']);
} catch {
  gh([
    'release', 'create', updaterRelease,
    '-R', repo,
    outputName,
    '--target', target,
    '--title', updaterTitle,
    '--notes', 'Auto-maintained by CI. Hosts Tauri updater manifests.',
    '--latest=false',
  ]);
}

if (cleanupAssets.length > 0) {
  const refreshed = JSON.parse(gh(['api', `/repos/${repo}/releases/tags/${tag}`]));
  for (const asset of refreshed.assets || []) {
    if (cleanupAssets.includes(asset.name)) {
      console.log(`delete stale release asset: ${asset.name}`);
      gh(['api', '-X', 'DELETE', `/repos/${repo}/releases/assets/${asset.id}`]);
    }
  }
}
