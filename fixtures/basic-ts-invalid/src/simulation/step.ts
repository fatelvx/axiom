import { integrate } from "../physics/math";
import { draw } from "../rendering/draw";

export function step(position: number, velocity: number): string {
  const nextPosition = integrate(position, velocity, 0.016);
  return draw(nextPosition);
}
