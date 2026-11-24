import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const catalogFile=path.join(root,'src/engine/generated/catalogIndex.json');
const dist=path.join(root,'dist');
const indexFile=path.join(dist,'index.html');
const site='https://bulk-calculator-studio.pages.dev';

if(!fs.existsSync(catalogFile)) throw Error('Catalog missing');
if(!fs.existsSync(indexFile)) throw Error('Vite index.html missing');

const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'));
if(!Array.isArray(catalog)||catalog.length!==2500) {
  throw Error('Catalog must contain exactly 2500 calculators');
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const seen=new Set();
const entries=[];

for(const item of catalog){
  const slug=String(item.slug??'').trim();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw Error('Invalid slug '+slug);
  if(seen.has(slug)) throw Error('Duplicate slug '+slug);
  seen.add(slug);
  if(!item.name || !item.category) throw Error('Missing metadata '+slug);
  if(['unpublished','restricted','pending_hindi'].includes(String(item.status||'').toLowerCase())) {
    throw Error('Catalog contains non-publishable entry: '+slug);
  }
  entries.push(item);
}

if(entries.length!==2500) throw Error('Not all 2500 calculators are publishable');

const original=fs.readFileSync(indexFile,'utf8');
if(!/<div\b[^>]*\bid=["']root["'][^>]*>/i.test(original)) {
  throw Error('React root element not found in built index.html');
}

const urls=[
  '/', '/calculators/', '/categories/', '/about/', '/contact/',
  '/help/', '/privacy/', '/terms/', '/disclaimer/'
];

for(const item of entries){
  const slug=item.slug;
  const name=String(item.name).trim();
  const category=String(item.categoryLabel||item.category).trim();
  const title=`${name} – Free Online Calculator | BULK CALCULATOR STUDIO`;
  const description=`Use the ${name} to calculate results online with interactive inputs and instant results. Free calculator at BULK CALCULATOR STUDIO.`;
  const canonical=`${site}/calculators/${slug}/`;

  const schema={
    '@context':'https://schema.org',
    '@type':'SoftwareApplication',
    name,
    applicationCategory:'UtilitiesApplication',
    operatingSystem:'Web',
    description,
    url:canonical,
    offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},
    isPartOf:{
      '@type':'WebSite',
      name:'BULK CALCULATOR STUDIO',
      url:site
    }
  };

  let html=original;
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);

  const descriptionTag=`<meta name="description" content="${esc(description)}">`;
  if(/<meta\s+name=["']description["'][^>]*>/i.test(html)){
    html=html.replace(/<meta\s+name=["']description["'][^>]*>/i,descriptionTag);
  } else {
    html=html.replace('</head>',descriptionTag+'</head>');
  }

  html=html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi,'');
  html=html.replace(/<meta\s+property=["']og:(?:title|description|url|type)["'][^>]*>/gi,'');
  html=html.replace(/<meta\s+name=["']twitter:(?:card|title|description)["'][^>]*>/gi,'');
  html=html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'');

  const head=`
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>`;
  html=html.replace('</head>',head);

  const fallback=`<main>
<h1>${esc(name)}</h1>
<p>${esc(description)}</p>
<p>Category: ${esc(category)}</p>
<p>Calculator ${Number(item.catalogNumber)||''} of 2500.</p>
<p>Interactive calculator is loading. Please wait.</p>
</main>`;

  html=html.replace(
    /(<div\b[^>]*\bid=["']root["'][^>]*>)[\s\S]*?(<\/div>)/i,
    `$1${fallback}$2`
  );

  const output=path.join(dist,'calculators',slug,'index.html');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,html);
  urls.push(`/calculators/${slug}/`);
}

const unique=[...new Set(urls)];
if(unique.length!==2509) throw Error(`Expected 2509 sitemap URLs, got ${unique.length}`);

const xml=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${unique.map(u=>`<url><loc>${site}${u}</loc></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(dist,'sitemap.xml'),xml);
fs.writeFileSync(path.join(dist,'robots.txt'),
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`);

console.log('Catalog entries checked:',catalog.length);
console.log('SEO calculator pages generated:',entries.length);
console.log('Sitemap URLs generated:',unique.length);
