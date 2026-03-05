import * as mongoose from 'mongoose';

const DateSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  cantidadEntradas: { type: Number, required: true },
});

export const EventSchema = new mongoose.Schema({
  titulo: { type: String, unique: true },
  fechas: [DateSchema],
  descripcion: String,
  precioEntrada: Number,
  ubicacion: String,
  imagenUrl: String,
  createdBy: String
});
