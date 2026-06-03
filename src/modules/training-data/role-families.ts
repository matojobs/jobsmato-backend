/**
 * Role-family classification for candidate↔job matching.
 * Keyword-based: maps a free-text role string to a family, and scores
 * similarity between a job title and a candidate's sourced-for role.
 */

export type RoleFamily =
  | 'sales' | 'collections' | 'support' | 'logistics' | 'operations' | 'tech' | 'other';

// Keyword lists — first match wins (order matters: specific before generic)
const FAMILY_KEYWORDS: { family: RoleFamily; keywords: string[] }[] = [
  { family: 'collections', keywords: ['collection', 'recovery', 'cst', 'delinquenc'] },
  { family: 'sales', keywords: [
    'sales', 'telesales', 'tele sales', 'inside sales', 'bde', 'business development',
    'relationship manager', ' rm', 'channel sales', 'area sales', 'asm', 'arm',
    'field sales', 'fse', 'business manager', 'account manager', 'pre sales', 'presales',
    'revenue', 'acquisition', 'closing',
  ] },
  { family: 'support', keywords: [
    'customer support', 'customer care', 'customer service', 'telecaller', 'tele caller',
    'tele-caller', 'call center', 'call centre', 'support', 'cse', 'csa', 'csr',
    'voice process', 'bpo', 'kpo', 'helpdesk', 'help desk', 'chat process',
  ] },
  { family: 'logistics', keywords: [
    'driver', 'delivery', 'dispatch', 'fleet', 'rider', 'logistics', 'warehouse',
    'supply chain', 'transport', 'pilot',
  ] },
  { family: 'tech', keywords: [
    'developer', 'engineer', 'software', 'it support', 'technical', 'programmer',
    'qa ', 'tester', 'devops', 'data ', 'analyst',
  ] },
  { family: 'operations', keywords: [
    'evaluator', 'operations', 'coordinator', ' ops', 'inventory', 'procurement',
    'back office', 'backoffice', 'admin', 'process associate', 'data entry',
  ] },
];

// Families that are "adjacent" — a candidate from one can plausibly do the other
// (all are phone/field roles requiring similar skills). Scored at related-level.
const RELATED: Record<RoleFamily, RoleFamily[]> = {
  sales:       ['collections', 'support', 'operations'],
  collections: ['sales', 'support'],
  support:     ['sales', 'collections', 'operations'],
  logistics:   ['operations'],
  operations:  ['support', 'sales', 'logistics'],
  tech:        [],
  other:       [],
};

export function classifyRole(role?: string | null): RoleFamily {
  if (!role) return 'other';
  const r = ` ${role.toLowerCase().trim()} `;
  for (const { family, keywords } of FAMILY_KEYWORDS) {
    if (keywords.some(k => r.includes(k))) return family;
  }
  return 'other';
}

const normalize = (s?: string | null) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Role similarity score 0–100.
 *  100 = exact/near-exact title match
 *   70 = same family
 *   40 = related/adjacent family
 *    0 = unrelated
 */
export function roleSimilarity(jobTitle: string, candidateRole?: string | null): number {
  if (!candidateRole) return 0;
  const jt = normalize(jobTitle);
  const cr = normalize(candidateRole);
  if (!jt || !cr) return 0;

  // exact or containment match
  if (jt === cr || jt.includes(cr) || cr.includes(jt)) return 100;

  // token overlap → near match
  const jtTokens = new Set(jt.split(' '));
  const crTokens = cr.split(' ');
  const overlap = crTokens.filter(t => t.length > 2 && jtTokens.has(t)).length;
  if (overlap >= 2) return 90;

  const jf = classifyRole(jobTitle);
  const cf = classifyRole(candidateRole);
  if (jf === 'other' || cf === 'other') return overlap === 1 ? 40 : 0;
  if (jf === cf) return 70;
  if (RELATED[jf]?.includes(cf)) return 40;
  return 0;
}

/**
 * SQL ILIKE fragments to pre-filter the candidate pool by role family.
 * Returns keyword list to OR-match against sourcedForRole in SQL.
 */
export function familyKeywordsFor(jobTitle: string): string[] {
  const fam = classifyRole(jobTitle);
  if (fam === 'other') {
    // fall back to job-title tokens
    return normalize(jobTitle).split(' ').filter(t => t.length > 3);
  }
  const families = [fam, ...(RELATED[fam] || [])];
  const kws = new Set<string>();
  for (const f of families) {
    const entry = FAMILY_KEYWORDS.find(e => e.family === f);
    entry?.keywords.forEach(k => kws.add(k.trim()));
  }
  return [...kws].filter(Boolean);
}
