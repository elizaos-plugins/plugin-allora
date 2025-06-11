import type {
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  Action,
  Content,
} from "@elizaos/core";
import {
  logger,
  createUniqueUuid,
  composePrompt,
  parseJSONObjectFromText,
} from "@elizaos/core";
import { z } from "zod";
import { topicsProvider } from "../providers/topics.js";
import { getInferenceTemplate } from "../templates/index.js";
import { AlloraAPIClient, type ChainSlug } from "@alloralabs/allora-sdk";
import { validateAlloraConfig } from "../config.js";

interface InferenceFields {
  topicId: number | null;
  topicName: string | null;
}

export const getInferenceAction: Action = {
  name: "GET_INFERENCE",
  similes: [
    "GET_ALLORA_INFERENCE",
    "GET_TOPIC_INFERENCE",
    "ALLORA_INFERENCE",
    "TOPIC_INFERENCE",
  ],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description: "Get inference from Allora Network",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: { [key: string]: unknown },
    callback: HandlerCallback,
  ) => {
    // Initialize or update state
    let currentState = state;
    if (!currentState) {
      currentState = (await runtime.composeState(message)) as State;
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }

    // Get Allora topics information from the provider
    currentState.alloraTopics = await topicsProvider.get(
      runtime,
      message,
      currentState,
    );

    // Compose context for extracting the inference fields
    const inferenceTopicContext = composePrompt({
      state: currentState,
      template: getInferenceTemplate,
    });

    // Define the schema for extracting the inference fields
    const schema = z.object({
      topicId: z.number().nullable(),
      topicName: z.string().nullable(),
    });

    // Use the runtime's message generation to get a response
    const generatedContent = await runtime.generateText({
      runtime,
      context: inferenceTopicContext,
      modelName: runtime.modelProvider,
    });

    // Parse the JSON from the response
    const parsedResult = parseJSONObjectFromText(generatedContent);
    if (!parsedResult) {
      logger.error("Failed to parse inference fields from generated content");
      const content: Content = {
        text: "Failed to understand the request. Please try again.",
        source: "@elizaos-plugins/allora",
      };
      callback(content);
      return;
    }

    // Validate the parsed result against the schema
    const validationResult = schema.safeParse(parsedResult);
    if (!validationResult.success) {
      logger.error("Invalid inference fields:", validationResult.error);
      const content: Content = {
        text: "Failed to parse the request properly. Please try again.",
        source: "@elizaos-plugins/allora",
      };
      callback(content);
      return;
    }

    const inferenceFields = validationResult.data as InferenceFields;

    if (!inferenceFields.topicId || !inferenceFields.topicName) {
      const content: Content = {
        text: "There is no active Allora Network topic that matches your request.",
        source: "@elizaos-plugins/allora",
      };
      callback(content);

      await runtime.createMemory(
        {
          id: createUniqueUuid(runtime, `allora-inference-${Date.now()}`),
          entityId: message.entityId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content,
          metadata: {
            type: "action_response",
            actionName: "GET_INFERENCE",
          },
          createdAt: Date.now(),
        },
        "messages",
      );
      return;
    }

    logger.info(
      `Retrieving inference for topic ID: ${inferenceFields.topicId}`,
    );

    try {
      // Get inference from Allora API
      const config = validateAlloraConfig(runtime);
      const alloraApiClient = new AlloraAPIClient({
        chainSlug: config.ALLORA_CHAIN_SLUG as ChainSlug,
        apiKey: config.ALLORA_API_KEY,
      });

      const inferenceRes = await alloraApiClient.getInferenceByTopicID(
        inferenceFields.topicId,
      );
      const inferenceValue =
        inferenceRes.inference_data.network_inference_normalized;

      const content: Content = {
        text: `Inference provided by Allora Network on topic ${inferenceFields.topicName} (Topic ID: ${inferenceFields.topicId}): ${inferenceValue}`,
        source: "@elizaos-plugins/allora",
      };
      callback(content);

      await runtime.createMemory(
        {
          id: createUniqueUuid(runtime, `allora-inference-${Date.now()}`),
          entityId: message.entityId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content,
          metadata: {
            type: "action_response",
            actionName: "GET_INFERENCE",
            topicId: inferenceFields.topicId,
            topicName: inferenceFields.topicName,
            inferenceValue,
          },
          createdAt: Date.now(),
        },
        "messages",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const displayMessage = `There was an error fetching the inference from Allora Network: ${errorMessage}`;

      logger.error(displayMessage);
      const content: Content = {
        text: displayMessage,
        source: "@elizaos-plugins/allora",
      };
      callback(content);

      await runtime.createMemory(
        {
          id: createUniqueUuid(runtime, `allora-inference-error-${Date.now()}`),
          entityId: message.entityId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content,
          metadata: {
            type: "action_response",
            actionName: "GET_INFERENCE",
            error: errorMessage,
          },
          createdAt: Date.now(),
        },
        "messages",
      );
    }
  },
  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "What is the predicted ETH price in 5 minutes?",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "Inference provided by Allora Network on topic ETH 5min (ID: 13): 3393.364326646801085508",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "What is the predicted price of gold in 24 hours?",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll get the inference now...",
          action: "GET_INFERENCE",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "There is no active Allora Network topic that matches your request.",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
