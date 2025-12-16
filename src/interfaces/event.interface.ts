import { Document } from 'mongoose';

export type EventDate= {
  fecha: Date | string;
  cantidadEntradas: number;
}

export interface Event extends Document {
  readonly titulo: string;
  readonly fechas: EventDate[];
  readonly descripcion: string;
  readonly precioEntrada: number;
  readonly ubicacion: string;
  readonly imagenUrl: string;
  readonly createdBy: string;
}