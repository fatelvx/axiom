import { integrate } from "../physics/math";

export function draw(position: number, velocity: number): string {
  return `value:${integrate(position, velocity, 0.016)}`;
}
