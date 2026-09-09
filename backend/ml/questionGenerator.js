/**
 * Question Generator — Powered by Groq (groq/compound-mini)
 * Used exclusively for generating fresh cognitive test questions.
 * Fast inference, free tier, clean JSON output.
 */

const Groq = require("groq-sdk");
const MODEL = "groq/compound-mini";

// Lazy init — ensures env vars are loaded before client is created
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ─── Core chat helper ─────────────────────────────────────────────────────────
async function chat(systemPrompt, userPrompt, maxTokens = 800) {
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("Groq question generator error:", err.message);
    return null;
  }
}

// ─── Generate Pattern Recognition questions ───────────────────────────────────
async function generatePatternQuestions(count = 5) {
  const system = `You are a cognitive test designer generating number sequence questions.
STRICT RULES:
- Each question must use a DIFFERENT mathematical rule (arithmetic, geometric, Fibonacci-style, squares, cubes, triangular numbers, alternating ops, etc.)
- Every sequence must end with "?" as the last element
- Options must contain exactly one correct answer and 3 plausible wrong answers close in value
- Vary difficulty: 2 easy, 2 medium, 1 hard
- Return ONLY a raw JSON array, no markdown fences, no explanation, nothing else.
Format exactly: [{"seq":[1,2,3,"?"],"answer":4,"options":[3,4,5,6]},...]`;

  const user = `Generate ${count} unique number sequence pattern questions, each using a different rule. Raw JSON array only.`;

  const raw = await chat(system, user, 900);
  if (!raw) return null;

  try {
    const clean = raw.replace(/```json|```/gi, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length < count) return null;
    return parsed.slice(0, count).map((q) => ({
      seq:     q.seq,
      answer:  q.answer,
      options: q.options,
    }));
  } catch (e) {
    console.error("Pattern question parse error:", e.message);
    return null;
  }
}

// ─── Generate Decision Making questions ───────────────────────────────────────
async function generateDecisionQuestions(count = 5) {
  const system = `You are a cognitive test designer generating quick decision-making questions.
STRICT RULES:
- Each question must be from a DIFFERENT category: math calculation, word analogy, general knowledge, odd-one-out, logical sequence
- Questions must be answerable in under 6 seconds
- Exactly one correct answer, 3 wrong options
- Keep questions concise (max 12 words)
- Vary difficulty: 2 easy, 2 medium, 1 hard
- Return ONLY a raw JSON array, no markdown fences, no explanation, nothing else.
Format exactly: [{"q":"question text","a":"correct answer","opts":["opt1","opt2","opt3","opt4"]},...]`;

  const user = `Generate ${count} unique decision-making questions, each from a different category. Raw JSON array only.`;

  const raw = await chat(system, user, 900);
  if (!raw) return null;

  try {
    const clean = raw.replace(/```json|```/gi, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length < count) return null;
    return parsed.slice(0, count).map((q) => ({
      q:    q.q,
      a:    q.a,
      opts: q.opts,
    }));
  } catch (e) {
    console.error("Decision question parse error:", e.message);
    return null;
  }
}

// ─── Unified entry point ──────────────────────────────────────────────────────
async function generateTestQuestions(testType, count = 5) {
  if (testType === "pattern")  return await generatePatternQuestions(count);
  if (testType === "decision") return await generateDecisionQuestions(count);
  return null;
}

module.exports = { generateTestQuestions };
