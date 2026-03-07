import { randomUUID } from 'crypto';
import { API_URL } from '../config.js';

/**
 * Fetch wrapper that adds AI audit headers (X-Caller-Type, X-Correlation-ID)
 * to every MCP → backend API call for audit trail compliance.
 */
export function mcpFetch(
  path: string,
  jwt: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    correlationId?: string;
  } = {},
): Promise<Response> {
  const correlationId = options.correlationId ?? randomUUID();
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  return fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'X-Caller-Type': 'mcp-agent',
      'X-Correlation-ID': correlationId,
      'X-Approval-Channel': 'inline_mcp',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: options.body } : {}),
  });
}
