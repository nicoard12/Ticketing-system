import nodemailer from 'nodemailer';
import { User } from 'src/interfaces/user.interface';

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

export async function sendMail(
  user: User,
  verificationCode: string,
  CODE_EXPIRATION: number,
) {
  await transporter.sendMail({
    from: `Ticketing System <${process.env.MAIL_USER}>`,
    to: user.email,
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
          Expira en ${CODE_EXPIRATION} minutos
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
