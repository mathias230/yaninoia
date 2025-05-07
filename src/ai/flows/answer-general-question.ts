'use server';
/**
 * @fileOverview A Genkit flow for answering general knowledge questions.
 *
 * - answerGeneralQuestion - A function that takes a user's question and returns an answer.
 * - AnswerGeneralQuestionInput - The input type for the answerGeneralQuestion function.
 * - AnswerGeneralQuestionOutput - The return type for the answerGeneralQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerGeneralQuestionInputSchema = z.object({
  question: z.string().describe('The question asked by the user.'),
});
export type AnswerGeneralQuestionInput = z.infer<typeof AnswerGeneralQuestionInputSchema>;

const AnswerGeneralQuestionOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
  originalQuestion: z.string().describe('The original question that was answered.')
});
export type AnswerGeneralQuestionOutput = z.infer<typeof AnswerGeneralQuestionOutputSchema>;

export async function answerGeneralQuestion(input: AnswerGeneralQuestionInput): Promise<AnswerGeneralQuestionOutput> {
  return answerGeneralQuestionFlow(input);
}

const answerGeneralQuestionPrompt = ai.definePrompt({
  name: 'answerGeneralQuestionPrompt',
  input: {schema: AnswerGeneralQuestionInputSchema},
  output: {schema: AnswerGeneralQuestionOutputSchema},
  prompt: `You are a helpful AI assistant. Your goal is to provide clear, concise, and accurate answers to the user's questions.
User's Question: {{{question}}}

Provide your answer in the 'answer' field.
Also, return the original question in the 'originalQuestion' field.
`,
});

const answerGeneralQuestionFlow = ai.defineFlow(
  {
    name: 'answerGeneralQuestionFlow',
    inputSchema: AnswerGeneralQuestionInputSchema,
    outputSchema: AnswerGeneralQuestionOutputSchema,
  },
  async (input: AnswerGeneralQuestionInput) => {
    const {output} = await answerGeneralQuestionPrompt(input);
    if (!output) {
      // Fallback if the LLM fails to produce structured output
      // This is a basic fallback, more robust error handling might be needed
      const fallbackResponse = await ai.generate({
        prompt: `Answer the following question: ${input.question}`,
      });
      return {
        answer: fallbackResponse.text ?? "Sorry, I couldn't find an answer to that.",
        originalQuestion: input.question,
      };
    }
    // Ensure originalQuestion is populated if not directly by LLM (though it should be)
    return {
      ...output,
      originalQuestion: output.originalQuestion || input.question,
    };
  }
);
