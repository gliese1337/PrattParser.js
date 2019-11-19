import { Token, XfixParselet, ExprParser } from './parselets';

export class PostfixUnaryParselet<T> implements XfixParselet<T> {
  constructor(
    private cons: new(token: Token, left: T) => T,
    public readonly precedence: number,
  ) { }

  parse(_: ExprParser<T>, token: Token, left: T) {
    return new this.cons(token, left);
  }
}