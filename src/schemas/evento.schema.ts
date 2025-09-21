import * as mongoose from 'mongoose';

const FechaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  fecha: { type: Date, required: true },
  ticketsDisponibles: { type: Number, required: true },
});

export const EventoSchema = new mongoose.Schema({
  titulo: { type: String, unique: true },
  fechas: [FechaSchema] ,
  descripcion: String,
  cantidadEntradas: Number,
  precioEntrada: Number,
  ubicacion: String,
  imagenUrl: String
});