
'use server';
/**
 * @fileOverview Un flujo de Genkit para generar un título de chat conciso basado en los mensajes iniciales.
 *
 * - generateChatTitle - Una función que toma el primer mensaje del usuario y la respuesta de la IA y devuelve un título sugerido.
 * - GenerateChatTitleInput - El tipo de entrada para la función generateChatTitle.
 * - GenerateChatTitleOutput - El tipo de retorno para la función generateChatTitle.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChatTitleInputSchema = z.object({
  userMessage: z.string().describe("El primer mensaje enviado por el usuario en la conversación."),
  aiMessage: z.string().describe("El primer mensaje enviado por la IA en respuesta al usuario."),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;

const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe('Un título conciso y relevante para la conversación de chat, idealmente de 3-5 palabras.'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const generateChatTitlePrompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Basándote en el siguiente intercambio inicial en una conversación, genera un título corto y conciso (3-5 palabras) que capture el tema principal. La IA en esta conversación se llama Yanino.

Usuario: "{{userMessage}}"
Yanino: "{{aiMessage}}"

Sugiere un título para este chat.
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
        return { title: "Chat con Yanino" };
    }
    return output;
  }
);

