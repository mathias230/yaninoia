
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
  title: z.string().describe('Un título descriptivo y conciso para la conversación de chat que refleje el tema principal de la consulta del usuario.'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  return generateChatTitleFlow(input);
}

const generateChatTitlePrompt = ai.definePrompt({
  name: 'generateChatTitlePrompt',
  input: {schema: GenerateChatTitleInputSchema},
  output: {schema: GenerateChatTitleOutputSchema},
  prompt: `Analiza el primer mensaje del usuario y la primera respuesta de la IA en una conversación. 
Genera un título descriptivo y conciso para el chat que refleje el tema principal de la consulta del usuario. 
El título debe ser lo suficientemente detallado como para que el usuario pueda identificar fácilmente el contenido del chat más tarde. 
Por ejemplo, si el usuario pregunta "códigos de programación para página web para dedicar", un buen título sería "Códigos de programación para dedicar página web".
Otro ejemplo, si el usuario pregunta "¿Cuál es la receta para la tarta de manzana?", un buen título sería "Receta de tarta de manzana".
La IA en esta conversación se llama Yanino.

Usuario: "{{userMessage}}"
Yanino: "{{aiMessage}}"

Genera un título para este chat.
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
    if (!output?.title || output.title.trim() === "") {
        // Fallback if AI doesn't generate a title or generates an empty one.
        // Try to create a generic title from the user's message if it's short enough.
        if (input.userMessage && input.userMessage.length > 0 && input.userMessage.length <= 50) {
            const firstFewWords = input.userMessage.split(' ').slice(0, 5).join(' ');
            return { title: firstFewWords + (input.userMessage.split(' ').length > 5 ? '...' : '') };
        }
        return { title: "Chat con Yanino" }; // Default fallback
    }
    // Ensure the title is not excessively long, Genkit might sometimes ignore length constraints in prompt
    if (output.title.length > 70) {
      return { title: output.title.substring(0, 67) + "..." };
    }
    return output;
  }
);

