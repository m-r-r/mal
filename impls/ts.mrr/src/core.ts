import { Atom, List, Expr, Vector, Closure } from "./types";
import Environment from "./env";
import print from "./printer";

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

export const NIL = Symbol.for("nil");
export const TRUE = Symbol.for("true");
export const FALSE = Symbol.for("false");

const numFn =
  (name: string, f: (...nx: number[]) => Expr): Closure =>
  (...args: Expr[]): Expr => {
    args.forEach((v, i) => {
      if (typeof v !== "number") {
        throw new EvalError(`${name} : argument #${i} must be a number`);
      }
    });
    return f(...(args as number[]));
  };

const numCmpFn = (
  name: string,
  cmp: (a: number, b: number) => boolean
): Closure =>
  numFn(name, (...nums: number[]) => {
    if (nums.length < 2) {
      throw new EvalError(
        `${name} expects at least two arguments, got ${nums.length}`
      );
    }

    const result = nums.reduce((result, i, ix) => {
      const next = nums[ix + 1];
      return result && (typeof next === "number" ? cmp(i, next) : true);
    }, true);

    return symbolFromBoolean(result);
  });

export function equals(a: Expr, b: Expr): boolean {
  if (Object.is(a, b)) {
    return true;
  } else if (a instanceof Map && b instanceof Map) {
    return equals([...a.entries()], [...b.entries()]);
  } else if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.every((item, idx) => equals(item, b[idx]!));
  } else {
    return false;
  }
}

function symbolFromBoolean(bool: boolean): symbol {
  return bool ? TRUE : FALSE;
}

function toString(expr: Expr): string {
  if (typeof expr === "number" || typeof expr === "string") {
    return String(expr);
  } else {
    return print(expr);
  }
}

const printFunction =
  (readably: boolean, output: boolean = false, sep = " "): Closure =>
  (...args: Expr[]) => {
    // let toStr = readably ? print : toString;
    let result = args.map((v: Expr) => print(v, readably)).join(sep);

    if (output) {
      process.stdout.write(result + "\n");
      return NIL;
    } else {
      return result;
    }
  };

export function toBoolean(expr: Expr): boolean {
  return !(expr === NIL || expr === FALSE);
}

const unary =
  (name: string, f: Fn<Expr, Expr>): Closure =>
  (...args: Expr[]) => {
    if (args.length !== 1) {
      throw new EvalError(`${name} expected 1 argument, got ${args.length}`);
    }
    return f(args[0]!);
  };

type Fn<A, B> = (a: A) => B;
const compose =
  <A extends Fn<any, any>, B extends Fn<any, any>>(a: A, b: B) =>
  (x: Parameters<A>[0]): ReturnType<B> =>
    b(a(x));

const count = (expr: Expr): number => {
  if (Array.isArray(expr)) {
    return expr.length;
  } else if (expr instanceof Map) {
    return expr.size;
  } else if (expr === NIL) {
    return 0;
  } else {
    return 1;
  }
};

export const DEFAULT_ENV = new Environment({
  true: Symbol.for("true"),
  false: Symbol.for("false"),
  nil: Symbol.for("nil"),
  "+": numFn("+", (...args) => args.reduce((acc, i) => acc + i, 0)),
  "-": numFn("-", (...nums) => {
    if (nums.length > 1) {
      return nums.reduce((a: number, b: number): number => a - b);
    } else {
      return nums.reduce((a, b) => a - b, 0);
    }
  }),
  "*": numFn("*", (...args) => args.reduce((a, b) => a * b, 1)),
  "/": numFn("/", (...args) => args.reduce((a, b) => a / b)),
  "<": numCmpFn("<", (a, b) => a < b),
  "<=": numCmpFn("<=", (a, b) => a <= b),
  ">": numCmpFn(">", (a, b) => a > b),
  ">=": numCmpFn(">=", (a, b) => a >= b),
  "=": (...args) => {
    if (args.length < 2) {
      throw new EvalError(
        `= expects at least two arguments, got ${args.length}`
      );
    }

    const result = args.reduce(
      (result, item, idx) => result && equals(item, args[idx + 1] ?? item),
      true
    );

    return symbolFromBoolean(result);
  },
  list: (...args: Expr[]) => args,
  "list?": compose(isList, symbolFromBoolean),
  "pr-str": printFunction(true),
  str: printFunction(false, false, ""),
  prn: printFunction(true, true),
  println: printFunction(false, true),
  not: unary("not", (x) => symbolFromBoolean(!toBoolean(x))),
  count: unary("count", count),
  "empty?": unary("count", (x) => symbolFromBoolean(count(x) === 0)),
});
