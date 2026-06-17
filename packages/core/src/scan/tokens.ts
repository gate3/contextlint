/** v1 token estimate — chars / 4 (no API keys required). */
export function estimateTokens(textOrCharCount: string | number): number {
  const chars =
    typeof textOrCharCount === "number" ? textOrCharCount : textOrCharCount.length;
  return Math.ceil(chars / 4);
}
