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
}, true);

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
}, false);

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
}, true);

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
}, false);

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
}, false);

parser.register('+', new PrefixUnaryParselet(function(token, right) { 
  return {
    right,
    toString() {
      return `(+${right})`;
    }
  }
}, Precedence.PREFIX), true);

parser.register('-', new PrefixUnaryParselet(function(token, right) { 
  return {
    right,
    toString() {
      return `(-${right})`;
    }
  }
}, Precedence.PREFIX), true);

parser.register('~', new PrefixUnaryParselet(function(token, right) { 
  return {
    right,
    toString() {
      return `(~${right})`;
    }
  }
}, Precedence.PREFIX), true);

parser.register('!', new PrefixUnaryParselet(function(token, right) { 
  return {
    right,
    toString() {
      return `(!${right})`;
    }
  }
}, Precedence.PREFIX), true);
    
// For kicks, we'll make "!" both prefix and postfix, kind of like ++.
parser.register('!', new PostfixUnaryParselet(function(token, left) { 
  return {
    left,
    toString() {
      return `(${left}!)`;
    }
  }
}, Precedence.POSTFIX), false);

parser.register('+', new BinaryParselet(function(token, left, right) { 
  return {
    left, right,
    toString() {
      return `(${left}+${right})`;
    }
  }
}, Precedence.SUM, "left"), false);

parser.register('-', new BinaryParselet(function(token, left, right) { 
  return {
    left, right,
    toString() {
      return `(${left}-${right})`;
    }
  }
}, Precedence.SUM, "left"), false);

parser.register('*', new BinaryParselet(function(token, left, right) { 
  return {
    left, right,
    toString() {
      return `(${left}*${right})`;
    }
  }
}, Precedence.PRODUCT, "left"), false);

parser.register('/', new BinaryParselet(function(token, left, right) { 
  return {
    left, right,
    toString() {
      return `(${left}/${right})`;
    }
  }
}, Precedence.PRODUCT, "left"), false);

parser.register('^', new BinaryParselet(function(token, left, right) { 
  return {
    left, right,
    toString() {
      return `(${left}^${right})`;
    }
  }
}, Precedence.EXPONENT, "right"), false);

const punctuation = "()-+=*^/~?!:,".split('');
function lex(str) {
  return str.split(' ').map(
    text => punctuation.indexOf(text) > -1
      ? { type: text, text }
      : { type: "NAME", text }
  );
}

module.exports = str => parser.parse(lex(str));