import * as mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
  idAuth: String,
  nombre: String,
  email: String,
  imagen: String,
  rol: {type: String, enum: ['normal', 'admin', 'productor', 'staff'], default: 'user'},
});
