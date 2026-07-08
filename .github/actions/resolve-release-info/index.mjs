import fs from 'node:fs';

const tagPrefix = process.env.INPUT_TAG_PREFIX || 'v';
const packageJsonPath = process.env.INPUT_PACKAGE_JSON || 'package.json';
const changelogPath = process.env.INPUT_CHANGELOG || 'CHANGELOG.md';
const verifyPackageVersion = (process.env.INPUT_VERIFY_PACKAGE_VERSION || 'true') !== 'false';

function output(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<EOF_${name}\n${value}\nEOF_${name}\n`);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function releaseNotesFromChangelog(path, version) {
  if (!fs.existsSync(path)) return '';
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
  const collected = [];
  let capture = false;
  for (const line of lines) {
    const versionHeader = line.match(/^##\s+(.+?)\s*$/);
    if (versionHeader) {
      if (capture) break;
      capture = versionHeader[1] === version;
      continue;
    }
    if (capture) collected.push(line);
  }
  return collected.join('\n').trim();
}

const pkg = readJson(packageJsonPath);
const packageVersion = pkg.version;
if (!packageVersion) {
  throw new Error(`${packageJsonPath} does not contain a version field`);
}

let tag;
let version;
if ((process.env.GITHUB_REF || '').startsWith('refs/tags/')) {
  tag = process.env.GITHUB_REF_NAME;
  version = tag.startsWith(tagPrefix) ? tag.slice(tagPrefix.length) : tag;
} else {
  version = packageVersion;
  tag = `${tagPrefix}${version}`;
}

if (verifyPackageVersion && version !== packageVersion) {
  throw new Error(`Tag version (${version}) does not match ${packageJsonPath} version (${packageVersion})`);
}

let notes = releaseNotesFromChangelog(changelogPath, version);
if (!notes) {
  notes = `Release ${version}`;
}

output('tag', tag);
output('version', version);
output('notes', notes);
