import { publicApi } from "../services";
import { feature } from "../services/feature";
import { secret } from "../services/internal/secret";

export function render(): string {
  return `${publicApi()} ${feature()} ${secret()}`;
}
