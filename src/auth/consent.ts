import { MCP_BASE_URL } from '../config.js';

export function getConsentHtml(pendingAuthId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in — AgentCard</title>
  <link rel="icon" type="image/svg+xml" href="https://agentcard.sh/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fafafa;
      --card: #ffffff;
      --fg: #09090b;
      --dim: #555;
      --muted: #888;
      --accent: #a78bfa;
      --border: rgba(0,0,0,0.1);
      --ease: cubic-bezier(0.4, 0, 0.2, 1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      max-width: 400px;
      width: 100%;
      margin: 20px;
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
    }

    .card-inner {
      padding: 40px 36px 36px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .logo-text {
      font-family: 'Geist Mono', monospace;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: -0.02em;
      color: var(--fg);
    }

    .subtitle {
      font-family: 'Geist Mono', monospace;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 32px;
      letter-spacing: -0.01em;
    }

    label {
      display: block;
      font-family: 'Geist Mono', monospace;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--dim);
      margin-bottom: 8px;
    }

    input[type="email"] {
      width: 100%;
      padding: 11px 14px;
      background: var(--card);
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 0;
      color: var(--fg);
      font-family: 'Geist Mono', monospace;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s var(--ease);
    }

    input[type="email"]::placeholder {
      color: #bbb;
    }

    input[type="email"]:focus {
      border-color: var(--accent);
    }

    button {
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      background: var(--fg);
      color: #fafafa;
      border: none;
      border-radius: 0;
      font-family: 'Geist Mono', monospace;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s var(--ease);
    }

    button:hover { opacity: 0.85; }

    button:disabled {
      background: #d4d4d4;
      color: #888;
      cursor: not-allowed;
      opacity: 1;
    }

    .status {
      margin-top: 20px;
      padding: 12px 14px;
      font-family: 'Geist Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
      display: none;
    }

    .status.info {
      display: block;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      color: #6d28d9;
    }

    .status.error {
      display: block;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }

    .status.success {
      display: block;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }

    .footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      text-align: center;
    }

    .footer a {
      font-family: 'Geist Mono', monospace;
      font-size: 12px;
      color: var(--muted);
      text-decoration: none;
      transition: color 0.15s var(--ease);
    }

    .footer a:hover { color: var(--fg); }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-inner">
      <div class="logo">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="24" height="24" fill="none"><rect x="20" y="43" width="160" height="114" rx="12" stroke="#09090b" stroke-width="5" fill="none"/><rect x="58" y="68" width="84" height="64" stroke="#09090b" stroke-width="5" fill="none"/><line x1="58" y1="103.5" x2="142" y2="103.5" stroke="#09090b" stroke-width="5"/><line x1="99.5" y1="68" x2="99.5" y2="103.5" stroke="#09090b" stroke-width="5"/></svg>
        <span class="logo-text">AgentCard</span>
      </div>
      <p class="subtitle">Sign in to connect your account to Claude</p>

      <form id="authForm">
        <label for="email">Email address</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required autocomplete="email">
        <button type="submit" id="submitBtn">Send magic link</button>
      </form>

      <div id="status" class="status"></div>

      <div class="footer">
        <a href="https://agentcard.sh" target="_blank">agentcard.sh</a>
      </div>
    </div>
  </div>

  <script>
    const pendingAuthId = ${JSON.stringify(pendingAuthId)};
    const baseUrl = ${JSON.stringify(MCP_BASE_URL)};
    const form = document.getElementById('authForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusEl = document.getElementById('status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      if (!email) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        const res = await fetch(baseUrl + '/oauth/submit-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, pendingAuthId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to send magic link');
        }

        statusEl.className = 'status info';
        statusEl.textContent = 'Check your email and click the magic link to sign in.';
        form.style.display = 'none';

        // Poll for completion
        pollForAuth();
      } catch (err) {
        statusEl.className = 'status error';
        statusEl.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send magic link';
      }
    });

    async function pollForAuth() {
      const maxAttempts = 90; // 15 min at 10s intervals
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 10000));

        try {
          const res = await fetch(baseUrl + '/oauth/poll?pending=' + encodeURIComponent(pendingAuthId));
          const data = await res.json();

          if (data.status === 'verified') {
            statusEl.className = 'status success';
            statusEl.textContent = 'Authenticated! Redirecting...';
            // Redirect to complete OAuth flow
            window.location.href = baseUrl + '/oauth/complete?pending=' + encodeURIComponent(pendingAuthId);
            return;
          }
        } catch {
          // ignore polling errors
        }
      }

      statusEl.className = 'status error';
      statusEl.textContent = 'Session expired. Please refresh and try again.';
    }
  </script>
</body>
</html>`;
}
