import { Atom, List, Expr, Vector } from "./types";

function isAtom(expr: Expr): expr is Atom {
  return (
    typeof expr === "number" ||
    typeof expr === "string" ||
    typeof expr === "symbol"
  );
}

function isCollection(expr: Expr): boolean {
  return expr instanceof Vector || expr instanceof Map;
}

function isList(expr: Expr): expr is List {
  return Array.isArray(expr) && !(expr instanceof Vector);
}

function symbolToString(sym: symbol): string {
  const s = Symbol.keyFor(sym);
  if (typeof s !== "string") {
    throw new EvalError(`Invalid symbol ${String(sym)}`);
  }
  return s;
}

export class EvalError extends Error {}

function expectNumberArgument(expr: Expr, index: number): number {
  if (typeof expr === "number") {
    return expr;
  }
  throw new EvalError(
    `argument ${index} must be an integer, got ${typeof expr}`
  );
}

const env: Record<string, (...args: Expr[]) => Expr> = {
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
};

export default function evaluate(expr: Expr): Expr {
  if (expr instanceof Map) {
    return new Map(
      Array.from(expr.entries()).map(([k, v]) => [evaluate(k), evaluate(v)])
    );
  } else if (expr instanceof Vector) {
    return expr.map((i) => evaluate(i));
  } else if (isList(expr) && expr.length >= 1) {
    const [symbol, ...args] = expr;
    if (typeof symbol !== "symbol") {
      throw new EvalError(`Value of type ${typeof expr} is not callable`);
    }
    const fnName = symbolToString(symbol);
    const fn = env[fnName];
    if (typeof fn !== "function") {
      throw new EvalError(`unbound symbol ${fnName}`);
    }
    return fn(...args.map((a) => evaluate(a)));
  } else {
    return expr;
  }
}
