// src/actions/getInference.ts
import {
  elizaLogger as elizaLogger2
} from "@elizaos/core";
import { randomUUID } from "crypto";

// src/providers/topics.ts
import {
  elizaLogger
} from "@elizaos/core";
import NodeCache from "node-cache";
var cache = new NodeCache({ stdTTL: 30 * 60 });
var getAlloraTopics = async (runtime) => {
  const cacheKey = "allora-topics";
  const cachedValue = cache.get(cacheKey);
  if (cachedValue) {
    elizaLogger.info("Retrieving Allora topics from cache");
    return cachedValue;
  }
  const alloraService = runtime.getService("allora-service");
  if (!alloraService || !alloraService.isInitialized()) {
    elizaLogger.error("Allora service is not initialized");
    return [];
  }
  const alloraApiClient = alloraService.getClient();
  const alloraTopics = await alloraApiClient.getAllTopics();
  cache.set(cacheKey, alloraTopics);
  return alloraTopics;
};
var topicsProvider = {
  name: "alloraTopics",
  get: async (runtime, message, state) => {
    const alloraTopics = await getAlloraTopics(runtime);
    let output = "Allora Network Topics: \n";
    for (const topic of alloraTopics) {
      output += `Topic Name: ${topic.topic_name}
`;
      output += `Topic Description: ${topic.description}
`;
      output += `Topic ID: ${topic.topic_id}
`;
      output += `Topic is Active: ${topic.is_active}
`;
      output += `Topic Updated At: ${topic.updated_at}
`;
      output += "\n";
    }
    return {
      data: {
        topics: alloraTopics,
        count: alloraTopics.length
      },
      values: {
        activeTopics: alloraTopics.filter((topic) => topic.is_active).length,
        totalTopics: alloraTopics.length
      },
      text: output
    };
  }
};

// src/actions/getInference.ts
var getInferenceAction = {
  name: "GET_INFERENCE",
  similes: [
    "GET_ALLORA_INFERENCE",
    "GET_TOPIC_INFERENCE",
    "ALLORA_INFERENCE",
    "TOPIC_INFERENCE"
  ],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Get inference from Allora Network",
  handler: async (runtime, message, state, _options, callback) => {
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    currentState.alloraTopics = await topicsProvider.get(
      runtime,
      message,
      currentState
    );
    const topics = currentState.alloraTopics?.data?.topics || [];
    const activeTopic = topics.find((topic) => topic.is_active);
    if (!activeTopic) {
      const content = {
        text: "There is no active Allora Network topic available at the moment.",
        source: "@elizaos-plugins/allora"
      };
      callback(content);
      return;
    }
    elizaLogger2.info(
      `Retrieving inference for topic ID: ${activeTopic.topic_id}`
    );
    try {
      const alloraService = runtime.getService(
        "allora-service"
      );
      if (!alloraService || !alloraService.isInitialized()) {
        const content2 = {
          text: "Allora service is not initialized. Please check your configuration.",
          source: "@elizaos-plugins/allora"
        };
        callback(content2);
        return;
      }
      const alloraApiClient = alloraService.getClient();
      const inferenceRes = await alloraApiClient.getInferenceByTopicID(
        activeTopic.topic_id
      );
      const inferenceValue = inferenceRes.inference_data.network_inference_normalized;
      const responseText = `Inference provided by Allora Network on topic ${activeTopic.topic_name} (Topic ID: ${activeTopic.topic_id}): ${inferenceValue}`;
      const content = {
        text: responseText,
        source: "@elizaos-plugins/allora"
      };
      callback(content);
      await runtime.createMemory({
        id: randomUUID(),
        entityId: message.entityId,
        agentId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: responseText,
          source: "@elizaos-plugins/allora"
        },
        metadata: {
          type: "action_response",
          actionName: "GET_INFERENCE",
          topicId: activeTopic.topic_id,
          topicName: activeTopic.topic_name,
          inferenceValue
        },
        createdAt: Date.now()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const displayMessage = `There was an error fetching the inference from Allora Network: ${errorMessage}`;
      elizaLogger2.error(displayMessage);
      const content = {
        text: displayMessage,
        source: "@elizaos-plugins/allora"
      };
      callback(content);
    }
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "What is the predicted ETH price in 5 minutes?"
        }
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE"
        }
      },
      {
        name: "{{user2}}",
        content: {
          text: "Inference provided by Allora Network on topic ETH 5min (ID: 13): 3393.364326646801085508"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "What is the predicted price of gold in 24 hours?"
        }
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE"
        }
      },
      {
        name: "{{user2}}",
        content: {
          text: "There is no active Allora Network topic available at the moment."
        }
      }
    ]
  ]
};

// src/service.ts
import { Service, elizaLogger as elizaLogger3 } from "@elizaos/core";
import { AlloraAPIClient } from "@alloralabs/allora-sdk";

// src/config.ts
import { z } from "zod";
var ConfigSchema = z.object({
  ALLORA_API_KEY: z.string().min(1, "Allora API key is required"),
  ALLORA_CHAIN_SLUG: z.string().min(1, "Allora chain slug is required")
});
function validateAlloraConfig(runtime) {
  const config = {
    ALLORA_API_KEY: runtime.getSetting("ALLORA_API_KEY") || process.env.ALLORA_API_KEY,
    ALLORA_CHAIN_SLUG: runtime.getSetting("ALLORA_CHAIN_SLUG") || process.env.ALLORA_CHAIN_SLUG
  };
  return ConfigSchema.parse(config);
}

// src/service.ts
var AlloraService = class _AlloraService extends Service {
  static serviceType = "allora-service";
  config;
  alloraClient = null;
  constructor(runtime) {
    super(runtime);
    this.config = validateAlloraConfig(runtime);
  }
  static async start(runtime) {
    const service = new _AlloraService(runtime);
    await service.initialize();
    return service;
  }
  async initialize() {
    try {
      this.alloraClient = new AlloraAPIClient({
        chainSlug: this.config.ALLORA_CHAIN_SLUG,
        apiKey: this.config.ALLORA_API_KEY
      });
      elizaLogger3.info("Allora service initialized successfully");
    } catch (error) {
      elizaLogger3.error("Failed to initialize Allora service:", error);
      throw error;
    }
  }
  async stop() {
    this.alloraClient = null;
    elizaLogger3.info("Allora service stopped");
  }
  get capabilityDescription() {
    return "Allora Network integration for fetching topic inferences and predictions";
  }
  getClient() {
    if (!this.alloraClient) {
      throw new Error("Allora client not initialized");
    }
    return this.alloraClient;
  }
  isInitialized() {
    return this.alloraClient !== null;
  }
  getStatus() {
    return this.isInitialized() ? "initialized" : "not initialized";
  }
};

// src/test/test.ts
var test = {
  name: "@elizaos-plugins/allora Plugin Tests",
  description: "Basic tests for @elizaos-plugins/allora plugin",
  tests: [
    {
      name: "Plugin has required structure",
      fn: async () => {
        if (!index_default.name || !index_default.description || !index_default.actions) {
          throw new Error("Plugin missing required fields");
        }
      }
    },
    {
      name: "Actions are valid",
      fn: async () => {
        const actions = index_default.actions || [];
        if (actions.length === 0) {
          throw new Error("Plugin has no actions");
        }
        for (const action of actions) {
          if (!action.name || !action.handler) {
            throw new Error("Action missing required properties");
          }
        }
      }
    },
    {
      name: "Should validate action handlers can be called",
      fn: async (runtime) => {
        const plugin = await import("./index.js");
        const actions = plugin.default?.actions || [];
        if (actions.length === 0) {
          console.log("\u2139\uFE0F  No actions to test");
          return;
        }
        for (const action of actions) {
          if (typeof action.validate !== "function") {
            throw new Error(`Action ${action.name} missing validate method`);
          }
          if (typeof action.handler !== "function") {
            throw new Error(`Action ${action.name} missing handler method`);
          }
          console.log(`\u2713 Action ${action.name} has required methods`);
        }
        console.log("\u2705 All action handlers validated");
      }
    }
  ]
};
var test_default = test;

// src/index.ts
var alloraPlugin = {
  name: "allora-network",
  description: "Allora Network plugin for fetching topic inferences and predictions from Allora Network",
  services: [AlloraService],
  actions: [getInferenceAction],
  providers: [topicsProvider],
  tests: [test_default],
  init: async (_config, _runtime) => {
  }
};
var index_default = alloraPlugin;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map