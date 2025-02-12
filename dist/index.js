// src/actions/getInference.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateObject,
  ModelClass
} from "@elizaos/core";
import { z } from "zod";

// src/providers/topics.ts
import {
  elizaLogger
} from "@elizaos/core";
import NodeCache from "node-cache";
import { AlloraAPIClient } from "@alloralabs/allora-sdk";
var TopicsProvider = class {
  cache;
  constructor() {
    this.cache = new NodeCache({ stdTTL: 30 * 60 });
  }
  async get(runtime, _message, _state) {
    const alloraTopics = await this.getAlloraTopics(runtime);
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
    return output;
  }
  async getAlloraTopics(runtime) {
    const cacheKey = "allora-topics";
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue) {
      elizaLogger.info("Retrieving Allora topics from cache");
      return cachedValue;
    }
    const alloraApiKey = runtime.getSetting("ALLORA_API_KEY");
    const alloraChainSlug = runtime.getSetting("ALLORA_CHAIN_SLUG");
    const alloraApiClient = new AlloraAPIClient({
      chainSlug: alloraChainSlug,
      apiKey: alloraApiKey
    });
    const alloraTopics = await alloraApiClient.getAllTopics();
    this.cache.set(cacheKey, alloraTopics);
    return alloraTopics;
  }
};
var topicsProvider = new TopicsProvider();

// src/templates/index.ts
var getInferenceTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
Example response:
\`\`\`json
{
    "topicId": 1,
    "topicName": "Topic Name",
}
\`\`\`

Recent messages:
{{recentMessages}}

Allora Network Topics:
{{alloraTopics}}

Given the recent messages and the Allora Network Topics above, extract the following information about the requested:
- Topic ID of the topic that best matches the user's request. The topic should be active, otherwise return null.
- Topic Name of the topic that best matches the user's request. The topic should be active, otherwise return null.

If the topic is not active or the inference timeframe is not matching the user's request, return null for both topicId and topicName.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "topicId": number | null,
    "topicName": string | null,
}
\`\`\``;

// src/actions/getInference.ts
import { AlloraAPIClient as AlloraAPIClient2 } from "@alloralabs/allora-sdk";
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
    currentState.alloraTopics = await topicsProvider.get(runtime, message, currentState);
    const inferenceTopicContext = composeContext({
      state: currentState,
      template: getInferenceTemplate
    });
    const schema = z.object({
      topicId: z.number().nullable(),
      topicName: z.string().nullable()
    });
    const results = await generateObject({
      runtime,
      context: inferenceTopicContext,
      modelClass: ModelClass.SMALL,
      schema
    });
    const inferenceFields = results.object;
    if (!inferenceFields.topicId || !inferenceFields.topicName) {
      callback({
        text: "There is no active Allora Network topic that matches your request."
      });
      return false;
    }
    elizaLogger2.info(
      `Retrieving inference for topic ID: ${inferenceFields.topicId}`
    );
    try {
      const alloraApiClient = new AlloraAPIClient2({
        chainSlug: runtime.getSetting("ALLORA_CHAIN_SLUG"),
        apiKey: runtime.getSetting("ALLORA_API_KEY")
      });
      const inferenceRes = await alloraApiClient.getInferenceByTopicID(
        inferenceFields.topicId
      );
      const inferenceValue = inferenceRes.inference_data.network_inference_normalized;
      callback({
        text: `Inference provided by Allora Network on topic ${inferenceFields.topicName} (Topic ID: ${inferenceFields.topicId}): ${inferenceValue}`
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const displayMessage = `There was an error fetching the inference from Allora Network: ${errorMessage}`;
      elizaLogger2.error(displayMessage);
      callback({
        text: displayMessage
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is the predicted ETH price in 5 minutes?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Inference provided by Allora Network on topic ETH 5min (ID: 13): 3393.364326646801085508"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is the predicted price of gold in 24 hours?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "There is no active Allora Network topic that matches your request."
        }
      }
    ]
  ]
};

// src/index.ts
var alloraPlugin = {
  name: "Allora Network plugin",
  description: "Allora Network plugin for Eliza",
  actions: [getInferenceAction],
  evaluators: [],
  providers: [topicsProvider]
};
export {
  alloraPlugin
};
//# sourceMappingURL=index.js.map