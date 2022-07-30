import { Expr, Vector } from "./types";
import { symbolToString } from "./core";

export default function print(expr: Expr, readable: boolean = true): string {
  if (typeof expr === "number") {
    return String(expr);
  } else if (typeof expr === "string") {
    if (!readable) {
      return expr;
    } else {
      return `"${expr
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")}"`;
    }
  } else if (typeof expr === "symbol") {
    return symbolToString(expr);
  } else if (expr instanceof Array) {
    const values = expr.map((e) => print(e, readable)).join(" ");
    if (expr instanceof Vector) {
      return `[${values}]`;
    } else {
      return `(${values})`;
    }
  } else if (expr instanceof Map) {
    const values = Array.from(expr.entries())
      .flat()
      .map((e) => print(e, readable))
      .join(" ");
    return `{${values}}`;
  } else if (expr instanceof Function) {
    return "#<function>";
  } else {
    throw new TypeError(`Invalid expression ${String(expr)}`);
  }
}
