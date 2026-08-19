const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const API_BASE = `${apiOrigin}/api`;

export const fetchVerificationContent = async (
  gameId: string,
  partnerCode: string,
  lang: string,
): Promise<string> => {
  const params = new URLSearchParams({ partnerCode, lang });
  const response = await fetch(
    `${API_BASE}/verification/content/${encodeURIComponent(gameId)}?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to load verification content (${response.status})`);
  }

  const body = (await response.json()) as { html?: unknown };
  return typeof body.html === 'string' ? body.html : '';
};
