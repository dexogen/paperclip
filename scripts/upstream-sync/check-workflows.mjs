import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const forkWorkflows = new Set(['upstream-sync.yml', 'localization-check.yml', 'fork-build.yml']);

function hasTopLevelOr(expression) {
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    if (char === "'") {
      if (quoted && expression[i + 1] === "'") { i++; continue; }
      quoted = !quoted;
    } else if (!quoted) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (depth === 0 && expression.slice(i, i + 2) === '||') return true;
    }
  }
  return quoted || depth !== 0;
}

export function checkWorkflowOwners(root) {
  const errors = [];
  for (const name of readdirSync(join(root, '.github/workflows')).filter((name) => /\.ya?ml$/.test(name))) {
    const owner = forkWorkflows.has(name) ? 'dexogen/paperclip' : 'paperclipai/paperclip';
    let workflow;
    try {
      const uiRequire = createRequire(new URL('../../ui/package.json', import.meta.url));
      const editorRequire = createRequire(uiRequire.resolve('@mdxeditor/editor'));
      const { load } = editorRequire('js-yaml');
      workflow = load(readFileSync(join(root, '.github/workflows', name), 'utf8'));
    } catch (error) {
      errors.push(`${name}: cannot parse workflow YAML: ${error.message}`);
      continue;
    }
    if (!workflow?.jobs || typeof workflow.jobs !== 'object' || Array.isArray(workflow.jobs) ||
        Object.keys(workflow.jobs).length === 0) {
      errors.push(`${name}: expected nonempty jobs mapping`);
      continue;
    }
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      if (!job || typeof job !== 'object' || Array.isArray(job) || typeof job.if !== 'string') {
        errors.push(`${name}/${jobName}: missing repository owner guard`);
        continue;
      }
      const condition = job.if.trim().replace(/^\$\{\{\s*/, '').replace(/\s*\}\}$/, '');
      const required = `github.repository == '${owner}'`;
      if (!(condition === required || condition.startsWith(`${required} &&`)) || hasTopLevelOr(condition)) {
        errors.push(`${name}/${jobName}: condition must start with ${required}`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkWorkflowOwners(resolve(process.argv[2] || '.'));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Workflow repository guards verified.');
}
