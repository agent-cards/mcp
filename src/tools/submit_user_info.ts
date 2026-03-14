import { mcpFetch } from '../lib/mcp-fetch.js';

export const submitUserInfoDefinition = {
  name: 'submit_user_info',
  description:
    'Submit user identity information required before creating your first virtual card. Call this after create_card returns a user_info_required response. Collects first name, last name, date of birth, phone number, and Stripe Issuing cardholder terms acceptance.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      first_name: {
        type: 'string',
        description: "User's legal first name",
      },
      last_name: {
        type: 'string',
        description: "User's legal last name",
      },
      date_of_birth: {
        type: 'string',
        description: "User's date of birth in YYYY-MM-DD format",
      },
      phone_number: {
        type: 'string',
        description: "User's phone number (e.g. +1-555-123-4567)",
      },
      terms_accepted: {
        type: 'boolean',
        description:
          'Must be true — indicates the user has accepted the Stripe Issuing cardholder terms of service',
      },
    },
    required: ['first_name', 'last_name', 'date_of_birth', 'phone_number', 'terms_accepted'],
  },
};

export async function submitUserInfo(
  args: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone_number: string;
    terms_accepted: boolean;
  },
  jwt: string,
) {
  const res = await mcpFetch('/cards/user-info', jwt, {
    method: 'POST',
    body: JSON.stringify({
      firstName: args.first_name,
      lastName: args.last_name,
      dateOfBirth: args.date_of_birth,
      phoneNumber: args.phone_number,
      termsAccepted: args.terms_accepted,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: 'User information saved successfully. You can now call create_card to issue a virtual card.',
      },
    ],
  };
}
