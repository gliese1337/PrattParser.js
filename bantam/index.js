const { PrattParser, PrefixUnaryParselet, PostfixUnaryParselet, BinaryParselet } = require('../dist');

const parser = new PrattParser();

const Precedence = {
  // Ordered in increasing precedence.
  ASSIGNMENT : 1,
  CONDITIONAL: 2,
  SUM        : 3,
  PRODUCT    : 4,
  EXPONENT   : 5,
  PREFIX     : 6,
  POSTFIX    : 7,
  CALL       : 8,
};

parser.register('NAME', {
  parse(_, token) {
    return {
      name: token.text,
      toString() {
        return this.name;
      },
    };
  }
}, PrattParser.PREFIX);

parser.register('=', {
  precedence: Precedence.ASSIGNMENT,
  parse(parser, token, left) {
    const right = parser.parse(this.precedence - 1);
    if (!left.hasOwnProperty('name')) throw new Error("The left-hand side of an assignment must be a name.");
    return {
      left, right,
      toString(){
        return `(${this.left}=${this.right})`;
      },
    };
  }
}, PrattParser.XFIX);

parser.register('(', {
  parse(parser, token) {
    const expr = parser.parse(0);
    parser.consume(')');
    return {
      expr,
      toString() {
        return ''+this.expr;
      }
    };
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

    return {
      name: left,
      args,
      toString() {
        return `${ this.name }(${this.args.join(',')})`;
      },
    };
  }
}, PrattParser.XFIX);

parser.register('?', {
  precedence: Precedence.CONDITIONAL,
  parse(parser, token, left) {
    const thenArm = parser.parse(0);
    parser.consume(':');
    const elseArm = parser.parse(this.precedence - 1);
    
    return {
      cond: left,
      thenArm,
      elseArm,
      toString() {
        return `(${ this.cond }?${ this.thenArm }:${ this.elseArm })`;
      },
    };
  }
}, PrattParser.XFIX);

parser.register('+', new PrefixUnaryParselet((token, right) => { 
  return {
    right,
    toString() {
      return `(+${right})`;
    }
  }
}, Precedence.PREFIX), PrattParser.PREFIX);

parser.register('-', new PrefixUnaryParselet((token, right) => { 
  return {
    right,
    toString() {
      return `(-${right})`;
    }
  }
}, Precedence.PREFIX), PrattParser.PREFIX);

parser.register('~', new PrefixUnaryParselet((token, right) => { 
  return {
    right,
    toString() {
      return `(~${right})`;
    }
  }
}, Precedence.PREFIX), PrattParser.PREFIX);

parser.register('!', new PrefixUnaryParselet((token, right) => { 
  return {
    right,
    toString() {
      return `(!${right})`;
    }
  }
}, Precedence.PREFIX), PrattParser.PREFIX);
    
// For kicks, we'll make "!" both prefix and postfix, kind of like ++.
parser.register('!', new PostfixUnaryParselet((token, left) => { 
  return {
    left,
    toString() {
      return `(${left}!)`;
    }
  }
}, Precedence.POSTFIX), PrattParser.XFIX);

parser.register('+', new BinaryParselet((token, left, right) => { 
  return {
    left, right,
    toString() {
      return `(${left}+${right})`;
    }
  }
}, Precedence.SUM, BinaryParselet.LEFT_ASSOC), PrattParser.XFIX);

parser.register('-', new BinaryParselet((token, left, right) => { 
  return {
    left, right,
    toString() {
      return `(${left}-${right})`;
    }
  }
}, Precedence.SUM, BinaryParselet.LEFT_ASSOC), PrattParser.XFIX);

parser.register('*', new BinaryParselet((token, left, right) => { 
  return {
    left, right,
    toString() {
      return `(${left}*${right})`;
    }
  }
}, Precedence.PRODUCT, BinaryParselet.LEFT_ASSOC), PrattParser.XFIX);

parser.register('/', new BinaryParselet((token, left, right) => { 
  return {
    left, right,
    toString() {
      return `(${left}/${right})`;
    }
  }
}, Precedence.PRODUCT, BinaryParselet.LEFT_ASSOC), PrattParser.XFIX);

parser.register('^', new BinaryParselet((token, left, right) => { 
  return {
    left, right,
    toString() {
      return `(${left}^${right})`;
    }
  }
}, Precedence.EXPONENT, BinaryParselet.RIGHT_ASSOC), PrattParser.XFIX);

const punctuation = "()-+=*^/~?!:,".split('');
function lex(str) {
  return str.split(' ').map(
    text => punctuation.indexOf(text) > -1
      ? { type: text, text }
      : { type: "NAME", text }
  );
}

module.exports = str => parser.parse(lex(str));