import nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { randomInt, randomUUID } from 'crypto';
import QRCode from 'qrcode';
import { Ticket } from 'src/interfaces/ticket.interface';
import { Event } from 'src/interfaces/event.interface';
import { QR_VALIDATION_WINDOW_HOURS, VERIFICATION_CODE_EXPIRATION } from './tickets.constants';



if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
  throw new Error('MAIL_USER o MAIL_PASS no configurados');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendVerificationCode(
  email: string,
  verificationCode: string,
) {
  await transporter.sendMail({
    from: `Ticketing System <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Verificá tu email para completar la compra de tu ticket',
    html: `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f5f7fa;
      padding: 24px;
    ">
      <div style="
        max-width: 480px;
        margin: auto;
        background: #ffffff;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
      ">
        <h1 style="margin-bottom: 8px;">🎟️ Ticketing System</h1>

        <p style="font-size: 15px; color: #555;">
          Gracias por tu compra
        </p>

        <p style="font-size: 16px; margin-top: 24px;">
          Tu código de verificación es:
        </p>

        <div style="
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          background: #f0f0f0;
          padding: 12px;
          border-radius: 6px;
          margin: 16px 0;
        ">
          ${verificationCode}
        </div>

        <p style="font-size: 14px; color: #888;">
          Expira en ${VERIFICATION_CODE_EXPIRATION} minutos
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 12px; color: #aaa;">
          Si no realizaste esta compra, podés ignorar este correo.
        </p>
      </div>
    </div>
  `,
  });
}

export function generateVerificationCode() {
  const verificationCode = randomInt(100000, 1000000).toString();

  const verificationCodeHash = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  const verificationCodeExpiresAt = new Date(
    Date.now() + VERIFICATION_CODE_EXPIRATION * 60 * 1000,
  );

  return {
    verificationCode,
    verificationCodeHash,
    verificationCodeExpiresAt,
  };
}

export function isTheSameCode(code: string, codeHash: string): boolean {
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  return hashedCode === codeHash;
}

export function generateQrCode(): string {
  return randomUUID();
}

export async function sendQrCode(
  qrToken: string,
  ticket: Ticket,
  event: Event,
): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(qrToken);
  const email = ticket.purchaserEmail;
  const quantity = ticket.quantity;
  const eventTitle = event.titulo;
  const eventDate = event.fechas.find(
    (f) => f._id?.toString() === ticket.eventDateId.toString(),
  )?.fecha;

  const base64 = qrDataUrl.split(',')[1];
  const qrBuffer = Buffer.from(base64, 'base64');

  await transporter.sendMail({
    from: `Ticketing System <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Tu entrada 🎟️',
    html: `
    <div style="
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f5f7fa;
      padding: 24px;
    ">
      <div style="
        max-width: 480px;
        margin: auto;
        background: #ffffff;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
      ">
        <h1 style="margin-bottom: 8px;">🎟️ ${eventTitle} ${eventDate ? new Date(eventDate).toLocaleDateString() : 'Fecha no disponible'}</h1>

        <p style="font-size: 15px; color: #555;">
          ¡Gracias por tu compra!
        </p>

        <p style="font-size: 16px; margin-top: 24px;">
          Tu entrada es válida para ${quantity} ${quantity === 1 ? 'persona' : 'personas'}.
        </p>

        <p style="font-size: 16px;">
          Escanea el código QR adjunto para acceder al evento.
        </p>

        <div style="
          margin: 24px 0;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;
        ">
          <img src="cid:ticket-qr" alt="Código QR de la entrada" style="max-width: 200px; height: auto;" />
        </div>

      </div>
    </div>
  `,
    attachments: [
      {
        filename: 'ticket-qr.png',
        content: qrBuffer,
        contentType: 'image/png',
        cid: 'ticket-qr',
      },
    ],
  });

  return qrToken;
}

export async function sendTicketRefund(
  amount: number | undefined,
  email: string | undefined,
) {
  if (!email) return;
  await transporter.sendMail({
    from: `Ticketing System <${process.env.MAIL_USER}>`,
    to: email,
    subject: '🎫 Tu reembolso ha sido procesado',
    html: `
      <div style="
        font-family: 'Helvetica Neue', Arial, sans-serif;
        background-color: #f2f4f6;
        padding: 40px 20px;
      ">
        <div style="
          max-width: 500px;
          margin: auto;
          background: #ffffff;
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        ">
          <h1 style="
            color: #1a73e8;
            margin-bottom: 16px;
            font-size: 28px;
          ">💸 Reembolso procesado</h1>

          <p style="
            font-size: 16px;
            color: #555555;
            line-height: 1.5;
          ">
            Hola! Hemos procesado tu reembolso de <strong>$${amount}</strong> debido a que no se pudo completar la compra de tus tickets.
          </p>

          <p style="
            font-size: 16px;
            color: #555555;
            margin-top: 16px;
          ">
            No te preocupes, podés volver a intentar tu compra cuando quieras. ¡Te esperamos para que no te pierdas tu evento favorito!
          </p>
        </div>
      </div>
    `,
  });
}

export function canValidateQr(eventDate: Date | string) {
  const now = new Date();

  const qrValidationCutoffDate = new Date(
    now.getTime() - QR_VALIDATION_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const event = new Date(eventDate);

  return event >= qrValidationCutoffDate;
}
