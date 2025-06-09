import {
  elizaLogger,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
} from "@elizaos/core";
import NodeCache from "node-cache";
import { type AlloraTopic } from "@alloralabs/allora-sdk";
import { AlloraService } from "../service.js";

const cache = new NodeCache({ stdTTL: 30 * 60 });

const getAlloraTopics = async (
  runtime: IAgentRuntime,
): Promise<AlloraTopic[]> => {
  const cacheKey = "allora-topics";
  const cachedValue = cache.get<AlloraTopic[]>(cacheKey);

  if (cachedValue) {
    elizaLogger.info("Retrieving Allora topics from cache");
    return cachedValue;
  }

  const alloraService = runtime.getService("allora-service") as AlloraService;
  if (!alloraService || !alloraService.isInitialized()) {
    elizaLogger.error("Allora service is not initialized");
    return [];
  }

  const alloraApiClient = alloraService.getClient();
  const alloraTopics = await alloraApiClient.getAllTopics();

  cache.set(cacheKey, alloraTopics);

  return alloraTopics;
};

export const topicsProvider: Provider = {
  name: "alloraTopics",
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const alloraTopics = await getAlloraTopics(runtime);

    let output = "Allora Network Topics: \n";
    for (const topic of alloraTopics) {
      output += `Topic Name: ${topic.topic_name}\n`;
      output += `Topic Description: ${topic.description}\n`;
      output += `Topic ID: ${topic.topic_id}\n`;
      output += `Topic is Active: ${topic.is_active}\n`;
      output += `Topic Updated At: ${topic.updated_at}\n`;
      output += "\n";
    }

    return {
      data: {
        topics: alloraTopics,
        count: alloraTopics.length,
      },
      values: {
        activeTopics: alloraTopics.filter((topic) => topic.is_active).length,
        totalTopics: alloraTopics.length,
      },
      text: output,
    };
  },
};
