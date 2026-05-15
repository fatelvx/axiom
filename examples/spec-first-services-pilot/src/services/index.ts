import type { MessageDraft, SendReceipt } from "../contracts";
import { runAgentLoop } from "./internal/agentLoop";

export function sendMessage(draft: MessageDraft): SendReceipt {
  return runAgentLoop(draft);
}
