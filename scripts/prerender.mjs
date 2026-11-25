import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const baseHtmlPath = path.join(distDir, 'index.html');
const ssrEntryPath = path.join(root, 'dist-ssr', 'entry-server.js');

const template = fs.readFileSync(baseHtmlPath, 'utf-8');
if (!template.includes('<!--app-html-->')) {
  throw new Error('Missing <!--app-html--> placeholder in dist/index.html');
}

const { getRoutes, renderRoute, renderLlmsFullText } = await import(pathToFileURL(ssrEntryPath).href);
const routes = getRoutes();

function escapeHtmlAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

for (const meta of routes) {
  const appHtml = renderRoute(meta.route);
  const canonicalUrl = `https://vivechak.bhaskarjha.dev${meta.route === '/' ? '/' : meta.route}`;
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const ogType = meta.route.startsWith('/docs/') ? 'article' : 'website';

  const html = template
    .replace('<div id="root"><!--app-html--></div>', () => `<div id="root" data-ssr-route="${meta.route}">${appHtml}</div>`)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${safeTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      () => `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
      () => `<link rel="canonical" href="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
      () => `<meta property="og:type" content="${ogType}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
      () => `<meta property="og:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      () => `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      () => `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/>/,
      () => `<meta name="twitter:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      () => `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      () => `<meta name="twitter:description" content="${safeDesc}" />`
    );

  const outFile =
    meta.route === '/'
      ? baseHtmlPath
      : path.join(distDir, meta.route.replace(/^\//, ''), 'index.html');

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html, 'utf-8');
}

// Compile full-text AI documentation corpus (llmstxt.org llms-full.txt standard)
const llmsFull = renderLlmsFullText();
fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFull, 'utf-8');

// Cross-platform cleanup of dist-ssr directory
const distSsrDir = path.join(root, 'dist-ssr');
if (fs.existsSync(distSsrDir)) {
  fs.rmSync(distSsrDir, { recursive: true, force: true });
}

console.log(`Prerendered ${routes.length} static SEO routes + llms-full.txt (${llmsFull.length} bytes) into dist/`);
