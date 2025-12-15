import { Document } from 'mongoose';

export interface Event extends Document {
  readonly titulo: string;
  readonly fechas: Date[];
  readonly descripcion: string;
  readonly cantidadEntradas: number;
  readonly precioEntrada: number;
  readonly ubicacion: string;
  readonly imagenUrl: string;
  readonly createdBy: string;
}