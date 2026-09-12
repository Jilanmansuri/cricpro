import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  console.log('Testing gemini-2.5-flash with JSON config...');
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Output a JSON object with keys "status" ("working") and "model" ("gemini-2.5-flash")',
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log('SUCCESS (2.5-flash):', res.text);
  } catch (err: any) {
    console.error('ERROR (2.5-flash):', err.message);
  }

  console.log('Testing gemini-3.6-flash with JSON config...');
  try {
    const res2 = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Output a JSON object with keys "status" ("working") and "model" ("gemini-3.6-flash")',
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log('SUCCESS (3.6-flash):', res2.text);
  } catch (err: any) {
    console.error('ERROR (3.6-flash):', err.message);
  }
}

main();

