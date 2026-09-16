import { NextRequest, NextResponse } from 'next/server';
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const buffer = Buffer.from(imageBase64.split(',')[1] || imageBase64, 'base64');
    const [result] = await client.textDetection({ image: { content: buffer } });
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) return NextResponse.json({ text: '' });
    return NextResponse.json({ text: detections[0].description });
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
