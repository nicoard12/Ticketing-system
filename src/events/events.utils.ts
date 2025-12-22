import { BadRequestException } from '@nestjs/common';
import { EventDate } from 'src/interfaces/event.interface';

export function parseFechas(fechas: string): EventDate[] {
  let parsed: EventDate[];
  try {
    parsed = JSON.parse(fechas) as EventDate[];
  } catch {
    throw new BadRequestException('Formato de fechas inválido');
  }

  return parsed.map((f) => {
    const cantidad = toNumber(f.cantidadEntradas, 0);
    if (cantidad < 0) {
      throw new BadRequestException(
        `La cantidad de entradas no puede ser negativa (${cantidad} para la fecha ${new Date(
          f.fecha,
        ).toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          dateStyle: 'short',
          timeStyle: 'short',
        })})`,
      );
    }
    if (!f.fecha || isNaN(Date.parse(String(f.fecha)))) {
      throw new BadRequestException(`Fecha inválida: ${f.fecha}`);
    }
    return {
      _id: f._id || undefined,
      fecha: new Date(f.fecha),
      cantidadEntradas: cantidad,
    };
  });
}

export function toNumber(value: any, fallback: number): number {
  return value ? Number(value) : fallback;
}
