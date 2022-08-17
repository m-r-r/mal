import type { default as EnvironmentT } from "./env";
export type Environment = EnvironmentT;

export type Atom = symbol | string | number;

export type List = Expr[];
export type Collection = List | Map<Expr, Expr> | Vector;
export type Expr = Atom | Collection | Closure;
export type TailCall = { env: Environment, body: Expr };
export type Closure = { args: Expr[], env: Environment, body: Expr };
export type SpecialForm = (env: Environment, ...args: Expr[]) => Expr | TailCall;

export class Vector extends Array<Expr> {}
