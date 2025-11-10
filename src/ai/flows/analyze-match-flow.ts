'use server';
/**
 * @fileOverview An AI agent for analyzing soccer match reports.
 *
 * - analyzeMatch - A function that handles the match analysis process.
 * - MatchAnalysisInput - The input type for the analyzeMatch function.
 * - MatchAnalysisOutput - The return type for the analyzeMatch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { MatchState } from '@/lib/types';
import { formatTime } from '@/lib/utils';


export const MatchAnalysisInputSchema = z.object({
  matchData: z.string().describe('A JSON string representing the full state of the match.'),
});
export type MatchAnalysisInput = z.infer<typeof MatchAnalysisInputSchema>;


export const MatchAnalysisOutputSchema = z.object({
  analysis: z.string().describe('A concise, insightful analysis of the match from a refereeing perspective.'),
});
export type MatchAnalysisOutput = z.infer<typeof MatchAnalysisOutputSchema>;


export async function analyzeMatch(input: MatchAnalysisInput): Promise<MatchAnalysisOutput> {
  return analyzeMatchFlow(input);
}


const analysisPrompt = ai.definePrompt({
  name: 'matchAnalysisPrompt',
  input: {schema: MatchAnalysisInputSchema},
  output: {schema: MatchAnalysisOutputSchema},
  prompt: `
You are an expert soccer referee analyst. Your task is to provide a concise and insightful analysis of the provided match data from a referee's perspective.

Focus on key events, patterns, and overall match control. Your analysis should be professional, objective, and around 3-4 paragraphs.

Here is the match data in JSON format:
{{{matchData}}}

Based on this data, provide your analysis. Consider the following points:
- Overall match summary (result, general flow).
- Hotspots or difficult periods in the match (e.g., a high concentration of fouls or cards).
- Key decisions and their impact (e.g., red cards, penalty decisions if any).
- Any patterns in fouls or misconduct for either team.
- A concluding thought on the referee's management of the game.
`,
});

const analyzeMatchFlow = ai.defineFlow(
  {
    name: 'analyzeMatchFlow',
    inputSchema: MatchAnalysisInputSchema,
    outputSchema: MatchAnalysisOutputSchema,
  },
  async (input) => {
    // We are receiving a JSON string, so we'll parse it first.
    // The prompt expects a string, so we don't need to do anything complex.
    const {output} = await analysisPrompt(input);
    return output!;
  }
);
