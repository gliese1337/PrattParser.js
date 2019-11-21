Pratt-Expr
============

A generic, configurable Top-Down Operator Precedence [Pratt Expression Parser](https://en.wikipedia.org/wiki/Pratt_parser) library for node and the browser.

We provide the infrastructure to parse a token stream based on a grammar, you provide the grammar to parse the token stream with.

Basic Usage
-----------

```js
const { PrattParser } = require('pratt-expr');

const parser = new PrattParser();

/* Define Your Grammar */

const tokens = /* Get a token stream */

const AST = parser.parse(tokens);
```

The token stream must be an iterable object yielding objects conforming to the `Token` interface:

```ts
interface Token {
  type: string;
}
```

Any other fields may be added for your convenience. E.g., if you get your tokens from `perplex`, they will have additional `match: string`, `start: number`, and `end: number` fields, useful for error reporting and interpreting literal values (for token types that correspond to more than one textual string);

Upon finding a token that it cannot associate with a value or operator, `parser.parse(tokens)` will `throw` the offending token, allowing you to make use any auxiliary fields for error reporting or recovery purposes.

The parser itself has no idea how to turn strings into token streams; your lexical grammar is your responsibility. We just handle the parsing.

Defining the Grammar
--------------------

To cover the most common, simple cases of prefix, postfix, and binary infix operators, `PrattParser<N, T extends Token>` instances have the following helper methods:

* `parser.prefix(tokenType: string, precedence: number, cons: (token: T, right: N) => N): void`
* `parser.postfix(tokenType: string, precedence: number, cons: (token: T, left: N) => N): void`
* `parser.infix(tokenType: string, precedence: number, associativity: boolean, cons: (token: T, left: N, right: N) => N): void`

For infix operators, `associativity` is `true` for right-associative operators and `false` for left-associative operators. To avoid the use of potentially-confusing unlabelled boolean arguments in code, the `PrattParser` class provides static `PrattParser.LEFT_ASSOC` and `PrattParser.RIGHT_ASSOC` properties.

Each of these methods takes a `cons` (for "constructor") callback which, given a token and left and/or right expressions, returns a parsed value of user-defined type T. This gives you the flexibility to define your own custom AST node types, or return eagerly-interpreted values, or anything else you might want to do; the library does not tie you to a specific abstract syntax tree format. It is also possible to perform validation in the `cons` function; e.g., 

```js
parser.infix('=', 2, PrattParser.RIGHT_ASSOC, (token, left, right) => {
  if (left.type !== 'name')
    throw new Error("The left-hand side of an assignment must be a name.");
  return new AssignmentExpr(left, right)
});
```

There is also a special method for registering *nullary* operators--i.e., terminal symbols representing values that don't require any syntactic asrguments:

* `parser.nullary(tokenType: string, cons: (token: T) => N): void`

Under the hood, the grammar is defined by registering *parselets*--bits of code that know how to parse a single syntactic production. Parselets come in two types: Prefix parselets, which handle expressions that start with a terminal token and encode prefix and circumfix operators, and Xfix parselets, which handle all other productions, encoding infix, postfix, and mixfix operators. If you need to encode a grammar that's a little more complicated than a simple collection of unary prefix, unary postfix, and binary infix operators, the library gives the ability to construct these parselets directly.

Prefix parselets are objects with a single `parse` method with the signature `Parselet.parse<N, T>(parser: ExprParser<N, T>, token: T): N`. Xfix parselets conform to the slightly larger interface

```ts
export interface IXfixParselet<N, T extends Token> extends Parselet<N, T> {
  readonly precedence: number;
  parse(parser: ExprParser<N, T>, token: T, left: N): N;
}
```

Note the added `precedence` field and additional `left` argument to the `parse` method. Prefix parselets *may* provide a precedence value, but are not required to, as the only place that the precedence value would be used is inside their own `parse` implementations. The framework, however, requires the ability to inspect the precedence of Xfix parselets at will. These interface are minimally implemented by the types `PrefixParselet<T>` and `XfixParselet<T>`, with the following constructors:

* `new PrefixParselet<N, T extends Token>(parse: (parser: ExprParser<N, T>, token: T) => N)`
* `new XfixParselet<N, T extends Token>(parse: (parser: ExprParser<N, T>, token: T, left: N) => N, precedence: number)`

The first argument to `parse` in either case is an object that allows calling back into the parser framework to check on the current parsing state and/or acquire following subexpressions. `ExprParser` conforms to the following interface:

```ts
interface ExprParser<N, T extends Token> {
  peek(d: number): T | undefined;
  consume(expect?: string): T;
  match(expect: string): boolean;
  parse(precedence: number): N;
}
```

* `peek(d: number)` looks ahead `d` tokens in the input stream without consuming any tokens.
* `consume(expect?: string)` pulls the next token off the front of the input stream and returns it. If you provide an argument, `consume` will check that the next token matches the expected token type string, and will throw an error otherwise.
* `match(expect: string)` takes a mandatory expected token type, and tells you whether or not the next token matches it, without consuming it.
* `parse(precedence: number)` consumes the input token stream up until it finds an operator with precedence lower than the provided `precedence` argument, and returns the resulting subexpression.

Parselets are registered with a `PrattParser` instance by calling the method

* `parser.register(tokenType: string, parselet: Parselet<T>): void`

For example, this code registers a parselet to handle circumfix parentheses:

```ts
parser.register('(', new PrefixParselet((parser, token) => {
  const expr = parser.parse(0);
  parser.consume(')');
  return new ParenExpr(expr);
}));
```

This code registers a parselet to handle infix ternary conditional operators:

```ts
parser.register('?', new XfixParselet((parser, token, left) => {
    const thenArm = parser.parse(0);
    parser.consume(':');
    const elseArm = parser.parse(Precedence.TERNARY - 1);
    return new ConditionalExpr(cond, thenArm, elseArm);
  }
}, Precedence.TERNARY));
```

The library also exports the following helper types:

* `new PrefixUnaryParselet<N, T extends Token>(cons: (token: T, right: N) => N, precedence: number)`
* `new PostfixUnaryParselet<N, T extends Token>(cons: (token: T, left: N) => N, precedence: number)`
* `new BinaryParselet<N, T extends Token>(cons: (token: T, left: N, right: N) => N, precedence: number, associativity: PrattParser.LEFT_ASSOC | PrattParser.RIGHT_ASSOC)`

These are the same types used internally to implement the `prefix`, `postfix` and `infix` shortcut methods.

Now, you might be wondering why parselets are implemented as objects with a single method, rather than just as first-class functions. Well, it's because Xfix parselets actually require additional fields:

It is also possible to provide your own custom parselets, which need not be instances of any of the library types. To handle these cases, an extended form of the `register` method is provided which allows explicitly indicating whether or not the provided object should be treated as a Prefix parselet:

* `parser.register(tokenType: string, parselet: Parselet<N, T>, prefix: true): void`

As with associativity, the `PrattParser` class provides static `PrattParser.PREFIX` and `PrattParser.XFIX` properties to avoid bare undocumented boolean values. This form can also sometimes result in clearer code. The ternary operator implementation using this extended form is as follows:

```ts
parser.register('?', {
  precedence: Precedence.TERNARY,
  parse(parser, token, left) {
    const thenArm = parser.parse(0);
    parser.consume(':');
    const elseArm = parser.parse(this.precedence - 1);
    return new ConditionalExpr(cond, thenArm, elseArm);
  }
}, PrattParser.XFIX);
```

For a slightly more complex example, involving parsing a variable number of argument expressions, consider the following implementations of an mixfix function call operator:

```ts
parser.register('(', new XfixParselet((parser, token, left) => {
  const args = [];
  // There may be no arguments at all.
  if (!parser.match(')')) {
    do {
      args.push(parser.parse(0));
    } while (parser.match(','));
    parser.consume(')');
  }

  return new CallExpr(left, args);
}, Precedence.CALL));

/* OR */
parser.register('(', {
  precedence: Precedence.CALL,
  parse(parser, token, left) {
    const args = [];
    // There may be no arguments at all.
    if (!parser.match(')')) {
      do {
        args.push(parser.parse(0));
      } while (parser.match(','));
      parser.consume(')');
    }

    return new CallExpr(left, args);
  }
}, PrattParser.XFIX);
```

Interpretation
--------------

Perhaps you don't want to have to keep a full abstract syntax tree in memort at once; or maybe you just want to do some post-processing on individual nodes before returning the final tree. Either way, we've got you covered. Passing a callback function to `setInterpreter<N>(i: ((node: N) => N) | null)` will register a function that can be run on every expression generated during parsing, in a bottom-up fashion. That way, you can do constant folding, or one-pass compilation, or full on direct interpretation concurrent with parsing. Afterwards, you can call `parser.interpret<T extends Token>(tokens: Iterable<T>)`, rather than `parse`, to perform a parse with your custom interpreter function run on every AST node. If you do not set an interpreter callback, or you later pass in `null` to unset it, any calls to `interpret` will behave identically to calls to `parse`.

On Generality
=============

Originally, Pratt parsing was developed for functional languages in which a whole program is a single expression, with no sequential statements. That might make one think that this kind of parsing framework is unsuitable for parsing the grammars of imperative programming languages, or anything that involves arbitrarily long lists. That could not be further from the truth! There are three available methods for handling sequential elements:

1. Make use of an explicit sequencing operator. E.g., `;` can be registered as an extremely low-precedence binary operator to parse sequential statements as a linked list of syntax nodes.
2. The same approach demonstrated above for parsing lists of function arguments can be extended to any list, including lists of statement-expressions.
3. If sequential expressions exist in the input token stream, `parse<T extends Token>(tokens: Iterable<T>)` can simply be called on the same token stream multiple times in a row.

TODO
====

Although there will be some efficiency trade-offs, it would be nice to have to option to auto-generate parselets based on user-provided grammar rules / operator-operand patterns.