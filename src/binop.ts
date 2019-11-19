import { Token, XfixParselet, ExprParser } from './parselets';

export class BinaryParselet<T> implements XfixParselet<T> {
  private isRight: boolean;

  public static readonly RIGHT_ASSOC = true;
  public static readonly LEFT_ASSOC = false;

  constructor(
    private cons: (token: Token, left: T, right: T) => T,
    public readonly precedence: number,
    associativity: boolean,
  ) {
    this.isRight = associativity;
  }

  parse(parser: ExprParser<T>, token: Token, left: T) {
    const right = parser.parse(this.precedence - (this.isRight?1:0));
    return this.cons(token, left, right);
  }
}