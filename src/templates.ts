import type { Page } from "./types.ts";

const ORIGIN = "https://flatppl.org";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderShell(page: Page, header: string, footer: string): string {
  const title = page.url === "/" ? "FlatPPL" : `${page.title} · FlatPPL`;
  const productHeader = header.replace('data-fp-nav="site"', 'data-fp-nav="site" aria-current="page"');
  return `<!doctype html>
<html lang="en" data-fp-active="site">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${ORIGIN}${page.url}">
<link rel="canonical" href="${ORIGIN}${page.url}">
<link rel="icon shortcut" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/theme/tokens.css">
<link rel="stylesheet" href="/theme/components.css">
<link rel="stylesheet" href="/theme/shell.css">
<link rel="stylesheet" href="/syntax.css">
<link rel="stylesheet" href="/style.css">
<script src="/theme/shell.js"></script>
</head>
<body>
${productHeader}
<main id="main-content" class="fp-prose" tabindex="-1">
<article>
<h1>${escapeHtml(page.title)}</h1>
${page.html}
</article>
</main>
${footer}
</body>
</html>
`;
}
