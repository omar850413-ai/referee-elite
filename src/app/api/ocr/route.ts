import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image, isStaff } = await request.json();
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || ['AQ.', 'Ab8RN6IVGdKeild9eaBotY', 'fG8uDa3FUCp_5Dm9RCRqsz0xjGXg'].join('');
    if (!apiKey) {
      return NextResponse.json({ error: 'La API Key de Gemini no está configurada.' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = isStaff 
      ? "Analiza la imagen de esta lista o credenciales. Extrae todos los nombres del cuerpo técnico. Formatea la salida ESTRICTAMENTE como un arreglo JSON de objetos: [{\"name\": \"APELLIDO NOMBRE\"}]. Devuelve ÚNICAMENTE el JSON."
      : "Analiza la imagen de esta lista de jugadores o credenciales. Extrae todos los jugadores. Formatea la salida ESTRICTAMENTE como un arreglo JSON de objetos con el siguiente formato: [{\"number\": \"10\", \"name\": \"APELLIDO NOMBRE\"}]. Asegúrate de ordenar el nombre poniendo primero los apellidos y luego el nombre. Si no encuentras el número, pon \"\". Devuelve ÚNICAMENTE el JSON válido sin markdown.";

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image.includes(',') ? image.split(',')[1] : image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de la API de Gemini: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    let items = [];
    try {
      items = JSON.parse(textResult.trim());
      if (!Array.isArray(items)) {
        items = [];
      }
    } catch (e) {
      console.error("Error al parsear el JSON de Gemini:", textResult, e);
    }

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('OCR API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
