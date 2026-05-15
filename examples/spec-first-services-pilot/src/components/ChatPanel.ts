import { sendMessage } from "../services";
import { recordSendReceipt } from "../store";

export function renderChatPanel(text: string): string {
  const receipt = sendMessage({ conversationId: "chat", text });
  recordSendReceipt(receipt);

  return receipt.queued ? "queued" : "empty";
}
