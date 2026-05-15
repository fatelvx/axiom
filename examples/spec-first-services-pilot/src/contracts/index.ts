export type ConversationId = string;

export interface MessageDraft {
  conversationId: ConversationId;
  text: string;
}

export interface SendReceipt {
  conversationId: ConversationId;
  queued: boolean;
}
