// use server'
'use server';

/**
 * @fileOverview A voice command interpreter AI agent.
 *
 * - interpretVoiceCommand - A function that handles the voice command interpretation process.
 * - InterpretVoiceCommandInput - The input type for the interpretVoiceCommand function.
 * - InterpretVoiceCommandOutput - The return type for the interpretVoiceCommand function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {openApplication, getInstalledApplications} from '@/services/application-manager';
import {searchFiles} from '@/services/file-search';

const InterpretVoiceCommandInputSchema = z.object({
  voiceCommand: z.string().describe('The voice command given by the user.'),
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

export async function interpretVoiceCommand(input: InterpretVoiceCommandInput): Promise<InterpretVoiceCommandOutput> {
  return interpretVoiceCommandFlow(input);
}

const applicationOptions = async () => {
  const applications = await getInstalledApplications();
  return applications.map(app => app.name);
};

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
{{#each (await applicationOptions)}}
- {{this}}
{{/each}}

Voice Command: {{{voiceCommand}}}`,
});

const interpretVoiceCommandFlow = ai.defineFlow(
  {
    name: 'interpretVoiceCommandFlow',
    inputSchema: InterpretVoiceCommandInputSchema,
    outputSchema: InterpretVoiceCommandOutputSchema,
  },
  async input => {
    const {output} = await interpretVoiceCommandPrompt(input);
    return output!;
  }
);
