const STYLESHEET_LOAD_TIMEOUT_MS = 2000;

const waitForStylesheet = (link: HTMLLinkElement): Promise<void> =>
  new Promise((resolve) => {
    if (link.sheet) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
    setTimeout(finish, STYLESHEET_LOAD_TIMEOUT_MS);
  });

export const injectThemeStylesheets = async (
  urls: readonly string[],
): Promise<void> => {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    const existingHrefs = new Set(
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
        (link) => link.getAttribute('href'),
      ),
    );

    const pending: Promise<void>[] = [];

    for (const url of urls) {
      if (existingHrefs.has(url)) {
        continue;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      existingHrefs.add(url);
      pending.push(waitForStylesheet(link));
    }

    await Promise.all(pending);
  } catch {
    return;
  }
};
