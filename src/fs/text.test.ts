import assert from "node:assert/strict";
import test from "node:test";
import { decodeTextBuffer } from "./text.js";

test("decodeTextBuffer reads UTF-8 text", () => {
  assert.equal(decodeTextBuffer(Buffer.from("module App\npath \"src/**\"\n", "utf8")), "module App\npath \"src/**\"\n");
});

test("decodeTextBuffer strips a UTF-8 BOM", () => {
  const buffer = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("module App\n", "utf8")]);
  assert.equal(decodeTextBuffer(buffer), "module App\n");
});

test("decodeTextBuffer reads UTF-16LE text with a BOM", () => {
  const buffer = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("module App\npath \"src/**\"\n", "utf16le")]);
  assert.equal(decodeTextBuffer(buffer), "module App\npath \"src/**\"\n");
});

test("decodeTextBuffer reads likely UTF-16LE text without a BOM", () => {
  const buffer = Buffer.from("module App\npath \"src/**\"\n", "utf16le");
  assert.equal(decodeTextBuffer(buffer), "module App\npath \"src/**\"\n");
});
