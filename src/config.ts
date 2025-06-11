import { z } from "zod";
import { type IAgentRuntime } from "@elizaos/core";

export const ConfigSchema = z.object({
  ALLORA_API_KEY: z.string().min(1, "Allora API key is required"),
  ALLORA_CHAIN_SLUG: z
    .enum(["allora-testnet", "allora-mainnet", "local"])
    .default("allora-testnet"),
});

export type AlloraConfig = z.infer<typeof ConfigSchema>;

export function validateAlloraConfig(runtime: IAgentRuntime): AlloraConfig {
  const apiKey =
    runtime.getSetting("ALLORA_API_KEY") ?? process.env.ALLORA_API_KEY;
  let chainSlug =
    runtime.getSetting("ALLORA_CHAIN_SLUG") ??
    process.env.ALLORA_CHAIN_SLUG ??
    "allora-testnet";

  // Handle legacy "testnet" value
  if (chainSlug === "testnet") {
    chainSlug = "allora-testnet";
  }

  const config = {
    ALLORA_API_KEY: apiKey,
    ALLORA_CHAIN_SLUG: chainSlug,
  };

  return ConfigSchema.parse(config);
}
