export function parseFechas(fechas: any): Date[] {
  if (!fechas) return [];

  return JSON.parse(fechas)
    .filter((f: string | null) => f && !isNaN(Date.parse(f)))
    .map((f: string) => new Date(f));
}

export function toNumber(value: any, fallback: number): number {
  return value ? Number(value) : fallback;
}

export function buildFechasConTickets(
  fechas: Date[],
  titulo: string,
  cantidadEntradas: number,
) {
  return fechas.map((f) => ({
    titulo,
    fecha: f,
    ticketsDisponibles: cantidadEntradas,
  }));
}
