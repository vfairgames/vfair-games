import { afterEach, describe, expect, it, vi } from 'vitest';

import { injectThemeStylesheets } from './inject-theme-stylesheets';

describe('injectThemeStylesheets', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('resolves when stylesheets load', async () => {
    const url = 'https://example.com/theme.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);

    const pending = injectThemeStylesheets([url]);
    link.dispatchEvent(new Event('load'));

    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves when stylesheets fail to load', async () => {
    const url = 'https://example.com/missing.css';

    const pending = injectThemeStylesheets([url]);
    const link = document.querySelector<HTMLLinkElement>(`link[href="${url}"]`);
    link?.dispatchEvent(new Event('error'));

    await expect(pending).resolves.toBeUndefined();
  });

  it('waits for all stylesheets before resolving', async () => {
    const firstUrl = 'https://example.com/first.css';
    const secondUrl = 'https://example.com/second.css';
    let resolved = false;

    const pending = injectThemeStylesheets([firstUrl, secondUrl]);
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    );

    links[0]?.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(resolved).toBe(false);

    void pending.then(() => {
      resolved = true;
    });

    links[1]?.dispatchEvent(new Event('load'));
    await pending;

    expect(resolved).toBe(true);
  });

  it('skips urls that are already present', async () => {
    const url = 'https://example.com/existing.css';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);

    await expect(injectThemeStylesheets([url])).resolves.toBeUndefined();
    expect(document.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(1);
  });

  it('resolves after timeout when no load or error event fires', async () => {
    vi.useFakeTimers();

    try {
      const pending = injectThemeStylesheets(['https://example.com/slow.css']);

      await vi.advanceTimersByTimeAsync(2000);
      await expect(pending).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
