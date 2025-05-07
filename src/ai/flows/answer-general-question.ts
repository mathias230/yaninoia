'use server';
/**
 * @fileOverview A Genkit flow for answering general knowledge questions, potentially with image or file context.
 *
 * - answerGeneralQuestion - A function that takes a user's question and optional attachments, then returns an answer.
 * - AnswerGeneralQuestionInput - The input type for the answerGeneralQuestion function.
 * - AnswerGeneralQuestionOutput - The return type for the answerGeneralQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerGeneralQuestionInputSchema = z.object({
  question: z.string().describe('The question or instruction asked by the user.'),
  imageDataUri: z.string().optional().describe("An optional image provided by the user, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  fileData: z.object({
    name: z.string().describe('The name of the uploaded file.'),
    type: z.string().describe('The MIME type of the uploaded file.'),
    dataUri: z.string().describe("The content of the uploaded file, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  }).optional().describe('An optional file provided by the user for analysis, summarization, or to answer questions about.'),
  // Fields for pre-processed file data, to be populated by the flow
  fileIsText: z.boolean().optional().describe('Internal field: Whether the uploaded file is determined to be a text file.'),
  fileTextPreview: z.string().optional().describe('Internal field: A preview of the text content (first 2000 chars) if the file is text-based.')
});
export type AnswerGeneralQuestionInput = z.infer<typeof AnswerGeneralQuestionInputSchema>;

const AnswerGeneralQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question/instruction.'),
  originalQuestion: z.string().describe('The original question or instruction that was processed.')
});
export type AnswerGeneralQuestionOutput = z.infer<typeof AnswerGeneralQuestionOutputSchema>;

// Type for the external input to the exported function, which won't include pre-processed fields.
export type AnswerGeneralQuestionUserFacingInput = Omit<AnswerGeneralQuestionInput, 'fileIsText' | 'fileTextPreview'>;

export async function answerGeneralQuestion(input: AnswerGeneralQuestionUserFacingInput): Promise<AnswerGeneralQuestionOutput> {
  return answerGeneralQuestionFlow(input);
}

const answerGeneralQuestionPrompt = ai.definePrompt({
  name: 'answerGeneralQuestionPrompt',
  input: {schema: AnswerGeneralQuestionInputSchema}, // Prompt expects the schema with pre-processed fields
  output: {schema: AnswerGeneralQuestionOutputSchema},
  prompt: `You are a friendly and empathetic AI assistant. Your goal is to provide clear, concise, and accurate answers to the user's questions or instructions in a warm and approachable tone. Use conversational language and try to be helpful and understanding.

User's Input: {{{question}}}

{{#if imageDataUri}}
The user has also provided an image. Analyze this image as part of your response:
{{media url=imageDataUri}}
{{/if}}

{{#if fileData}}
The user has also uploaded a file named "{{fileData.name}}" (type: {{fileData.type}}).
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
Also, return the original question in the 'originalQuestion' field, which should be the user's textual input.
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
    inputSchema: AnswerGeneralQuestionInputSchema, // Flow's internal input type matches prompt's expectation
    outputSchema: AnswerGeneralQuestionOutputSchema,
  },
  async (input: AnswerGeneralQuestionUserFacingInput) => { // Flow receives user-facing input type
    
    const promptInput: AnswerGeneralQuestionInput = { ...input };

    if (input.fileData) {
      promptInput.fileIsText = input.fileData.type.startsWith("text");
      if (promptInput.fileIsText) {
        const fileContent = dataUriToString(input.fileData.dataUri);
        promptInput.fileTextPreview = fileContent.substring(0, 2000);
      }
    }

    const {output} = await answerGeneralQuestionPrompt(promptInput); 
    
    if (!output) {
      // Fallback if the LLM fails to produce structured output
      // Ensure fallbackResponse.text is not null or undefined before assigning
      let fallbackAnswer = "Sorry, I couldn't find an answer to that. I'm still learning!";
      try {
        const fallbackResponse = await ai.generate({
          prompt: `Answer the following question in a friendly and empathetic tone: ${input.question}`,
        });
        if (fallbackResponse.text) {
          fallbackAnswer = fallbackResponse.text;
        }
      } catch (e) {
        console.error("Error during fallback generation:", e);
        // Keep the default fallbackAnswer
      }
      return {
        answer: fallbackAnswer,
        originalQuestion: input.question,
      };
    }
    return {
      ...output,
      originalQuestion: output.originalQuestion || input.question, // Ensure originalQuestion is always populated
    };
  }
);
