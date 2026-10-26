# Russian editorial guide

English is the source message catalog. Russian translations preserve the action,
scope, permission, and outcome of each message. Translate whole messages with named
parameters; user-entered names and machine identifiers are never translated.

| English concept | Russian | Usage |
| --- | --- | --- |
| Organization | Организация | Current UI name for the company boundary; retain `company` in APIs. |
| Task | Задача | Also use for user-facing issue terminology. |
| Routine | Регулярное задание | Reusable automation that creates tasks; distinct from a single task. |
| Project | Проект | Do not confuse a project with an organization or a task. |
| Agent | Агент | A managed execution identity, not a human user. |
| Human/user | Пользователь | Use for people when permissions distinguish them from agents. |
| Harness | Инструмент агента | For Claude/Codex and other execution tools; distinct from the agent's role. |
| Execution environment | Среда выполнения | The machine, container, or other environment where an agent runs. |
| Runner | Среда запуска | Generic runner controls; retain the product name `Paperclip Runner`. Distinct from a harness and an assigned agent. |
| Run | Запуск | One execution attempt, distinct from the task. |
| Session | Сеанс | A conversation or provider session; distinct from a run and a turn. |
| Inbox | Входящие | The person's task inbox. |
| Approval | Согласование | A governed decision; use «Подтвердить» for a simple confirmation action. |
| Connection | Подключение | A configured connection to an external service. |
| Profile | Профиль | A person's display identity. |
| Workspace | Рабочее пространство | Keep runtime IDs and filesystem paths unchanged. |
| Backlog | В планах | A task whose work has not started; match the status badge in warnings. |
| Board user | Оператор | The human control-plane user, distinct from an agent. |
| Email | Электронная почта | The visible label; retain `email` in APIs and fields. |
| Archive | Архивировать | Reversible removal from an active view, not deletion. |
| Delete | Удалить | Destructive removal; do not soften it into archiving. |
| Save | Сохранить | A committed change; «Сохранение…» while pending. |
| Cancel | Отмена | Cancels the current interaction. |

Use polite, direct Russian without bureaucratic phrasing. Buttons name actions;
errors explain the failure and a useful next step when one is known. Use «ё» where
appropriate and the ellipsis character in Russian pending states. Preserve English
source copy so English regression checks remain meaningful.

Russian cardinal families have `one`, `few`, `many`, and `other`; verify at least
`0, 1, 2, 5, 11, 21, 22, 25, 1.5`. Some phrases can use an invariant construction,
but each required form must still exist. Keep interpolation names and React structure.
Do not insert HTML or new destination links into a translation.

Brand names, model IDs, paths, command examples, technical logs, and user/agent content
retain their source spelling. Language selection changes number/date presentation;
it does not convert currencies or choose a different time zone.

Review translations in their UI context, including errors, empty states, tooltips,
screen-reader labels, narrow layouts, and unsaved forms. A machine draft is not an
accepted translation. Record an agent review as `agent`, not as human approval.
