import { IsEnum } from 'class-validator';
import { Rol } from 'src/interfaces/user.interface';

export class ChangeRoleDto {
  @IsEnum(Rol)
  rol: Rol;
}
