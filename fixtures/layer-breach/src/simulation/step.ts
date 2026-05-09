import { draw } from "../rendering/draw";

export function step(value: number): string {
  return draw(value);
}
