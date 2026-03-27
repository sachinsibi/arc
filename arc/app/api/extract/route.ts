import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { TREE_EXTRACTION_PROMPT, NARRATIVE_SYNTHESIS_PROMPT } from '@/lib/prompts';
import { LifeTree } from '@/lib/types';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Format the conversation transcript as readable text
  const transcript = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'User' : 'Arc'}: ${m.content}`
    )
    .join('\n\n');

  // Step 1: Extract tree structure
  const treeResult = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: TREE_EXTRACTION_PROMPT,
    messages: [{ role: 'user', content: transcript }],
  });

  let tree: LifeTree;
  try {
    tree = JSON.parse(treeResult.text);
  } catch {
    // Claude sometimes wraps JSON in markdown code fences — strip and retry
    const jsonMatch = treeResult.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      tree = JSON.parse(jsonMatch[0]);
    } else {
      return Response.json(
        { error: 'Failed to parse tree JSON from Claude response' },
        { status: 500 }
      );
    }
  }

  // Step 2: Generate narrative synthesis
  const narrativeResult = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: NARRATIVE_SYNTHESIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: `CONVERSATION TRANSCRIPT:\n${transcript}\n\nEXTRACTED TREE DATA:\n${JSON.stringify(tree, null, 2)}`,
      },
    ],
  });

  return Response.json({
    tree,
    narrative: narrativeResult.text,
  });
}
