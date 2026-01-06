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
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { ValidateQRDto } from './dto/validate-qr.dto';

@ApiBearerAuth()
@Controller('tickets')
@UsePipes(new ValidationPipe())
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // @UseGuards(AuthGuard('jwt'))
  // @Post()
  // create(@Req() req, @Body() createTicketDto: CreateTicketDto) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.create(userId, createTicketDto);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Get('/user')
  // myTickets(@Req() req) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.myTickets(userId);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Get('pending-payment')
  // getPendingPayment(@Req() req) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.getPendingPayment(userId);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Patch(':id/send-code')
  // updateCode(@Req() req, @Param('id') ticketId: string) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.sendCode(userId, ticketId);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Patch(':id/email')
  // updateEmail(
  //   @Req() req,
  //   @Param('id') ticketId: string,
  //   @Body() changeEmailDto: ChangeEmailDto,
  // ) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.changeEmail(
  //     userId,
  //     ticketId,
  //     changeEmailDto.newEmail,
  //   );
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Patch(':id/verify')
  // verifyCode(
  //   @Req() req,
  //   @Param('id') ticketId: string,
  //   @Body() verifyCodeDto: VerifyCodeDto,
  // ) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.verifyCode(userId, ticketId, verifyCodeDto.code);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Post(':id/transfer')
  // transferTicket(
  //   @Req() req,
  //   @Param('id') ticketId: string,
  //   @Body() transferTicketDto: TransferTicketDto,
  // ) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.transferTicket(
  //     userId,
  //     ticketId,
  //     transferTicketDto,
  //   );
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Patch('validate-qr')
  // validateQR(@Req() req, @Body() validateQRDto: ValidateQRDto) {
  //   const userId = req.user.sub;
  //   return this.ticketsService.validateQR(userId, validateQRDto);
  // }

  // @Post('confirm-payment')
  // async confirmPayment(@Body() body: any) {
  //   if (!body?.data?.id) return true;
  //   const paymentId = body.data.id;

  //   return this.ticketsService.confirmPayment(paymentId);
  // }

  // @UseGuards(AuthGuard('jwt'))
  // @Delete('/pending-payment/:id')
  // removePendingTicket(@Req() req, @Param('id') id: string) {
  //   const AuthId = req.user.sub;
  //   return this.ticketsService.removePendingTicket(AuthId, id);
  // }
}
