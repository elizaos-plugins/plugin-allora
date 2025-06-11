import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import NodeCache from "node-cache";
import {
  AlloraAPIClient,
  type AlloraTopic,
  type ChainSlug,
} from "@alloralabs/allora-sdk";
import { validateAlloraConfig } from "../config.js";

const cache = new NodeCache({ stdTTL: 30 * 60 });

async function getAlloraTopics(runtime: IAgentRuntime): Promise<AlloraTopic[]> {
  const cacheKey = "allora-topics";
  const cachedValue = cache.get<AlloraTopic[]>(cacheKey);

  if (cachedValue) {
    logger.info("Retrieving Allora topics from cache");
    return cachedValue;
  }

  const config = validateAlloraConfig(runtime);

  const alloraApiClient = new AlloraAPIClient({
    chainSlug: config.ALLORA_CHAIN_SLUG as ChainSlug,
    apiKey: config.ALLORA_API_KEY,
  });
  const alloraTopics = await alloraApiClient.getAllTopics();

  cache.set(cacheKey, alloraTopics);

  return alloraTopics;
}

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
