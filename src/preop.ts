import { Token, PrefixParselet, ExprParser } from './parselets';

export class PrefixUnaryParselet<T> implements PrefixParselet<T> {
  constructor(
    private cons: new(token: Token, right: T) => T,
    public readonly precedence: number
  ) { }

  parse(parser: ExprParser<T>, token: Token) {
    return new this.cons(token, parser.parse(this.precedence));
  }
}