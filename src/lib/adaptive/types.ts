import type { EngineConfig } from "./engineConfig";

export type AdaptiveContext = {
  userId: string;
  screen: string;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
  config?: EngineConfig;
  /** Pseudonyme `G01`, `G02`, … (Gast-Studysession): lockerere Schwellen. */
  isGuestStudyUser?: boolean;
};

export type SuggestionDraft = {
  ruleKey: string;
  type: string;
  title: string;
  explanation: string;
  payload: Record<string, unknown>;
};

export type AdaptiveRule = {
  key: string;
  name: string;
  description: string;
  evaluate: (ctx: AdaptiveContext) => Promise<SuggestionDraft | null>;
};
