import { t as fullSharedT } from "@/i18n";
import animatedHero from "../../../announcements/examples/animated/assets/78bafb6adbfd9da899cdbb5d934b4c0b9df5d419d6f0a5104a87a7b25dcc6bd8.html?raw";
import type { Announcement } from "@paperclipai/shared";

/** Design guide / Storybook only. Never a runtime feed fallback. */
export const announcementPreview: Announcement = {
  id: "preview-work-together",
  eyebrow: "New in Paperclip",
  get title() { return fullSharedT("fullShared.give_your_next_idea_a_team_4e9241"); },
  get description() { return fullSharedT("fullShared.bring_agents_projects_and_work_together_set_the_dire_c42c81"); },
  image: { path: `assets/${"0".repeat(64)}.png`, get alt() { return fullSharedT("fullShared.paperclip_ideas_become_work_b9965c"); } },
  secondaryLink: { kind: "external", get label() { return fullSharedT("fullShared.learn_more_144579"); }, url: "https://paperclip.ing" },
  primaryAction: { kind: "route", get label() { return fullSharedT("fullShared.explore_your_projects_44b567"); }, path: "/projects" },
};

export const announcementAnimationPreview: Announcement = {
  ...announcementPreview,
  animation: { path: "assets/78bafb6adbfd9da899cdbb5d934b4c0b9df5d419d6f0a5104a87a7b25dcc6bd8.html", get alt() { return fullSharedT("fullShared.agents_plan_build_and_review_work_together_30348b"); } },
};
export const announcementAnimationPreviewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(animatedHero)}`;
