// TK-0005: Kategorien liegen jetzt in der DB (belegbot_categories) und kommen
// im Client ueber useCategories(). Diese Liste ist nur noch der Seed fuer die
// Migration und der Farb-Fallback fuer Belege, deren Kategorie geloescht wurde.
export const CATEGORIES = [
  'Lebensmittel',
  'Restaurant & Café',
  'Haushalt & Wohnen',
  'Gesundheit & Apotheke',
  'Kleidung & Mode',
  'Elektronik & Technik',
  'Transport & Auto',
  'Freizeit & Sport',
  'Reisen & Urlaub',
  'Bildung & Bücher',
  'Beauty & Pflege',
  'Versicherung & Finanzen',
  'Sonstiges',
  'Andere',
] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, string> = {
  'Lebensmittel': '#4ECB71',
  'Restaurant & Café': '#E8A838',
  'Haushalt & Wohnen': '#3FC9C0',
  'Gesundheit & Apotheke': '#E85050',
  'Kleidung & Mode': '#A855F7',
  'Elektronik & Technik': '#3B82F6',
  'Transport & Auto': '#F97316',
  'Freizeit & Sport': '#EC4899',
  'Reisen & Urlaub': '#14B8A6',
  'Bildung & Bücher': '#F59E0B',
  'Beauty & Pflege': '#E879F9',
  'Versicherung & Finanzen': '#6366F1',
  'Sonstiges': '#8A90B0',
  'Andere': '#555A78',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#8A90B0';
}

/** Format euros */
export function formatEuro(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/** Format date to German locale */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format date for input field */
export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getUserLabel(user: string): string {
  return capitalize(user);
}
