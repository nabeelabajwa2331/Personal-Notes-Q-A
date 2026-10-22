import { noteStore } from "../notes/noteStore.js";
import type { Note } from "../notes/noteStore.js";
import { chunkText } from "../rag/chunker.js";

export interface AskSource {
  noteId: string;
  title: string;
  excerpt: string;
  relevance: number;
}

export interface AskResult {
  answer: string;
  sources: AskSource[];
}

interface Candidate {
  note: Note;
  chunk: string;
  score: number;
}

const STOP_WORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "anything",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "know",
  "learn",
  "me",
  "my",
  "note",
  "notes",
  "of",
  "on",
  "or",
  "please",
  "say",
  "summarize",
  "summary",
  "tell",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "write",
  "wrote",
  "you",
  "your",
]);

const OVERVIEW_WORDS = new Set([
  "overview",
  "summarize",
  "summary",
  "topic",
  "topics",
]);

function stemToken(token: string): string {
  if (/^\d+$/.test(token) || token.length <= 4) {
    return token;
  }

  if (token.endsWith("ies") && token.length > 5) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("ing") && token.length > 6) {
    return token.slice(0, -3);
  }

  if (token.endsWith("ed") && token.length > 5) {
    return token.slice(0, -2);
  }

  if (token.endsWith("es") && token.length > 5) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }

  return token;
}

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  return matches
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .map(stemToken);
}

function uniqueTokens(text: string): string[] {
  return Array.from(new Set(tokenize(text)));
}

function normalizeQuery(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 15);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function scoreChunk(
  note: Note,
  chunk: string,
  queryTokens: string[],
  normalizedQuery: string
): number {
  const chunkCounts = new Map<string, number>();

  for (const token of tokenize(chunk)) {
    chunkCounts.set(token, (chunkCounts.get(token) ?? 0) + 1);
  }

  const titleTokens = new Set(tokenize(note.title));
  let score = 0;

  for (const token of queryTokens) {
    const count = chunkCounts.get(token) ?? 0;

    if (count > 0) {
      score += 1 + Math.min(count, 4) * 0.5;
    }

    if (titleTokens.has(token)) {
      score += 4;
    }
  }

  if (
    normalizedQuery.length >= 4 &&
    `${note.title}\n${chunk}`.toLowerCase().includes(normalizedQuery)
  ) {
    score += 5;
  }

  return score;
}

function extractExcerpt(chunk: string, queryTokens: string[]): string {
  const sentences = splitSentences(chunk);

  if (sentences.length === 0) {
    return truncate(chunk.trim(), 220);
  }

  const ranked = sentences
    .map((sentence, index) => {
      const sentenceTokens = new Set(tokenize(sentence));
      const matches = queryTokens.filter((token) =>
        sentenceTokens.has(token)
      ).length;

      return { sentence, index, matches };
    })
    .sort((left, right) => {
      if (right.matches !== left.matches) {
        return right.matches - left.matches;
      }

      return left.index - right.index;
    });

  return truncate(
    ranked
      .slice(0, 2)
      .sort((left, right) => left.index - right.index)
      .map((item) => item.sentence)
      .join(" "),
    320
  );
}

function collectCandidates(
  notes: Note[],
  queryTokens: string[],
  normalizedQuery: string
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const note of notes) {
    const chunks = chunkText(note.content, {
      maxCharacters: 900,
      overlapCharacters: 120,
    });

    const chunkContents =
      chunks.length > 0
        ? chunks.map((chunk) => chunk.content)
        : [note.title];

    for (const chunk of chunkContents) {
      const score = scoreChunk(
        note,
        chunk,
        queryTokens,
        normalizedQuery
      );

      if (score > 0) {
        candidates.push({ note, chunk, score });
      }
    }
  }

  return candidates.sort((left, right) => right.score - left.score);
}

function buildSources(
  candidates: Candidate[],
  queryTokens: string[]
): AskSource[] {
  const sources: AskSource[] = [];
  const seenNotes = new Set<string>();

  for (const candidate of candidates) {
    if (seenNotes.has(candidate.note.id)) {
      continue;
    }

    seenNotes.add(candidate.note.id);

    sources.push({
      noteId: candidate.note.id,
      title: candidate.note.title,
      excerpt: extractExcerpt(candidate.chunk, queryTokens),
      relevance: Number(candidate.score.toFixed(2)),
    });

    if (sources.length === 3) {
      break;
    }
  }

  return sources;
}

function sortByUpdatedAt(notes: Note[]): Note[] {
  return [...notes].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );
}

function buildNoteSources(notes: Note[]): AskSource[] {
  return notes.slice(0, 3).map((note) => ({
    noteId: note.id,
    title: note.title,
    excerpt: truncate(
      note.content.replace(/\s+/g, " ").trim() || "No content yet.",
      220
    ),
    relevance: 0,
  }));
}

function buildOverview(allNotes: Note[]): AskResult {
  const notes = sortByUpdatedAt(allNotes);

  if (notes.length === 0) {
    return {
      answer:
        "You do not have any notes yet. Create a note first, then ask me about it.",
      sources: [],
    };
  }

  const sources = buildNoteSources(notes);

  return {
    answer: `Your notes currently cover: ${notes
      .slice(0, 6)
      .map((note) => note.title)
      .join(", ")}. Ask about any of these topics for a more detailed answer.`,
    sources,
  };
}

function buildFallback(notes: Note[]): AskResult {
  const recentNotes = sortByUpdatedAt(notes);
  const sources = buildNoteSources(recentNotes);

  return {
    answer: `I could not find a direct match for that question. Here are your most recent notes, which may help:\n\n${sources
      .map((source) => `${source.title}: ${source.excerpt}`)
      .join("\n\n")}`,
    sources,
  };
}

export async function askNotes(question: string): Promise<AskResult> {
  const notes = await noteStore.list();

  if (notes.length === 0) {
    return {
      answer:
        "You do not have any notes yet. Create a note first, then ask me about it.",
      sources: [],
    };
  }

  const queryTokens = uniqueTokens(question);
  const normalizedQuery = normalizeQuery(question);

  if (queryTokens.length === 0) {
    return buildOverview(notes);
  }

  const candidates = collectCandidates(
    notes,
    queryTokens,
    normalizedQuery
  );

  if (candidates.length === 0) {
    const askedForOverview = tokenize(question).some((token) =>
      OVERVIEW_WORDS.has(token)
    );

    if (askedForOverview) {
      return buildOverview(notes);
    }

    return buildFallback(notes);
  }

  const sources = buildSources(candidates, queryTokens);

  return {
    answer: `Here is what I found in your notes:\n\n${sources
      .map((source) => `${source.title}: ${source.excerpt}`)
      .join("\n\n")}`,
    sources,
  };
}
