import { describe, expect, it } from 'vitest';

import { currencyStep, formatCurrency } from './currency';

describe('currencyStep', () => {
  it('returns the stepper size for common decimal places', () => {
    expect(currencyStep(0)).toBe(1);
    expect(currencyStep(2)).toBe(0.01);
    expect(currencyStep(4)).toBe(0.0001);
  });
});

describe('formatCurrency', () => {
  it('formats with the currency symbol by default', () => {
    expect(formatCurrency(1234.5, { currency: 'USD', locale: 'en-US' })).toBe(
      '$1,234.50',
    );
  });

  it('formats without a symbol when showSymbol is false', () => {
    expect(
      formatCurrency(1234.5, {
        currency: 'USD',
        locale: 'en-US',
        showSymbol: false,
      }),
    ).toBe('1,234.50');
  });

  it('honors an explicit decimals override', () => {
    expect(
      formatCurrency(1.5, {
        currency: 'USD',
        locale: 'en-US',
        decimals: 0,
      }),
    ).toBe('$2');
    expect(
      formatCurrency(1.23456, {
        currency: 'USD',
        locale: 'en-US',
        decimals: 4,
      }),
    ).toBe('$1.2346');
  });

  it('rounds before formatting', () => {
    expect(
      formatCurrency(1.005, {
        currency: 'USD',
        locale: 'en-US',
        decimals: 2,
      }),
    ).toBe('$1.01');
  });

  it('uses the currency locale map when locale is omitted', () => {
    expect(formatCurrency(10, { currency: 'EUR' })).toContain('10');
    expect(formatCurrency(10, { currency: 'EUR' })).toMatch(/€|EUR/);
  });

  it('falls back to en-US for unknown currencies when locale is omitted', () => {
    expect(
      formatCurrency(12.3, {
        currency: 'UNKNOWN',
        showSymbol: false,
      }),
    ).toBe('12.30');
  });

  it('uses an explicit locale over the currency map', () => {
    expect(
      formatCurrency(1234.5, {
        currency: 'USD',
        locale: 'de-DE',
        showSymbol: false,
      }),
    ).toBe('1.234,50');
  });
});
