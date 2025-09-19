import express from 'express';
import POMConverterService from '../services/POMConverterService.js';

const router = express.Router();
const converter = new POMConverterService();

// Simple ping for diagnostics
router.get('/ping', (req, res) => {
  res.json({ ok: true, route: '/api/pom', time: new Date().toISOString() });
});

// POST /api/pom/convert
// Body: { code?: string, codeBase64?: string, language?: 'javascript'|'typescript', className?: string, testName?: string }
router.post('/convert', async (req, res) => {
  try {
    const { code, codeBase64, language, className, testName } = req.body || {};
    let source = code;
    if (!source && codeBase64) {
      try { source = Buffer.from(codeBase64, 'base64').toString('utf-8'); } catch {}
    }
    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return res.status(400).json({ error: 'code or codeBase64 is required' });
    }

    const result = await converter.convertToPOM(source, { language, className, testName });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('POM conversion failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
