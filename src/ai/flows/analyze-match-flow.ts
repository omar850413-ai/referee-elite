
'use server';
/**
 * @fileOverview An AI flow to analyze a soccer match based on game events.
 *
 * - analyzeMatch: A function that takes match data and returns an AI-generated analysis.
 * - AnalyzeMatchInput: The input type for the analyzeMatch function.
 * - AnalyzeMatchOutput: The return type for the analyzeMatch function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import type { MatchState } from '@/lib/types';
import { formatTime } from '@/lib/utils';

// We can't import MatchState directly because of 'use client' directives.
// So, we redefine the input schema based on the structure of MatchState.
export const AnalyzeMatchInputSchema = z.object({
  scores: z.object({ home: z.number(), away: z.number() }),
  fouls: z.object({ home: z.number(), away: z.number() }),
  teamNames: z.object({ home: z.string(), away: z.string() }),
  events: z.array(z.any()),
});

export type AnalyzeMatchInput = z.infer<typeof AnalyzeMatchInputSchema>;

export const AnalyzeMatchOutputSchema = z.object({
  analysis: z.string().describe('The detailed analysis of the match.'),
});

export type AnalyzeMatchOutput = z.infer<typeof AnalyzeMatchOutputSchema>;


export async function analyzeMatch(input: AnalyzeMatchInput): Promise<AnalyzeMatchOutput> {
  // We process the events here to create a more readable summary for the AI.
  const eventSummary = input.events.map(event => {
    const time = formatTime(event.time);
    const teamName = event.team ? input.teamNames[event.team] : '';
    switch (event.type) {
      case 'period_start': return `[${time}] ${event.text}`;
      case 'period_end': return `[${time}] ${event.text}`;
      case 'goal': return `[${time}] Gol de ${teamName} (Camiseta #${event.jersey})`;
      case 'goal_removed': return `[${time}] Gol anulado para ${teamName} (Camiseta #${event.jersey})`;
      case 'foul': return `[${time}] Falta cometida por ${teamName}`;
      case 'yellow': return `[${time}] Tarjeta Amarilla para ${teamName} (${typeof event.jersey === 'number' ? 'Jugador #'+event.jersey : event.jersey}) por: ${event.reason}`;
      case 'red': return `[${time}] Tarjeta Roja para ${teamName} (${typeof event.jersey === 'number' ? 'Jugador #'+event.jersey : event.jersey}) por: ${event.reason}`;
      case 'note': return `[${time}] Anotación del Asesor: ${event.text}`;
      case 'substitution': return `[${time}] Sustitución en ${teamName}: Sale #${event.playerOut}, Entra #${event.playerIn}`;
      default: return `[${time}] Evento desconocido: ${event.type}`;
    }
  }).join('\n');

  const processedInput = {
    ...input,
    eventSummary,
  }

  return analyzeMatchFlow(processedInput);
}

const prompt = ai.definePrompt({
  name: 'analyzeMatchPrompt',
  input: { schema: AnalyzeMatchInputSchema.extend({ eventSummary: z.string() }) },
  output: { schema: AnalyzeMatchOutputSchema },
  prompt: `Eres un analista experto de arbitraje de fútbol. Tu tarea es analizar el informe de un partido y proporcionar un resumen conciso y perspicaz para el asesor de árbitros.

  Información del Partido:
  - Marcador Final: {{teamNames.home}} {{scores.home}} - {{scores.away}} {{teamNames.away}}
  - Faltas Totales: {{teamNames.home}} ({{fouls.home}}) - {{teamNames.away}} ({{fouls.away}})

  Cronología de Eventos:
  {{{eventSummary}}}

  Basado en la información y la cronología, genera un análisis del partido en español. Tu análisis debe incluir:
  1.  **Resumen General:** Un párrafo breve que describa el flujo del partido.
  2.  **Momentos Clave:** Identifica 2-3 momentos cruciales (goles, expulsiones, rachas de tarjetas) y su impacto en el juego.
  3.  **Gestión Disciplinaria:** Comenta sobre la distribución de tarjetas y faltas. ¿Hubo concentración de tarjetas en algún período? ¿La cantidad de faltas sugiere un partido ríspido?
  4.  **Sugerencia para el Asesor:** Ofrece una observación constructiva o una pregunta para el asesor sobre la actuación del árbitro. Por ejemplo, "¿Cómo evaluaría la gestión del árbitro en los minutos finales donde se concentraron las amonestaciones?".

  Formatea tu respuesta de manera clara y profesional, usando saltos de línea para separar cada sección. No incluyas el marcador final ni el resumen de faltas, ya que están visibles en otra parte. Empieza directamente con el "Resumen General".`,
});

const analyzeMatchFlow = ai.defineFlow(
  {
    name: 'analyzeMatchFlow',
    inputSchema: AnalyzeMatchInputSchema.extend({ eventSummary: z.string() }),
    outputSchema: AnalyzeMatchOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
