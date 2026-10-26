import type { TFunction } from "i18next";
/**
 * Whimsical gerunds for the live status pill when the label carries no real
 * signal ("Running"/"Working"). Two curated pools: Paperclip's analog-office
 * vocabulary (led by the "Clipping" brand nod) and Claude-Code-style whimsy.
 * Every word is chosen to still read sensibly after-the-fact — a settled turn
 * that once said "Collating…" shouldn't feel like a lie.
 *
 * The pick is deterministic from a seed (the run-scoped status item id) so a
 * re-render never reshuffles the word, and it rotates to the next word every
 * ~10s of elapsed run time.
 */

/** Paperclip / analog-office pool — "Clipping" is the guaranteed brand nod.
 * Board-curated round 2 (PAP-349): dropped Cataloguing / Carbon-copying /
 * Archiving, added the workshop-and-whiteboard verbs. */
export const ANALOG_OFFICE_WORDS: readonly string[] = [
  "Clipping",
  "Organizing",
  "Sorting",
  "Synthesizing",
  "Analyzing",
  "Filing",
  "Collating",
  "Stapling",
  "Indexing",
  "Annotating",
  "Drafting",
  "Proofreading",
  "Alphabetizing",
  "Photocopying",
  "Laminating",
  "Hole-punching",
  "Bookmarking",
  "Highlighting",
  "Typing",
  "Trimming",
  "Aligning",
  "Combining",
  "Whiteboarding",
  "Diagramming",
  "Sketching",
  "Labeling",
  "Sticky-noting",
];

/** Claude-Code-style whimsy pool — board-curated round 2 kept only these four. */
export const CLAUDE_CODE_WORDS: readonly string[] = [
  "Brewing",
  "Tinkering",
  "Distilling",
  "Deliberating",
];

/** Interleaved so consecutive rotations alternate flavors rather than running
 * through one pool before the other. */
export const WHIMSY_WORDS: readonly string[] = (() => {
  const out: string[] = [];
  const max = Math.max(ANALOG_OFFICE_WORDS.length, CLAUDE_CODE_WORDS.length);
  for (let i = 0; i < max; i++) {
    if (i < ANALOG_OFFICE_WORDS.length) out.push(ANALOG_OFFICE_WORDS[i]);
    if (i < CLAUDE_CODE_WORDS.length) out.push(CLAUDE_CODE_WORDS[i]);
  }
  return out;
})();

/** How long each word holds before rotating to the next. */
export const WHIMSY_ROTATE_MS = 10_000;

/**
 * Labels that carry no tool identity, where a whimsical word fills the gap.
 * Informative labels (taxonomy verbs, "Thinking", "Responding", "Queued")
 * always keep their copy — whimsy never replaces signal.
 */
export function isGenericStatusLabel(label: string | undefined | null): boolean {
  const raw = (label ?? "").trim().toLowerCase();
  return raw === "running" || raw === "working";
}

/** FNV-1a 32-bit — stable, dependency-free string hash for the seed. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic whimsical word: the seed fixes the starting offset into the
 * pool and each elapsed `WHIMSY_ROTATE_MS` advances one word. Same seed and
 * elapsed always yield the same word.
 */
export function whimsyWord(seed: string, elapsedMs = 0, t?: TFunction): string {
  const tick = Math.floor(Math.max(0, elapsedMs) / WHIMSY_ROTATE_MS);
  const index = (fnv1a(seed) + tick) % WHIMSY_WORDS.length;
  if (!t) return WHIMSY_WORDS[index];
  switch (index) {
    case 0: return t("runUi.whimsy.clipping", { defaultValue: WHIMSY_WORDS[index] });
    case 1: return t("runUi.whimsy.brewing", { defaultValue: WHIMSY_WORDS[index] });
    case 2: return t("runUi.whimsy.organizing", { defaultValue: WHIMSY_WORDS[index] });
    case 3: return t("runUi.whimsy.tinkering", { defaultValue: WHIMSY_WORDS[index] });
    case 4: return t("runUi.whimsy.sorting", { defaultValue: WHIMSY_WORDS[index] });
    case 5: return t("runUi.whimsy.distilling", { defaultValue: WHIMSY_WORDS[index] });
    case 6: return t("runUi.whimsy.synthesizing", { defaultValue: WHIMSY_WORDS[index] });
    case 7: return t("runUi.whimsy.deliberating", { defaultValue: WHIMSY_WORDS[index] });
    case 8: return t("runUi.whimsy.analyzing", { defaultValue: WHIMSY_WORDS[index] });
    case 9: return t("runUi.whimsy.filing", { defaultValue: WHIMSY_WORDS[index] });
    case 10: return t("runUi.whimsy.collating", { defaultValue: WHIMSY_WORDS[index] });
    case 11: return t("runUi.whimsy.stapling", { defaultValue: WHIMSY_WORDS[index] });
    case 12: return t("runUi.whimsy.indexing", { defaultValue: WHIMSY_WORDS[index] });
    case 13: return t("runUi.whimsy.annotating", { defaultValue: WHIMSY_WORDS[index] });
    case 14: return t("runUi.whimsy.drafting", { defaultValue: WHIMSY_WORDS[index] });
    case 15: return t("runUi.whimsy.proofreading", { defaultValue: WHIMSY_WORDS[index] });
    case 16: return t("runUi.whimsy.alphabetizing", { defaultValue: WHIMSY_WORDS[index] });
    case 17: return t("runUi.whimsy.photocopying", { defaultValue: WHIMSY_WORDS[index] });
    case 18: return t("runUi.whimsy.laminating", { defaultValue: WHIMSY_WORDS[index] });
    case 19: return t("runUi.whimsy.holePunching", { defaultValue: WHIMSY_WORDS[index] });
    case 20: return t("runUi.whimsy.bookmarking", { defaultValue: WHIMSY_WORDS[index] });
    case 21: return t("runUi.whimsy.highlighting", { defaultValue: WHIMSY_WORDS[index] });
    case 22: return t("runUi.whimsy.typing", { defaultValue: WHIMSY_WORDS[index] });
    case 23: return t("runUi.whimsy.trimming", { defaultValue: WHIMSY_WORDS[index] });
    case 24: return t("runUi.whimsy.aligning", { defaultValue: WHIMSY_WORDS[index] });
    case 25: return t("runUi.whimsy.combining", { defaultValue: WHIMSY_WORDS[index] });
    case 26: return t("runUi.whimsy.whiteboarding", { defaultValue: WHIMSY_WORDS[index] });
    case 27: return t("runUi.whimsy.diagramming", { defaultValue: WHIMSY_WORDS[index] });
    case 28: return t("runUi.whimsy.sketching", { defaultValue: WHIMSY_WORDS[index] });
    case 29: return t("runUi.whimsy.labeling", { defaultValue: WHIMSY_WORDS[index] });
    case 30: return t("runUi.whimsy.stickyNoting", { defaultValue: WHIMSY_WORDS[index] });
    default: return WHIMSY_WORDS[index];
  }
}
