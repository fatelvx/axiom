import type { SendReceipt } from "../contracts";
import { readLastReceipt, rememberReceipt } from "./internal/chatState";

export function recordSendReceipt(receipt: SendReceipt): void {
  rememberReceipt(receipt);
}

export function readLastQueuedConversation(): string | undefined {
  return readLastReceipt()?.conversationId;
}
