'use server';
/**
 * @fileOverview A Genkit flow for answering general knowledge questions, potentially with image or file context,
 * and awareness of the preceding conversation.
 *
 * - answerGeneralQuestion - A function that takes a user's question, optional attachments, and conversation history, then returns an answer.
 * - AnswerGeneralQuestionUserFacingInput - The input type for the answerGeneralQuestion function.
 * - AnswerGeneralQuestionOutput - The return type for the answerGeneralQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for individual history message
const ConversationMessageSchema = z.object({
  sender: z.enum(["user", "ai"]).describe("Who sent this message in the history."),
  content: z.string().describe("The text content of the historical message.")
});

// Schema for the input the prompt itself expects (internal, includes pre-processed fields)
const AnswerGeneralQuestionPromptInputSchema = z.object({
  question: z.string().describe('The current question or instruction asked by the user.'),
  imageDataUri: z.string().optional().describe("An optional image provided by the user with the current question, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileData: z.object({
    name: z.string().describe('The name of the uploaded file.'),
    type: z.string().describe('The MIME type of the uploaded file.'),
    dataUri: z.string().describe("The content of the uploaded file, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file provided by the user with the current question for analysis, summarization, or to answer questions about.'),
  conversationHistory: z.array(ConversationMessageSchema).optional().describe('The history of the current conversation, ordered from oldest to newest. Use this to maintain context.'),
  // Fields for pre-processed file data, to be populated by the flow for the prompt
  fileIsText: z.boolean().optional().describe('Internal field: Whether the uploaded file is determined to be a text file.'),
  fileTextPreview: z.string().optional().describe('Internal field: A preview of the text content (first 2000 chars) if the file is text-based.')
});
// This type is for internal use within the flow, for the prompt.
type AnswerGeneralQuestionPromptInput = z.infer<typeof AnswerGeneralQuestionPromptInputSchema>;


// Schema for the input the user-facing exported function and the flow will take
const AnswerGeneralQuestionUserFacingInputSchema = z.object({
  question: z.string().describe('The current question or instruction asked by the user.'),
  imageDataUri: z.string().optional().describe("An optional image provided by the user with the current question, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileData: z.object({
    name: z.string().describe('The name of the uploaded file.'),
    type: z.string().describe('The MIME type of the uploaded file.'),
    dataUri: z.string().describe("The content of the uploaded file, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file provided by the user with the current question for analysis, summarization, or to answer questions about.'),
  conversationHistory: z.array(ConversationMessageSchema).optional().describe('The history of the current conversation, ordered from oldest to newest. Use this to maintain context.'),
});
export type AnswerGeneralQuestionUserFacingInput = z.infer<typeof AnswerGeneralQuestionUserFacingInputSchema>;


const AnswerGeneralQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question/instruction.'),
  originalQuestion: z.string().describe('The original question or instruction that was processed.')
});
export type AnswerGeneralQuestionOutput = z.infer<typeof AnswerGeneralQuestionOutputSchema>;


export async function answerGeneralQuestion(input: AnswerGeneralQuestionUserFacingInput): Promise<AnswerGeneralQuestionOutput> {
  return answerGeneralQuestionFlow(input);
}

const answerGeneralQuestionPrompt = ai.definePrompt({
  name: 'answerGeneralQuestionPrompt',
  input: {schema: AnswerGeneralQuestionPromptInputSchema}, // Prompt expects the schema with pre-processed fields and history
  output: {schema: AnswerGeneralQuestionOutputSchema},
  prompt: `You are a friendly and empathetic AI assistant. Your goal is to provide clear, concise, and accurate answers to the user's questions or instructions. Use the provided conversation history to maintain context and provide relevant follow-up responses. Use a warm and approachable tone with conversational language.

{{#if conversationHistory}}
--- Conversation History (Oldest to Newest) ---
{{#each conversationHistory}}
{{this.sender}}: {{this.content}}
{{/each}}
--- End of Conversation History ---

Now, considering the history above, please respond to the following:
{{/if}}

User's Current Input: {{{question}}}

{{#if imageDataUri}}
The user has also provided an image with their current input. Analyze this image as part of your response:
{{media url=imageDataUri}}
{{/if}}

{{#if fileData}}
The user has also uploaded a file named "{{fileData.name}}" (type: {{fileData.type}}) with their current input.
Please analyze its content and help the user with it. You can assist with understanding, summarizing, or answering questions about this file.
File Reference: {{fileData.name}} (type: {{fileData.type}})
{{#if fileIsText}}
File Content (first 2000 characters):
\`\`\`
{{{fileTextPreview}}}
\`\`\`
{{else}}
This is a non-text file. You can discuss its potential contents or uses based on its name and type.
{{/if}}
{{/if}}

Provide your answer in the 'answer' field.
Also, return the original current question in the 'originalQuestion' field, which should be the user's textual input for the current turn.
`,
});


// Helper to convert data URI to string, assuming UTF-8 for text files
const dataUriToString = (dataUri: string): string => {
  try {
    const base64Part = dataUri.substring(dataUri.indexOf(',') + 1);
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    return decoded;
  } catch (e) {
    console.warn("Failed to decode data URI to string", e);
    return "[Could not decode file content]";
  }
};

const answerGeneralQuestionFlow = ai.defineFlow(
  {
    name: 'answerGeneralQuestionFlow',
    inputSchema: AnswerGeneralQuestionUserFacingInputSchema, // Flow's input is user-facing
    outputSchema: AnswerGeneralQuestionOutputSchema,
  },
  async (userInput: AnswerGeneralQuestionUserFacingInput) => { 
    
    // Construct the input for the prompt, including any pre-processing
    const promptInput: AnswerGeneralQuestionPromptInput = { 
      question: userInput.question,
      imageDataUri: userInput.imageDataUri,
      fileData: userInput.fileData,
      conversationHistory: userInput.conversationHistory, // Pass through history
    };

    if (userInput.fileData) {
      promptInput.fileIsText = userInput.fileData.type.startsWith("text");
      if (promptInput.fileIsText) {
        const fileContent = dataUriToString(userInput.fileData.dataUri);
        promptInput.fileTextPreview = fileContent.substring(0, 2000);
      }
    }

    const {output} = await answerGeneralQuestionPrompt(promptInput); 
    
    if (!output) {
      let fallbackAnswer = "Sorry, I couldn't find an answer to that. I'm still learning!";
      try {
        // Fallback prompt should also ideally have history if we want it to be contextual
        // For simplicity, this fallback is non-contextual for now.
        const fallbackResponse = await ai.generate({
          prompt: `Answer the following question in a friendly and empathetic tone: ${userInput.question}`,
        });
        if (fallbackResponse.text) {
          fallbackAnswer = fallbackResponse.text;
        }
      } catch (e) {
        console.error("Error during fallback generation:", e);
      }
      return {
        answer: fallbackAnswer,
        originalQuestion: userInput.question,
      };
    }
    return {
      ...output,
      originalQuestion: output.originalQuestion || userInput.question, 
    };
  }
);

