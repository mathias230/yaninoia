'use server';

/**
 * @fileOverview Summarizes web search results for a given query.
 *
 * - summarizeWebSearch - A function that takes a search query and summarizes the top search results.
 * - SummarizeWebSearchInput - The input type for the summarizeWebSearch function.
 * - SummarizeWebSearchOutput - The return type for the summarizeWebSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {searchFiles} from '@/services/file-search';

const SummarizeWebSearchInputSchema = z.object({
  query: z.string().describe('The search query to summarize web results for.'),
});
export type SummarizeWebSearchInput = z.infer<typeof SummarizeWebSearchInputSchema>;

const SummarizeWebSearchOutputSchema = z.object({
  summary: z.string().describe('A summary of the top search results for the query.'),
});
export type SummarizeWebSearchOutput = z.infer<typeof SummarizeWebSearchOutputSchema>;

export async function summarizeWebSearch(input: SummarizeWebSearchInput): Promise<SummarizeWebSearchOutput> {
  return summarizeWebSearchFlow(input);
}

const summarizeWebSearchPrompt = ai.definePrompt({
  name: 'summarizeWebSearchPrompt',
  input: {schema: SummarizeWebSearchInputSchema},
  output: {schema: SummarizeWebSearchOutputSchema},
  prompt: `Summarize the top search results for the following query:\n\n{{query}}`,
});

const summarizeWebSearchFlow = ai.defineFlow(
  {
    name: 'summarizeWebSearchFlow',
    inputSchema: SummarizeWebSearchInputSchema,
    outputSchema: SummarizeWebSearchOutputSchema,
  },
  async input => {
    const {output} = await summarizeWebSearchPrompt(input);
    return output!;
  }
);
