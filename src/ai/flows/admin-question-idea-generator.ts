'use server';
/**
 * @fileOverview An AI tool to assist administrators by suggesting diverse question ideas and variations
 * based on provided topics and difficulty levels.
 *
 * - generateQuestionIdeas - A function that handles the generation of question ideas.
 * - GenerateQuestionIdeasInput - The input type for the generateQuestionIdeas function.
 * - GenerateQuestionIdeasOutput - The return type for the generateQuestionIdeas function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateQuestionIdeasInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate question ideas.'),
  difficultyLevel: z.enum(['easy', 'medium', 'hard']).describe('The desired difficulty level for the questions.'),
});
export type GenerateQuestionIdeasInput = z.infer<typeof GenerateQuestionIdeasInputSchema>;

const GenerateQuestionIdeaSchema = z.object({
  questionText: z.string().describe('A suggested question text.'),
  suggestedOptions: z.array(z.string()).describe('An array of possible answer options for the question.'),
  correctOptionIndex: z.number().int().describe('The zero-based index of the correct option in the suggestedOptions array.'),
});

const GenerateQuestionIdeasOutputSchema = z.object({
  questions: z.array(GenerateQuestionIdeaSchema).describe('An array of diverse question ideas.'),
});
export type GenerateQuestionIdeasOutput = z.infer<typeof GenerateQuestionIdeasOutputSchema>;

export async function generateQuestionIdeas(input: GenerateQuestionIdeasInput): Promise<GenerateQuestionIdeasOutput> {
  return generateQuestionIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionIdeasPrompt',
  input: { schema: GenerateQuestionIdeasInputSchema },
  output: { schema: GenerateQuestionIdeasOutputSchema },
  prompt: `You are an AI assistant that helps create multiple-choice questions for exams.

Generate a list of diverse and high-quality question ideas and variations for the given topic and difficulty level.
Each question should have at least 4 options, and one correct answer.

Topic: {{{topic}}}
Difficulty Level: {{{difficultyLevel}}}

Make sure the questions are clear, unambiguous, and the options are plausible distractors.`,
});

const generateQuestionIdeasFlow = ai.defineFlow(
  {
    name: 'generateQuestionIdeasFlow',
    inputSchema: GenerateQuestionIdeasInputSchema,
    outputSchema: GenerateQuestionIdeasOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate question ideas.');
    }
    return output;
  }
);
