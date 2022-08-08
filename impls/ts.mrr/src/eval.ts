import { Expr, Vector, Environment, SpecialForm, Closure } from "./types";
import { DEFAULT_ENV, NIL, TRUE, FALSE, isList, toBoolean } from "./core";
import print from "./printer";

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

const evalMany: SpecialForm = (env: Environment, ...args): Expr =>
  args.reduce((_: Expr, e: Expr) => evaluate(e, env), NIL);

const AMPERSAND = Symbol.for("&");

const SPECIAL_FORMS: Map<symbol, SpecialForm> = new Map(
  Object.entries({
    do: evalMany,
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
    "fn*": (env, args, ...body): Closure => {
      if (!Array.isArray(args)) {
        throw new EvalError(
          `fn* : argument #0 must be a list or an array of symbols`
        );
      }
      if (body.length < 1) {
        throw new EvalError(`fn* should have a body`);
      }

      const names: symbol[] = args.map((v) => {
        if (typeof v !== "symbol") {
          throw new EvalError(
            `fn* : argument #0 must be a list or an array of symbols`
          );
        }
        return v;
      });

      let ampersandPos = names.indexOf(AMPERSAND);
      let isVariadic = false;
      let reqArgs = names.length;

      if (ampersandPos !== -1) {
        if (ampersandPos !== names.length - 2) {
          throw new EvalError(`fn* : only the last argument can be variadic`);
        }
        isVariadic = true;
        names.splice(ampersandPos, 1);
        reqArgs = Math.max(0, reqArgs - 2);
      }

      return (...args: Expr[]): Expr => {
        if (isVariadic) {
          if (args.length < reqArgs) {
            throw new EvalError(
              `expected at least ${reqArgs} arguments, got ${args.length}`
            );
          }
        } else if (args.length !== names.length) {
          throw new EvalError(
            `expected ${names.length} arguments, got ${args.length}`
          );
        }

        if (isVariadic) {
          const rest: Expr[] = args.slice(reqArgs);
          rest.unshift(Symbol.for("list"));
          args = args.slice(0, reqArgs);
          args.push(rest);
        }

        const bindings = names.reduce((acc, n, i) => {
          acc.push(n);
          acc.push(args![i]);
          return acc;
        }, [] as Expr[]);

        const inner = env.extend();
        bind(inner, bindings, "fn*");
        return evalMany(inner, ...body);
      };
    },
    if: (env, ...args): Expr => {
      if (args.length < 2) {
        throw new EvalError(`if should have at least two arguments`);
      }

      const lastCondIndex = args.length - (args.length % 2 ? 3 : 2);

      for (let i = 0; i < args.length - 1; i++) {
        const cond = toBoolean(evaluate(args[i]!, env));
        if (cond) {
          return evaluate(args[i + 1] ?? NIL, env);
        } else if (i === lastCondIndex) {
          return evaluate(args[i + 2] ?? NIL, env);
        } else {
          i++;
        }
      }
      return NIL;
    },
  } as Record<string, SpecialForm>).map(([k, v]) => [Symbol.for(k), v])
);

export const SPECIAL_FORMS_SYMBOLS: symbol[] = Array.from(SPECIAL_FORMS.keys());

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
    let fn;
    const [first, ...args] = expr;

    if (typeof first === "symbol") {
      const specialForm = SPECIAL_FORMS.get(first);
      if (typeof specialForm !== "undefined") {
        return specialForm(env, ...args);
      }
    }

    fn = evaluate(first, env);

    if (typeof fn !== "function") {
      throw new EvalError(`Value ${print(first)} is not callable`);
    }

    return fn(...args.map((a) => evaluate(a, env)));
  } else if (typeof expr === "symbol") {
    if (
      expr === NIL ||
      expr === FALSE ||
      expr === TRUE ||
      Symbol.keyFor(expr)?.startsWith(":")
    ) {
      return expr;
    }
    return env.get(expr);
  } else {
    return expr;
  }
}
