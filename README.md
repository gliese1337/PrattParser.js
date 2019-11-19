Pratt-Expr
============

A generic, configurable Top-Down Operator Precedence [Pratt Expression Parser](https://en.wikipedia.org/wiki/Pratt_parser) library for node and the browser.

We provide the infrastructure to parse a token stream based on a grammar, you provide the grammar to parse the token stream with.

Basic Usage
-----------

```
const { PrattParser } = require('pratt-expr');

const parser = new PrattParser();

/ * Define Your Grammar */

const tokens = /* Get a token stream */

const AST = parser.parse(tokens);
```

The token stream must be an iterable object yielding objects conforming to the `Token` interface:
```
interface Token {
    type: string;
    text: string;
}
```

The parser has no idea how to turn strings into token streams; your lexical grammar is your responsibility. We just handle the parsing.

Defining the Grammar
--------------------

The grammar is defined by registering *parselets*--bits of code that know how to parse a single syntactic production. Parselets come in two types: Prefix parselets, which handle expressions that start with a terminal token and encode prefix and circumfix operators, and Xfix parselets, which handle all other productions, encoding infix, postfix, and mixfix operators.

Prefix parselets are objects with a single `parse` method with the signature `Parselet.parse<T>(parse: ExprParser<T>, token: Token): T`. The first argument is a an object that allows calling back into the parser framework to check on the current parsing state and/or acquire following subexpressions. `ExprParser` conforms to the following interface:

```
interface ExprParser<T> {
  peek(d: number): Token | undefined;
  consume(expect?: string): Token;
  match(expect: string): boolean;
  parse(precedence: number): T;
}
```

* `peek(d: number)` looks ahead `d` tokens in the input stream without consuming any tokens.
* `consume(expect?: string)` pulls the next token off the front of the input stream and returns it. If you provide an argument, `consume` will check that the next token matches the expected token type string, and will throw an error otherwise.
* `match(expect: string)` takes a mandatory expected token type, and tells you whether or not the next token matches it, without consuming it.
* `parse(precedence: number)` consumes the input token stream up until it finds an operator with precedence lower than the provided `precedence` argument, and returns the resulting subexpression.

Prefix parselets are registered with the parser by calling the method `parser.register(tokenType: string, parselet: PrefixParselet<T>, prefix: true): void`. The `PrattParser` class provides a static property `PrattParser.PREFIX` so as to avoid a bare, non-self-documenting boolean literal in your code. For example, the following code registers a parselet to recognized matched parentheses:

```
parser.register('(', {
  parse(parser, token) {
    const expr = parser.parse(0);
    parser.consume(')');
    return new ParenExpr(expr);
  }
}, PrattParser.PREFIX);
```

The library also exports a helper class, `PrefixUnaryParselet` to handle the common case of a prefix operator that takes a single following argument. It has the following signatrure:

`new PrefixUnaryParselet<T>(constructor: (token: Token, right: T) => T, precedence: number)`

Now, you might be wondering why parselets are implemented as objects with a single method, rather than just as first-class functions. Well, it's because Xfix parselets actually require additional fields:

```
interface XfixParselet<T> {
  readonly precedence: number;
  parse(parser: ExprParser<T>, token: Token, left: T): T;
}
```

Note that the `parse` method now takes an additional argument for the preceding subexpression, and there is an added `precedence` field. Prefix parselets *can* provide a `precedence` field as well, but for Xfix parselets it is mandatory; this is because the precedence of a Prefix parselet only matters when the parselet passes a precedence value back into the framework, via `ExprParser.parse(precedence)`. The parser framework, however, need to be able to check the precedence values of Xfix parselets at will. Xfix parselets are registered by calling `parser.register(tokenType: string, parselet: XfixParselet<T>, prefix: false): void`. Again, a `PrattParser.XFIX` property is provided to avoid bare boolean constants. For example, the following code registers a parselet that recognized ternary conditional operators:

```
parser.register('?', {
  precedence: /* whatever you want */,
  parse(parser, token, left) {
    const thenArm = parser.parse(0);
    parser.consume(':');
    const elseArm = parser.parse(this.precedence - 1);
    return new ConditionalExpr(cond, thenArm, elseArm);
  }
}, PrattParser.XFIX);
```

The library also provides the following helper classes for the common cases of unary postfix operators and binary infix operators:

* `new PostfixUnaryParselet<T>(constructor: (token: Token, left: T) => T, precedence: number)`
* `new BinaryParselet<T>(constructor: (token: Token, left: T, right: T) => T, precedence: number, associativity: BinaryParselet.LEFT_ASSOC | BinaryParselet.RIGHT_ASSOC)`

Interpretation
--------------

Perhaps you don't want to have to keep a full abstract syntax tree in memort at once; or maybe you just want to do some post-processing on individual nodes before returning the final tree. Either way, we've got you covered. Passing a callback function to `setInterpreter<T>(i: ((node: T) => T) | null)` will register a function that can be run on every expression generated during parsing, in a bottom-up fashion. That way, you can do constant folding, or one-pass compilation, or full on direct interpretation concurrent with parsing. Afterwards, you can call `parser.interpret(tokens: Iterable<Token>)`, rather than `parse`, to perform a parse with your custom interpreter function run on every AST node. If you do not set an interpreter callback, or you later pass in `null` to unset it, any calls to `interpret` will behave identically to calls to `parse`.

TODO
====

Although there will be some efficiency trade-offs, it would be nice to have to option to auto-generate parselets based on user-provided grammar rules.