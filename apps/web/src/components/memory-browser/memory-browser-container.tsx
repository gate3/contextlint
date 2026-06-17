import { useMemoryBrowser } from "@/hooks/use-memory-browser";
import { MemoryBrowserView } from "./memory-browser-view";

export function MemoryBrowserContainer() {
  const viewProps = useMemoryBrowser();
  return <MemoryBrowserView {...viewProps} />;
}
