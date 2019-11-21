const { PrattParser, PrefixUnaryParselet, PostfixUnaryParselet, BinaryParselet } = require('../dist');

const parser = new PrattParser();

const Precedence = {
  // Ordered in increasing precedence.
  STATEMENT  : 1,
  ASSIGNMENT : 2,
  CONDITIONAL: 3,
  SUM        : 4,
  PRODUCT    : 5,
  EXPONENT   : 6,
  PREFIX     : 7,
  POSTFIX    : 8,
  CALL       : 9,
};

parser.nullary('NAME', (token) => ({
  name: token.text,
  toString() { return this.name; },
}));

parser.infix('=', Precedence.ASSIGNMENT, PrattParser.RIGHT_ASSOC, (token, left, right) => {
  if (!left.hasOwnProperty('name'))
    throw new Error("The left-hand side of an assignment must be a name.");
  return { toString(){ return `(${left}=${right})`; },
  };
});

parser.prefix('+', Precedence.PREFIX, (token, right) => ({
  toString() { return `(+${right})`; }
}));

parser.prefix('-', Precedence.PREFIX, (token, right) => ({
  toString() { return `(-${right})`; }
}));

parser.prefix('~', Precedence.PREFIX, (token, right) => ({
  toString() { return `(~${right})`; }
}));

parser.prefix('!', Precedence.PREFIX, (token, right) => ({
  toString() { return `(!${right})`; }
}));

parser.postfix('!', Precedence.POSTFIX, (token, left) => ({
  toString() { return `(${left}!)`; }
}));

parser.infix('+', Precedence.SUM, PrattParser.LEFT_ASSOC, (token, left, right) => ({
  toString() { return `(${left}+${right})`; }
}));

parser.infix('-', Precedence.SUM, PrattParser.LEFT_ASSOC, (token, left, right) => ({
  toString() { return `(${left}-${right})`; }
}));

parser.infix('*', Precedence.PRODUCT, PrattParser.LEFT_ASSOC, (token, left, right) => ({
  toString() { return `(${left}*${right})`; }
}));

parser.infix('/', Precedence.PRODUCT, PrattParser.LEFT_ASSOC, (token, left, right) => ({
  toString() { return `(${left}/${right})`; }
}));

parser.infix('^', Precedence.EXPONENT, PrattParser.RIGHT_ASSOC, (token, left, right) => ({
  toString() { return `(${left}^${right})`; }
}));

parser.infix(';', Precedence.STATEMENT, PrattParser.RIGHT_ASSOC, (token, left, right) => ({
  toString() { return `(${left};${right})`; }
}));

parser.register('(', {
  parse(parser, token) {
    const expr = parser.parse(0);
    parser.consume(')');
    return { toString() { return ''+expr; } };
  }
}, PrattParser.PREFIX);

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

    return { toString() { return `${left}(${args.join(',')})`; } };
  }
}, PrattParser.XFIX);

parser.register('?', {
  precedence: Precedence.CONDITIONAL,
  parse(parser, token, left) {
    const thenArm = parser.parse(0);
    parser.consume(':');
    const elseArm = parser.parse(this.precedence - 1);
    
    return { toString() { return `(${left}?${thenArm}:${elseArm})`; } };
  }
}, PrattParser.XFIX);

const punctuation = "()-+=*^/~?!:;,".split('');
function lex(str) {
  return str.split(' ').map(
    text => punctuation.indexOf(text) > -1
      ? { type: text, text }
      : { type: "NAME", text }
  );
}

module.exports = str => parser.parse(lex(str));