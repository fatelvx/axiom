import { sendMessage } from "../services";
import { recordSendReceipt } from "../store";

export function useSendMessage() {
  return (text: string) => {
    const receipt = sendMessage({ conversationId: "hook", text });
    recordSendReceipt(receipt);
    return receipt;
  };
}
