import type { default as EnvironmentT } from "./env";
export type Environment = EnvironmentT;

export type Atom = symbol | string | number;

export type List = Expr[];
export type Collection = List | Map<Expr, Expr> | Vector;
export type Expr = Atom | Collection | Closure;
export type Closure = (...args: Expr[]) => Expr;
export type SpecialForm = (env: Environment, ...args: Expr[]) => Expr;

export class Vector extends Array<Expr> {}
