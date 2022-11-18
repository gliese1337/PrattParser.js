const { PrattParser } = require('../dist');

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

const prefix_handler = (token, right) => ({
  toString() { return `(${token.text}${right})`; }
});

parser.prefix('+', Precedence.PREFIX, prefix_handler);
parser.prefix('-', Precedence.PREFIX, prefix_handler);
parser.prefix('~', Precedence.PREFIX, prefix_handler);
parser.prefix('!', Precedence.PREFIX, prefix_handler);

parser.postfix('!', Precedence.POSTFIX, (token, left) => ({
  toString() { return `(${left}!)`; }
}));

const infix_handler = (token, left, right) => ({
  toString() { return `(${left}${token.text}${right})`; }
});

parser.infix('+', Precedence.SUM, PrattParser.LEFT_ASSOC, infix_handler);
parser.infix('-', Precedence.SUM, PrattParser.LEFT_ASSOC, infix_handler);
parser.infix('*', Precedence.PRODUCT, PrattParser.LEFT_ASSOC, infix_handler);
parser.infix('/', Precedence.PRODUCT, PrattParser.LEFT_ASSOC, infix_handler);
parser.infix('^', Precedence.EXPONENT, PrattParser.RIGHT_ASSOC, infix_handler);
parser.infix(';', Precedence.STATEMENT, PrattParser.RIGHT_ASSOC, infix_handler);

parser.register('(', {
  parse(parser, _token) {
    const expr = parser.parse(0);
    parser.consume(')');
    return { toString() { return ''+expr; } };
  }
}, PrattParser.PREFIX);

parser.register('(', {
  precedence: Precedence.CALL,
  parse(parser, _token, left) {
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
  parse(parser, _token, left) {
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