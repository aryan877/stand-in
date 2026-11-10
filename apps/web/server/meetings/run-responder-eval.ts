import { registerBuiltinEngines } from "@agent-native/core/agent/engine";
import { formatReport, runEvalSuite } from "@agent-native/core/eval";

import { registerOpenCodeEngine } from "../lib/providers/llm.js";
import evals from "./responder-safety.eval.js";

registerBuiltinEngines();
registerOpenCodeEngine();

const { report } = await runEvalSuite({ evals, actions: {}, persist: false });
console.log(formatReport(report));
process.exit(report.failed === 0 ? 0 : 1);
