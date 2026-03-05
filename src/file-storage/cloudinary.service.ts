import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { IFileStorage } from 'src/file-storage/file-storage.interaface';

@Injectable()
export class CloudinaryService implements IFileStorage {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'eventos',
  ): Promise<string> {
    try {
      const result = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url)
              return reject(
                new Error('No se pudo obtener la URL de Cloudinary'),
              );
            resolve(result.secure_url);
          },
        );
        stream.end(file.buffer);
      });

      return result;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw new Error('Falló la carga de imagen en Cloudinary');
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const parts = imageUrl.split('/');
      const fileName = parts.pop()?.split('.')[0];
      const folder = parts.pop();
      const publicId = `${folder}/${fileName}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error('Error borrando imagen en Cloudinary:', err);
    }
  }
}
