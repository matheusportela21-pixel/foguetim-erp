export function normalizeSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    // Remove acentos (fallback client-side; o banco usa unaccent para busca server-side)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Normaliza espaços e hífens
    .replace(/[-\s]+/g, ' ')
    // Remove caracteres especiais exceto letras, números e espaços
    .replace(/[^\w\s]/g, '')
    .trim()
}
