import { Trans as FullSharedTailTrans } from "@/i18n";
import { t as fullSharedT, Trans as FullSharedTrans, useTranslation as useFullSharedTranslation } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutEntry {
  keys: string[];
  label: string;
  /** Render keys as a simultaneous chord (joined with "+") rather than a
   *  "then" sequence. */
  combo?: boolean;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    get title() { return fullSharedT("sidebar.inbox"); },
    shortcuts: [
      { keys: ["j"], get label() { return fullSharedT("fullShared.move_down_40bb50"); } },
      { keys: ["↓"], get label() { return fullSharedT("fullShared.move_down_40bb50"); } },
      { keys: ["k"], get label() { return fullSharedT("fullShared.move_up_c66feb"); } },
      { keys: ["↑"], get label() { return fullSharedT("fullShared.move_up_c66feb"); } },
      { keys: ["←"], get label() { return fullSharedT("fullShared.collapse_selected_group_933a60"); } },
      { keys: ["→"], get label() { return fullSharedT("fullShared.expand_selected_group_6ecae6"); } },
      { keys: ["Enter"], get label() { return fullSharedT("fullShared.open_selected_item_948dbc"); } },
      { keys: ["a"], get label() { return fullSharedT("fullShared.archive_item_0fd57c"); } },
      { keys: ["y"], get label() { return fullSharedT("fullShared.archive_item_0fd57c"); } },
      { keys: ["r"], get label() { return fullSharedT("fullShared.mark_as_read_50c8b8"); } },
      { keys: ["U"], get label() { return fullSharedT("fullShared.mark_as_unread_2c19d5"); } },
    ],
  },
  {
    get title() { return fullSharedT("fullShared.task_detail_be4654"); },
    shortcuts: [
      { keys: ["y"], get label() { return fullSharedT("fullShared.quick_archive_back_to_inbox_630428"); } },
      { keys: ["g", "i"], get label() { return fullSharedT("fullShared.go_to_inbox_cde5be"); } },
      { keys: ["g", "c"], get label() { return fullSharedT("fullShared.focus_comment_composer_a0f6da"); } },
    ],
  },
  {
    get title() { return fullSharedT("sidebar.decisions"); },
    shortcuts: [
      { keys: ["j"], get label() { return fullSharedT("fullShared.move_down_40bb50"); } },
      { keys: ["↓"], get label() { return fullSharedT("fullShared.move_down_40bb50"); } },
      { keys: ["k"], get label() { return fullSharedT("fullShared.move_up_c66feb"); } },
      { keys: ["↑"], get label() { return fullSharedT("fullShared.move_up_c66feb"); } },
      { keys: ["Enter"], get label() { return fullSharedT("fullShared.open_or_close_selected_decision_54d2ae"); } },
      { keys: ["x"], get label() { return fullSharedT("fullShared.dismiss_selected_decision_371158"); } },
    ],
  },
  {
    get title() { return fullSharedT("fullShared.global_a258b3"); },
    shortcuts: [
      { keys: ["/"], get label() { return fullSharedT("fullShared.search_current_page_or_quick_search_4dac6e"); } },
      { keys: ["c"], get label() { return fullSharedT("newIssue.newTask"); } },
      { keys: ["["], get label() { return fullSharedT("fullShared.toggle_sidebar_041aef"); } },
      { keys: ["]"], get label() { return fullSharedT("fullShared.toggle_panel_ed9885"); } },
      { keys: ["?"], get label() { return fullSharedT("fullShared.show_keyboard_shortcuts_3d0ced"); } },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  useFullSharedTranslation();
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-(--shadow-extract-10)">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  useFullSharedTranslation();
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.title} className="px-5 py-3">
            <h3 className="mb-2 text-(length:--text-micro) font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut.combo ? "+" : fullSharedT("fullShared.then_21af6f")}
                          </span>
                        )}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          <FullSharedTailTrans i18nKey="fullSharedTail.shortcutHint" components={{ key: <KeyCap>{"Esc"}</KeyCap> }} />
        </p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useFullSharedTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{fullSharedT("fullShared.keyboard_shortcuts_e9bef0")}</DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
