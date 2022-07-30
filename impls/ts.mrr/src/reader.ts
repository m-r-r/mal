import { Atom, Collection, Expr, Vector } from "./types";

type ListTokenKind = "open" | "close";
type ListDelimiterKind = "parentheses" | "braces" | "brackets";

type TokenValue =
  | {
      kind: "number";
      value: number;
    }
  | {
      kind: "string" | "symbol" | "special";
      value: string;
    }
  | {
      kind: ListTokenKind;
      value: ListDelimiterKind;
    }
  | {
      kind: "end";
      value: null;
    };

export type Token = TokenValue & { pos: number; raw: string };

const SPECIAL_SYNTAX: Record<string, [string, number]> = {
  "'": ["quote", 1],
  "`": ["quasiquote", 1],
  "~": ["unquote", 1],
  "~@": ["splice-unquote", 1],
  "@": ["deref", 1],
  "^": ["with-meta", -2],
};

const REGEXES = {
  WS: /^[\s,]*$/,
  STRING: /^"(?:\\.|[^\\"])*"$/,
  NUMBER: /^-?\d+$/,
  COMMENT: /^;.*$/,
  NON_SPECIAl_CHAR: /^[^\s\[\]{}('"`,;)]*$/,
  SPECIAL_CHAR: new RegExp(`^[${Object.keys(SPECIAL_SYNTAX).join("")}]+$`),
};

const LIST_DELIMITERS: Record<string, [ListTokenKind, ListDelimiterKind]> = {
  "(": ["open", "parentheses"],
  ")": ["close", "parentheses"],
  "{": ["open", "braces"],
  "}": ["close", "braces"],
  "[": ["open", "brackets"],
  "]": ["close", "brackets"],
};

function* tokenize(input: string): Generator<Token> {
  const tokenRe =
    /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s\[\]{}('"`,;)]*)/g;

  do {
    const match = tokenRe.exec(input);
    if (match === null || match.index === tokenRe.lastIndex) {
      yield {
        kind: "end",
        value: null,
        pos: input.length,
        raw: "",
      };
      return;
    }
    const pos = tokenRe.lastIndex;
    const text = match[1]!.trim();

    // Skip whitespaces and comments
    if (REGEXES.WS.test(text) || REGEXES.COMMENT.test(text)) {
      continue;
    }

    switch (true) {
      case REGEXES.NUMBER.test(text): {
        const value = parseFloat(text);
        if (Number.isNaN(value)) {
          throw new ReadError(pos, `invalid number`);
        }
        yield {
          kind: "number",
          value,
          pos,
          raw: text,
        };
        break;
      }

      case REGEXES.STRING.test(text): {
        yield {
          kind: "string",
          value: text
            .slice(1, -1)
            .replace(/(?<!\\)\\n/g, "\n")
            .replace(/\\([\\"])/g, "$1"),
          pos,
          raw: text,
        };
        break;
      }

      case typeof LIST_DELIMITERS[text] !== "undefined": {
        yield {
          kind: LIST_DELIMITERS[text]![0],
          value: LIST_DELIMITERS[text]![1],
          pos,
          raw: text,
        };
        break;
      }

      case REGEXES.SPECIAL_CHAR.test(text): {
        yield {
          kind: "special",
          value: text,
          pos,
          raw: text,
        };
        break;
      }

      case REGEXES.NON_SPECIAl_CHAR.test(text): {
        yield {
          kind: "symbol",
          value: text,
          pos,
          raw: text,
        };
        break;
      }

      default: {
        throw new ReadError(pos, `Unexpected end of input`);
      }
    }
  } while (true);
}

export class ReadError extends Error {
  constructor(pos: number, msg: string) {
    super(`${msg} at position ${pos}`);
  }
}

class Reader {
  constructor(private input: string) {
    this.tokens = tokenize(input);
    this.next();
    this.value = this.peek();
  }

  private tokens: Generator<Token>;
  private value: Token;
  private done: boolean = false;

  public next(): Token {
    const result = this.tokens.next();

    if (typeof result.value !== "undefined") {
      this.value = result.value;
    } else {
      this.done = true;
    }
    return this.value;
  }

  public peek(): Token {
    if (typeof this.value === "undefined") {
      throw new TypeError();
    }
    return this.value;
  }

  public get pos(): number {
    return this.value?.pos ?? (this.done ? this.input.length : 0);
  }

  private readAtom(): Atom {
    const token = this.peek();
    switch (token?.kind) {
      case "number":
      case "string":
        return token.value;

      case "symbol":
        return Symbol.for(token.value);
      default:
        throw new ReadError(
          token.pos,
          `Unexpected token ${formatToken(token)}`
        );
    }
  }

  private readCollection(): Collection {
    const firstToken = this.peek();

    if (firstToken.kind !== "open") {
      throw new ReadError(
        this.pos,
        `Expected tokens '(', '{' or '[' ; got ${formatToken(firstToken)}`
      );
    }

    let items: Expr[] = [];

    for (let token; (token = this.next()); ) {
      if (token.kind === "close") {
        if (token.value !== firstToken.value) {
          const expected = getExpectedClosingDelimiter(firstToken.value);
          throw new ReadError(
            token.pos,
            `Unbalenced ${
              firstToken.value
            } : expected ${expected}, got ${formatToken(token)}`
          );
        }
        break;
      } else if (token.kind === "end") {
        const expected = getExpectedClosingDelimiter(firstToken.value);
        throw new ReadError(
          token.pos,
          `Expected ${expected}, got ${formatToken(token)}`
        );
      }

      items.push(this.readExpression());
    }

    if (firstToken.value === "brackets") {
      return Vector.from(items);
    } else if (firstToken.value === "braces") {
      const map = new Map<Expr, Expr>();

      items.forEach((item, i) => {
        if (i % 2 === 0) {
          map.set(item, items[i + 1] ?? Symbol.for("nil"));
        }
      });

      return map;
    } else {
      return items;
    }
  }

  private readSpecial(): Expr {
    const token = this.peek();
    if (token.kind !== "special") {
      throw new TypeError(`Invalid token ${token.kind}`);
    }
    this.next();

    const desc = SPECIAL_SYNTAX[token.value];
    if (!desc) {
      throw new ReadError(token.pos, `Unsupported syntax ${token.value}`);
    }
    const [form, arity] = desc;
    const operands = [];

    for (let i = 0; i < Math.abs(arity); i++) {
      if (i !== 0) {
        this.next();
      }
      operands.push(this.readExpression());
    }

    if (Math.sign(arity) === -1) {
      operands.reverse();
    }

    return [Symbol.for(form), ...operands];
  }

  private readExpression(): Expr {
    const token = this.peek();

    if (token.kind === "open") {
      return this.readCollection();
    } else if (token.kind === "special") {
      return this.readSpecial();
    } else {
      return this.readAtom();
    }
  }

  public read(): Expr {
    const expr = this.readExpression();
    const token = this.next();

    if (token && token.kind !== "end") {
      throw new ReadError(
        token.pos,
        `Expexted end of input, got ${formatToken(token)}`
      );
    }

    return expr;
  }
}

function getExpectedClosingDelimiter(kind: ListDelimiterKind): string {
  return (
    Object.entries(LIST_DELIMITERS).find(
      ([_, [tokenKind, delimKind]]) =>
        delimKind === kind && tokenKind === "close"
    )?.[0] ?? "closing delimiter"
  );
}

function formatToken(token: Token | undefined): string {
  if (!token || token.kind === "end") {
    return "end of input";
  } else if (token.kind === "close" || token.kind === "open") {
    return (
      Object.entries(LIST_DELIMITERS).find(
        ([_, [tokenKind, delimKind]]) =>
          delimKind === token.value && tokenKind === token.kind
      )?.[0] ?? token.kind
    );
  } else {
    return String(token.value);
  }
}

export default function read(input: string): Expr {
  return new Reader(input).read();
}
