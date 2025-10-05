import { describe, expect, it } from 'vitest';

import { normalizeSlug } from '@/utils/slug';

describe('normalizeSlug', () => {
  it('converts mixed case and spaces to kebab-case', () => {
    expect(normalizeSlug('Cura Emotiva')).toBe('cura-emotiva');
  });

  it('removes special characters and trims hyphens', () => {
    expect(normalizeSlug('  Respiro! Consapevole  ')).toBe('respiro-consapevole');
    expect(normalizeSlug('---Spazio*** Sicuro---')).toBe('spazio-sicuro');
  });

  it('collapses multiple separators into a single hyphen', () => {
    expect(normalizeSlug('respiro   consapevole')).toBe('respiro-consapevole');
    expect(normalizeSlug('cura_emotiva')).toBe('cura-emotiva');
  });

  it('returns empty string when no valid characters remain', () => {
    expect(normalizeSlug('!!!')).toBe('');
  });
});
