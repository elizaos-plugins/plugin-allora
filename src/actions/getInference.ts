import {
  type ActionExample,
  elizaLogger,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  type Action,
  type Content,
} from "@elizaos/core";
import { randomUUID } from "crypto";
import { topicsProvider } from "../providers/topics.js";
import { AlloraService } from "../service.js";

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

    // For now, we'll just get the first active topic
    const topics = currentState.alloraTopics?.data?.topics || [];
    const activeTopic = topics.find((topic: any) => topic.is_active);

    if (!activeTopic) {
      const content: Content = {
        text: "There is no active Allora Network topic available at the moment.",
        source: "@elizaos-plugins/allora",
      };
      callback(content);
      return;
    }

    elizaLogger.info(
      `Retrieving inference for topic ID: ${activeTopic.topic_id}`,
    );

    try {
      // Get Allora service and client
      const alloraService = runtime.getService(
        "allora-service",
      ) as AlloraService;
      if (!alloraService || !alloraService.isInitialized()) {
        const content: Content = {
          text: "Allora service is not initialized. Please check your configuration.",
          source: "@elizaos-plugins/allora",
        };
        callback(content);
        return;
      }

      const alloraApiClient = alloraService.getClient();
      const inferenceRes = await alloraApiClient.getInferenceByTopicID(
        activeTopic.topic_id,
      );
      const inferenceValue =
        inferenceRes.inference_data.network_inference_normalized;

      const responseText = `Inference provided by Allora Network on topic ${activeTopic.topic_name} (Topic ID: ${activeTopic.topic_id}): ${inferenceValue}`;

      const content: Content = {
        text: responseText,
        source: "@elizaos-plugins/allora",
      };
      callback(content);

      await runtime.createMemory({
        id: randomUUID(),
        entityId: message.entityId,
        agentId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: responseText,
          source: "@elizaos-plugins/allora",
        },
        metadata: {
          type: "action_response",
          actionName: "GET_INFERENCE",
          topicId: activeTopic.topic_id,
          topicName: activeTopic.topic_name,
          inferenceValue: inferenceValue,
        },
        createdAt: Date.now(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const displayMessage = `There was an error fetching the inference from Allora Network: ${errorMessage}`;

      elizaLogger.error(displayMessage);

      const content: Content = {
        text: displayMessage,
        source: "@elizaos-plugins/allora",
      };
      callback(content);
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
          text: "There is no active Allora Network topic available at the moment.",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
