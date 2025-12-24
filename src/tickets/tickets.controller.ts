import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@ApiBearerAuth()
@Controller('tickets')
@UsePipes(new ValidationPipe())
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req, @Body() createTicketDto: CreateTicketDto) {
    const userId = req.user.sub;
    return this.ticketsService.create(userId, createTicketDto);
  }

  @Get()
  findAll() {
    return this.ticketsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/send-code')
  updateCode(@Req() req, @Param('id') ticketId: string) {
    const userId = req.user.sub;
    return this.ticketsService.sendCode(userId, ticketId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/email')
  updateEmail(
    @Req() req,
    @Param('id') ticketId: string,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    const userId = req.user.sub;
    return this.ticketsService.changeEmail(
      userId,
      ticketId,
      changeEmailDto.newEmail,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/verify')
  verifyCode(
    @Req() req,
    @Param('id') ticketId: string,
    @Body() verifyCodeDto: VerifyCodeDto,
  ) {
    const userId = req.user.sub;
    return this.ticketsService.verifyCode(
      userId,
      ticketId,
      verifyCodeDto.code,
    );
  }
}
