import express from 'express';
import { getMyCertificates, generateCertificate } from '../controllers/certificateController.js';
import authMiddleware from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/my-certificates', authMiddleware, getMyCertificates);
// Route: POST /api/certificate/generate
router.post('/generate', generateCertificate);


export default router;