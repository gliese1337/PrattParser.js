export interface Token {
  type: string;
  text: string;
}

export interface ExprParser<T> {
  peek(d: number): Token | undefined;
  consume(expect?: string): Token;
  match(expect: string): boolean;
  parse(precedence: number): T;
}

export interface Parselet<T> {
  parse(parser: ExprParser<T>, token: Token, left?: T): T;
}

export interface PrefixParselet<T> extends Parselet<T> {
  parse(parser: ExprParser<T>, token: Token): T;
}

export interface XfixParselet<T> extends Parselet<T> {
  readonly precedence: number;
  parse(parser: ExprParser<T>, token: Token, left: T): T;
}