import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { UploadService } from '../services/upload.service.js';

const uploadService = new UploadService();

export const uploadBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'Please attach an image file');
  const result = await uploadService.banner(req.file);
  res.status(201).json({ success: true, message: 'Banner uploaded', data: result });
});
