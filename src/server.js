const express = require("express");
const dotenv = require("dotenv");
const { Readable } = require("node:stream");
const { estimateRequestTokens, truncateRequestToLimit } = require("./tokenize");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 8080);
const MAX_CONTEXT_TOKENS = Number(process.env.MAX_CONTEXT_TOKENS || 50000);
const TRUNCATE = String(process.env.TRUNCATE || "false").toLowerCase() === "true";

app.use(express.json({ limit: "50mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

function detectMode(path, body) {
  if (path.startsWith("/v1/messages")) return "anthropic";
  if (path.startsWith("/v1/chat/completions") || path.startsWith("/v1/completions")) return "openai";
  if (body && typeof body.model === "string" && body.model.toLowerCase().includes("claude")) return "anthropic";
  return "openai";
}

function getUpstreamUrl(req) {
  const fromHeader = req.headers["x-upstream-url"];
  const fromEnv = process.env.UPSTREAM_URL;
  const upstream = (fromHeader || fromEnv || "").toString().trim();
  if (!upstream) return null;
  return upstream.replace(/\/$/, "");
}

app.use(async (req, res) => {
  if (req.method === "GET") {
    return res.status(404).json({ error: { message: "Not found" } });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: { message: "Invalid or missing JSON body" } });
  }

  const mode = detectMode(req.path, req.body);
  const estimatedTokens = estimateRequestTokens(req.body, mode);

  if (estimatedTokens > MAX_CONTEXT_TOKENS) {
    if (!TRUNCATE) {
      return res.status(400).json({
        error: {
          message: `Context exceeds limit. Estimated ${estimatedTokens} tokens, max ${MAX_CONTEXT_TOKENS}.`,
          type: "token_limit_exceeded",
        },
        mode,
        estimated_tokens: estimatedTokens,
        max_tokens: MAX_CONTEXT_TOKENS,
      });
    }

    req.body = truncateRequestToLimit(req.body, mode, MAX_CONTEXT_TOKENS);
  }

  const upstreamBase = getUpstreamUrl(req);
  if (!upstreamBase) {
    return res.status(400).json({
      error: {
        message: "Missing upstream URL. Set UPSTREAM_URL or send x-upstream-url header.",
        type: "missing_upstream",
      },
    });
  }

  const upstreamUrl = `${upstreamBase}${req.originalUrl}`;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];
  delete headers["accept-encoding"];
  delete headers["x-upstream-url"];

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: JSON.stringify(req.body),
    });

    res.status(upstreamRes.status);
    for (const [key, value] of upstreamRes.headers.entries()) {
      if (key.toLowerCase() === "content-encoding") continue;
      res.setHeader(key, value);
    }

    res.setHeader("x-token-limiter-estimate", String(estimatedTokens));
    res.setHeader("x-token-limiter-max", String(MAX_CONTEXT_TOKENS));

    if (!upstreamRes.body) {
      const text = await upstreamRes.text();
      return res.send(text);
    }

    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.pipe(res);
  } catch (err) {
    return res.status(502).json({
      error: {
        message: "Failed to reach upstream provider.",
        type: "upstream_error",
      },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Universal Token Limiter running on http://localhost:${PORT}`);
});
