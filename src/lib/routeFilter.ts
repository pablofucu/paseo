/** La ruta gratis más corta, para sugerirla como primer paseo; undefined si no hay ninguna gratis */
export function shortestFree<T extends { price: 'free' | { eur: number }; durationMin: number }>(tours: T[]): T | undefined {
  return tours.filter(t => t.price === 'free').sort((a, b) => a.durationMin - b.durationMin)[0];
}
