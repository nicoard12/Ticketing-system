import * as mongoose from 'mongoose';

const DateSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  fecha: { type: Date, required: true },
  ticketsDisponibles: { type: Number, required: true },
});

export const EventSchema = new mongoose.Schema({
  titulo: { type: String, unique: true },
  fechas: [DateSchema],
  descripcion: String,
  cantidadEntradas: Number,
  precioEntrada: Number,
  ubicacion: String,
  imagenUrl: String,
  createdBy: String
});
