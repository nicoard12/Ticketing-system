import * as mongoose from 'mongoose';

export const UsuarioSchema = new mongoose.Schema({
  idAuth: String,
  nombre: String,
  email: String,
  rol: String,
});
