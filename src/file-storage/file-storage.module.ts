import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [
    {
      provide: "FILESTORAGE_PROVIDER",
      useClass: CloudinaryService,
    },
  ],
  exports: ["FILESTORAGE_PROVIDER"],
})
export class FileStorageModule {}
