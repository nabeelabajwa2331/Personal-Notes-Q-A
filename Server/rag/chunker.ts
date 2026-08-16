export interface Chunk {
  index: number;
  content: string;
}

interface ChunkOptions {
  maxCharacters?: number;
  overlapCharacters?: number;
}

function splitLargeBlock(
  block: string,
  maxCharacters: number
): string[] {
  const pieces: string[] = [];

  for (let i = 0; i < block.length; i += maxCharacters) {
    pieces.push(block.slice(i, i + maxCharacters));
  }

  return pieces;
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const maxCharacters = options.maxCharacters ?? 1000;
  const overlapCharacters = options.overlapCharacters ?? 150;

  if (!text.trim()) {
    return [];
  }

  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const rawBlocks = normalizedText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const blocks = rawBlocks.flatMap((block) =>
    block.length > maxCharacters
      ? splitLargeBlock(block, maxCharacters)
      : [block]
  );

  const chunks: Chunk[] = [];

  let currentChunk = "";

  for (const block of blocks) {
    const candidate = currentChunk
      ? `${currentChunk}\n\n${block}`
      : block;

    if (candidate.length <= maxCharacters) {
      currentChunk = candidate;
      continue;
    }

    if (currentChunk) {
      chunks.push({
        index: chunks.length,
        content: currentChunk,
      });
    }

    const overlap = currentChunk.slice(-overlapCharacters);

    currentChunk = overlap
      ? `${overlap}\n\n${block}`
      : block;
  }

  if (currentChunk) {
    chunks.push({
      index: chunks.length,
      content: currentChunk,
    });
  }

  return chunks;
}