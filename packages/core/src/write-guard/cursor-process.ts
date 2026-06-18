import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Best-effort check whether the Cursor app process is running. */
export async function isCursorProcessRunning(): Promise<boolean> {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync("tasklist", ["/FI", "IMAGENAME eq Cursor.exe"], {
        encoding: "utf8",
      });
      return stdout.includes("Cursor.exe");
    } catch {
      return false;
    }
  }

  try {
    await execFileAsync("pgrep", ["-x", "Cursor"], { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}
