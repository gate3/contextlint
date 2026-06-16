import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("API", () => {
  it("GET /health returns ok", async () => {
    const app = createApp([]);
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, service: "meminspect" });
  });
});
