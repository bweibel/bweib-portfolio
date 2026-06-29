/*
 * Build-time PDF generation. Astro has already produced the static site in
 * dist/; this serves that directory over a throwaway local HTTP server and uses
 * Puppeteer's headless Chromium to render /resume-print to dist/resume.pdf.
 *
 * Run automatically as part of `npm run build` (after `astro build`). Requires
 * the `puppeteer` dev dependency, which bundles its own Chromium.
 */
import http from 'node:http';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const ROUTE = '/resume-print';
const OUTPUT = path.join(DIST, 'resume.pdf');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

/** Minimal static file server over dist/, mapping a clean URL to index.html. */
function createServer() {
  return http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let filePath = path.join(DIST, pathname);

      // Map directory-style routes to their index.html (Astro static output).
      if (pathname.endsWith('/')) filePath = path.join(filePath, 'index.html');
      else if (!path.extname(filePath)) {
        try {
          await access(filePath);
        } catch {
          filePath = path.join(filePath, 'index.html');
        }
      }

      const body = await readFile(filePath);
      res.writeHead(200, {
        'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const url = `http://127.0.0.1:${port}${ROUTE}/`;

const browser = await puppeteer.launch({
  // --no-sandbox is required to run Chromium in CI containers (GitHub Actions).
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  // networkidle0 ensures Google Fonts have loaded before we snapshot.
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await page.pdf({
    path: OUTPUT,
    printBackground: true,
    // Honor the page's own @page size/margins instead of Puppeteer defaults.
    preferCSSPageSize: true,
  });
  console.log(`✓ Generated ${path.relative(process.cwd(), OUTPUT)}`);
} finally {
  await browser.close();
  server.close();
}
