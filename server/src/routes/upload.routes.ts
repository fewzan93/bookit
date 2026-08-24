import { Router } from 'express';
import multer from 'multer';
import { uploadBanner } from '../controllers/upload.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported image type'));
  },
});

export const uploadRoutes = Router();

uploadRoutes.post('/banner', authRequired, requireRoles('organizer', 'admin'), upload.single('file'), uploadBanner);
