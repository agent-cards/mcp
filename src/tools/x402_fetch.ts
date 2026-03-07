import { fetchWithCardPayment } from '../lib/x402-client.js';
import { CARD_PAYMENT_SECRET } from '../config.js';

export const x402FetchDefinition = {
  name: 'x402_fetch',
  description:
    'Make an HTTP request that automatically pays if the server returns a 402 Payment Required response with x402 payment headers. Uses the specified card for payment. If the resource is not payment-gated, behaves like a normal fetch. Check the card balance with check_balance before calling this tool to ensure sufficient funds. Falls back to returning the response as-is if payment negotiation fails.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'The URL to fetch' },
      method: { type: 'string', description: 'HTTP method (default: GET)' },
      headers: {
        type: 'object',
        description: 'Additional request headers',
        additionalProperties: { type: 'string' },
      },
      body: { type: 'string', description: 'Request body' },
      card_id: { type: 'string', description: 'Agent Card ID to use for payment' },
    },
    required: ['url', 'card_id'],
  },
};

interface X402FetchArgs {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  card_id: string;
}

export async function x402Fetch(args: X402FetchArgs, jwt: string) {
  if (!CARD_PAYMENT_SECRET) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Error: CARD_PAYMENT_SECRET is not configured. x402 card payments are not available.',
        },
      ],
      isError: true,
    };
  }

  // Extract userId from the JWT (decode without verification — the backend already verified it)
  let userId: string;
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1], 'base64').toString('utf-8'),
    );
    userId = payload.userId;
    if (!userId) throw new Error('No userId in JWT');
  } catch {
    return {
      content: [{ type: 'text' as const, text: 'Error: Could not extract userId from JWT' }],
      isError: true,
    };
  }

  const requestOptions: RequestInit = {
    method: args.method ?? 'GET',
    headers: {
      ...args.headers,
      Authorization: `Bearer ${jwt}`,
    },
  };
  if (args.body) {
    requestOptions.body = args.body;
  }

  const { response, payment } = await fetchWithCardPayment(
    args.url,
    requestOptions,
    userId,
    args.card_id,
  );

  const responseBody = await response.text();

  const lines: string[] = [];
  lines.push(`Status: ${response.status} ${response.statusText}`);

  if (payment) {
    if (payment.paid) {
      lines.push(`Payment: $${((payment.amountCents ?? 0) / 100).toFixed(2)} charged to card ${args.card_id}`);
    } else if (payment.acceptedSchemes) {
      lines.push(`Payment required but card scheme not accepted. Accepted schemes: ${payment.acceptedSchemes.join(', ')}`);
    } else {
      const reason = payment.rejectionReason
        ? `Payment was rejected. Reason: ${payment.rejectionReason}`
        : 'Payment required but could not be processed.';
      lines.push(reason);
    }
  }

  lines.push('');
  lines.push(responseBody);

  return {
    content: [{ type: 'text' as const, text: lines.join('\n') }],
  };
}
