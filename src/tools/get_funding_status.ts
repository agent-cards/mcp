import { mcpFetch } from '../lib/mcp-fetch.js';

export const getFundingStatusDefinition = {
  name: 'get_funding_status',
  description:
    'Poll the status of a card funding session after the user completes Stripe checkout. Returns "pending" while waiting for payment, or full card details once the card is ready. Recommended: poll every 3-5 seconds. Typical funding completes within 30 seconds of the user completing checkout.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      session_id: {
        type: 'string',
        description: 'The session ID returned by create_card',
      },
    },
    required: ['session_id'],
  },
};

export async function getFundingStatus(args: { session_id: string }, jwt: string) {
  const res = await mcpFetch(`/funding/status/${args.session_id}`, jwt);

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { status: string; card?: Record<string, unknown> };

  if (data.status === 'pending') {
    return { content: [{ type: 'text' as const, text: 'Status: pending — payment not yet completed.' }] };
  }

  const text = `Status: ${data.status}\nCard: ${JSON.stringify(data.card, null, 2)}`;
  return { content: [{ type: 'text' as const, text }] };
}
