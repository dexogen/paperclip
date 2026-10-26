import { i18n, useTranslation } from "@/i18n";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { PROJECT_COLORS, PROJECT_ICON_NAMES, type ProjectIconName } from "@paperclipai/shared";
import { PROJECT_ICONS } from "../lib/project-icons";
import { ProjectTile } from "./ProjectTile";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";

function projectIconLabels(t: TFunction): Record<ProjectIconName, string> {
  return {
    "folder": t("projectConfigUi.icons.folder"),
    "rocket": t("projectConfigUi.icons.rocket"),
    "code": t("projectConfigUi.icons.code"),
    "terminal": t("projectConfigUi.icons.terminal"),
    "database": t("projectConfigUi.icons.database"),
    "globe": t("projectConfigUi.icons.globe"),
    "package": t("projectConfigUi.icons.package"),
    "boxes": t("projectConfigUi.icons.boxes"),
    "box": t("projectConfigUi.icons.box"),
    "layers": t("projectConfigUi.icons.layers"),
    "briefcase": t("projectConfigUi.icons.briefcase"),
    "compass": t("projectConfigUi.icons.compass"),
    "target": t("projectConfigUi.icons.target"),
    "flame": t("projectConfigUi.icons.flame"),
    "zap": t("projectConfigUi.icons.zap"),
    "star": t("projectConfigUi.icons.star"),
    "bug": t("projectConfigUi.icons.bug"),
    "wrench": t("projectConfigUi.icons.wrench"),
    "hammer": t("projectConfigUi.icons.hammer"),
    "lightbulb": t("projectConfigUi.icons.lightbulb"),
    "sparkles": t("projectConfigUi.icons.sparkles"),
    "shield": t("projectConfigUi.icons.shield"),
    "lock": t("projectConfigUi.icons.lock"),
    "search": t("projectConfigUi.icons.search"),
    "cog": t("projectConfigUi.icons.cog"),
    "brain": t("projectConfigUi.icons.brain"),
    "cpu": t("projectConfigUi.icons.cpu"),
    "git-branch": t("projectConfigUi.icons.git-branch"),
    "file-code": t("projectConfigUi.icons.file-code"),
    "puzzle": t("projectConfigUi.icons.puzzle"),
    "gem": t("projectConfigUi.icons.gem"),
    "atom": t("projectConfigUi.icons.atom"),
    "heart": t("projectConfigUi.icons.heart"),
    "mail": t("projectConfigUi.icons.mail"),
    "message-square": t("projectConfigUi.icons.message-square"),
    "crown": t("projectConfigUi.icons.crown"),
    "radar": t("projectConfigUi.icons.radar"),
    "telescope": t("projectConfigUi.icons.telescope"),
    "hexagon": t("projectConfigUi.icons.hexagon"),
  };
}

/* ── Combined icon + color picker popover (PAP-72 / PAP-68 part 4) ── */

const DEFAULT_PROJECT_ICON = "folder";

export function ProjectTilePicker({
  color,
  icon,
  onSelectIcon,
  onSelectColor,
}: {
  color: string | null;
  icon: string | null;
  onSelectIcon: (icon: string) => void;
  onSelectColor: (color: string | null) => void;
}) {
  const { t } = useTranslation();
  const labels = projectIconLabels(t);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const entries = PROJECT_ICON_NAMES.map((name) => [name, PROJECT_ICONS[name]] as const);
    if (!search) return entries;
    const q = search.toLowerCase();
    const english = projectIconLabels(i18n.getFixedT("en"));
    const russian = projectIconLabels(i18n.getFixedT("ru"));
    return entries.filter(([name]) => `${name} ${english[name]} ${russian[name]}`.toLowerCase().includes(q));
  }, [search]);

  // Keep the popover open across selections so the user can pick both an icon
  // and a color in one pass; reset the search when it closes.
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="shrink-0 rounded-lg cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-(--tp-box-shadow)"
          aria-label={t("projectConfigUi.icons.change")}
        >
          <ProjectTile color={color} icon={icon} size="md" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {/* Icon search + grid */}
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("projectConfigUi.icons.title")}</p>
        <Input
          placeholder={t("projectConfigUi.icons.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
          autoFocus
        />
        <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
          {filteredIcons.map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelectIcon(name)}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded hover:bg-accent transition-colors",
                (icon ?? DEFAULT_PROJECT_ICON) === name && "bg-accent ring-1 ring-primary",
              )}
              title={labels[name]}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          {filteredIcons.length === 0 && (
            <p className="col-span-7 text-xs text-muted-foreground text-center py-2">{t("projectConfigUi.icons.empty")}</p>
          )}
        </div>

        {/* Color swatches */}
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t("projectConfigUi.icons.color")}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {/* Neutral / reset-to-gray option */}
            <button
              type="button"
              onClick={() => onSelectColor(null)}
              className={`h-6 w-6 cursor-pointer transition-(--tp-transform-box-shadow) duration-150 hover:scale-110 ${
                color === null
                  ? "ring-2 ring-foreground ring-offset-1 ring-offset-background rounded-md"
                  : ""
              }`}
              aria-label={t("projectConfigUi.icons.reset")}
              title={t("projectConfigUi.icons.neutral")}
            >
              <ProjectTile color={null} size="sm" />
            </button>
            {PROJECT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => onSelectColor(swatch)}
                className={`h-6 w-6 rounded-md cursor-pointer transition-(--tp-transform-box-shadow) duration-150 hover:scale-110 ${
                  swatch === color
                    ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                    : "hover:ring-2 hover:ring-foreground/30"
                }`}
                style={{ backgroundColor: swatch }}
                aria-label={t("projectConfigUi.icons.selectColor", { color: swatch })}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
