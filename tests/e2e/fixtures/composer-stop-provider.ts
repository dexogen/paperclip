import { isAbsolute, join } from "node:path";

export interface ComposerStopProviderPaths {
  nodeBinary: string;
  runIdentityScript: string;
  runtimeRoot: string;
  binary: string;
  stateDirectory: string;
  holdFile: string;
  setupLog: string;
  workLogDirectory: string;
}

export function composerStopProviderScript(paths: ComposerStopProviderPaths): string {
  if (!Object.values(paths).every(isAbsolute)) throw new Error("Composer Stop fixture paths must be absolute");
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  return `#!/bin/sh
set -eu
if [ -f ${quote(paths.holdFile)} ]; then
  run_id=$(${quote(paths.nodeBinary)} ${quote(paths.runIdentityScript)} ${quote(paths.runtimeRoot)})
  exec ${quote(paths.binary)} --state-file ${quote(paths.stateDirectory)}/state-$$.json --hold-turn --call-log ${quote(paths.workLogDirectory)}/"$run_id".log "$@"
fi
exec ${quote(paths.binary)} --state-file ${quote(paths.stateDirectory)}/state-$$.json --call-log ${quote(paths.setupLog)} "$@"
`;
}

export function composerStopWorkLog(directory: string, runId: string): string {
  if (!isAbsolute(directory) || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(runId)) {
    throw new Error("Composer Stop work evidence requires an absolute directory and a task run UUID");
  }
  return join(directory, `${runId}.log`);
}
