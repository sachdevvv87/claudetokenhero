function normalizeTextInput(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .join("");
  }
  if (typeof content.text === "string") return content.text;
  return "";
}

function estimateTokensForText(text) {
  if (!text) return 0;
  // Simple, model-agnostic estimate: ~4 characters per token.
  return Math.ceil(text.length / 4);
}

function collectTextRefsFromMessages(messages) {
  const refs = [];
  if (!Array.isArray(messages)) return refs;

  for (const message of messages) {
    if (!message) continue;

    if (typeof message.content === "string") {
      refs.push({
        get: () => message.content,
        set: (val) => {
          message.content = val;
        },
      });
      continue;
    }

    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (!part) continue;
        if (typeof part === "string") {
          refs.push({
            get: () => part,
            set: (val) => {
              const index = message.content.indexOf(part);
              if (index >= 0) message.content[index] = val;
            },
          });
          continue;
        }
        if (typeof part.text === "string") {
          refs.push({
            get: () => part.text,
            set: (val) => {
              part.text = val;
            },
          });
        }
      }
    }
  }

  return refs;
}

function estimateRequestTokens(body, mode) {
  let totalText = "";

  if (mode === "anthropic") {
    if (body.system) totalText += normalizeTextInput(body.system);
    if (Array.isArray(body.messages)) {
      for (const m of body.messages) totalText += normalizeTextInput(m.content);
    }
  } else {
    if (Array.isArray(body.messages)) {
      for (const m of body.messages) totalText += normalizeTextInput(m.content);
    }
    if (body.prompt) totalText += normalizeTextInput(body.prompt);
    if (body.input) totalText += normalizeTextInput(body.input);
  }

  return estimateTokensForText(totalText);
}

function truncateRequestToLimit(body, mode, maxTokens) {
  const charLimit = Math.max(0, Math.floor(maxTokens * 4));
  let usedChars = 0;

  const consume = (text) => {
    if (!text) return "";
    const remaining = charLimit - usedChars;
    if (remaining <= 0) return "";
    const slice = text.slice(0, remaining);
    usedChars += slice.length;
    return slice;
  };

  if (mode === "anthropic") {
    if (body.system) body.system = consume(normalizeTextInput(body.system));
    const refs = collectTextRefsFromMessages(body.messages);
    for (const ref of refs) {
      const next = consume(ref.get());
      ref.set(next);
    }
  } else {
    const refs = collectTextRefsFromMessages(body.messages);
    for (const ref of refs) {
      const next = consume(ref.get());
      ref.set(next);
    }
    if (body.prompt) body.prompt = consume(normalizeTextInput(body.prompt));
    if (body.input) body.input = consume(normalizeTextInput(body.input));
  }

  return body;
}

module.exports = {
  estimateRequestTokens,
  truncateRequestToLimit,
};
