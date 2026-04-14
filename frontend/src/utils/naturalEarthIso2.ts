/**
 * Natural Earth `ne_110m_admin_0_countries` uses ISO_A2 "-99" for several sovereign areas
 * (France, Norway, Kosovo, etc.). We map those to stable 2-letter codes used by the app.
 *
 * Kosovo: dataset WB_A2 is "KV"; we use "XK" (widely used, matches backend continent lists).
 */
export type NaturalEarthProps = {
  ISO_A2?: string;
  WB_A2?: string;
  ADM0_A3?: string;
  ADMIN?: string;
  ISO_A3?: string;
};

export function resolveNaturalEarthIso2(p: NaturalEarthProps | undefined | null): string | null {
  if (!p) return null;

  const iso = p.ISO_A2;
  if (iso && iso !== '-99') return iso;

  const adm = p.ADM0_A3;
  const wb = p.WB_A2;

  if (adm === 'KOS' || p.ADMIN === 'Kosovo' || wb === 'KV') return 'XK';
  if (wb && wb !== '-99') return wb;
  if (adm === 'NOR') return 'NO';
  if (adm === 'FRA') return 'FR';

  return null;
}
