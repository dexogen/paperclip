# Russian localization coverage

**The application is not fully translated.** This source audit was made on
2026-10-26 at `6e2115267cd8ed60252f29b8f339cbb049499c5f`, before the subsequent
invitation, announcement, onboarding, artifact, skills and audit corrections.
Passing localization checks do not certify every UI surface or runtime state.

## What the existing check proves

The snapshot has 8,744 reviewed message families and 14,320 baseline findings
in 747 source files. Catalog review and source debt are different measures.
The baseline permits existing findings while rejecting new source drift;
`report.ok` does not require zero remaining debt. These figures are not a
percentage of translated application screens.

The scanner covers `ui/src` and `packages/shared/src/constants.ts`. Server-owned
templates, bundled catalog descriptions and first-party announcement payloads
need additional inventories and runtime checks. General API errors contain both
owned messages and provider diagnostics.

## Area inventory

Counts are static candidates in the listed entry files, not confirmed visible
English strings. They include technical strings and can miss dynamic payloads.
Shared imports overlap: rows must not be added together. The audit examined
route wiring, feature flags, entry files and the existing source report; it did
not execute every route or state. Neither a zero count nor `t()` calls alone
certify an area as complete.

| Area | Entry candidates | Availability | Main entry files |
|---|---:|---|---|
| Authentication, invitations and first administrator | 196 | public / auth state | `pages/Auth.tsx`, `pages/BoardClaim.tsx`, `pages/CliAuth.tsx` + 3 files |
| Onboarding wizard and first task | 48 | global overlay + routed wizard | `App.tsx`, `components/OnboardingWizard.tsx`, `components/OnboardingWizardVariant.tsx` |
| Navigation and contextual sidebars | 97 | enableStreamlinedUi != false (default) | `components/AgentContextualSidebar.tsx`, `components/AppConnectionSidebar.tsx`, `components/AppsSidebar.tsx` + 10 files |
| Alternate production shell | 61 | enableStreamlinedUi === false | `components/AppConnectionSidebar.production.tsx`, `components/AppsSidebar.production.tsx`, `components/CompanySettingsSidebar.production.tsx` + 5 files |
| Shared dialogs, commands, announcements and errors | 65 | both shells; announcements mounted in Layout.tsx | `components/AnnouncementCard.tsx`, `components/AnnouncementWell.tsx`, `components/AppErrorBoundary.tsx` + 8 files |
| Dashboard | 2 | both shells | `pages/Dashboard.tsx`, `pages/DashboardLive.tsx` |
| Tasks, inbox and search | 40 | enableCombinedInboxTasks applies only to streamlined shell | `pages/Inbox.tsx`, `pages/IssueDetail.tsx`, `pages/Issues.tsx` + 1 files |
| Decisions, approvals and requests | 40 | both shells | `pages/ApprovalDetail.tsx`, `pages/Approvals.tsx`, `pages/DecisionQueuePage.tsx` + 2 files |
| Agent chat and conference room | 39 | agent chat flag; board-chat behind ConferenceRoomChatGate | `pages/AgentChat.tsx`, `pages/AgentChats.tsx`, `pages/BoardChat.tsx` |
| Agents and their detail tabs | 73 | Agents list streamlined; AgentDetailPage shared across both shells | `pages/AgentDetail.tsx`, `pages/AgentDetailPage.tsx`, `pages/AgentToolsTab.tsx` + 3 files |
| Alternate agents list and organization chart | 21 | enableStreamlinedUi === false | `pages/Agents.production.tsx`, `pages/OrgChart.production.tsx` |
| Projects | 7 | both shells | `pages/ProjectDetail.tsx`, `pages/Projects.tsx` |
| Workspaces and runtime logs | 158 | IsolatedWorkspacesRouteGate + company gate | `pages/ExecutionWorkspaceDetail.tsx`, `pages/ProjectWorkspaceDetail.tsx`, `pages/Workspaces.tsx` |
| Routines, schedules and triggers | 158 | enableStreamlinedUi != false | `pages/RoutineDetail.tsx`, `pages/Routines.tsx` |
| Alternate routines | 161 | enableStreamlinedUi === false | `pages/RoutineDetail.production.tsx`, `pages/Routines.production.tsx` |
| Goals | 13 | routes registered; sidebar link flag independent | `pages/GoalDetail.tsx`, `pages/Goals.tsx` |
| Artifacts | 16 | ungated company route (also duplicated under conference gate) | `pages/Artifacts.tsx` |
| Skills library, sources and studio | 801 | CompanySkills streamlined; SkillSources/SkillStudio shared | `pages/CompanySkills.tsx`, `pages/SkillSources.tsx`, `pages/SkillStudio.tsx` |
| Alternate skills library | 447 | enableStreamlinedUi === false | `pages/CompanySkills.production.tsx` |
| Teams catalog and organization import | 328 | NewAgent nested surface; import behind CloudManagedPageGate and hidden-page gate | `pages/CompanyImport.tsx`, `pages/TeamCatalog.tsx` |
| Audit, activity, runs, costs, budgets and timeline | 146 | streamlined redirects old aliases; AuditHub /activity/* routes shared | `pages/Costs.tsx`, `pages/Timeline.tsx`, `pages/audit/AuditFeed.tsx` + 2 files |
| Alternate activity entry | 0 | enableStreamlinedUi === false | `pages/audit/CompanyActivity.production.tsx` |
| Apps and service connections | 272 | provider/connection availability; some connect intents gated | `pages/apps/AppDetail.tsx`, `pages/apps/AppNotConnected.tsx`, `pages/apps/AppsConnect.tsx` + 3 files |
| Chat connectors, email, bots and identity | 611 | ChatConnectorsExperimentalGate; identity protected by API rollout flag | `pages/apps/chat/ChatEndpointDetail.tsx`, `pages/apps/chat/ChatEndpointSetup.tsx`, `pages/apps/chat/ChatIdentityConfirm.tsx` |
| Advanced tools and gateways | 69 | both shells | `pages/apps/gateways/GatewayDetail.tsx`, `pages/apps/gateways/GatewaysList.tsx`, `pages/tools/AdvancedToolsRoute.tsx` + 2 files |
| Organizations and general settings | 23 | both shells | `pages/Companies.tsx`, `pages/CompanyConnections.tsx`, `pages/CompanySettings.tsx` |
| Members, invitations and access | 68 | hidden-page gates | `pages/CompanyAccess.tsx`, `pages/InstanceAccess.tsx` |
| Execution environments | 27 | hidden-page gate | `pages/CompanyEnvironments.tsx` |
| Secrets and vault import | 485 | hidden-page gate | `pages/Secrets.tsx` |
| Organization export | 52 | hidden-page gate | `pages/CompanyExport.tsx` |
| User profile | 35 | profile settings hidden-page gate | `pages/ProfileSettings.tsx`, `pages/UserProfile.tsx` |
| Plugins and adapters | 256 | hidden-page gates for manager; dynamic plugin route slots | `pages/AdapterManager.tsx`, `pages/CompanySettingsPluginPage.tsx`, `pages/PluginManager.tsx` + 2 files |
| Experimental settings, cases and status cards | 157 | CasesExperimentalGate; StatusCardsExperimentalGate; settings hidden-page gate | `pages/CaseDetail.tsx`, `pages/Cases.tsx`, `pages/InstanceExperimentalSettings.tsx` |
| Design and diagnostic routes | 707 | TaskChatLab only DEV; top-level ux-lab/perf routes registered outside DEV condition | `pages/BootstrapSetupUxLab.tsx`, `pages/CrossIssueCollaborationUxLab.tsx`, `pages/DesignGuide.tsx` + 3 files |

## Confirmed gaps and bounded corrections

- The public invitation form is separate from Auth and BoardClaim. Translating
  those pages did not translate the first-administrator invitation.
- SidebarAgents and SidebarRecentTasks own labels, actions, dialogs and toasts
  beyond the already translated parent sidebar.
- Artifacts and Audit include child controls and tabs, including Timeline.
  Skills has two reachable library variants plus shared Sources and Studio.
- The first-task greeting and opening question are deterministic server assets,
  although they appear as an agent message. Its task/project names are defaults.
- The Connectors card comes from a first-party feed. Its publication ID is
  `2026-09-14-connectors`. The correction matches exact known source copy;
  arbitrary or changed feed text is preserved.
- Secrets, Apps/chat connections, team import, routines and other inventory rows
  still need migration and runtime review. Finishing the screenshot-reported
  gaps alone will not make the entire application translated.

The subsequent correction adds Russian UI copy for the invitation form, the
known Connectors announcement, artifact controls, both skills libraries,
Sources and Studio, Audit tabs and Timeline, and agent/recent-task sidebars.
New first tasks carry the selected language to the server-owned greeting and
opening question. Existing unchanged system seeds are translated for display
only after provenance and exact-copy checks; stored data is not rewritten.

Targeted verification passed for each slice: invitation/announcement (46 tests),
onboarding (28 server tests and 349 UI tests), artifacts/audit/sidebars (168
tests), and skills (212 tests). These are per-slice results, not an aggregate
test count or proof of every runtime state. The onboarding route tests use real
embedded PostgreSQL; component tests use controlled fixtures. Integrated UI and
server typechecks and token gates also passed before the next upstream merge.
Final-commit CI and deployment verification are separate acceptance steps.

The source audit resolved 1,990 baseline candidates in this correction and
still found 12,330 remaining candidates. No new untranslated text was added to
the baseline. This does not establish that all remaining candidates are UI
copy, or that all runtime text is detectable by this scanner.

## Runtime variants

`enableStreamlinedUi` defaults to enabled. When explicitly disabled, App selects
Layout.production, Agents.production, Routines.production,
RoutineDetail.production, CompanySkills.production and alternate activity and
organization-chart entry points. These are reachable product paths.

AgentDetailPage always imports AgentDetail.tsx at the audited revision;
AgentDetail.production.tsx is not wired into that graph. Likewise,
CompanyActivity.production imports AuditFeed.tsx, not AuditFeed.production.tsx.
Unused variants must not inflate live-coverage claims. The 263 Route tags include
aliases and diagnostic routes, not 263 distinct end-user features.

## Content and evidence boundaries

The snapshot has 17 bundled skills and 5 bundled teams with human-readable
metadata. Their descriptions need separate treatment. Names, slugs, package
identifiers, commands and executable instructions are not ordinary UI copy.

The onboarding regression imports the actual server question/greeting assets,
so changes to their recognized copy fail the fixture contract in fork CI.
This narrow check does not extend the general scanner to all server templates
or provide a monitor for remote announcement-feed changes.

Do not rewrite user task text, document or artifact contents, imported skills,
plugin payloads or arbitrary provider output. Owned labels, defaults, templates
and error identifiers need explicit localization seams.

Record source migration, editorial review, tests and real-browser evidence
separately. A mocked component test does not prove a real server journey.
Dynamic states without that evidence remain **unverified**. Reproduce the source
inventory with the detector JSON report and route definitions at the audited Git
revision. Update bounded results without erasing the distinction between a
catalog check and complete application coverage.
