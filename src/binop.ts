import { Token, XfixParselet, ExprParser } from './parselets';

export class BinaryParselet<T> implements XfixParselet<T> {
  private isRight: boolean;
  constructor(
    private cons: new(token: Token, left: T, right: T) => T,
    public readonly precedence: number,
    associativity: "right" | "left",
  ) {
    this.isRight = associativity === "right";
  }

  parse(parser: ExprParser<T>, token: Token, left: T) {
    const right = parser.parse(this.precedence - (this.isRight?1:0));
    return new this.cons(token, left, right);
  }
}