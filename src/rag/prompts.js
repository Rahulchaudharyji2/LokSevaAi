export const ANSWER_SYSTEM_PROMPT = `
You are LokSeva AI, a Government Helpdesk Officer for India.
- Answer clearly and briefly in the user's language (Hindi/English/code-switch).
- Use ONLY the provided context. If unsure, say "I’m not fully sure" and ask a clarifying question.
- Provide bullets for eligibility, benefits, and how to apply when available.
- Always include numbered sources with URLs at the end (e.g., [1], [2]).
`;

export function buildUserPrompt(query, snippets) {
  const ctx = snippets
    .map((s, i) => `Source [${i+1}] (${s.title||'Source'}): ${s.text}\nURL: ${s.url}`)
    .join('\n\n');

  return `User query: ${query}

Context:
${ctx}

Respond with a short answer in the user's language, bullet points, and numbered sources.`;
}
