import { Expr, Vector, Environment, SpecialForm } from "./types";
import { isList, symbolToString } from "./core";
import { DEFAULT_ENV } from "./core";

export class EvalError extends Error {}

function bind(env: Environment, args: Expr[], context: string): Expr {
  if (args.length % 2 !== 0) {
    throw new EvalError(`${context} must have an even number of bindings`);
  }
  const symbols: symbol[] = args.reduce((acc: symbol[], v, i) => {
    const expectSym = i % 2 === 0;
    if (!expectSym) {
      return acc;
    }
    if (typeof v !== "symbol") {
      throw new EvalError(`${context} : argument ${i} should be a symbol`);
    }
    acc.push(v);
    return acc;
  }, []);
  const values = args.filter((_, i) => i % 2 !== 0);

  let result: Expr = Symbol.for("nil");
  symbols.forEach((sym, i) => {
    result = env.set(sym, evaluate(values[i]!, env));
  });
  return result;
}

const SPECIAL_FORMS: Map<symbol, SpecialForm> = new Map(
  Object.entries({
    "def!": (env, ...args): Expr => bind(env, args, "def!"),
    "let*": (env, ...args): Expr => {
      const [bindings, ...body] = args;
      if (!Array.isArray(bindings)) {
        throw new EvalError(
          `def! : argument #0 must be a list or an array of bindings`
        );
      }
      if (body.length < 1) {
        throw new EvalError(`def! should have at least two arguments`);
      }
      env = env.extend();
      return body.reduce(
        (last: Expr, body: Expr) => evaluate(body, env),
        bind(env, bindings, "let*")
      );
    },
  } as Record<string, SpecialForm>).map(([k, v]) => [Symbol.for(k), v])
);

export default function evaluate(
  expr: Expr,
  env: Environment = DEFAULT_ENV
): Expr {
  if (expr instanceof Map) {
    return new Map(
      Array.from(expr.entries()).map(([k, v]) => [
        evaluate(k, env),
        evaluate(v, env),
      ])
    );
  } else if (expr instanceof Vector) {
    return expr.map((i) => evaluate(i, env));
  } else if (isList(expr) && expr.length >= 1) {
    const [symbol, ...args] = expr;
    if (typeof symbol !== "symbol") {
      throw new EvalError(`Value of type ${typeof expr} is not callable`);
    }
    const specialForm = SPECIAL_FORMS.get(symbol);
    if (typeof specialForm !== "undefined") {
      return specialForm(env, ...args);
    }
    const fn = env.get(symbol);
    if (typeof fn !== "function") {
      throw new EvalError(
        `sumbol ${symbolToString(symbol)} is not bound to a function`
      );
    }
    return fn(...args.map((a) => evaluate(a, env)));
  } else if (typeof expr === "symbol") {
    if (Symbol.keyFor(expr)?.startsWith(":")) {
      return expr;
    }
    return env.get(expr);
  } else {
    return expr;
  }
}
