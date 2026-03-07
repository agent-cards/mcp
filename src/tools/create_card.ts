import { mcpFetch } from '../lib/mcp-fetch.js';

export const createCardDefinition = {
  name: 'create_card',
  description:
    'Create a new prepaid virtual Visa card. Returns a Stripe checkout URL that the human must open in a browser to complete payment. IMPORTANT: After calling this tool, tell the user to open the checkout URL. Then call get_funding_status with the returned session_id to poll until the card is ready. Use sandbox: true for testing without real payment.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount_cents: {
        type: 'number',
        description: 'Funding amount in cents (minimum 100, i.e. $1.00)',
      },
      sandbox: {
        type: 'boolean',
        description: 'If true, create a test card without real payment (default: false)',
      },
    },
    required: ['amount_cents'],
  },
};

export async function createCard(
  args: { amount_cents: number; sandbox?: boolean },
  jwt: string,
) {
  const res = await mcpFetch('/funding/checkout', jwt, {
    method: 'POST',
    body: JSON.stringify({
      amountCents: args.amount_cents,
      sandbox: args.sandbox ?? false,
    }),
  });

  if (res.status === 403) {
    const body = await res.json() as { error?: string };
    if (body.error === 'beta_capacity_reached') {
      return {
        content: [{ type: 'text' as const, text: "Thanks for trying the beta! We've reached our card issuance limit. You've been added to our waitlist — we'll notify you when we can issue more cards." }],
      };
    }
  }

  if (res.status === 202) {
    const body = (await res.json()) as {
      approvalId: string;
      fundingSessionId: string;
      message: string;
    };

    const text = [
      'Approval required to create a virtual card.',
      `Ask the user for approval, then call approve_request with:`,
      `  approval_id: "${body.approvalId}"`,
      `  decision: "approved" (or "denied")`,
      `  action: "transaction"`,
      `  resource_id: "${body.fundingSessionId}"`,
      `  funding_session_id: "${body.fundingSessionId}"`,
    ].join('\n');

    return { content: [{ type: 'text' as const, text }] };
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const { sessionId, checkoutUrl } = (await res.json()) as {
    sessionId: string;
    checkoutUrl: string;
  };

  const text = [
    `Checkout session created.`,
    `Session ID: ${sessionId}`,
    `Checkout URL: ${checkoutUrl}`,
    ``,
    `The user must open the checkout URL to complete payment.`,
    `After payment, call get_funding_status with session_id "${sessionId}" to check when the card is ready.`,
  ].join('\n');

  return { content: [{ type: 'text' as const, text }] };
}
