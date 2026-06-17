import { describe, expect, it } from "vitest";
import { estimateTokens } from "./tokens.js";

describe("estimateTokens", () => {
  it("estimates from string length", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("estimates from a precomputed character count", () => {
    expect(estimateTokens(8000)).toBe(2000);
  });
});
