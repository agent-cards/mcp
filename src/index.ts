import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JWT } from './config.js';
import { createServer } from './server.js';

async function main() {
  if (!JWT) {
    process.stderr.write('[agent-cards-mcp] Warning: AGENT_CARDS_JWT is not set\n');
  }
  const server = createServer(JWT);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[agent-cards-mcp] Server running on stdio\n');
}

main().catch((err) => {
  process.stderr.write(`[agent-cards-mcp] Fatal: ${err.message}\n`);
  process.exit(1);
});
