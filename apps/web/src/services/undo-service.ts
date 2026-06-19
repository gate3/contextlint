import { postJson } from "./http-client.js";
import type { UndoStatus } from "@meminspect/core";

export async function undoLastWrite(): Promise<UndoStatus> {
  const { status } = await postJson<{ ok: true; status: UndoStatus }>("/undo", {});
  return status;
}
