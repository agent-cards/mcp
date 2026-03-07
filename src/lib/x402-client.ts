import { SignJWT } from 'jose';
import { CARD_PAYMENT_SECRET } from '../config.js';

interface CardSchemeAccept {
  scheme: 'card';
  facilitator?: string;
  [key: string]: unknown;
}

interface PaymentRequired {
  x402Version: number;
  accepts: Array<{ scheme: string; [key: string]: unknown }>;
}

interface X402PaymentResult {
  paid: boolean;
  amountCents?: number;
  transaction?: string;
  acceptedSchemes?: string[];
  rejectionReason?: string;
}

export async function fetchWithCardPayment(
  url: string,
  options: RequestInit,
  userId: string,
  cardId: string,
): Promise<{ response: Response; payment?: X402PaymentResult }> {
  // Make the initial request
  const response = await fetch(url, options);

  // If not 402, return as-is
  if (response.status !== 402) {
    return { response };
  }

  // Try to parse the PaymentRequired info
  const paymentRequiredHeader = response.headers.get('x-payment-required');
  if (!paymentRequiredHeader) {
    return { response, payment: { paid: false } };
  }

  let paymentRequired: PaymentRequired;
  try {
    const decoded = Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8');
    paymentRequired = JSON.parse(decoded);
  } catch {
    return { response, payment: { paid: false } };
  }

  // Look for card scheme in accepts
  const cardAccept = paymentRequired.accepts.find(
    (a): a is CardSchemeAccept => a.scheme === 'card',
  );

  if (!cardAccept) {
    return {
      response,
      payment: {
        paid: false,
        acceptedSchemes: paymentRequired.accepts.map((a) => a.scheme),
      },
    };
  }

  if (!CARD_PAYMENT_SECRET) {
    return {
      response,
      payment: { paid: false, acceptedSchemes: ['card'] },
    };
  }

  // Find the requested amount from the accept entry or default
  const amountCents = (cardAccept as any).amountCents ?? (cardAccept as any).maxAmountCents ?? 0;
  if (amountCents <= 0) {
    return { response, payment: { paid: false } };
  }

  // Build the card payment token
  const secret = new TextEncoder().encode(CARD_PAYMENT_SECRET);
  const now = Math.floor(Date.now() / 1000);

  const cardToken = await new SignJWT({
    cardId,
    userId,
    maxAmountCents: amountCents,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(secret);

  const nonce = crypto.randomUUID();

  const paymentPayload = {
    x402Version: 1,
    scheme: 'card',
    payload: {
      cardToken,
      amountCents,
      currency: 'USD',
      nonce,
      validBefore: now + 60,
      resourceUrl: url,
    },
  };

  const encodedPayment = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  // Retry the original request with the payment header
  const paidResponse = await fetch(url, {
    ...options,
    headers: {
      ...Object.fromEntries(new Headers(options.headers).entries()),
      'X-PAYMENT': encodedPayment,
    },
  });

  let rejectionReason: string | undefined;
  if (!paidResponse.ok) {
    try {
      const cloned = paidResponse.clone();
      const errorBody = await cloned.json() as { error?: string; message?: string };
      rejectionReason = errorBody.error ?? errorBody.message;
    } catch {
      // response wasn't JSON — no rejection reason available
    }
  }

  return {
    response: paidResponse,
    payment: {
      paid: paidResponse.ok,
      amountCents,
      rejectionReason,
    },
  };
}
