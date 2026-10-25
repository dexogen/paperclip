import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function parseArgs(args, valueFlags, booleanFlags = []) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (booleanFlags.includes(flag)) options[flag.slice(2)] = true;
    else if (valueFlags.includes(flag)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      options[flag.slice(2)] = value;
    } else throw new Error(`Unknown option: ${flag}`);
  }
  return options;
}

export function writeOutput(path, text) {
  if (path === "-") process.stdout.write(text);
  else {
    const full = resolve(path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
}

export const isMain = (url) => process.argv[1] && url === pathToFileURL(resolve(process.argv[1])).href;
export const printError = (error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; };
