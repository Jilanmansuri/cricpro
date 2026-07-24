import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

export interface OCRResult {
  text: string;
  confidence: number;
}

export class OcrService {
  public async processAndExtractText(input: string): Promise<OCRResult> {
    const uniqueName = `prep_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    const tempDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const preprocessedPath = path.join(tempDir, `${uniqueName}.png`);

    try {
      let imageSource = input;

      // 1. Image Pre-processing using Sharp
      await sharp(imageSource)
        .resize({ width: 1800 })
        .greyscale()
        .normalize()
        .threshold(120)
        .toFile(preprocessedPath);

      // 2. Perform OCR using Tesseract.js
      const result = await Tesseract.recognize(
        preprocessedPath,
        'eng',
        {
          logger: () => {}
        }
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      };
    } catch (error) {
      console.error('OCR Processing Error:', error);
      throw new Error(`Failed to extract text from scorecard image: ${(error as Error).message}`);
    } finally {
      if (fs.existsSync(preprocessedPath)) {
        try {
          fs.unlinkSync(preprocessedPath);
        } catch (err) {
          console.error('Failed to delete temporary preprocessed image:', err);
        }
      }
    }
  }
}
export default OcrService;
