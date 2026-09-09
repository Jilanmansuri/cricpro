import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { GeminiExtractionService } from '../services/GeminiExtractionService';

async function main() {
  const service = new GeminiExtractionService();
  const imgPath = 'C:\\Users\\Anas8\\.gemini\\antigravity-ide\\brain\\9eb5e5eb-bdba-43fc-bf05-134afccc00e0\\.user_uploaded\\media_1788870454053.jpg';
  console.log('Testing image:', imgPath);
  const data = await service.extractScorecardFromImage(imgPath);
  console.log('RESULT:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => {
  console.error('ERROR:', err);
});
