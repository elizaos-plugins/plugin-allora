import type { TestSuite } from "@elizaos/core";
import plugin from "../index.js";

export const test: TestSuite = {
  name: "@elizaos-plugins/allora Plugin Tests",
  description: "Basic tests for @elizaos-plugins/allora plugin",
  tests: [
    {
      name: "Plugin has required structure",
      fn: async () => {
        if (!plugin.name || !plugin.description || !plugin.actions) {
          throw new Error("Plugin missing required fields");
        }
      },
    },
    {
      name: "Actions are valid",
      fn: async () => {
        const actions = plugin.actions || [];
        if (actions.length === 0) {
          throw new Error("Plugin has no actions");
        }
        for (const action of actions) {
          if (!action.name || !action.handler) {
            throw new Error("Action missing required properties");
          }
        }
      },
    },
    {
      name: "Should validate action handlers can be called",
      fn: async (runtime: IAgentRuntime) => {
        const plugin = await import("../index");
        const actions = plugin.default?.actions || [];

        if (actions.length === 0) {
          console.log("ℹ️  No actions to test");
          return;
        }

        // Test that each action has required methods
        for (const action of actions) {
          if (typeof action.validate !== "function") {
            throw new Error(`Action ${action.name} missing validate method`);
          }

          if (typeof action.handler !== "function") {
            throw new Error(`Action ${action.name} missing handler method`);
          }

          console.log(`✓ Action ${action.name} has required methods`);
        }

        console.log("✅ All action handlers validated");
      },
    },
  ],
};

export default test;
