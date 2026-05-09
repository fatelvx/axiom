export function integrate(position: number, velocity: number, dt: number): number {
  return position + velocity * dt;
}
