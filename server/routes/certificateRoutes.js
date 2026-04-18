import express from 'express';
import { generateCertificate } from '../controllers/certificateController.js';

const router = express.Router();

// Route: POST /api/certificate/generate
router.post('/generate', generateCertificate);


export default router;