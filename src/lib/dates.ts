const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «Hoy he completado» si fue hoy; si no, «El 3 de octubre completé» (con el año si no es el actual) */
export function completedPhrase(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) return 'Hoy he completado';
  const year = d.getFullYear() === now.getFullYear() ? '' : ` de ${d.getFullYear()}`;
  return `El ${d.getDate()} de ${MONTHS[d.getMonth()]}${year} completé`;
}
