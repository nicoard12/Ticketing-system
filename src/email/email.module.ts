import { Module } from '@nestjs/common';
import { SMTPService } from './SMTP.service';

@Module({
  providers: [
    {
      provide: "EMAIL_PROVIDER",
      useClass: SMTPService,
    },
  ],
  exports: ["EMAIL_PROVIDER"],
})
export class EmailModule {}
