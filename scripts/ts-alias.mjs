// Cargador para los scripts de Node: resuelve el alias «@/…» de la app a
// src/…, y las importaciones relativas sin extensión a su .ts. Así los
// scripts pueden usar src/lib/*.ts tal cual (Node ≥ 22.18 quita los tipos).
//   import { register } from 'node:module';
//   register('./ts-alias.mjs', import.meta.url);
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, next) {
  let url = null;
  if (specifier.startsWith('@/')) url = new URL(specifier.slice(2), src);
  else if (/^\.\.?\//.test(specifier) && context.parentURL?.endsWith('.ts') && !/\.[cm]?[jt]sx?$/.test(specifier)) url = new URL(specifier, context.parentURL);
  if (url) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      const candidate = new URL(url.href + ext);
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context);
    }
  }
  return next(specifier, context);
}
