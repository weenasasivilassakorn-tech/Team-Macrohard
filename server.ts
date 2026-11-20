import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

interface ChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

interface AssistantChatRequest {
  role?: 'farmer' | 'baac';
  lang?: 'th' | 'en';
  message?: string;
  history?: ChatHistoryMessage[];
  contextSummary?: string;
}

function buildSystemInstruction(
  role: 'farmer' | 'baac',
  lang: 'th' | 'en',
  contextSummary: string
): string {
  const languageDirective =
    lang === 'th'
      ? 'ตอบเป็นภาษาไทยที่สุภาพ กระชับ อ่านง่าย เหมาะกับหน้าจอมือถือ (ใช้หัวข้อย่อยสั้นๆ ไม่เกิน 4-6 บรรทัดต่อคำตอบ)'
      : 'Respond in clear, concise English formatted for mobile readability (short bullet points, under 6 lines).';

  if (role === 'baac') {
    return [
      'You are the CropShield BAAC Credit & Risk Officer AI Copilot (ผู้ช่วยวิเคราะห์ความเสี่ยงพอร์ตและสินเชื่อ ธ.ก.ส.).',
      'Your job is to help BAAC loan officers quickly assess 7-day agricultural climate risk, Min Health Score thresholds, Tranche disbursements, credit holds, parametric insurance triggers, and SMS outreach.',
      'Ground every recommendation strictly in the live portfolio metrics and NASA satellite data provided in the context below.',
      languageDirective,
      contextSummary ? `\nLive BAAC Portfolio Context:\n${contextSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'You are the CropShield Smart Farming & Credit AI Assistant (ผู้ช่วยเกษตรกรอัจฉริยะ CropShield).',
    'Explain soil moisture, 7-day drought/flood forecasts, NASA POWER satellite scores, irrigation/fertilizer timing, Parametric Shield insurance, and working credit eligibility in warm, encouraging, plain everyday language suitable for elderly Thai farmers.',
    'Ground every answer in the live plot and NASA satellite context provided below.',
    languageDirective,
    contextSummary ? `\nLive Farmer Plot Context:\n${contextSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const port = isProd ? Number(process.env.PORT ?? 3000) : 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/nasa-power/point', async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        res.status(400).json({ error: 'Invalid lat/lon coordinates' });
        return;
      }

      const endDate = new Date();
      endDate.setUTCDate(endDate.getUTCDate() - 4);
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 7);
      if (endDate.getUTCFullYear() > 2025) {
        endDate.setUTCFullYear(2025);
        startDate.setUTCFullYear(2025);
      }
      const fmt = (d: Date) =>
        `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
          d.getUTCDate()
        ).padStart(2, '0')}`;

      const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M,GWETTOP&community=AG&longitude=${lon.toFixed(
        4
      )}&latitude=${lat.toFixed(4)}&start=${fmt(startDate)}&end=${fmt(endDate)}&format=JSON`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `NASA POWER HTTP ${upstream.status}` });
        return;
      }
      const data = await upstream.json();
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'NASA POWER upstream fetch failed';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const body = (req.body ?? {}) as AssistantChatRequest;
      const role = body.role === 'baac' ? 'baac' : 'farmer';
      const lang = body.lang === 'en' ? 'en' : 'th';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const contextSummary =
        typeof body.contextSummary === 'string' ? body.contextSummary.slice(0, 6000) : '';
      const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

      if (!message) {
        res.status(400).json({
          error:
            lang === 'th'
              ? 'กรุณาพิมพ์คำถามก่อนส่งข้อความ'
              : 'Please enter a message before sending.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            lang === 'th'
              ? 'ยังไม่ได้เชื่อมต่อ Gemini API Key ในสภาพแวดล้อมเซิร์ฟเวอร์ (Settings > Secrets)'
              : 'Gemini API key is not configured on the server (Settings > Secrets).',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contents = [
        ...history
          .filter(
            (item): item is ChatHistoryMessage =>
              Boolean(item) &&
              (item.role === 'user' || item.role === 'model') &&
              typeof item.text === 'string' &&
              item.text.trim().length > 0
          )
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text.trim() }],
          })),
        {
          role: 'user' as const,
          parts: [{ text: message }],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction: buildSystemInstruction(role, lang, contextSummary),
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        res.status(502).json({
          error:
            lang === 'th'
              ? 'ผู้ช่วย AI ไม่สามารถสร้างคำตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
              : 'AI assistant returned an empty response. Please try again.',
        });
        return;
      }

      res.json({
        reply: replyText,
        model: 'gemini-4-hydrogen',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected Gemini API error';
      console.error('[/api/assistant/chat] Error:', message);
      res.status(500).json({
        error: `AI Assistant service error: ${message}`,
      });
    }
  });

  app.post('/api/assistant/draft-sms', async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        lang?: 'th' | 'en';
        farmerName?: string;
        cropType?: string;
        nasaHealthScore?: number;
        riskStatus7Day?: string;
        trancheInfo?: string;
        repaymentDueLabel?: string;
        daysUntilRepayment?: number;
      };
      const lang = body.lang === 'en' ? 'en' : 'th';
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({ error: 'Gemini API key unavailable' });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt =
        lang === 'en'
          ? `Draft one short, warm SMS message (max 280 chars) from a BAAC loan officer to farmer "${body.farmerName ?? 'Farmer'}" growing ${body.cropType ?? 'crop'}. Include: NASA health score ${body.nasaHealthScore ?? 75}/100, 7-day status "${body.riskStatus7Day ?? 'Monitor'}", tranche info "${body.trancheInfo ?? 'Tranche 2'}", and repayment due ${body.repaymentDueLabel ?? 'soon'} (${body.daysUntilRepayment ?? 14} days left). Return only the SMS text.`
          : `ช่วยร่างข้อความ SMS สั้นๆ สุภาพ เข้าใจง่ายสำหรับผู้สูงอายุ (ไม่เกิน 3 บรรทัด) จากเจ้าหน้าที่ ธ.ก.ส. ถึงคุณ${body.farmerName ?? 'เกษตรกร'} (ปลูก${body.cropType ?? 'พืชไร่'}) โดยระบุ: 1) คะแนนสุขภาพแปลง NASA ${body.nasaHealthScore ?? 75}/100 และเตือนความเสี่ยง 7 วัน (${body.riskStatus7Day ?? 'เฝ้าระวัง'}) 2) สถานะงวดสินเชื่อ (${body.trancheInfo ?? 'งวดที่ 2'}) 3) วันกำหนดชำระคืน ${body.repaymentDueLabel ?? ''} (เหลืออีก ${body.daysUntilRepayment ?? 14} วัน) ส่งคืนเฉพาะข้อความ SMS เท่านั้น`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const draft = response.text?.trim();
      if (!draft) {
        res.status(502).json({ error: 'Empty AI SMS draft' });
        return;
      }
      res.json({ draft });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected Gemini API error';
      console.error('[/api/assistant/draft-sms] Error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CropShield server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CropShield server:', err);
  process.exit(1);
});
