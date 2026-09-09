'use server';
/**
 * @fileOverview An AI tool to assist administrators by parsing attached documents (PDFs, DOCX, or Images)
 * and extracting structured multiple-choice questions.
 *
 * - parseExamDocument - A function that handles the document parsing process.
 * - ParseDocumentInput - The input type for the parseExamDocument function.
 * - ParseDocumentOutput - The return type for the parseExamDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ParseDocumentInputSchema = z.object({
  documentDataUri: z.string().describe("A data URI of the document (PDF, DOCX, or image) to parse. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type ParseDocumentInput = z.infer<typeof ParseDocumentInputSchema>;

const ParsedQuestionSchema = z.object({
  questionText: z.string().describe('The extracted question text.'),
  options: z.array(z.string()).describe('The extracted multiple-choice options.'),
  correctOptionIndex: z.number().int().describe('The zero-based index of the correct option as identified in the document.'),
});

const ParseDocumentOutputSchema = z.object({
  questions: z.array(ParsedQuestionSchema).describe('An array of structured questions extracted from the document.'),
});
export type ParseDocumentOutput = z.infer<typeof ParseDocumentOutputSchema>;

export async function parseExamDocument(input: ParseDocumentInput): Promise<ParseDocumentOutput> {
  return parseDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseExamDocumentPrompt',
  input: { schema: ParseDocumentInputSchema },
  output: { schema: ParseDocumentOutputSchema },
  prompt: `You are an expert at extracting structured educational content from various document formats.

Analyze the attached document (which could be a PDF, Word document, or Image) and extract all multiple-choice questions. 
For each question, identify:
1. The question text.
2. All available options (A, B, C, D, etc.).
3. The correct answer. Look for labels like "Answer: A", "Correct: 1", bolded text, or a separate answer key section.

If no key is explicitly provided, use your best judgment to determine the most plausible correct answer based on the subject matter, but prioritize explicit labels if they exist.

Document: {{media url=documentDataUri}}`,
});

const parseDocumentFlow = ai.defineFlow(
  {
    name: 'parseDocumentFlow',
    inputSchema: ParseDocumentInputSchema,
    outputSchema: ParseDocumentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to parse the document. Ensure it contains clear multiple-choice questions.');
    }
    return output;
  }
);
