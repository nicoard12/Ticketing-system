export interface IFileStorage {
  uploadImage(file: Express.Multer.File, folder?: string): Promise<string>;
  deleteImage(imageUrl: string): Promise<void>;
}
