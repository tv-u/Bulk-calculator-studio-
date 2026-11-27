import { describe, expect, it } from 'vitest';
import { buildSearchIndex, searchRegistry } from '../src/engine/searchEngine';

describe('Smart 5,729-Calculator Live Search Engine', () => {
  const index = buildSearchIndex([], [], 'en');

  it('indexes all 5,729+ calculators and studio destinations', () => {
    expect(index.length).toBeGreaterThanOrEqual(5735);
  });

  it('ranks exact, prefix, and keyword matches accurately across 5,729 tools', () => {
    const emiMatches = searchRegistry('emi', index);
    expect(emiMatches[0].item.id).toBe('emi-calculator');
    expect(emiMatches[0].item.route).toBe('/calculators/emi-calculator/');

    const autoMatches = searchRegistry('auto loan', index);
    expect(autoMatches.some((m) => m.item.id === 'auto-loan-calculator')).toBe(true);

    const gstMatches = searchRegistry('gst', index);
    expect(gstMatches[0].item.id).toBe('gst-calculator');

    const numMatch = searchRegistry('#1', index);
    expect(numMatch[0].item.id).toBe('emi-calculator');

    expect(searchRegistry('altman z', index).some((m) => m.item.id === 'altman-z-score-calculator')).toBe(true);
    expect(searchRegistry('alabama paycheck', index).some((m) => m.item.id === 'alabama-paycheck-calculator')).toBe(true);
    expect(searchRegistry('lm317', index).some((m) => m.item.id === 'lm317-calculator')).toBe(true);
    expect(searchRegistry('minecraft circle', index).some((m) => m.item.id === 'minecraft-circle-calculator')).toBe(true);
  });

  it('resolves natural synonyms & Hindi transliteration terms (byaj, kist, zameen)', () => {
    const loanMatches = searchRegistry('home loan', index);
    expect(loanMatches.some((m) => m.item.id === 'home-loan-calculator')).toBe(true);

    const bmiMatches = searchRegistry('body mass', index);
    expect(bmiMatches.some((m) => m.item.id === 'bmi-calculator')).toBe(true);

    const byajMatches = searchRegistry('byaj', index);
    expect(byajMatches.some((m) => m.item.id === 'emi-calculator')).toBe(true);

    const fxMatches = searchRegistry('fx', index);
    expect(fxMatches.some((m) => m.item.route === '/currency-converter')).toBe(true);
  });

  it('tolerates minor typos via Levenshtein fuzzy matching', () => {
    const typoPct = searchRegistry('percntge', index);
    expect(typoPct.some((m) => m.item.id === 'percentage-calculator')).toBe(true);

    const typoCompound = searchRegistry('compund', index);
    expect(typoCompound.some((m) => m.item.id === 'compound-interest-calculator')).toBe(true);
  });

  it('immediately removes unpublished calculators and includes published custom calculators', () => {
    const updatedIndex = buildSearchIndex(
      ['emi-calculator'],
      [
        {
          id: 'my-solar',
          name: 'Solar Roof ROI',
          description: 'Custom solar payback',
          categoryLabel: 'Custom',
          published: true,
        },
      ],
      'hi'
    );
    const emiSearch = searchRegistry('emi-calculator', updatedIndex);
    expect(emiSearch.some((m) => m.item.id === 'emi-calculator')).toBe(false);

    const customSearch = searchRegistry('solar roof roi', updatedIndex);
    expect(customSearch[0].item.name).toBe('Solar Roof ROI');
  });
});
