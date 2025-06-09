import { z } from "zod";
import { type IAgentRuntime } from "@elizaos/core";

export const ConfigSchema = z.object({
  ALLORA_API_KEY: z.string().min(1, "Allora API key is required"),
  ALLORA_CHAIN_SLUG: z.string().min(1, "Allora chain slug is required"),
});

export type AlloraConfig = z.infer<typeof ConfigSchema>;

export function validateAlloraConfig(runtime: IAgentRuntime): AlloraConfig {
  const config = {
    ALLORA_API_KEY:
      runtime.getSetting("ALLORA_API_KEY") || process.env.ALLORA_API_KEY,
    ALLORA_CHAIN_SLUG:
      runtime.getSetting("ALLORA_CHAIN_SLUG") || process.env.ALLORA_CHAIN_SLUG,
  };

  return ConfigSchema.parse(config);
}
