import { mcpFetch } from '../lib/mcp-fetch.js';

export const createCardDefinition = {
  name: 'create_card',
  description:
    'Create a new virtual Visa card. Requires a saved payment method (call setup_payment_method first). Your payment method is only charged when the card is used. Cards expire after 7 days if unused. Limits: max $50 per card, max 5 active cards. Contact support to request higher limits. Use sandbox: true for testing.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      amount_cents: {
        type: 'number',
        description: 'Card funding amount in cents (minimum 100, maximum 5000 i.e. $1.00–$50.00)',
      },
      sandbox: {
        type: 'boolean',
        description: 'If true, create a test card without real payment (default: false)',
      },
    },
    required: ['amount_cents'],
  },
  annotations: {
    title: 'Create Card',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

export async function createCard(
  args: { amount_cents: number; sandbox?: boolean },
  jwt: string,
) {
  // Pre-flight: check payment method exists before attempting card creation
  const pmRes = await mcpFetch('/payment-methods/status', jwt);
  if (pmRes.ok) {
    const pmBody = (await pmRes.json()) as { hasPaymentMethod: boolean };
    if (!pmBody.hasPaymentMethod) {
      const text = [
        'No saved payment method found.',
        '',
        'Please call setup_payment_method first to save a payment method, then retry create_card.',
      ].join('\n');
      return { content: [{ type: 'text' as const, text }] };
    }
  }

  const res = await mcpFetch('/cards/create', jwt, {
    method: 'POST',
    body: JSON.stringify({ amountCents: args.amount_cents }),
  });

  // 202: Approval required (check before res.ok since 202 is also "ok")
  if (res.status === 202) {
    const body = (await res.json()) as {
      approvalId: string;
      message: string;
    };

    const text = [
      'Approval required to create a virtual card.',
      `Ask the user for approval, then call approve_request with:`,
      `  approval_id: "${body.approvalId}"`,
      `  decision: "approved" (or "denied")`,
      `  action: "transaction"`,
      `  resource_id: "${body.approvalId}"`,
    ].join('\n');

    return { content: [{ type: 'text' as const, text }] };
  }

  // 200: Card created successfully
  if (res.ok) {
    const card = (await res.json()) as {
      id: string;
      last4: string;
      expiry: string;
      balanceCents: number;
      status: string;
    };

    const text = [
      `Card created successfully.`,
      `Card ID: ${card.id}`,
      `Last 4: ${card.last4}`,
      `Expiry: ${card.expiry}`,
      `Balance: $${(card.balanceCents / 100).toFixed(2)}`,
      `Status: ${card.status}`,
      '',
      'Billing address (use this for online purchases):',
      '  2261 Market Street #4242',
      '  San Francisco, CA 94114, US',
      '',
      'Your payment method will only be charged when this card is used.',
      'The card expires if not used within 7 days.',
    ].join('\n');

    return { content: [{ type: 'text' as const, text }] };
  }

  // 422: Payment method required or user info required
  if (res.status === 422) {
    const body = (await res.json()) as {
      status: string;
      missingFields?: string[];
      message?: string;
    };

    if (body.status === 'payment_method_required') {
      const text = [
        'No saved payment method found.',
        '',
        'Please call setup_payment_method first to save a payment method, then retry create_card.',
      ].join('\n');

      return { content: [{ type: 'text' as const, text }] };
    }

    if (body.status === 'user_info_required') {
      const text = [
        'Before creating your first card, we need some identity information.',
        '',
        'Please collect the following from the user:',
        '  1. First name (legal name)',
        '  2. Last name (legal name)',
        '  3. Date of birth (YYYY-MM-DD format)',
        '  4. Acceptance of the Stripe Issuing cardholder terms of service',
        '',
        'Then call submit_user_info with:',
        '  first_name, last_name, date_of_birth, terms_accepted (must be true)',
        '',
        `After that, call create_card again with amount_cents ${args.amount_cents} to issue the card.`,
      ].join('\n');

      return { content: [{ type: 'text' as const, text }] };
    }
  }

  // 403: Beta capacity reached
  if (res.status === 403) {
    const body = (await res.json()) as { error?: string };
    if (body.error === 'beta_capacity_reached') {
      return {
        content: [{ type: 'text' as const, text: "Thanks for trying the beta! We've reached our card issuance limit. You've been added to our waitlist — we'll notify you when we can issue more cards." }],
      };
    }
  }

  // 503: Issuing balance insufficient
  if (res.status === 503) {
    const body = (await res.json()) as { error?: string; message?: string };
    if (body.error === 'issuing_balance_insufficient') {
      return {
        content: [{ type: 'text' as const, text: body.message ?? 'Our card issuing balance is temporarily insufficient. Please try again later.' }],
      };
    }
  }

  // 402: Payment method declined
  if (res.status === 402) {
    const body = (await res.json()) as { error?: string; message?: string; decline_reason?: string };
    const lines = [
      body.message ?? 'Your payment method was declined.',
    ];
    if (body.decline_reason) {
      lines.push(`Reason: ${body.decline_reason}`);
    }
    lines.push(
      '',
      'Your payment method has been removed. Please call setup_payment_method to add a new payment method, then retry create_card.',
    );
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  }

  // 400: Limit errors
  if (res.status === 400) {
    const body = (await res.json()) as { error?: string; message?: string };
    if (body.error === 'amount_exceeds_limit' || body.error === 'card_limit_reached') {
      return {
        content: [{ type: 'text' as const, text: body.message ?? body.error }],
      };
    }
  }

  // Other errors
  throw new Error(`API error ${res.status}: ${await res.text()}`);
}
