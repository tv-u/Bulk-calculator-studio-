import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CATALOG_FILE = path.join(ROOT, 'public/reports/catalog-master.json');
const SITEMAP_FILE = path.join(ROOT, 'public/sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'public/robots.txt');

const DOMAIN = 'https://bulk-calculator-studio.pages.dev';

function generateSitemap() {
  let catalog = [];
  if (fs.existsSync(CATALOG_FILE)) {
    catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
  }

  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/calculators/', priority: '0.9', changefreq: 'daily' },
    { loc: '/categories/', priority: '0.9', changefreq: 'weekly' },
    { loc: '/bulk-calculator/', priority: '0.9', changefreq: 'weekly' },
    { loc: '/custom-calculator-builder/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/workflow-builder/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/unit-converter/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/currency-converter/', priority: '0.8', changefreq: 'daily' },
    { loc: '/math-lab/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/finance-lab/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/data-analysis/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/formula-library/', priority: '0.8', changefreq: 'weekly' },
    { loc: '/about/', priority: '0.5', changefreq: 'monthly' },
    { loc: '/contact/', priority: '0.5', changefreq: 'monthly' },
    { loc: '/help/', priority: '0.5', changefreq: 'monthly' },
    { loc: '/developer/', priority: '0.5', changefreq: 'monthly' },
    { loc: '/privacy/', priority: '0.3', changefreq: 'yearly' },
    { loc: '/terms/', priority: '0.3', changefreq: 'yearly' },
    { loc: '/disclaimer/', priority: '0.3', changefreq: 'yearly' },
  ];

  const urlEntries = [];
  const seenUrls = new Set();

  for (const route of staticRoutes) {
    const full = `${DOMAIN}${route.loc}`;
    if (seenUrls.has(full)) continue;
    seenUrls.add(full);
    urlEntries.push(
      `  <url>\n    <loc>${full}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`
    );
  }

  for (const item of catalog) {
    const full = `${DOMAIN}/calculators/${item.slug}/`;
    if (seenUrls.has(full)) continue;
    seenUrls.add(full);
    urlEntries.push(
      `  <url>\n    <loc>${full}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf8');
  console.log(`Generated public/sitemap.xml with ${urlEntries.length} canonical URLs for ${DOMAIN}`);

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${DOMAIN}/sitemap.xml
`;
  fs.writeFileSync(ROBOTS_FILE, robotsTxt, 'utf8');
  console.log(`Generated public/robots.txt pointing to ${DOMAIN}/sitemap.xml`);
}

generateSitemap();
