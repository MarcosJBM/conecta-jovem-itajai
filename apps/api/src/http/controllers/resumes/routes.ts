import { Router } from 'express';
import {
  requireSession,
  requireSameOriginWrite,
} from '../../middlewares/auth.js';
import { getResume } from './get-resume.js';
import { updateResume } from './update-resume.js';
export const resumeRoutes = Router();
resumeRoutes.use(requireSession);
resumeRoutes.get('/me', getResume);
resumeRoutes.put('/me', requireSameOriginWrite, updateResume);
