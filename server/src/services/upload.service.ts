import fs from 'node:fs';
import path from 'node:path';
import { cloudinaryConfigured, uploadImage } from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { randomId } from '../utils/slug.js';
import { ApiError } from '../middlewares/errorHandler.js';

export const UPLOADS_DIR = path.resolve('uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export class UploadService {
  async banner(file: Express.Multer.File): Promise<{ url: string; publicId?: string }> {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) throw new ApiError(400, 'Unsupported image type. Use JPEG, PNG, WebP or GIF.');

    if (cloudinaryConfigured()) {
      return uploadImage(file.buffer, 'bookit/banners');
    }

    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `banner-${Date.now()}-${randomId()}.${ext}`;
    await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), file.buffer);
    return { url: `${env.STATIC_URL}/uploads/${filename}` };
  }
}
