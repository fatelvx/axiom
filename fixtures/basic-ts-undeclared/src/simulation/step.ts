import { integrate } from "../physics/math";

export function step(position: number, velocity: number): number {
  return integrate(position, velocity, 0.016);
}
