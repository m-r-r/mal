import type { Interface } from "node:readline";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { readFileSync, writeFileSync } from "node:fs";
import { SPECIAL_FORMS_SYMBOLS } from "./eval";
import type Environment from "./env";
import { symbolToString } from "./core";

const HISTORY_FILE = join(process.cwd(), ".mal-history");
const HISTORY_SIZE = 100;

function loadHistory(): string[] {
  try {
    const buf = readFileSync(HISTORY_FILE, { encoding: "utf-8" });
    return buf
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .slice(-HISTORY_SIZE);
  } catch (_) {
    return [];
  }
}

function saveHistory(history: string[]): void {
  try {
    writeFileSync(HISTORY_FILE, history.join("\n"), { encoding: "utf-8" });
  } catch (_) {}
}

export default function setupReadline(env: Environment): Interface {
  function completer(line: string): [string[], string] {
    let lastToken = line.split(/[\s,\{\}]+/g).at(-1);
    if (typeof lastToken !== "string" || lastToken === "") {
      return [[], line];
    }

    const isOpening = lastToken.startsWith("(") || lastToken.startsWith("[");
    let symbols;
    if (isOpening) {
      lastToken = lastToken.slice(1);
      symbols = [...SPECIAL_FORMS_SYMBOLS, ...env.list()];
    } else {
      symbols = [...env.list()];
    }

    const allSymbols: string[] = symbols.map(symbolToString);
    const matchingSymbols = allSymbols.filter((s) =>
      s.startsWith(String(lastToken))
    );
    matchingSymbols.sort();

    return [
      matchingSymbols.map((s) => line.slice(0, -String(lastToken).length) + s),
      line,
    ];
  }

  let history = loadHistory();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "user> ",
    completer,
    historySize: HISTORY_SIZE,
    history,
  });

  rl.on("history", (hist) => {
    history = hist;
  });
  rl.on("close", () => saveHistory(history));

  return rl;
}
