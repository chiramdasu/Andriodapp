import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to safely initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// OCR Receipt Parsing Route
app.post('/api/parse-receipt', async (req: express.Request, res: express.Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 parameter is required.' });
    }

    // Clean base64 string prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const ai = getGeminiClient();

    const systemInstruction = `You are an expert OCR, document intelligence, and receipt processing AI agent.
Your mission is to accurately parse receipt images and extract structural transaction details, financial totals, store information, itemized products, and warranty coverage details.

Key Extraction Guidelines:
1. Store Name: Extract the primary merchant or store brand (e.g. Best Buy, Home Depot, Apple Store, Target, Costco, Walmart).
2. Purchase Date: Extract or infer the date of purchase in ISO YYYY-MM-DD format. If year is missing, assume current/recent year (2026).
3. Financial Metrics: Extract total amount, subtotal, and tax as numbers. Identify currency (e.g. USD, EUR, $, £).
4. Items & Products: Extract all itemized products with name, price, and quantity.
5. Warranty Expiration Dates:
   - Identify whether any item (or the overall receipt) explicitly mentions warranty coverage (e.g. "2 Year Plan", "Extended Warranty", "Manufacturer Warranty 12 Months", "AppleCare+ thru 2028-05-20", "Return within 90 days").
   - If an item is a high-value electronic, tool, appliance, computer, or durable good where standard manufacturer warranties apply (e.g., 1 year for TVs, laptops, power tools), calculate the expiration date starting from the purchase date and document it in warrantyNotes.
   - Return the overall main/latest warranty expiration date in overallWarrantyExpirationDate (YYYY-MM-DD).
6. Provide an OCR confidence score from 0 to 100 based on image legibility and clarity.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Analyze this receipt image. Extract store details, purchase date, total amount, item breakdown, and warranty expiration dates.',
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING, description: 'Store or vendor name' },
            storeAddress: { type: Type.STRING, description: 'Store address or location' },
            storePhone: { type: Type.STRING, description: 'Store phone number' },
            purchaseDate: { type: Type.STRING, description: 'Purchase date in YYYY-MM-DD format' },
            purchaseTime: { type: Type.STRING, description: 'Time of purchase (e.g. 14:23)' },
            receiptNumber: { type: Type.STRING, description: 'Receipt ID, Order #, or Transaction #' },
            paymentMethod: { type: Type.STRING, description: 'Payment method (e.g. Visa ending 4910, Cash, Apple Pay)' },
            category: { type: Type.STRING, description: 'Primary store category e.g. Electronics, Home Improvement, Retail, Appliances, Groceries, Other' },
            subtotal: { type: Type.NUMBER, description: 'Subtotal cost before tax' },
            tax: { type: Type.NUMBER, description: 'Sales tax amount' },
            totalAmount: { type: Type.NUMBER, description: 'Total payment amount' },
            currency: { type: Type.STRING, description: 'Currency symbol or code e.g. USD, $' },
            overallWarrantyExpirationDate: { type: Type.STRING, description: 'Primary or furthest warranty expiration date in YYYY-MM-DD' },
            warrantySummary: { type: Type.STRING, description: 'Summary description of warranty coverage' },
            confidenceScore: { type: Type.NUMBER, description: 'OCR accuracy confidence level 0-100' },
            rawNotes: { type: Type.STRING, description: 'Additional terms, return policy, or barcode info' },
            items: {
              type: Type.ARRAY,
              description: 'List of individual line items purchased',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Item name or description' },
                  price: { type: Type.NUMBER, description: 'Item price' },
                  quantity: { type: Type.NUMBER, description: 'Item quantity' },
                  category: { type: Type.STRING, description: 'Item sub-category' },
                  hasWarranty: { type: Type.BOOLEAN, description: 'Whether item includes warranty coverage' },
                  warrantyDurationMonths: { type: Type.NUMBER, description: 'Warranty duration in months e.g. 12, 24, 36' },
                  warrantyExpirationDate: { type: Type.STRING, description: 'Item warranty expiration date in YYYY-MM-DD' },
                  warrantyNotes: { type: Type.STRING, description: 'Details on item warranty coverage' },
                },
                required: ['name', 'price'],
              },
            },
          },
          required: ['storeName', 'purchaseDate', 'totalAmount', 'items'],
        },
      },
    });

    const jsonText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', jsonText);
      return res.status(500).json({ error: 'Failed to format OCR result as structured JSON.' });
    }

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error in /api/parse-receipt:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while parsing receipt image.',
    });
  }
});

// Setup Vite in middleware mode for dev, or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt OCR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
