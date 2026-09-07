import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image } = await request.json(); // base64 image data
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Attempt to get the key from env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'La API Key de Gemini no está configurada.' }, { status: 500 });
    }

    // Call Gemini v1beta endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analiza la imagen de esta lista de alumnos. Extrae todos los nombres de los estudiantes. Formatea la salida estrictamente como un arreglo JSON de cadenas conteniendo los nombres de los alumnos en formato 'APELLIDO NOMBRE' o 'NOMBRE APELLIDO', por ejemplo: [\"PÉREZ JUAN\", \"GÓMEZ MARÍA\"]. Devuelve ÚNICAMENTE el arreglo JSON, sin usar bloques de markdown (como ```json) ni texto adicional."
              },
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
    
    let names = [];
    try {
      names = JSON.parse(textResult.trim());
      if (!Array.isArray(names)) {
        names = [];
      }
    } catch (e) {
      console.error("Error al parsear el JSON de Gemini:", textResult, e);
      // Intento de extracción simple por regex si falla el parseo
      const matches = textResult.match(/"([^"]+)"/g);
      if (matches) {
        names = matches.map(m => m.replace(/"/g, ''));
      }
    }

    return NextResponse.json({ names });
  } catch (error: any) {
    console.error('OCR API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
