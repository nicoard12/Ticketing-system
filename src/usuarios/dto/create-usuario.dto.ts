import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Rol } from '../entities/usuario.entity';


export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(Rol, {
    message: 'el rol debe ser productor, normal o staff',
  })
  @IsNotEmpty()
  rol: Rol;
  
}
