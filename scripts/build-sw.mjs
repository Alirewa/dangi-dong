import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

/**
 * Postbuild step: walk out/, build a precache manifest, and write out/sw.js
 * from public/sw-template.js.
 *
 * Follows the Applyfa-static postbuild convention rather than adding a Next
 * webpack plugin.
 */

const OUT = 'out';
const TEMPLATE = join('public', 'sw-template.js');
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Shipping a huge precache to an Iranian mobile connection is a real cost, so
// the build fails rather than silently regressing.
const MAX_PRECACHE_BYTES = 6 * 1024 * 1024;

const SKIP_FILES = new Set(['sw.js', '.DS_Store', '.nojekyll']);
const SKIP_EXT = ['.map', '.nft.json'];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function shouldSkip(relPath) {
  const name = relPath.split(sep).pop() ?? '';
  if (SKIP_FILES.has(name)) return true;
  return SKIP_EXT.some((ext) => relPath.endsWith(ext));
}

async function main() {
  try {
    await stat(OUT);
  } catch {
    console.error(`[build-sw] "${OUT}/" not found — run "next build" first.`);
    process.exit(1);
  }

  const template = await readFile(TEMPLATE, 'utf8');
  const files = await walk(OUT);

  const manifest = [];
  let totalBytes = 0;

  for (const file of files) {
    const rel = relative(OUT, file);
    if (shouldSkip(rel)) continue;

    const contents = await readFile(file);
    totalBytes += contents.length;

    // HTML files do not get content-hashed filenames from Next, so they need an
    // explicit revision for the cache key to change between deploys.
    const revision = createHash('sha1').update(contents).digest('hex').slice(0, 8);
    manifest.push({ url: `${BASE}/${rel.split(sep).join(posix.sep)}`, revision });
  }

  manifest.sort((a, b) => a.url.localeCompare(b.url));

  const version = createHash('sha1').update(JSON.stringify(manifest)).digest('hex').slice(0, 12);

  const sw = template
    .replace('%%PRECACHE%%', JSON.stringify(manifest))
    .replaceAll('%%VERSION%%', version)
    .replaceAll('%%BASE%%', BASE);

  await writeFile(join(OUT, 'sw.js'), sw, 'utf8');

  const mb = (totalBytes / 1024 / 1024).toFixed(2);
  console.log(`[build-sw] ${manifest.length} files precached, ${mb} MB, version ${version}`);

  if (totalBytes > MAX_PRECACHE_BYTES) {
    console.error(
      `[build-sw] precache is ${mb} MB, over the ${(MAX_PRECACHE_BYTES / 1024 / 1024).toFixed(
        0
      )} MB budget. Trim assets before shipping.`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[build-sw] failed:', err);
  process.exit(1);
});
