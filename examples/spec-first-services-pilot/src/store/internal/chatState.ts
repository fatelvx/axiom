import type { SendReceipt } from "../../contracts";

let lastReceipt: SendReceipt | undefined;

export function rememberReceipt(receipt: SendReceipt): void {
  lastReceipt = receipt;
}

export function readLastReceipt(): SendReceipt | undefined {
  return lastReceipt;
}
