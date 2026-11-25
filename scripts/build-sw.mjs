// Writes dist/sw.js from scripts/service-worker.js after `expo export -p web`
// (vercel.json runs both): fills in the list of files to save and a version
// fingerprint, and puts the same version in index.html, so the app can tell
// whether a new service worker is a newer deploy than the page it's running.
// Usage: node scripts/build-sw.mjs [distDir]

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv[2] ?? join(root, 'dist');

// Launch screens are only read by iOS when the app is added, and the
// export's own bookkeeping isn't needed by the app.
const SKIP = [/^splash\//, /^metadata\.json$/, /^sw\.js$/, /\.map$/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(dist)
  .map((path) => relative(dist, path).split('\\').join('/'))
  .filter((path) => !SKIP.some((pattern) => pattern.test(path)))
  .sort();

const indexPath = join(dist, 'index.html');
const index = readFileSync(indexPath, 'utf8');

// The fingerprint: the page (which names this build's scripts) and every
// file's name and size (the names carry a hash of their content).
const hash = createHash('sha256').update(index);
let bytes = 0;
for (const path of files) {
  const size = statSync(join(dist, path)).size;
  bytes += size;
  hash.update(`${path}:${size}\n`);
}
const version = hash.digest('hex').slice(0, 12);

// The page is saved as '/', the address every route is served from.
const precache = files.map((path) => (path === 'index.html' ? '/' : `/${path.replace(/ /g, '%20')}`));

const template = readFileSync(join(root, 'scripts', 'service-worker.js'), 'utf8');
writeFileSync(
  join(dist, 'sw.js'),
  template
    .replace("'__VERSION__'", JSON.stringify(version))
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2)),
);
writeFileSync(
  indexPath,
  index.replace('</head>', `<meta name="app-version" content="${version}" />\n</head>`),
);

console.log(`sw.js: version ${version}, ${precache.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
