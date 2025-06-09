import { type Plugin, type IAgentRuntime } from "@elizaos/core";
import { getInferenceAction } from "./actions/getInference.js";
import { topicsProvider } from "./providers/topics.js";
import { AlloraService } from "./service.js";
import test from "./test/test.js";

const alloraPlugin: Plugin = {
  name: "allora-network",
  description:
    "Allora Network plugin for fetching topic inferences and predictions from Allora Network",
  services: [AlloraService],
  actions: [getInferenceAction],
  providers: [topicsProvider],
  tests: [test],
  init: async (_config: Record<string, string>, _runtime: IAgentRuntime) => {
    // Services are automatically registered from the services array
  },
};

export default alloraPlugin;
