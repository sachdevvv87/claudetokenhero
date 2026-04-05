# Universal Token Limiter

Use this skill to enforce a 50,000-token context window cap across LLM calls by routing requests through the local proxy.

## Rules
- Always send LLM requests through `http://localhost:8080`.
- Keep the cap at 50,000 tokens unless the user explicitly asks to change it.
- If an input is too large, reduce it (summarize or trim) before sending.

## Notes
- The proxy supports both Anthropic (`/v1/messages`) and OpenAI-style (`/v1/chat/completions`).
- The proxy estimates tokens in a model-agnostic way and rejects or trims requests that exceed the cap.
