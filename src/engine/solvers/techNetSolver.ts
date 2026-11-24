import type { CalculatorDefinition, CalculatorResult } from '../calculatorTypes';
import { num, str } from '../calculatorTypes';
import type { CatalogEntryMeta } from '../catalogTypes';

function ipToLong(ip: string): number {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error('Enter a valid IPv4 address (e.g. 192.168.1.10).');
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function longToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error('Enter 6-digit hex color like #2563eb.');
  const rgb = [0, 2, 4].map((i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function buildTechNetDefinition(entry: CatalogEntryMeta): CalculatorDefinition {
  const n = entry.name.toLowerCase();
  const baseDef = {
    id: entry.slug,
    name: entry.name,
    shortDescription: `${entry.name} (#${entry.catalogNumber}) — deterministic CS, CIDR networking, media bitrate, or live diagnostic lookup.`,
    category: 'technology' as const,
    categoryLabel: entry.categoryLabel,
    keywords: [entry.name.toLowerCase(), entry.subcategory.toLowerCase(), 'technology', 'developer'],
    synonyms: [entry.slug.replace(/-/g, ' ')],
    relatedIds: ['ip-subnet-calculator', 'bandwidth-calculator', 'password-strength-calculator', 'aspect-ratio-calculator'],
  };

  // 1. Live Network Diagnostic Tools (DNS, WHOIS, SSL, Ping) — flagged explicitly as live-tool
  if (entry.solverKey === 'live_network_tool') {
    return {
      ...baseDef,
      formulaDisplay: 'Live Server Inspection (/api/live-tool): DNS-over-HTTPS / TLS Handshake / RDAP / HTTP Timing',
      explanation: 'Performs a real live network lookup via the backend server. Never invents DNS, WHOIS, or SSL data when offline or unreachable.',
      assumptions: 'Requires active internet connectivity and backend Express server.',
      inputs: [
        { key: 'domain', label: 'Target Hostname / Domain', type: 'text', defaultValue: 'example.com', placeholder: 'example.com' },
        {
          key: 'lookupType',
          label: 'Diagnostic Check',
          type: 'select',
          defaultValue: n.includes('ssl') || n.includes('tls') ? 'ssl' : n.includes('whois') || n.includes('domain') ? 'whois' : 'dns',
          options: [
            { label: 'DNS Records (A / MX / TXT)', value: 'dns' },
            { label: 'SSL / TLS Certificate Expiry', value: 'ssl' },
            { label: 'Domain RDAP / WHOIS Info', value: 'whois' },
            { label: 'HTTP Latency & Status', value: 'ping' },
          ],
        },
      ],
      compute: (vals): CalculatorResult => {
        const domain = str(vals, 'domain', 'example.com').replace(/^https?:\/\//i, '').split('/')[0];
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
          throw new Error('Enter a valid public domain name (e.g. example.com).');
        }
        return {
          primary: { label: 'Live Diagnostic Ready', value: domain, formatted: `Run Live Check for ${domain}` },
          breakdown: [
            { label: 'Classification', value: 'Live Network Tool', formatted: 'Live External Lookup (Requires Online Server)' },
            { label: 'Target Host', value: domain, formatted: domain },
          ],
          steps: [`Click "Run Live Network Diagnostic" below to query ${domain} in real time via /api/live-tool.`],
        };
      },
    };
  }

  // 2. Networking, IPv4/CIDR Subnetting, Wildcard, Bandwidth, PoE
  if (entry.solverKey === 'networking_subnet') {
    if (/(ip|cidr|subnet|vlsm|supernet|wildcard|network address|broadcast)/.test(n)) {
      return {
        ...baseDef,
        formulaDisplay: 'Usable Hosts = 2^(32 - Prefix) - 2  |  Network = IP & Mask  |  Broadcast = Network | ~Mask',
        explanation: 'Computes exact IPv4 CIDR network address, broadcast address, wildcard mask, and usable host range.',
        inputs: [
          { key: 'ip', label: 'IPv4 Address', type: 'text', defaultValue: '192.168.10.25' },
          { key: 'cidr', label: 'CIDR Prefix (/1 to /32)', type: 'number', defaultValue: 24, min: 1, max: 32, step: 1 },
        ],
        compute: (vals): CalculatorResult => {
          const ipLong = ipToLong(str(vals, 'ip', '192.168.10.25'));
          const cidr = Math.round(num(vals, 'cidr'));
          if (cidr < 1 || cidr > 32) throw new Error('CIDR prefix must be between 1 and 32.');
          const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
          const wildcard = (~mask) >>> 0;
          const net = (ipLong & mask) >>> 0;
          const bcast = (net | wildcard) >>> 0;
          const totalHosts = Math.pow(2, 32 - cidr);
          const usable = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalHosts - 2;
          return {
            primary: { label: n.includes('wildcard') ? 'Wildcard Mask' : n.includes('mask') ? 'Subnet Mask' : 'Network CIDR & Usable Hosts', value: usable, formatted: n.includes('wildcard') ? longToIp(wildcard) : n.includes('mask') ? longToIp(mask) : `${longToIp(net)}/${cidr} (${usable.toLocaleString()} hosts)` },
            breakdown: [
              { label: 'Subnet Mask', value: longToIp(mask), formatted: longToIp(mask) },
              { label: 'Wildcard Mask', value: longToIp(wildcard), formatted: longToIp(wildcard) },
              { label: 'Usable Host Range', value: usable, formatted: cidr === 32 ? longToIp(net) : `${longToIp(net + (cidr < 31 ? 1 : 0))} – ${longToIp(bcast - (cidr < 31 ? 1 : 0))}` },
              { label: 'Broadcast Address', value: longToIp(bcast), formatted: longToIp(bcast) },
            ],
            steps: [`Mask /${cidr} = ${longToIp(mask)}`, `Network = ${longToIp(net)}, Broadcast = ${longToIp(bcast)}`],
          };
        },
      };
    }
    return {
      ...baseDef,
      formulaDisplay: 'Transfer Time (s) = (File Size MB × 8) / (Speed Mbps × Efficiency)',
      explanation: 'Computes download/upload transfer durations, PoE wattage budget, or Wi-Fi free-space path loss.',
      inputs: [
        { key: 'sizeGb', label: 'Data Volume (GB)', type: 'number', defaultValue: 10, min: 0.001, step: 0.5 },
        { key: 'mbps', label: 'Throughput Speed (Mbps)', type: 'number', defaultValue: 100, min: 0.1, step: 5 },
        { key: 'eff', label: 'Protocol Efficiency (%)', type: 'number', defaultValue: 90, min: 10, max: 100, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const gb = num(vals, 'sizeGb'), mbps = num(vals, 'mbps'), eff = num(vals, 'eff') / 100;
        if (gb <= 0 || mbps <= 0 || eff <= 0) throw new Error('Size, speed, and efficiency must be positive.');
        const sec = (gb * 8000) / (mbps * eff);
        return {
          primary: { label: 'Estimated Transfer Time', value: sec, formatted: sec >= 3600 ? `${(sec / 3600).toFixed(2)} hrs` : sec >= 60 ? `${(sec / 60).toFixed(2)} min` : `${sec.toFixed(1)} sec` },
          breakdown: [
            { label: 'Effective Speed', value: mbps * eff, formatted: `${(mbps * eff).toFixed(1)} Mbps (${((mbps * eff) / 8).toFixed(2)} MB/s)` },
            { label: 'Monthly Data @ Constant Load', value: (mbps * eff * 3600 * 24 * 30) / 8000, formatted: `${((mbps * eff * 3600 * 24 * 30) / 8e6).toFixed(2)} TB/mo` },
          ],
          steps: [`(${gb}×8000 Mb) / (${mbps}×${eff}) = ${sec.toFixed(1)} s`],
        };
      },
    };
  }

  // 3. Media, Audio, Video, Photography & Display
  if (entry.solverKey === 'media_av_photo') {
    return {
      ...baseDef,
      formulaDisplay: 'Video File Size (MB) = (Video kbps + Audio kbps) × Seconds / 8000  |  PPI = √(W² + H²) / Diagonal',
      explanation: 'Computes video/audio recording size, pixel density PPI/DPI, aspect ratio, frame counts, and depth-of-field.',
      inputs: [
        { key: 'w', label: 'Width (px) / Video Bitrate (Mbps)', type: 'number', defaultValue: 1920, min: 1, step: 10 },
        { key: 'h', label: 'Height (px) / Duration (Minutes)', type: 'number', defaultValue: 1080, min: 1, step: 10 },
        { key: 'diagOrFps', label: 'Screen Inches / Frame Rate (FPS)', type: 'number', defaultValue: 24, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const w = num(vals, 'w'), h = num(vals, 'h'), d = num(vals, 'diagOrFps');
        if (w <= 0 || h <= 0 || d <= 0) throw new Error('Values must be positive.');
        if (/(video|audio|mp3|wav|bitrate|podcast|frame|fps|slow motion|time lapse|file size|storage)/.test(n)) {
          const mbps = w > 500 ? w / 100 : w; // sensible scale whether user enters 20 Mbps or 1920
          const secs = h * 60;
          const sizeMb = (mbps * secs) / 8;
          return {
            primary: { label: 'Estimated Media File Size', value: sizeMb, formatted: sizeMb >= 1024 ? `${(sizeMb / 1024).toFixed(2)} GB` : `${sizeMb.toFixed(1)} MB` },
            breakdown: [
              { label: 'Total Frames', value: secs * d, formatted: `${Math.round(secs * d).toLocaleString()} frames` },
              { label: 'Data Rate', value: mbps / 8, formatted: `${(mbps / 8).toFixed(2)} MB/s` },
            ],
            steps: [`${mbps.toFixed(1)} Mbps × ${secs} s / 8 = ${sizeMb.toFixed(1)} MB`],
          };
        }
        const diagPx = Math.hypot(w, h);
        const ppi = diagPx / d;
        const g = (() => { let a = Math.round(w), b = Math.round(h); while (b) { [a, b] = [b, a % b]; } return a || 1; })();
        return {
          primary: { label: 'Pixel Density (PPI / DPI)', value: ppi, formatted: `${ppi.toFixed(2)} PPI (${Math.round(w / g)}:${Math.round(h / g)})` },
          breakdown: [
            { label: 'Total Megapixels', value: (w * h) / 1e6, formatted: `${((w * h) / 1e6).toFixed(2)} MP` },
            { label: 'Aspect Ratio', value: w / h, formatted: `${Math.round(w / g)}:${Math.round(h / g)} (${(w / h).toFixed(3)})` },
          ],
          steps: [`Diagonal = √(${w}²+${h}²) = ${diagPx.toFixed(1)} px`, `PPI = ${diagPx.toFixed(1)} / ${d}" = ${ppi.toFixed(2)}`],
        };
      },
    };
  }

  // 4. Computer Science, Developer Utilities, Text, Color Contrast, Timestamp, Base64/Bitwise
  if (/(word counter|character counter|line counter|byte counter|text length|slug|base64|url |json)/.test(n)) {
    return {
      ...baseDef,
      formulaDisplay: 'UTF-8 Byte Count | Base64 Encoding | URL Percent-Encoding | Slug Normalization',
      explanation: 'Processes text length, UTF-8 bytes, words, lines, Base64, URL encoding, JSON validation, or clean SEO URL slugs.',
      inputs: [
        { key: 'text', label: 'Input Text / JSON Payload', type: 'text', defaultValue: 'BULK CALCULATOR STUDIO 2500' },
      ],
      compute: (vals): CalculatorResult => {
        const text = str(vals, 'text', '');
        const bytes = new TextEncoder().encode(text).length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(text))) : Buffer.from(text, 'utf8').toString('base64');
        let jsonStatus = 'Not tested';
        if (n.includes('json')) {
          try { JSON.parse(text); jsonStatus = 'Valid JSON'; } catch (e) { jsonStatus = `Invalid JSON: ${e instanceof Error ? e.message : 'syntax'}`; }
        }
        return {
          primary: { label: n.includes('base64') ? 'Base64 Encoded' : n.includes('url') ? 'URL Encoded' : n.includes('slug') ? 'URL Slug' : n.includes('json') ? 'JSON Validation' : 'Characters / Words', value: text.length, formatted: n.includes('base64') ? b64 : n.includes('url') ? encodeURIComponent(text) : n.includes('slug') ? slug : n.includes('json') ? jsonStatus : `${text.length} chars · ${words} words` },
          breakdown: [
            { label: 'UTF-8 Bytes', value: bytes, formatted: `${bytes} bytes` },
            { label: 'Base64 Output', value: b64, formatted: b64 },
            { label: 'URL Slug', value: slug, formatted: slug || '(empty)' },
          ],
          steps: [`Processed ${text.length} chars (${bytes} UTF-8 bytes)`],
        };
      },
    };
  }

  if (/(contrast|rgb|hex|hsl|css|rem|px)/.test(n)) {
    return {
      ...baseDef,
      formulaDisplay: 'WCAG Contrast = (L₁ + 0.05) / (L₂ + 0.05)  |  REM = PX / RootFontSize',
      explanation: 'Computes WCAG 2.2 AA/AAA color contrast ratio, HEX ↔ RGB conversion, and CSS PX ↔ REM units.',
      inputs: [
        { key: 'fg', label: 'Foreground HEX Color', type: 'text', defaultValue: '#ffffff' },
        { key: 'bg', label: 'Background HEX Color', type: 'text', defaultValue: '#1e1b4b' },
        { key: 'px', label: 'CSS Pixels (px)', type: 'number', defaultValue: 16, min: 1, step: 1 },
      ],
      compute: (vals): CalculatorResult => {
        const fg = str(vals, 'fg', '#ffffff'), bg = str(vals, 'bg', '#1e1b4b'), px = num(vals, 'px');
        const l1 = luminance(fg), l2 = luminance(bg);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const aa = ratio >= 4.5 ? 'Pass AA & AAA' : ratio >= 3 ? 'Large Text AA Only' : 'Fail WCAG AA';
        return {
          primary: { label: n.includes('rem') || n.includes('px') || n.includes('css') ? 'CSS REM Equivalent' : 'WCAG Contrast Ratio', value: n.includes('rem') || n.includes('px') ? px / 16 : ratio, formatted: n.includes('rem') || n.includes('px') ? `${(px / 16).toFixed(4)} rem (${px}px @ 16px root)` : `${ratio.toFixed(2)} : 1 (${aa})` },
          breakdown: [
            { label: 'WCAG Compliance', value: aa, formatted: aa },
            { label: 'REM (16px base)', value: px / 16, formatted: `${(px / 16).toFixed(3)} rem` },
          ],
          steps: [`L_fg=${l1.toFixed(4)}, L_bg=${l2.toFixed(4)} → Ratio=${ratio.toFixed(2)}:1`],
        };
      },
    };
  }

  return {
    ...baseDef,
    formulaDisplay: 'Bitwise: A & B, A | B, A ^ B, A << k  |  Password Entropy = L × log₂(PoolSize)',
    explanation: 'Computes binary/hex/bitwise integer operations, Unix epoch timestamps, or password cryptographic entropy.',
    inputs: [
      { key: 'a', label: 'Integer A / Timestamp / Password Length', type: 'number', defaultValue: 42, step: 1 },
      { key: 'b', label: 'Integer B / Shift Bits / Char Pool Size', type: 'number', defaultValue: 15, step: 1 },
    ],
    compute: (vals): CalculatorResult => {
      const a = Math.trunc(num(vals, 'a')), b = Math.trunc(num(vals, 'b'));
      if (n.includes('password') || n.includes('entropy') || n.includes('brute')) {
        const len = Math.max(4, Math.abs(a));
        const pool = Math.max(10, Math.abs(b) < 10 ? 72 : Math.abs(b));
        const bits = len * Math.log2(pool);
        return {
          primary: { label: 'Entropy Strength', value: bits, formatted: `${bits.toFixed(1)} bits` },
          breakdown: [
            { label: 'Keyspace Combinations', value: `2^${bits.toFixed(0)}`, formatted: `~10^${(bits * 0.30103).toFixed(1)}` },
            { label: 'Security Rating', value: bits >= 80 ? 'Strong' : bits >= 60 ? 'Moderate' : 'Weak', formatted: bits >= 80 ? 'Strong' : bits >= 60 ? 'Moderate' : 'Weak' },
          ],
          steps: [`Entropy = ${len} × log₂(${pool}) = ${bits.toFixed(2)} bits`],
        };
      }
      if (n.includes('unix') || n.includes('epoch')) {
        const ts = a < 1000000 ? Math.floor(Date.now() / 1000) : a;
        const iso = new Date(ts * 1000).toISOString();
        return {
          primary: { label: 'UTC ISO-8601 Date', value: ts, formatted: iso },
          breakdown: [{ label: 'Unix Epoch Seconds', value: ts, formatted: String(ts) }],
          steps: [`${ts}s → ${iso}`],
        };
      }
      return {
        primary: { label: n.includes('xor') ? 'A XOR B' : n.includes('or') ? 'A OR B' : n.includes('shift') ? 'A << B' : 'A AND B / Binary', value: n.includes('xor') ? a ^ b : n.includes('or') ? a | b : n.includes('shift') ? a << Math.min(20, Math.abs(b)) : a & b, formatted: `${n.includes('xor') ? a ^ b : n.includes('or') ? a | b : n.includes('shift') ? a << Math.min(20, Math.abs(b)) : a & b} (0b${((n.includes('xor') ? a ^ b : a & b) >>> 0).toString(2)})` },
        breakdown: [
          { label: 'Binary (A)', value: (a >>> 0).toString(2), formatted: `0b${(a >>> 0).toString(2)}` },
          { label: 'Hexadecimal (A)', value: (a >>> 0).toString(16).toUpperCase(), formatted: `0x${(a >>> 0).toString(16).toUpperCase()}` },
          { label: 'A + B / A ^ B', value: a + b, formatted: `Sum=${a + b}, XOR=${a ^ b}` },
        ],
        steps: [`A=${a} (0x${(a >>> 0).toString(16)}), B=${b} → AND=${a & b}, OR=${a | b}, XOR=${a ^ b}`],
      };
    },
  };
}
