'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzePerformanceInputSchema = z.object({
  missedQuestions: z.array(z.string()).describe('An array of question texts that students frequently answered incorrectly.'),
});
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;

const AnalyzePerformanceOutputSchema = z.object({
  weakTopics: z.array(z.string()).describe('A list of the core topics or concepts students are struggling with.'),
  analysisSummary: z.string().describe('A paragraph summarizing the common mistakes or conceptual gaps based on the missed questions.'),
  recommendedAction: z.string().describe('A concrete recommendation for the instructor (e.g., specific topics to review or assignments to create).'),
});
export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;

export async function analyzePerformanceInsights(input: AnalyzePerformanceInput) {
  try {
    const result = await analyzePerformanceFlow(input);
    return { success: true, data: result };
  } catch (error: any) {
    console.error("AI Performance Analyst Error:", error);
    return { success: false, error: error.message || "An unknown error occurred during AI analysis." };
  }
}

const prompt = ai.definePrompt({
  name: 'analyzePerformancePrompt',
  input: { schema: AnalyzePerformanceInputSchema },
  output: { schema: AnalyzePerformanceOutputSchema },
  prompt: `You are an expert educational AI analyst helping instructors identify learning gaps.

The instructor has provided a list of assessment questions that students frequently got wrong. 
Analyze these questions to identify the underlying topics, common misconceptions, and provide actionable advice.

Missed Questions:
{{#each missedQuestions}}
- {{this}}
{{/each}}

Identify the 2-4 core topics students are struggling with. Summarize why they might be missing them, and give the instructor a recommendation on what to do next.`,
});

const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: AnalyzePerformanceInputSchema,
    outputSchema: AnalyzePerformanceOutputSchema,
  },
  async (input) => {
    // If no missed questions, return a default positive message to avoid wasting API calls
    if (!input.missedQuestions || input.missedQuestions.length === 0) {
      return {
        weakTopics: ['None identified'],
        analysisSummary: 'Students are performing excellently across the board. No consistent weaknesses detected.',
        recommendedAction: 'Continue with the current curriculum and difficulty level.',
      };
    }

    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate performance insights.');
    }
    return output;
  }
);
