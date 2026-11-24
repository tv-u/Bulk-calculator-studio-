import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RTL_LANGUAGE_CODES, SUPPORTED_LANGUAGES } from '../src/i18n/languages';

describe('50-Language Internationalization & RTL Suite', () => {
  it('defines exact 50 supported languages with unique codes and proper RTL markers', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(50);
    const codes = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
    expect(codes.size).toBe(50);

    for (const rtlCode of RTL_LANGUAGE_CODES) {
      const lang = SUPPORTED_LANGUAGES.find((l) => l.code === rtlCode);
      expect(lang?.dir).toBe('rtl');
    }
    expect(SUPPORTED_LANGUAGES.find((l) => l.code === 'en')?.dir).toBe('ltr');
    expect(SUPPORTED_LANGUAGES.find((l) => l.code === 'hi')?.dir).toBe('ltr');
  });

  it('has valid JSON message bundles with native translations for all 50 languages in public/messages/', () => {
    const dir = path.resolve(process.cwd(), 'public/messages');
    for (const lang of SUPPORTED_LANGUAGES) {
      const file = path.join(dir, `${lang.code}.json`);
      expect(fs.existsSync(file)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
      expect(parsed['brand.name']).toBe('BULK CALCULATOR STUDIO');
      expect(typeof parsed['nav.home']).toBe('string');
      expect(parsed['nav.home'].length).toBeGreaterThan(0);
      expect(typeof parsed['calc.back']).toBe('string');
      expect(typeof parsed['calc.close']).toBe('string');
      expect(typeof parsed['calc.downloadPdf']).toBe('string');
      if (lang.code !== 'en') {
        expect(parsed['calc.back']).not.toBe('Back');
        expect(parsed['calc.close']).not.toBe('Close');
      }
    }

    const auditFile = path.resolve(process.cwd(), 'public/reports/i18n-audit.json');
    const audit = JSON.parse(fs.readFileSync(auditFile, 'utf8')) as {
      languages: Array<{ code: string; localizedKeys: number }>;
    };
    expect(audit.languages.length).toBe(50);
    for (const entry of audit.languages) {
      expect(entry.localizedKeys).toBeGreaterThanOrEqual(8);
    }
  });
});
