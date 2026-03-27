import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { CONVERSATION_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: CONVERSATION_SYSTEM_PROMPT,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return result.toTextStreamResponse();
}
