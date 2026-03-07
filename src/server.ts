import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listCardsDefinition, listCards } from './tools/list_cards.js';
import { getCardDetailsDefinition, getCardDetails } from './tools/get_card_details.js';
import { checkBalanceDefinition, checkBalance } from './tools/check_balance.js';
import { closeCardDefinition, closeCard } from './tools/close_card.js';
import { createCardDefinition, createCard } from './tools/create_card.js';
import { getFundingStatusDefinition, getFundingStatus } from './tools/get_funding_status.js';
import { startSupportChatDefinition, startSupportChat } from './tools/start_chat.js';
import { sendSupportMessageDefinition, sendSupportMessage } from './tools/send_chat_message.js';
import { readSupportChatDefinition, readSupportChat } from './tools/read_chat.js';
import { x402FetchDefinition, x402Fetch } from './tools/x402_fetch.js';
import { approveRequestDefinition, approveRequest } from './tools/approve_request.js';

const tools = [
  listCardsDefinition,
  getCardDetailsDefinition,
  checkBalanceDefinition,
  closeCardDefinition,
  createCardDefinition,
  getFundingStatusDefinition,
  startSupportChatDefinition,
  sendSupportMessageDefinition,
  readSupportChatDefinition,
  x402FetchDefinition,
  approveRequestDefinition,
];

export function createServer(jwt: string): Server {
  const server = new Server(
    { name: 'AgentCard', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Log tool invocation for AI audit trail (sanitize sensitive fields)
    const sanitizedArgs = { ...args } as Record<string, unknown>;
    if (sanitizedArgs.card_id) sanitizedArgs.card_id = '***';
    process.stderr.write(`[agent-cards-mcp] tool=${name} args=${JSON.stringify(sanitizedArgs)}\n`);

    try {
      switch (name) {
        case 'list_cards':
          return await listCards(args as Record<string, never>, jwt);
        case 'get_card_details':
          return await getCardDetails(args as { card_id: string }, jwt);
        case 'check_balance':
          return await checkBalance(args as { card_id: string }, jwt);
        case 'close_card':
          return await closeCard(args as { card_id: string }, jwt);
        case 'create_card':
          return await createCard(
            args as { amount_cents: number; sandbox?: boolean },
            jwt
          );
        case 'get_funding_status':
          return await getFundingStatus(args as { session_id: string }, jwt);
        case 'start_support_chat':
          return await startSupportChat(args as { message: string }, jwt);
        case 'send_support_message':
          return await sendSupportMessage(args as { conversation_id: string; message: string }, jwt);
        case 'read_support_chat':
          return await readSupportChat(args as { conversation_id: string }, jwt);
        case 'x402_fetch':
          return await x402Fetch(
            args as { url: string; method?: string; headers?: Record<string, string>; body?: string; card_id: string },
            jwt
          );
        case 'approve_request':
          return await approveRequest(
            args as { approval_id: string; decision: 'approved' | 'denied'; action: 'card_details' | 'transaction'; resource_id: string; funding_session_id?: string },
            jwt
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  return server;
}
