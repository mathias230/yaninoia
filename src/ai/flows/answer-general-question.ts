'use server';
/**
 * @fileOverview Un flujo de Genkit para responder preguntas de conocimiento general, potencialmente con contexto de imagen o archivo,
 * y conciencia de la conversación precedente.
 *
 * - answerGeneralQuestion - Una función que toma la pregunta del usuario, adjuntos opcionales e historial de conversación, luego devuelve una respuesta.
 * - AnswerGeneralQuestionUserFacingInput - El tipo de entrada para la función answerGeneralQuestion.
 * - AnswerGeneralQuestionOutput - El tipo de retorno para la función answerGeneralQuestion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Esquema para mensaje individual del historial
const ConversationMessageSchema = z.object({
  sender: z.enum(["user", "ai"]).describe("Quién envió este mensaje en el historial."),
  content: z.string().describe("El contenido de texto del mensaje histórico.")
});

// Esquema para la entrada que el prompt mismo espera (interno, incluye campos preprocesados)
const AnswerGeneralQuestionPromptInputSchema = z.object({
  question: z.string().describe('La pregunta o instrucción actual hecha por el usuario.'),
  imageDataUri: z.string().optional().describe("Una imagen principal opcional proporcionada por el usuario con la pregunta actual, como un URI de datos. Formato: 'data:<mimetype>;base64,<encoded_data>'. Esta imagen debe ser el foco principal del análisis visual si está presente."),
  fileData: z.object({
    name: z.string().describe('El nombre del archivo subido.'),
    type: z.string().describe('El tipo MIME del archivo subido.'),
    dataUri: z.string().describe("El contenido del archivo subido, como un URI de datos. Formato: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('Un archivo adicional opcional proporcionado por el usuario con la pregunta actual para análisis, resumen o para responder preguntas sobre él. Puede ser un archivo de texto, otra imagen, etc.'),
  conversationHistory: z.array(ConversationMessageSchema).optional().describe('El historial de la conversación actual, ordenado del más antiguo al más nuevo. Úsalo para mantener el contexto.'),
  // Campos para datos de archivo preprocesados, a ser poblados por el flujo para el prompt
  fileIsImage: z.boolean().optional().describe('Campo interno: Indica si el archivo adjunto (fileData) es una imagen.'),
  fileIsText: z.boolean().optional().describe('Campo interno: Indica si el archivo adjunto (fileData) es de texto (y no una imagen).'),
  fileTextPreview: z.string().optional().describe('Campo interno: Vista previa del contenido si fileIsText es true.')
});
// Este tipo es para uso interno dentro del flujo, para el prompt.
type AnswerGeneralQuestionPromptInput = z.infer<typeof AnswerGeneralQuestionPromptInputSchema>;


// Esquema para la entrada que la función exportada de cara al usuario y el flujo tomarán
const AnswerGeneralQuestionUserFacingInputSchema = z.object({
  question: z.string().describe('La pregunta o instrucción actual hecha por el usuario.'),
  imageDataUri: z.string().optional().describe("Una imagen principal opcional proporcionada por el usuario con la pregunta actual, como un URI de datos. Formato: 'data:<mimetype>;base64,<encoded_data>'."),
  fileData: z.object({
    name: z.string().describe('El nombre del archivo subido.'),
    type: z.string().describe('El tipo MIME del archivo subido.'),
    dataUri: z.string().describe("El contenido del archivo subido, como un URI de datos. Formato: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('Un archivo adicional opcional proporcionado por el usuario con la pregunta actual.'),
  conversationHistory: z.array(ConversationMessageSchema).optional().describe('El historial de la conversación actual, ordenado del más antiguo al más nuevo.'),
});
export type AnswerGeneralQuestionUserFacingInput = z.infer<typeof AnswerGeneralQuestionUserFacingInputSchema>;


const AnswerGeneralQuestionOutputSchema = z.object({
  answer: z.string().describe('La respuesta generada por IA a la pregunta/instrucción.'),
  originalQuestion: z.string().describe('La pregunta o instrucción original que fue procesada.')
});
export type AnswerGeneralQuestionOutput = z.infer<typeof AnswerGeneralQuestionOutputSchema>;


export async function answerGeneralQuestion(input: AnswerGeneralQuestionUserFacingInput): Promise<AnswerGeneralQuestionOutput> {
  return answerGeneralQuestionFlow(input);
}

const answerGeneralQuestionPrompt = ai.definePrompt({
  name: 'answerGeneralQuestionPrompt',
  input: {schema: AnswerGeneralQuestionPromptInputSchema}, 
  output: {schema: AnswerGeneralQuestionOutputSchema},
  prompt: `Eres Yanino, un asistente de IA súper amigable, empático ¡y con un gran sentido del humor! Tu objetivo es ser el compañero de chat perfecto: claro, conciso, preciso, y que además saque una sonrisa. 😉

Cuando respondas:
*   Sé siempre cálido, accesible y conversacional. ¡Imagina que estás charlando con un buen amigo!
*   ¡No tengas miedo de ser un poco gracioso! Un chiste ligero, un juego de palabras (si viene al caso y no es forzado), o un comentario divertido pueden alegrar el día. Pero ojo, ¡el humor debe ser siempre respetuoso y nunca a costa del usuario o de la seriedad de una pregunta importante!
*   Usa emojis con moderación para añadir personalidad y emoción a tus respuestas. Por ejemplo: 👍, 🎉, 🤔, 😂. ¡Pero no abuses!
*   Si la pregunta es seria o el usuario parece preocupado, prioriza la empatía y la claridad sobre el humor. Un "Entiendo cómo te sientes" o "Lamento que estés pasando por esto" puede ser muy útil.
*   Utiliza el historial de conversación proporcionado para mantener el contexto y ofrecer respuestas de seguimiento relevantes.
*   Para mejorar la legibilidad, por favor formatea tu respuesta usando markdown cuando sea apropiado. Esto incluye:
    - Párrafos separados por líneas en blanco.
    - Listas (usa -, * o números. Ej: - Primer punto, 1. Otro punto).
    - Negrita (usa **texto en negrita**).
    - Cursiva (usa *texto en cursiva* o _texto en cursiva_).
Asegúrate de que el texto fluya de manera natural y sea fácil de leer.

Al proporcionar fragmentos de código, por favor, enciérralos en bloques de código markdown con el lenguaje especificado, por ejemplo:
\`\`\`html
<p>Hola</p>
\`\`\`
\`\`\`javascript
console.log('mundo');
\`\`\`

{{#if conversationHistory}}
--- Historial de Conversación (Del más antiguo al más nuevo) ---
{{#each conversationHistory}}
{{this.sender}}: {{this.content}}
{{/each}}
--- Fin del Historial de Conversación ---

Ahora, considerando el historial anterior, por favor responde a lo siguiente:
{{/if}}

Pregunta/Instrucción del Usuario: {{{question}}}

{{#if imageDataUri}}
El usuario ha adjuntado la siguiente imagen principal. Por favor, analízala detenidamente y úsala como base para tu respuesta, junto con la pregunta/instrucción del usuario:
{{media url=imageDataUri}}
{{/if}}

{{#if fileData}}
  {{#if imageDataUri}}
  Adicionalmente, el usuario ha subido el siguiente archivo:
  {{else}}
  El usuario ha subido el siguiente archivo:
  {{/if}}
  Nombre del archivo: "{{fileData.name}}"
  Tipo de archivo: "{{fileData.type}}"

  {{#if fileIsImage}}
    {{#unless imageDataUri}} {{!-- Solo mostrar/analizar fileData como media si no existe imageDataUri primario --}}
    Este archivo es una imagen. Por favor, analízala:
    {{media url=fileData.dataUri}}
    {{else}} {{!-- Imagen primaria ya mostrada mediante imageDataUri --}}
    Este archivo adjunto también es una imagen. Menciona si es relevante como complemento al análisis de la imagen principal.
    {{/unless}}
  {{else if fileIsText}}
    Este archivo es de texto. Aquí tienes una vista previa de su contenido (primeros 2000 caracteres):
    \`\`\`
    {{{fileTextPreview}}}
    \`\`\`
    Por favor, analiza este texto en relación con la pregunta/instrucción del usuario.
  {{else}}
    Este es un archivo de tipo "{{fileData.type}}". No se puede mostrar una vista previa. Basa tu análisis en el nombre y tipo del archivo en relación con la pregunta/instrucción del usuario.
  {{/if}}
{{/if}}

Proporciona tu respuesta en el campo 'answer'.
También, devuelve la pregunta actual original en el campo 'originalQuestion', que debe ser la entrada textual del usuario para el turno actual.
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});


const dataUriToString = (dataUri: string): string => {
  try {
    const base64Part = dataUri.substring(dataUri.indexOf(',') + 1);
    // Asegurar que Buffer solo se usa en entorno Node.js
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(base64Part, 'base64').toString('utf-8');
    } else if (typeof atob === 'function') { // Usar atob en el navegador
      return atob(base64Part);
    }
    console.warn("No se pudo decodificar el URI de datos a cadena: ni Buffer ni atob están disponibles.");
    return "[No se pudo decodificar el contenido del archivo]";
  } catch (e) {
    console.warn("No se pudo decodificar el URI de datos a cadena", e);
    return "[No se pudo decodificar el contenido del archivo]";
  }
};

const answerGeneralQuestionFlow = ai.defineFlow(
  {
    name: 'answerGeneralQuestionFlow',
    inputSchema: AnswerGeneralQuestionUserFacingInputSchema, 
    outputSchema: AnswerGeneralQuestionOutputSchema,
  },
  async (userInput: AnswerGeneralQuestionUserFacingInput) => { 
    
    const promptInput: AnswerGeneralQuestionPromptInput = { 
      question: userInput.question,
      imageDataUri: userInput.imageDataUri,
      fileData: userInput.fileData,
      conversationHistory: userInput.conversationHistory, 
    };

    if (userInput.fileData) {
      promptInput.fileIsImage = userInput.fileData.type.startsWith("image/");
      // Solo tratar como texto si no es una imagen Y comienza explícitamente con "text/"
      promptInput.fileIsText = !promptInput.fileIsImage && userInput.fileData.type.startsWith("text/");
      
      if (promptInput.fileIsText) {
        const fileContent = dataUriToString(userInput.fileData.dataUri);
        promptInput.fileTextPreview = fileContent.substring(0, 2000);
      }
    }

    const {output} = await answerGeneralQuestionPrompt(promptInput); 
    
    if (!output) {
      let fallbackAnswer = "Lo siento, no pude encontrar una respuesta a eso. ¡Todavía estoy aprendiendo y a veces me trabo un poquito! 🤪";
      try {
        // Generar una respuesta de respaldo simple si la salida estructurada falla
        const fallbackResponse = await ai.generate({
          prompt: `Como Yanino, un IA amigable, empática y con un toque de humor, responde la siguiente pregunta de manera conversacional: ${userInput.question}${userInput.imageDataUri ? " (El usuario también envió una imagen)." : ""}${userInput.fileData ? ` (El usuario también envió un archivo llamado ${userInput.fileData.name}).` : ""}. Si no sabes, puedes decir algo como '¡Uy! Esa pregunta me agarró desprevenido. 🤔 ¿Podrías intentar de otra forma?'`,
          config: { // Add safety settings to fallback as well
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
          },
        });
        if (fallbackResponse.text) {
          fallbackAnswer = fallbackResponse.text;
        }
      } catch (e) {
        console.error("Error durante la generación de respaldo:", e);
      }
      return {
        answer: fallbackAnswer,
        originalQuestion: userInput.question,
      };
    }
    return {
      ...output,
      // Asegurarse de que originalQuestion siempre se popule, incluso si el LLM lo omite.
      originalQuestion: output.originalQuestion || userInput.question, 
    };
  }
);
