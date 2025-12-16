import { EventDate } from "src/interfaces/event.interface";

export function parseFechas(fechas: string): EventDate[] {
  const parsed = JSON.parse(fechas) as EventDate[];

  return parsed
    .filter(
      (f) => !!f?.fecha && !isNaN(Date.parse(String(f.fecha)))
    )
    .map((f) => ({
      fecha: new Date(f.fecha),
      cantidadEntradas: toNumber(f.cantidadEntradas, 0),
    }));
}



export function toNumber(value: any, fallback: number): number {
  return value ? Number(value) : fallback;
}


