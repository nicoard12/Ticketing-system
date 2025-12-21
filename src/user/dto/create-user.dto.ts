import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Rol } from 'src/interfaces/user.interface';


export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  idAuth: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  imagen: string;

  @IsEnum(Rol, {
    message: 'el rol debe ser productor, normal o staff',
  })
  @IsNotEmpty()
  @IsEnum(Rol)
  rol: Rol;
  
}
