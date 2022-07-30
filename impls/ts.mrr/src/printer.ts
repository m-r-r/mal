import { Expr, Vector } from "./types";

export default function print(expr: Expr): string {
  if (typeof expr === "number") {
    return String(expr);
  } else if (typeof expr === "string") {
    return `"${expr.replace(/\n/g, "\\n")}"`;
  } else if (typeof expr === "symbol") {
    const s = Symbol.keyFor(expr);
    if (typeof s === "string") {
      return s;
    } else {
      throw new TypeError(`Invalid symbol ${String(expr)}`);
    }
  } else if (expr instanceof Array) {
    const values = expr.map(print).join(" ");
    if (expr instanceof Vector) {
      return `[${values}]`;
    } else {
      return `(${values})`;
    }
  } else if (expr instanceof Map) {
    const values = Array.from(expr.entries()).flat().map(print).join(" ");
    return `{${values}}`;
  } else {
    throw new TypeError(`Invalid expression ${String(expr)}`);
  }
}
