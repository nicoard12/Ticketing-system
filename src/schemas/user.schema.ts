import * as mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
  idAuth: String,
  nombre: String,
  email: String,
  rol: String,
});
