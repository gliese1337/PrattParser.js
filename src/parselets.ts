export interface Token {
  type: string;
}

export interface ExprParser<N, T extends Token> {
  peek(d: number): Token | undefined;
  consume(expect?: string): T;
  match(expect: string): boolean;
  parse(precedence: number): N;
}

export interface Parselet<N, T extends Token> {
  parse(parser: ExprParser<N, T>, token: T, left?: N): N;
}

export class PrefixParselet<N, T extends Token> implements Parselet<N, T> {
  constructor(public readonly parse: (parser: ExprParser<N, T>, token: T) => N) {}
}

export interface IXfixParselet<N, T extends Token> extends Parselet<N, T> {
  readonly precedence: number;
  parse(parser: ExprParser<N, T>, token: T, left: N): N;
}

export class XfixParselet<N, T extends Token> implements Parselet<N, T> {
  constructor(
    public readonly parse: (parser: ExprParser<N, T>, token: T, left: N) => N,
    public readonly precedence: number,
  ) {}
}

export class PrefixUnaryParselet<N, T extends Token> extends PrefixParselet<N, T> {
  constructor(cons: (token: T, right: N) => N, precedence: number) {
    super((parser: ExprParser<N, T>, token: T) => cons.call(this, token, parser.parse(precedence)));
  }
}

export class PostfixUnaryParselet<N, T extends Token> extends XfixParselet<N, T> {
  constructor(
    cons: (token: T, left: N) => N,
    precedence: number,
  ) {
    super(
      (_: ExprParser<N, T>, token: T, left: N) => cons.call(this, token, left),
      precedence,
    )
  }
}

export class BinaryParselet<N, T extends Token> extends XfixParselet<N, T> {
  constructor(
    cons: (token: T, left: N, right: N) => N,
    precedence: number,
    associativity: boolean,
  ) {
    super((parser: ExprParser<N, T>, token: T, left: N) => {
      const right = parser.parse(this.precedence - (associativity?1:0));
      return cons.call(this, token, left, right);
    }, precedence);
  }
}