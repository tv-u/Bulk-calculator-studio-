import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogFile = path.join(root, 'src/engine/generated/catalogIndex.json');
const dist = path.join(root, 'dist');
const indexFile = path.join(dist, 'index.html');
const site = 'https://bulk-calculator-studio.pages.dev';

if (!fs.existsSync(catalogFile)) throw Error('Catalog missing: run generate-catalog.mjs first');
if (!fs.existsSync(indexFile)) throw Error('Vite dist/index.html missing: run vite build first');

const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
if (!Array.isArray(catalog) || catalog.length !== 2600) {
  throw Error(`Catalog must contain exactly 2600 calculators, found ${catalog?.length}`);
}

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

const seen = new Set();
const entries = [];

for (const item of catalog) {
  const slug = String(item.slug ?? '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid slug ' + slug);
  if (seen.has(slug)) throw Error('Duplicate slug ' + slug);
  seen.add(slug);
  if (!item.name || !item.category) throw Error('Missing metadata ' + slug);
  if (['unpublished', 'restricted', 'pending_hindi'].includes(String(item.status || '').toLowerCase())) {
    throw Error('Catalog contains non-publishable entry: ' + slug);
  }
  entries.push(item);
}

if (entries.length !== 2600) throw Error('Not all 2600 calculators are publishable');

const original = fs.readFileSync(indexFile, 'utf8');
if (!/<div\b[^>]*\bid=["']root["'][^>]*>/i.test(original)) {
  throw Error('React root element not found in built index.html');
}

function injectHeadAndFallback(baseHtml, { title, description, keywords, canonical, schema, fallbackHtml }) {
  let html = baseHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);

  const descriptionTag = `<meta name="description" content="${esc(description)}">`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, descriptionTag);
  } else {
    html = html.replace('</head>', descriptionTag + '</head>');
  }

  html = html.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, '');
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+property=["']og:(?:title|description|url|type)["'][^>]*>/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:(?:card|title|description)["'][^>]*>/gi, '');
  html = html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const head = `
<link rel="canonical" href="${canonical}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>`;
  html = html.replace('</head>', head);

  html = html.replace(
    /(<div\b[^>]*\bid=["']root["'][^>]*>)[\s\S]*?(<\/div>)/i,
    `$1${fallbackHtml}$2`
  );
  return html;
}

const staticPages = [
  {
    route: '/calculators/',
    title: 'All 2,600 Free Online Calculators | BulkCalc',
    description: 'Browse 2,600 verified online calculators across Finance, Math, Health, Engineering, Construction, Science, Business & Technology.',
    keywords: 'free online calculator directory, 2600 calculators, finance math health engineering calculators',
  },
  {
    route: '/categories/',
    title: '15 Calculator Domain Categories | BulkCalc',
    description: 'Explore 15 specialized calculator categories covering Finance, Math, Health, Engineering, Real Estate, Construction & Tech.',
    keywords: 'calculator categories, financial tools, math solvers, engineering calculators',
  },
  {
    route: '/bulk-calculator/',
    title: 'Bulk CSV Calculator Studio – Batch Process Rows | BulkCalc',
    description: 'Upload CSV spreadsheets or run batch calculations across thousands of rows with safe formulas and instant CSV/PDF exports.',
    keywords: 'bulk csv calculator online, batch formula calculator, spreadsheet batch processor',
  },
  {
    route: '/custom-calculator-builder/',
    title: 'Custom No-Code Calculator Builder | BulkCalc',
    description: 'Build, test, save, and share custom mathematical formulas securely with an AST parser and zero coding required.',
    keywords: 'custom calculator builder online, create formula calculator no code',
  },
  {
    route: '/workflow-builder/',
    title: 'Visual Calculator Workflow Builder | BulkCalc',
    description: 'Chain multiple financial and math calculators into automated step-by-step calculation pipelines in your browser.',
    keywords: 'calculator workflow builder, chained calculation pipeline',
  },
  {
    route: '/unit-converter/',
    title: 'Universal Unit Converter – 13 SI Categories | BulkCalc',
    description: 'Convert Length, Weight, Area, Volume, Temperature, Speed, Pressure, Energy & Data offline with NIST/SI constants.',
    keywords: 'universal unit converter online offline, si metric imperial converter',
  },
  {
    route: '/currency-converter/',
    title: 'Live Foreign Currency Exchange Converter | BulkCalc',
    description: 'Convert USD, INR, EUR, GBP, CAD, AED, JPY and major world currencies with live market exchange rates.',
    keywords: 'live currency converter usd to inr, foreign exchange calculator',
  },
  {
    route: '/math-lab/',
    title: 'Mathematics Lab – Graphing, Matrices & Calculus | BulkCalc',
    description: 'Plot functions, solve quadratic & linear equations, evaluate 2x2 matrices, and compute numerical derivatives & integrals.',
    keywords: 'online math lab graphing matrix integral solver',
  },
  {
    route: '/finance-lab/',
    title: 'Financial Simulation Lab – Loans & Investing | BulkCalc',
    description: 'Simulate loan amortization schedules, SIP vs lump-sum compounding, break-even points, and sensitivity scenarios.',
    keywords: 'financial simulation lab, loan amortization investment modeling',
  },
  {
    route: '/data-analysis/',
    title: 'CSV Data Analysis & Statistics Studio | BulkCalc',
    description: 'Inspect CSV datasets, clean missing or duplicate rows, and compute descriptive statistics and visual charts privately.',
    keywords: 'online csv data analysis tool, descriptive statistics dataset cleaner',
  },
  {
    route: '/formula-library/',
    title: 'Verified Mathematical & Financial Formula Library | BulkCalc',
    description: 'Browse documented mathematical, financial, clinical, physics, and engineering equations powering 2,600 calculators.',
    keywords: 'math finance engineering formula reference library',
  },
  {
    route: '/about/',
    title: 'About BULK CALCULATOR STUDIO | BulkCalc',
    description: 'Learn about our deterministic calculation accuracy standards, privacy-first local execution, and 2,600-tool platform.',
    keywords: 'about bulk calculator studio, deterministic calculator engine',
  },
  {
    route: '/contact/',
    title: 'Contact & Request a Calculator | BulkCalc',
    description: 'Send feedback, report an edge case, or request a new verified online calculator for BULK CALCULATOR STUDIO.',
    keywords: 'contact bulk calculator studio, request calculator',
  },
  {
    route: '/help/',
    title: 'Help Center & Offline FAQ | BulkCalc',
    description: 'Guides for Smart Search, Bulk CSV Studio, Custom Formula AST safety, PWA installation, and offline calculator access.',
    keywords: 'bulk calculator studio help faq, offline pwa calculator guide',
  },
  {
    route: '/developer/',
    title: 'Developer & Embed Documentation | BulkCalc',
    description: 'Technical reference for safe formula AST functions, embeddable calculator widgets, and REST endpoints.',
    keywords: 'calculator developer docs, embeddable calculator iframe api',
  },
  {
    route: '/privacy/',
    title: 'Privacy Policy | BulkCalc',
    description: 'Privacy commitment detailing client-side local storage, CSV processing privacy, and data handling practices.',
    keywords: 'bulk calculator studio privacy policy',
  },
  {
    route: '/terms/',
    title: 'Terms & Conditions | BulkCalc',
    description: 'Terms of service governing deterministic informational calculators and productivity workflows at BulkCalc.',
    keywords: 'bulk calculator studio terms conditions',
  },
  {
    route: '/disclaimer/',
    title: 'Financial, Clinical & Engineering Disclaimer | BulkCalc',
    description: 'Important statutory notices regarding financial projections, clinical health formulas, and engineering codes.',
    keywords: 'calculator disclaimer financial health engineering',
  },
];

const urls = ['/'];

// Pre-render static hub/info pages
for (const sp of staticPages) {
  const canonical = `${site}${sp.route}`;
  const outHtml = injectHeadAndFallback(original, {
    title: sp.title,
    description: sp.description,
    keywords: sp.keywords,
    canonical,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: sp.title,
      description: sp.description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'BULK CALCULATOR STUDIO', url: site },
    },
    fallbackHtml: `<main><h1>${esc(sp.title)}</h1><p>${esc(sp.description)}</p></main>`,
  });
  const slugDir = sp.route.replace(/^\/|\/$/g, '');
  const outPath = path.join(dist, slugDir, 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, outHtml);
  urls.push(sp.route);
}

// Pre-render all 2,600 single-page calculator HTML files
for (const item of entries) {
  const slug = item.slug;
  const name = String(item.name).trim();
  const catLabel = String(item.categoryLabel || item.category).trim();
  const sub = String(item.subcategory || catLabel).trim();

  const title =
    name.length <= 28
      ? `${name} – Free Online Tool | BulkCalc`
      : name.length <= 46
      ? `${name} | BulkCalc`
      : `${name} – BulkCalc`;

  const longTailPhrase = item.longTail
    ? String(item.longTail).trim()
    : `${sub.toLowerCase()} formula with step-by-step breakdown`;

  let description = `Calculate ${name.toLowerCase()} results with ${longTailPhrase}. Free instant online tool with PDF & CSV export at BulkCalc.`;
  if (description.length > 160) {
    description = `Free ${name}: ${longTailPhrase}. Instant step-by-step results, chart breakdown & PDF/CSV export at BulkCalc.`;
  }
  if (description.length > 160) {
    description = description.slice(0, 157).trimEnd() + '...';
  }

  const nLow = name.toLowerCase();
  const keywords = [
    ...new Set([
      nLow,
      `${nLow} online free no signup`,
      `${nLow} step by step formula`,
      item.longTail ? `${nLow} ${item.longTail}` : `${nLow} ${sub.toLowerCase()}`,
      `${nLow} pdf csv export`,
      `${item.category} calculator`,
    ]),
  ].join(', ');

  const canonical = `${site}/calculators/${slug}/`;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description,
      url: canonical,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isPartOf: { '@type': 'WebSite', name: 'BULK CALCULATOR STUDIO', url: site },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: catLabel, item: `${site}/en/${item.category}` },
        { '@type': 'ListItem', position: 3, name, item: canonical },
      ],
    },
  ];

  const fallbackHtml = `<main>
<h1>${esc(name)}</h1>
<p>${esc(description)}</p>
<p>Category: ${esc(catLabel)} · ${esc(sub)}</p>
<p>Tool #${Number(item.catalogNumber) || ''} of ${entries.length}.</p>
<p>Interactive calculator workspace loading...</p>
</main>`;

  const html = injectHeadAndFallback(original, {
    title,
    description,
    keywords,
    canonical,
    schema,
    fallbackHtml,
  });

  const output = path.join(dist, 'calculators', slug, 'index.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  urls.push(`/calculators/${slug}/`);
}

const unique = [...new Set(urls)];
const expectedTotal = 1 + staticPages.length + entries.length;
if (unique.length !== expectedTotal) {
  throw Error(`Expected ${expectedTotal} sitemap URLs, got ${unique.length}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map((u) => `  <url><loc>${site}${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml);
fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`
);

// Ensure SPA 404.html fallback stays synchronized with built index.html for Cloudflare & GitHub Pages
fs.copyFileSync(indexFile, path.join(dist, '404.html'));

console.log('Catalog entries checked:', catalog.length);
console.log('Static pages generated:', staticPages.length + entries.length);
console.log('Sitemap URLs generated:', unique.length);
