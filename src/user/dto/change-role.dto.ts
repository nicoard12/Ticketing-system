import { IsEnum } from 'class-validator';
import { Rol } from 'src/user/interfaces/user.interface';

export class ChangeRoleDto {
  @IsEnum(Rol)
  rol: Rol;
}
