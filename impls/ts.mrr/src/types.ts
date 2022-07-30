export type Atom = symbol | string | number;

export type List = Expr[];
export type Collection = List | Map<Expr, Expr> | Vector;
export type Expr = Atom | Collection;

export class Vector extends Array<Expr> {}
