import { t as fullSharedT } from "@/i18n";
import type { UIAdapterModule } from "../types";
import { parseProcessStdoutLine } from "./parse-stdout";
import { ProcessConfigFields } from "./config-fields";
import { buildProcessConfig } from "./build-config";

export const processUIAdapter: UIAdapterModule = {
  type: "process",
  get label() { return fullSharedT("fullShared.shell_process_ee53cd"); },
  parseStdoutLine: parseProcessStdoutLine,
  ConfigFields: ProcessConfigFields,
  buildAdapterConfig: buildProcessConfig,
};
