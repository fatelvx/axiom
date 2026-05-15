import type { MessageDraft, SendReceipt } from "../../contracts";

export function runAgentLoop(draft: MessageDraft): SendReceipt {
  return {
    conversationId: draft.conversationId,
    queued: draft.text.trim().length > 0
  };
}

export function readServiceStatus(): string {
  return "ready";
}
