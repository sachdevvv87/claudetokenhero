# Universal Token Limiter

A simple, shareable proxy that enforces a universal 50,000-token context window cap for any LLM API. It works with Anthropic- and OpenAI-style endpoints and can be used by non-technical users with a copy-paste setup.

## What it does
- Blocks or trims requests that exceed 50,000 tokens (approximate estimate).
- Works with Anthropic `/v1/messages` and OpenAI `/v1/chat/completions`.
- Lets you keep one universal cap across models, even if their native limit is higher.

## Quick start (non-technical)
1. Install Node.js (LTS).
2. Open PowerShell in this folder and run the one-click setup:

```powershell
.\setup.ps1
```

3. Start the limiter:

```bash
npm start
```

The limiter now runs at `http://localhost:8080`.

## How to use it with Claude
Point your Claude SDK or app to the proxy and keep your normal API key.

Examples:
- If your SDK supports a base URL, set it to `http://localhost:8080`.
- Or send the header `x-upstream-url: https://api.anthropic.com` with your requests.

## How to use it with OpenAI-style SDKs
Point the SDK to the proxy and keep your normal API key.

Examples:
- Set base URL to `http://localhost:8080`.
- Or send `x-upstream-url: https://api.openai.com` with your requests.

## Environment settings
- `MAX_CONTEXT_TOKENS` (default 50000): The enforced cap.
- `TRUNCATE` (default false): If true, the limiter trims content to fit instead of rejecting.
- `UPSTREAM_URL` (optional): Default provider if you do not send `x-upstream-url`.

## Sharing it with everyone
You can push this folder to GitHub and share it publicly. Anyone can run the limiter locally and point Claude or OpenAI-compatible apps to it.

## Codex skill (optional)
This repo includes a Codex skill at:
`skills/universal-token-limiter/SKILL.md`

Copy that folder into your Codex skills directory if you want Codex to always route requests through the proxy.

## Limitations
- Token counting is approximate and model-agnostic by design.
- Image inputs are not token-counted.
- Streaming is passed through, but your client must support streaming responses.

## License
MIT
