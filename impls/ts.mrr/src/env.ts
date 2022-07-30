import { Expr } from "./types";
import { EvalError } from "./eval";
import { symbolToString } from "./core";

export default class Environment {
  private bindings: Map<symbol, Expr>;
  private parent: Environment | undefined;

  constructor(bindings: Record<string, Expr> = {}) {
    this.bindings = new Map(
      Array.from(Object.entries(bindings).map(([k, v]) => [Symbol.for(k), v]))
    );
  }

  set<T extends Expr>(sym: symbol, value: T): T {
    this.bindings.set(sym, value);
    return value;
  }

  get(sym: symbol): Expr {
    const value = this.bindings.get(sym) ?? this.parent?.get(sym);

    if (typeof value === "undefined") {
      throw new EvalError(`variable ${symbolToString(sym)} not found`);
    }

    return value;
  }

  extend(): Environment {
    const child = new Environment();
    child.parent = this;
    return child;
  }
}
