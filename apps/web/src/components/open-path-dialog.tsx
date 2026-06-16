import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FolderInput } from "lucide-react";

interface OpenPathDialogProps {
  onOpen: (path: string) => void;
}

export function OpenPathDialog({ onOpen }: OpenPathDialogProps) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");

  const submit = () => {
    const trimmed = path.trim();
    if (!trimmed) {
      return;
    }
    onOpen(trimmed);
    setOpen(false);
    setPath("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FolderInput className="size-4" />
            Open project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open project</DialogTitle>
          <DialogDescription>
            Enter the absolute path to a folder on disk. Meminspect will scan that project for
            agent memory — Cursor rules, learned memories, internal DB entries, and Claude Code
            files — even if it does not appear in the discovered projects list.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="/Users/you/projects/my-app"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!path.trim()}>
            Open project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
