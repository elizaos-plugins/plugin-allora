import { IAgentRuntime, Plugin } from '@elizaos/core';
import { z } from 'zod';

declare const ConfigSchema: z.ZodObject<{
    ALLORA_API_KEY: z.ZodString;
    ALLORA_CHAIN_SLUG: z.ZodDefault<z.ZodEnum<["allora-testnet", "allora-mainnet", "local"]>>;
}, "strip", z.ZodTypeAny, {
    ALLORA_API_KEY: string;
    ALLORA_CHAIN_SLUG: "allora-testnet" | "allora-mainnet" | "local";
}, {
    ALLORA_API_KEY: string;
    ALLORA_CHAIN_SLUG?: "allora-testnet" | "allora-mainnet" | "local" | undefined;
}>;
type AlloraConfig = z.infer<typeof ConfigSchema>;
declare function validateAlloraConfig(runtime: IAgentRuntime): AlloraConfig;

declare const alloraPlugin: Plugin;

export { type AlloraConfig, ConfigSchema, alloraPlugin as default, validateAlloraConfig };
