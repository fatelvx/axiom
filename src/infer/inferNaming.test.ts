import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateName,
  combinedName,
  packageNameToIdentifier,
  preferCandidateGroupName,
  sourceRootEntryModuleName,
  stripExtension,
  toIdentifier,
  type NamedCandidateGroup
} from "./inferNaming.js";

test("identifier helpers normalize filesystem and package-shaped names", () => {
  assert.equal(toIdentifier("services/agent-loop.ts"), "ServicesAgentLoop");
  assert.equal(toIdentifier("9patch-renderer"), "Module9patchRenderer");
  assert.equal(toIdentifier("..."), "Module");
  assert.equal(stripExtension("component.test.tsx"), "component.test");
});

test("source root entry names distinguish app entrypoints from other root files", () => {
  assert.equal(sourceRootEntryModuleName("main.ts"), "AppEntry");
  assert.equal(sourceRootEntryModuleName("index.tsx"), "AppEntry");
  assert.equal(sourceRootEntryModuleName("app.js"), "AppEntry");
  assert.equal(sourceRootEntryModuleName("bootstrap.ts"), "Bootstrap");
  assert.equal(sourceRootEntryModuleName("worker.ts"), undefined);
  assert.equal(sourceRootEntryModuleName("main.vue"), undefined);
});

test("candidate group naming prefers meaningful root entry labels", () => {
  assert.equal(preferCandidateGroupName("SrcRoot", "AppEntry"), "AppEntry");
  assert.equal(preferCandidateGroupName("Root", "Bootstrap"), "Bootstrap");
  assert.equal(preferCandidateGroupName("Components", "AppEntry"), "Components");
});

test("package names become starter-contract module identifiers", () => {
  assert.equal(packageNameToIdentifier("@scope/pkg-name", "packages/pkg-name"), "PkgName");
  assert.equal(packageNameToIdentifier("plain-package", "packages/plain-package"), "PlainPackage");
  assert.equal(packageNameToIdentifier(undefined, "packages/fallback-package"), "FallbackPackage");
});

test("candidate and combined cycle names stay readable for inferred authoring", () => {
  const groups: NamedCandidateGroup[] = [
    { key: "adapter", name: "Adapter" },
    { key: "client", name: "Client" },
    { key: "middleware", name: "Middleware" },
    { key: "router", name: "Router" },
    { key: "services/agent-loop", name: "ServicesAgentLoop" },
    { key: "services/memory", name: "ServicesMemory" },
    { key: "services/tools", name: "ServicesTools" },
    { key: "signals", name: "Signals" },
    { key: "signals/debug", name: "SignalsDebug" },
    { key: "store", name: "Store" },
    { key: "ui", name: "Ui" },
    { key: "utils", name: "Utils" }
  ];

  assert.equal(candidateName(groups, "missing/group"), "MissingGroup");
  assert.equal(combinedName(groups, ["ui", "store"]), "StoreUi");
  assert.equal(combinedName(groups, ["signals", "signals/debug"]), "SignalsDebugCycle");
  assert.equal(combinedName(groups, ["services/agent-loop", "services/memory", "services/tools", "store"]), "ServicesCycle");
  assert.equal(combinedName(groups, ["adapter", "client", "middleware", "router", "utils"]), "MixedCycle");
});
