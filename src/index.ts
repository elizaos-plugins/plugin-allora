import { type Plugin } from "@elizaos/core";
import { getInferenceAction } from "./actions/getInference.js";
import { topicsProvider } from "./providers/topics.js";
import testSuite from "./test/test.js";

const alloraPlugin: Plugin = {
  name: "@elizaos-plugins/allora",
  description: "Allora Network plugin for ElizaOS",
  services: [],
  actions: [getInferenceAction],
  providers: [topicsProvider],
  evaluators: [],
  tests: [testSuite],
};

export default alloraPlugin;
export * from "./config.js";
