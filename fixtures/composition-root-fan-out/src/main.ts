import { createEngine } from "./engine";
import { createRenderer } from "./render";
import { createUi } from "./ui";
import { createPhases } from "./phases";

export function startApp(): void {
  createEngine();
  createRenderer();
  createUi();
  createPhases();
}
