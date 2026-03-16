export function normalizeSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, ' ')
    .replace(/[^\w\s]/g, '')
}
