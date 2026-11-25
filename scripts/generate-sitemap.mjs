import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CATALOG_FILE = path.join(ROOT, 'public/reports/catalog-master.json');
const SITEMAP_FILE = path.join(ROOT, 'public/sitemap.xml');
const ROBOTS_FILE = path.join(ROOT, 'public/robots.txt');

const DOMAIN = 'https://bulk-calculator-studio.pages.dev';

function generateSitemap() {
  let catalog = [];
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read catalog-master.json:', err);
  }

  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/calculators', priority: '0.9', changefreq: 'daily' },
    { loc: '/categories', priority: '0.8', changefreq: 'weekly' },
    { loc: '/bulk-calculator', priority: '0.9', changefreq: 'weekly' },
    { loc: '/custom-calculator-builder', priority: '0.8', changefreq: 'monthly' },
    { loc: '/workflow-builder', priority: '0.8', changefreq: 'monthly' },
    { loc: '/unit-converter', priority: '0.8', changefreq: 'weekly' },
    { loc: '/currency-converter', priority: '0.8', changefreq: 'daily' },
    { loc: '/math-lab', priority: '0.8', changefreq: 'weekly' },
    { loc: '/finance-lab', priority: '0.8', changefreq: 'weekly' },
    { loc: '/data-analysis', priority: '0.8', changefreq: 'weekly' },
    { loc: '/formula-library', priority: '0.8', changefreq: 'weekly' },
    { loc: '/about', priority: '0.4', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.4', changefreq: 'monthly' },
    { loc: '/help', priority: '0.5', changefreq: 'monthly' },
    { loc: '/developer', priority: '0.5', changefreq: 'monthly' },
  ];

  const langs = ['en', 'hi', 'ar', 'es'];
  const urlEntries = [];

  // Add static routes (and multi-language static routes)
  for (const route of staticRoutes) {
    urlEntries.push(`  <url>\n    <loc>${DOMAIN}${route.loc}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`);
    for (const lang of langs) {
      if (route.loc === '/') {
        urlEntries.push(`  <url>\n    <loc>${DOMAIN}/${lang}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`);
      } else {
        urlEntries.push(`  <url>\n    <loc>${DOMAIN}/${lang}${route.loc}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`);
      }
    }
  }

  // Add all 2,500 calculators (default English and localized paths)
  for (const item of catalog) {
    const calcPath = `/${item.category}/${item.slug}`;
    urlEntries.push(`  <url>\n    <loc>${DOMAIN}${calcPath}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    for (const lang of langs) {
      urlEntries.push(`  <url>\n    <loc>${DOMAIN}/${lang}${calcPath}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_FILE, sitemapXml, 'utf8');
  console.log(`Successfully generated static sitemap.xml with ${urlEntries.length} URLs for ${DOMAIN}`);

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
  fs.writeFileSync(ROBOTS_FILE, robotsTxt, 'utf8');
  console.log(`Successfully generated robots.txt pointing to ${DOMAIN}/sitemap.xml`);
}

generateSitemap();
