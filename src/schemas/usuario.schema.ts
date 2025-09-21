import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

export const UsuarioSchema = new mongoose.Schema({
  nombre: String,
  apellido: String,
  email: String,
  password: String,
  rol: String,
});

//encriptar contraseña antes de guardar
UsuarioSchema.pre('save', async function (next) {
  const user = this as any;

  if (!user.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  next();
});