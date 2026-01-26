import * as crypto from 'crypto';
import { randomInt, randomUUID } from 'crypto';
import QRCode from 'qrcode';
import {
  QR_VALIDATION_WINDOW_HOURS,
  VERIFICATION_CODE_EXPIRATION,
} from './tickets.constants';

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

export function generateQrID(): string {
  return randomUUID();
}

export async function generateQrCode(qrID: string): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(qrID);
  const base64 = qrDataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}


export function canValidateQr(eventDate: Date | string) {
  const now = new Date();

  const qrValidationCutoffDate = new Date(
    now.getTime() - QR_VALIDATION_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const event = new Date(eventDate);

  return event >= qrValidationCutoffDate;
}
