/** v1 token estimate — chars / 4 (no API keys required). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
