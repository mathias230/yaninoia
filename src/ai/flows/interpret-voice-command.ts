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
  voiceCommand: z.string().describe('The voice command given by the user.'),
  installedApplications: z.array(z.string()).optional().describe('A list of installed application names.'),
});
export type InterpretVoiceCommandInput = z.infer<typeof InterpretVoiceCommandInputSchema>;

const InterpretVoiceCommandOutputSchema = z.object({
  action: z
    .enum(['openApplication', 'searchFiles', 'webSearch', 'unknown'])
    .describe('The action to take based on the voice command.'),
  applicationName: z.string().optional().describe('The name of the application to open, if applicable.'),
  searchQuery: z.string().optional().describe('The search query, if applicable.'),
  webSearchQuery: z.string().optional().describe('The web search query, if applicable.'),
  reason: z.string().describe('The reason for taking the action.'),
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
  prompt: `You are an AI voice command interpreter that helps users perform tasks on their computer.

You will receive a voice command from the user, and you must determine the best action to take based on the command.

Here are the possible actions you can take:
- openApplication: Open a specific application on the computer. If this action is taken, you must specify the applicationName.
- searchFiles: Search for files on the computer. If this action is taken, you must specify the searchQuery.
- webSearch: Search the web for information. If this action is taken, you must specify the webSearchQuery.
- unknown: If you cannot determine the action to take, use this action.

Here are the applications that are installed on this computer:
{{#if installedApplications}}
{{#each installedApplications}}
- {{this}}
{{/each}}
{{else}}
No applications are listed as installed.
{{/if}}

Voice Command: {{{voiceCommand}}}`,
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

