// use server'
'use server';

/**
 * @fileOverview A voice command interpreter AI agent.
 *
 * - interpretVoiceCommand - A function that handles the voice command interpretation process.
 * - InterpretVoiceCommandInput - The input type for the interpretVoiceCommand function.
 * - InterpretVoiceCommandOutput - The return type for the interpretVoiceCommandOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getInstalledApplications } from '@/services/application-manager';

const InterpretVoiceCommandInputSchema = z.object({
  voiceCommand: z.string().describe('The voice command or question given by the user.'),
  installedApplications: z.array(z.string()).optional().describe('A list of installed application names.'),
});
export type InterpretVoiceCommandInput = z.infer<typeof InterpretVoiceCommandInputSchema>;

const InterpretVoiceCommandOutputSchema = z.object({
  action: z
    .enum(['openApplication', 'searchFiles', 'webSearch', 'answerQuestion', 'unknown'])
    .describe('The action to take based on the voice command or question.'),
  applicationName: z.string().optional().describe('The name of the application to open, if applicable.'),
  searchQuery: z.string().optional().describe('The search query for files, if applicable.'),
  webSearchQuery: z.string().optional().describe('The web search query, if applicable.'),
  question: z.string().optional().describe('The original question if the action is to answer a question.'),
  reason: z.string().describe('The reason for taking the action or categorization.'),
});
export type InterpretVoiceCommandOutput = z.infer<typeof InterpretVoiceCommandOutputSchema>;

export async function interpretVoiceCommand(input: Pick<InterpretVoiceCommandInput, 'voiceCommand'>): Promise<InterpretVoiceCommandOutput> {
  const applications = await getInstalledApplications();
  const applicationNames = applications.map(app => app.name);
  return interpretVoiceCommandFlow({ ...input, installedApplications: applicationNames });
}

const interpretVoiceCommandPrompt = ai.definePrompt({
  name: 'interpretVoiceCommandPrompt',
  input: {schema: InterpretVoiceCommandInputSchema},
  output: {schema: InterpretVoiceCommandOutputSchema},
  prompt: `You are an AI voice command interpreter that helps users perform tasks on their computer or answer their questions.

You will receive a command or question from the user, and you must determine the best action to take.

Here are the possible actions you can take:
- openApplication: Open a specific application on the computer. If this action is taken, you must specify the applicationName.
- searchFiles: Search for files on the computer. If this action is taken, you must specify the searchQuery.
- webSearch: Search the web for information, typically for broad topics or when a summary of multiple sources is beneficial (e.g., "latest news on AI", "best Italian restaurants"). If this action is taken, you must specify the webSearchQuery.
- answerQuestion: Directly answer a specific question (e.g., facts, definitions, "how to" questions like "What is the capital of France?" or "How do I bake a cake?"). If this action is taken, you must populate the 'question' field with the user's original voiceCommand.
- unknown: If you cannot determine the action to take, use this action.

Here are the applications that are installed on this computer:
{{#if installedApplications}}
{{#each installedApplications}}
- {{this}}
{{/each}}
{{else}}
No applications are listed as installed.
{{/if}}

User Input: {{{voiceCommand}}}

Carefully analyze the user input.
- If it's a command to open an application, use 'openApplication'.
- If it's a command to find local files, use 'searchFiles'.
- If it's a request for a web search summary on a broad topic, or current events, use 'webSearch'.
- If it's a direct question seeking a specific answer, explanation, or instructions, use 'answerQuestion' and ensure the 'question' field in your output is set to the user's "voiceCommand".
- If none of the above, use 'unknown'.
Provide a concise reason for your choice.
`,
});

const interpretVoiceCommandFlow = ai.defineFlow(
  {
    name: 'interpretVoiceCommandFlow',
    inputSchema: InterpretVoiceCommandInputSchema,
    outputSchema: InterpretVoiceCommandOutputSchema,
  },
  async (input: InterpretVoiceCommandInput) => {
    const {output} = await interpretVoiceCommandPrompt(input);
    return output!;
  }
);
