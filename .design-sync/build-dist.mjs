#!/usr/bin/env node
// Bespoke pre-build for design-sync (libs/shared-ui has no package.json / dist /
// build target). Produces a scratch "published package" the design-sync
// converter can consume via --entry:
//
//   .design-sync/.cache/dist-pkg/
//     package.json   name/version/module/types
//     index.mjs      esbuild IIFE-able ESM (react external, everything else
//                    inlined; svgr handles .svg ReactComponent imports)
//     index.d.ts     re-export barrel over types/ (component discovery + props)
//     types/         tsc --emitDeclarationOnly tree (run separately, copied in)
//     src/           copy of libs/shared-ui/src for converter src-enrichment
//                    (group from path + JSDoc)
//     styles.css     Tailwind v4 compiled (run separately, copied in)
//
// Why bespoke: the converter's own esbuild loads .svg as dataurl (no
// ReactComponent named export), so its synth-entry path dies on Icons.tsx.
// Pre-bundling with a real svgr plugin sidesteps that entirely.
//
// Inputs expected to already exist (the orchestrator builds them):
//   /tmp/ds-dts        tsc declaration tree
//   /tmp/ds-styles.css Tailwind compiled CSS
// Override via --dts-dir / --css-file.

import { build } from 'esbuild';
import { transform as svgrTransform } from '@svgr/core';
import {
  cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const REPO = resolve(process.cwd());
const UI_SRC = join(REPO, 'libs/shared-ui/src');
const SHADCN = join(UI_SRC, 'components/shadcn');
const CUSTOM = join(UI_SRC, 'components/custom');
const TSCONFIG = join(REPO, 'tsconfig.base.json');

function flag(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? dflt : process.argv[i + 1];
}
const DTS_DIR = resolve(flag('dts-dir', '/tmp/ds-dts'));
const CSS_FILE = resolve(flag('css-file', '/tmp/ds-styles.css'));
const OUT = resolve(flag('out', '.design-sync/.cache/dist-pkg'));

// ── 1. enumerate component files ────────────────────────────────────────────
const isTsx = (f) => f.endsWith('.tsx');
const shadcnFiles = readdirSync(SHADCN).filter(isTsx).map((f) => join(SHADCN, f));
const customFiles = readdirSync(CUSTOM).filter(isTsx).map((f) => join(CUSTOM, f));
const allFiles = [...shadcnFiles, ...customFiles];

// Per file: named PascalCase exports + whether it has a default export.
function analyze(file) {
  const txt = readFileSync(file, 'utf8');
  const named = new Set();
  // export function/const/class Name
  for (const m of txt.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) named.add(m[1]);
  // export { A, B as C }
  for (const m of txt.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const a = part.trim().match(/(?:[\w$]+\s+as\s+)?([A-Za-z_$][\w$]*)\s*$/);
      if (a && a[1] !== 'default') named.add(a[1]);
    }
  }
  const hasDefault = /export\s+default\b/.test(txt);
  // base name for default alias: PascalCase filename
  const base = basename(file).replace(/\.tsx$/, '');
  return { file, named, hasDefault, base };
}

// ── 2. build re-export barrels (JS uses src paths; DTS uses types/ paths) ────
function barrel(pathFor) {
  const lines = [];
  for (const f of allFiles) {
    const { hasDefault, named, base } = analyze(f);
    const spec = pathFor(f);
    lines.push(`export * from ${JSON.stringify(spec)};`);
    // default alias only when the PascalCase base isn't already a named export
    if (hasDefault && /^[A-Z][A-Za-z0-9]*$/.test(base) && !named.has(base)) {
      lines.push(`export { default as ${base} } from ${JSON.stringify(spec)};`);
    }
  }
  return lines.join('\n') + '\n';
}

mkdirSync(OUT, { recursive: true });
const jsEntry = join(OUT, '.entry.tsx');
writeFileSync(jsEntry, barrel((f) => f.replace(/\\/g, '/')));

// ── 3. svgr loader (Nx convention: named ReactComponent export) ─────────────
const svgrLoader = {
  name: 'svgr-named',
  setup(b) {
    b.onLoad({ filter: /\.svg$/ }, async (args) => {
      const svg = await readFile(args.path, 'utf8');
      const jsx = await svgrTransform(
        svg,
        { plugins: ['@svgr/plugin-jsx'], exportType: 'named', namedExport: 'ReactComponent', typescript: true },
        { filePath: args.path, componentName: 'ReactComponent' },
      );
      return { contents: jsx, loader: 'tsx' };
    });
  },
};

// ── 4. tsconfig paths plugin (@/ aliases) ──────────────────────────────────
const tsbase = JSON.parse(readFileSync(TSCONFIG, 'utf8'));
const rawPaths = tsbase.compilerOptions?.paths ?? {};
const baseUrl = resolve(REPO, tsbase.compilerOptions?.baseUrl ?? '.');
const aliasPlugin = {
  name: 'tspaths',
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      for (const [pat, targets] of Object.entries(rawPaths)) {
        const re = new RegExp('^' + pat.replace(/\*/g, '(.*)') + '$');
        const m = args.path.match(re);
        if (!m) continue;
        const star = m[1] ?? '';
        for (const t of targets) {
          const cand = resolve(baseUrl, t.replace(/\*/g, star));
          for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.js']) {
            const p = cand + ext;
            if (existsSync(p) && statSync(p).isFile()) return { path: p };
          }
        }
      }
      return null;
    });
  },
};

// ── 5. esbuild bundle → index.mjs ───────────────────────────────────────────
console.error('» esbuild bundling', allFiles.length, 'component files …');
await build({
  entryPoints: [jsEntry],
  outfile: join(OUT, 'index.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  target: 'es2020',
  loader: { '.css': 'empty', '.png': 'dataurl', '.jpg': 'dataurl', '.woff': 'empty', '.woff2': 'empty' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  plugins: [svgrLoader, aliasPlugin],
  logLevel: 'info',
  legalComments: 'none',
});
rmSync(jsEntry, { force: true });

// ── 6. types: copy tsc tree + generate index.d.ts barrel ────────────────────
if (!existsSync(DTS_DIR)) { console.error(`✗ dts dir ${DTS_DIR} missing — run tsc first`); process.exit(1); }
const typesOut = join(OUT, 'types');
rmSync(typesOut, { recursive: true, force: true });
cpSync(DTS_DIR, typesOut, { recursive: true });
// map a src .tsx → its emitted .d.ts under types/
function dtsSpecFor(file) {
  const relSrc = relative(REPO, file).replace(/\\/g, '/').replace(/\.tsx$/, '');
  return './' + join('types', relSrc).replace(/\\/g, '/');
}
writeFileSync(join(OUT, 'index.d.ts'), barrel(dtsSpecFor));

// ── 7. css + src copy + package.json ────────────────────────────────────────
if (existsSync(CSS_FILE)) cpSync(CSS_FILE, join(OUT, 'styles.css'));
else console.error(`! css ${CSS_FILE} missing — styles.css not written`);

// copy src for converter enrichment (group from path + JSDoc)
const srcOut = join(OUT, 'src');
rmSync(srcOut, { recursive: true, force: true });
cpSync(UI_SRC, srcOut, { recursive: true, filter: (s) => !/\.(test|spec)\./.test(s) });

const pkgVersion = (() => {
  try { return JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version || '0.0.0'; }
  catch { return '0.0.0'; }
})();
writeFileSync(join(OUT, 'package.json'), JSON.stringify({
  name: 'bt-shared-ui',
  version: /^\d+\.\d+\.\d+/.test(pkgVersion) ? pkgVersion : '0.0.0',
  type: 'module',
  module: 'index.mjs',
  main: 'index.mjs',
  types: 'index.d.ts',
}, null, 2) + '\n');

// ── 8. component→src map (for converter grouping: subcomponents land in the
// defining file's dir group instead of 'general'). Maps every PascalCase
// value export to its src file, package-relative (PKG_DIR = OUT). First file
// wins on collisions. Written to cache; the orchestrator merges it into
// config.json's componentSrcMap.
{
  const map = {};
  for (const f of allFiles) {
    const { named, hasDefault, base } = analyze(f);
    const relSrc = './' + join('src', relative(UI_SRC, f)).replace(/\\/g, '/');
    const names = new Set(named);
    if (hasDefault && /^[A-Z][A-Za-z0-9]*$/.test(base)) names.add(base);
    for (const n of names) {
      if (/^[A-Z][A-Za-z0-9]*$/.test(n) && !(n in map)) map[n] = relSrc;
    }
  }
  writeFileSync(join(dirname(OUT), 'component-src-map.json'), JSON.stringify(map, null, 2) + '\n');
  console.error(`  component-src-map.json: ${Object.keys(map).length} name(s)`);
}

const idxBytes = statSync(join(OUT, 'index.mjs')).size;
console.error(`✓ dist-pkg → ${OUT}`);
console.error(`  index.mjs ${(idxBytes / 1024).toFixed(0)} KB · ${allFiles.length} files · ${readdirSync(typesOut, { recursive: true }).filter((f) => String(f).endsWith('.d.ts')).length} d.ts`);
