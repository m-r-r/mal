import { Atom, List, Expr, Vector } from "./types";
import Environment from "./env";

export function isAtom(expr: Expr): expr is Atom {
  return (
    typeof expr === "number" ||
    typeof expr === "string" ||
    typeof expr === "symbol"
  );
}

export function isCollection(expr: Expr): boolean {
  return expr instanceof Vector || expr instanceof Map;
}

export function isList(expr: Expr): expr is List {
  return Array.isArray(expr) && !(expr instanceof Vector);
}

export function symbolToString(sym: symbol): string {
  const s = Symbol.keyFor(sym);
  if (typeof s !== "string") {
    throw new EvalError(`Invalid symbol ${String(sym)}`);
  }
  return s;
}

function expectNumberArgument(expr: Expr, index: number): number {
  if (typeof expr === "number") {
    return expr;
  }
  throw new EvalError(
    `argument ${index} must be an integer, got ${typeof expr}`
  );
}

export const DEFAULT_ENV = new Environment({
  "+": (...args) =>
    args.map(expectNumberArgument).reduce((acc, i) => acc + i, 0),
  "-": (...args) => {
    const nums: number[] = args.map(expectNumberArgument) as number[];
    if (nums.length > 1) {
      return nums.reduce((a: number, b: number): number => a - b);
    } else {
      return nums.reduce((a, b) => a - b, 0);
    }
  },
  "*": (...args) => args.map(expectNumberArgument).reduce((a, b) => a * b, 1),
  "/": (...args) => args.map(expectNumberArgument).reduce((a, b) => a / b),
});
