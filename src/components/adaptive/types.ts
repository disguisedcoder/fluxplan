export type AdaptiveSuggestion = {
  id: string;
  ruleKey: string;
  type: string;
  title: string;
  explanation: string;
  status: "pending" | "accepted" | "rejected" | "snoozed" | "undone";
  payload: unknown;
  createdAt: string;
  respondedAt: string | null;
};

export type AdaptiveRule = {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: string;
};

