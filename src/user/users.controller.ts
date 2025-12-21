import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Req,
  Put,
  Param,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChangeRoleDto } from './dto/change-role.dto';

@ApiBearerAuth()
@Controller('users')
@UsePipes(new ValidationPipe())
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getAll(@Req() req){
    const AuthId = req.user.sub;
    return this.usersService.getAllUsers(AuthId)
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.find(createUserDto.idAuth);
    if (user) return user;
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/role')
  async changeRole(@Param('id') idUser: string, @Body() newRole: ChangeRoleDto, @Req() req){
    const AuthId = req.user.sub;

    return this.usersService.changeRole(AuthId, newRole, idUser)
  }
}
