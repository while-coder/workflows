const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

// Only inspect tracked manifests from the caller's checkout.
const rootDir = process.cwd()
const manifests = execFileSync("git", ["ls-files", "-z", "--", "package.json", "**/package.json"], {
  cwd: rootDir, encoding: "utf8",
}).split("\0").filter(Boolean)

const updates = []
for (const manifest of manifests) {
  const filename = path.join(rootDir, manifest)
  const pkg = JSON.parse(fs.readFileSync(filename, "utf8"))
  if (pkg.ciDependencies === undefined) continue
  const overrides = pkg.ciDependencies
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw new Error(`${manifest}: ciDependencies must be an object`)
  }
  for (const [name, version] of Object.entries(overrides)) {
    if (!pkg.dependencies || !Object.hasOwn(pkg.dependencies, name)) {
      throw new Error(`${manifest}: ciDependencies entry ${name} must exist in dependencies`)
    }
    if (typeof version !== "string" || !version.trim()) {
      throw new Error(`${manifest}: ciDependencies entry ${name} must be a nonempty string`)
    }
    pkg.dependencies[name] = version
  }
  if (Object.keys(overrides).length) updates.push({ filename, manifest, pkg })
}

// Validate all mappings before writing any manifest.
for (const { filename, manifest, pkg } of updates) {
  fs.writeFileSync(filename, JSON.stringify(pkg, null, 2) + "\n")
  console.log(`Applied ciDependencies in ${manifest}`)
}
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `overrides-applied=${updates.length > 0}\n`)
}

