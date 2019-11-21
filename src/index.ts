import {
  Token,
  Parselet,
  PrefixParselet,
  XfixParselet,
  IXfixParselet,
  PrefixUnaryParselet,
  PostfixUnaryParselet,
  BinaryParselet,
  ExprParser,
} from './parselets';

export {
  Token,
  Parselet,
  PrefixParselet,
  XfixParselet,
  IXfixParselet,
  PrefixUnaryParselet,
  PostfixUnaryParselet,
  BinaryParselet,
  ExprParser,
}

class XParser<N, T extends Token> implements ExprParser<N, T> {
  private g: Iterator<T>;
  private q: T[] = [];

  constructor(
    private prefixParselets: Map<string, PrefixParselet<N, T>>,
    private xfixParselets:  Map<string, XfixParselet<N, T>>,
    private interpreter: ((node: N) => N) | null,
    tokens: Iterable<T>,
  ) {
    this.g = tokens[Symbol.iterator]();
  }

  peek(d: number): T | undefined {
    while(d >= this.q.length) {
      this.q.push(this.g.next().value);
    }
    return this.q[d];
  }

  consume(expect?: string): T {
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

    if (!prefix) throw token;

    let left = prefix.parse(this, token);

    const { interpreter: interp } = this;
    if (interp === null) {
      while(precedence < this.precedence) {
        const token = this.consume();
        const xfix = this.xfixParselets.get(token.type);
        if (!xfix) throw token;
        left = xfix.parse(this, token, left);
      }
    } else {
      left = interp(left);
      
      while(precedence < this.precedence) {
        const token = this.consume();
        const xfix = this.xfixParselets.get(token.type);
        if (!xfix) throw token;
        left = interp(xfix.parse(this, token, left));
      }
    }

    return left;
  }
}

export class PrattParser<N, T extends Token> {
  private prefixParselets = new Map<string, Parselet<N, T>>();
  private xfixParselets = new Map<string, IXfixParselet<N, T>>();
  private interpreter: ((node: N) => N) | null = null;

  public static readonly PREFIX = true;
  public static readonly XFIX = false;
  
  public static readonly RIGHT_ASSOC = true;
  public static readonly LEFT_ASSOC = false;

  public register(tokenType: string, parselet: Parselet<N, T>, prefix?: boolean) {
    if (prefix === void 0) {
      if (parselet instanceof PrefixParselet) {
        this.prefixParselets.set(tokenType, parselet);
      } else if (parselet instanceof XfixParselet) {
        this.xfixParselets.set(tokenType, parselet);
      } else {
        throw new Error("Cannot determine parselet type.");
      }
      return;
    }

    if (prefix) {
      this.prefixParselets.set(tokenType, parselet);
    } else{
      if (parselet.hasOwnProperty('precedence')) {
        this.xfixParselets.set(tokenType, parselet as IXfixParselet<N, T>);
      } else {
        throw new Error("Xfix operators must specify precedence");
      }
    }
  }

  public nullary(tokenType: string, cons: (token: T) => N) {
    this.register(tokenType, { parse: (_, token) => cons(token) }, true);
  }

  public prefix(tokenType: string, precedence: number, cons: (token: T, right: N) => N) {
      this.register(tokenType, new PrefixUnaryParselet(cons, precedence));
  }

  public postfix(tokenType: string, precedence: number, cons: (token: T, left: N) => N) {
      this.register(tokenType, new PostfixUnaryParselet(cons, precedence));
  }

  public infix(tokenType: string, precedence: number, associativity: boolean, cons: (token: T, left: N, right: N) => N) {
      this.register(tokenType, new BinaryParselet(cons, precedence, associativity));
  }

  public setInterpreter(i: ((node: N) => N) | null){
    this.interpreter = i;
  }

  public parse(tokens: Iterable<T>) {
    return (new XParser(this.prefixParselets, this.xfixParselets, null, tokens)).parse(0);
  }

  public interpret(tokens: Iterable<T>) {
    return (new XParser(this.prefixParselets, this.xfixParselets, this.interpreter, tokens)).parse(0);
  }
}