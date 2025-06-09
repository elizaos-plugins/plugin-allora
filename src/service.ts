import { Service, type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { AlloraAPIClient, type ChainSlug } from "@alloralabs/allora-sdk";
import { validateAlloraConfig, type AlloraConfig } from "./config.js";

export class AlloraService extends Service {
  static serviceType: string = "allora-service";

  public config: AlloraConfig;
  private alloraClient: AlloraAPIClient | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.config = validateAlloraConfig(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    const service = new AlloraService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      this.alloraClient = new AlloraAPIClient({
        chainSlug: this.config.ALLORA_CHAIN_SLUG as ChainSlug,
        apiKey: this.config.ALLORA_API_KEY,
      });
      elizaLogger.info("Allora service initialized successfully");
    } catch (error) {
      elizaLogger.error("Failed to initialize Allora service:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.alloraClient = null;
    elizaLogger.info("Allora service stopped");
  }

  get capabilityDescription(): string {
    return "Allora Network integration for fetching topic inferences and predictions";
  }

  getClient(): AlloraAPIClient {
    if (!this.alloraClient) {
      throw new Error("Allora client not initialized");
    }
    return this.alloraClient;
  }

  isInitialized(): boolean {
    return this.alloraClient !== null;
  }

  getStatus(): string {
    return this.isInitialized() ? "initialized" : "not initialized";
  }
}
