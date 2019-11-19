import { Token, Parselet, PrefixParselet, XfixParselet, ExprParser } from './parselets';

export { Token, Parselet, PrefixParselet, XfixParselet, ExprParser };
export { BinaryParselet } from './binop';
export { PrefixUnaryParselet } from './preop';
export { PostfixUnaryParselet } from './postop';

class XParser<T> implements ExprParser<T> {
  private g: Iterator<Token>;
  private q: Token[] = [];

  constructor(
    private prefixParselets: Map<string, PrefixParselet<T>>,
    private xfixParselets:  Map<string, XfixParselet<T>>,
    private interpreter: ((node: T) => T) | null,
    tokens: Iterable<Token>,
  ) {
    this.g = tokens[Symbol.iterator]();
  }

  peek(d: number): Token | undefined {
    while(d >= this.q.length) {
      this.q.push(this.g.next().value);
    }
    return this.q[d];
  }

  consume(expect?: string): Token {
    const t = this.q.length ? this.q.shift() : this.g.next().value;

    if (expect) {
      if (!t) throw new Error(`Unexpected end of input; expected ${ expect }.`);
      if (t.type !== expect) throw new Error(`Unexpected ${ t.type } token; expected ${ expect }.`);
    } else {
      if (!t) throw new Error(`Unexpected end of input.`);
    }

    return t;
  }

  match(expect: string): boolean {
    const t = this.peek(0);

    if (!t || t.type !== expect) return false;

    this.q.shift();

    return true;
  }

  private get precedence() {
    const next = this.peek(0);
    if (!next) return 0;
    const parser = this.xfixParselets.get(next.type);
    if (!parser) return 0;
    
    return parser.precedence;
  }

  parse(precedence: number) {
    const token = this.consume();
    const prefix = this.prefixParselets.get(token.type);

    if (!prefix) throw new Error(`Could not parse "${ token.text }".`);

    let left = prefix.parse(this, token);

    const { interpreter: interp } = this;
    if (interp === null) {
      while(precedence < this.precedence) {
        const token = this.consume();
        const xfix = this.xfixParselets.get(token.type);
        if (!xfix) throw new Error(`Could not parse "${ token.text }".`);
        left = xfix.parse(this, token, left);
      }
    } else {
      left = interp(left);
      
      while(precedence < this.precedence) {
        const token = this.consume();
        const xfix = this.xfixParselets.get(token.type);
        if (!xfix) throw new Error(`Could not parse "${ token.text }".`);
        left = interp(xfix.parse(this, token, left));
      }
    }

    return left;
  }
}

export class PrattParser<T> {
  private prefixParselets = new Map<string, PrefixParselet<T>>();
  private xfixParselets = new Map<string, XfixParselet<T>>();
  private interpreter: ((node: T) => T) | null = null;

  public register(tokenType: string, parselet: PrefixParselet<T>, prefix: true): void;
  public register(tokenType: string, parselet: XfixParselet<T>, prefix: false): void;
  public register(tokenType: string, parselet: Parselet<T>, prefix: boolean) {
    (prefix ? this.prefixParselets : this.xfixParselets).set(tokenType, parselet as any)
  }

  public setInterpreter(i: ((node: T) => T) | null){
    this.interpreter = i;
  }

  public parse(tokens: Iterable<Token>) {
    return (new XParser(this.prefixParselets, this.xfixParselets, null, tokens)).parse(0);
  }

  public interpret(tokens: Iterable<Token>) {
    return (new XParser(this.prefixParselets, this.xfixParselets, this.interpreter, tokens)).parse(0);
  }
}