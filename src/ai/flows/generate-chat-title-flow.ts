
'use server';
/**
 * @fileOverview A Genkit flow for generating a concise chat title based on the initial messages.
 *
 * - generateChatTitle - A function that takes the first user message and AI response and returns a suggested title.
 * - GenerateChatTitleInput - The input type for the generateChatTitle function.
 * - GenerateChatTitleOutput - The return type for the generateChatTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  userMessage: z.string().describe("The first message sent by the user in the conversation."),
  aiMessage: z.string().describe("The first message sent by the AI in response to the user."),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe('A concise and relevant title for the chat conversation, ideally 3-5 words.'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const generateChatTitlePrompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Based on the following initial exchange in a conversation, generate a short, concise title (3-5 words) that captures the main topic or theme. The AI in this conversation is named Yanino.

User: "{{userMessage}}"
Yanino: "{{aiMessage}}"

Suggest a title for this chat.
`,
});

const generateChatTitleFlow = ai.defineFlow(
  {
    name: 'generateChatTitleFlow',
    inputSchema: GenerateChatTitleInputSchema,
    outputSchema: GenerateChatTitleOutputSchema,
  },
  async (input: GenerateChatTitleInput) => {
    const {output} = await generateChatTitlePrompt(input);
    if (!output?.title) {
        // Fallback title if generation fails or is empty
        return { title: "Chat with Yanino" };
    }
    return output;
  }
);
