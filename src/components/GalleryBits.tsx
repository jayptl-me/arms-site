import { useState } from "react";
import { Dialog } from "../ui/dialog/dialog";
import { Menu } from "../ui/menu/menu";
import { Button } from "../ui/button/button";

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onPress={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="A dialog"
        description="Focus is trapped, Escape closes, focus returns to the button."
      >
        Dialog body content.
      </Dialog>
    </>
  );
}

export function MenuDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      trigger="Open menu"
      items={[
        { label: "First action" },
        { label: "Second action", shortcut: "⌘K" },
        { separator: true },
        { label: "Disabled action", disabled: true },
      ]}
    />
  );
}
