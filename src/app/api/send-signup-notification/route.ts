import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, appId } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Agenda Docente <onboarding@resend.dev>',
        to: ['omar850413@gmail.com'],
        subject: '🚀 Nuevo usuario registrado en Agenda Docente',
        html: `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
            <h2 style="color: #0284c7;">¡Nuevo Registro Recibido!</h2>
            <p>Se ha registrado un nuevo usuario en la aplicación.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 400px; margin-top: 15px;">
              <tr>
                <td style="font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Correo:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${email}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Aplicación:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${appId || 'agenda-docente'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">Fecha/Hora:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} (MX)</td>
              </tr>
            </table>
            <p style="margin-top: 25px; font-size: 0.9em; color: #64748b;">
              Recuerda revisar el panel de administración para aprobar a este usuario si es necesario.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error sending email via Resend:', errorText);
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in send-signup-notification API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
