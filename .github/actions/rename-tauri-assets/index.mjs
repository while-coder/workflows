import { execFileSync } from 'node:child_process';

const prefix = process.env.INPUT_PRODUCT_PREFIX;
const sourceProductName = process.env.INPUT_SOURCE_PRODUCT_NAME || prefix;
const version = process.env.INPUT_VERSION;
const tag = process.env.INPUT_TAG;
const repo = process.env.INPUT_REPO || process.env.GITHUB_REPOSITORY;

function gh(args, options = {}) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const escaped = escapeRegExp(sourceProductName);
const versionPattern = escapeRegExp(version);
const replacements = [
  [new RegExp(`^${escaped}_${versionPattern}_universal\\.dmg$`, 'i'), `${prefix}_${version}_macos_universal.dmg`],
  [new RegExp(`^${escaped}_universal\\.app\\.tar\\.gz(\\.sig)?$`, 'i'), `${prefix}_${version}_macos_universal.app.tar.gz$1`],
  [new RegExp(`^${escaped}_${versionPattern}_amd64\.AppImage\.tar\.gz(\.sig)?$`, 'i'), `${prefix}_${version}_linux_x64.AppImage.tar.gz$1`],
  [new RegExp(`^${escaped}_${versionPattern}_amd64\.(AppImage|deb)(\.sig)?$`, 'i'), `${prefix}_${version}_linux_x64.$1$2`],
  [new RegExp(`^${escaped}_${versionPattern}_x64-setup\\.nsis\\.zip(\\.sig)?$`, 'i'), `${prefix}_${version}_windows_x64.nsis.zip$1`],
  [new RegExp(`^${escaped}_${versionPattern}_arm64-setup\\.nsis\\.zip(\\.sig)?$`, 'i'), `${prefix}_${version}_windows_arm64.nsis.zip$1`],
  [new RegExp(`^${escaped}_${versionPattern}_x64-setup\\.exe(\\.sig)?$`, 'i'), `${prefix}_${version}_windows_x64.exe$1`],
  [new RegExp(`^${escaped}_${versionPattern}_arm64-setup\\.exe(\\.sig)?$`, 'i'), `${prefix}_${version}_windows_arm64.exe$1`],
];

const release = JSON.parse(gh(['api', `/repos/${repo}/releases/tags/${tag}`]));
for (const asset of release.assets || []) {
  let nextName = asset.name;
  for (const [pattern, replacement] of replacements) {
    nextName = nextName.replace(pattern, replacement);
  }
  if (nextName !== asset.name) {
    console.log(`rename: ${asset.name} -> ${nextName}`);
    gh(['api', '-X', 'PATCH', `/repos/${repo}/releases/assets/${asset.id}`, '-f', `name=${nextName}`]);
  }
}
