const { expect } = require('chai');
const parse = require('../bantam');

function test(str) {
  return `${ parse(str) }`;
}

describe("Test Parser on Bantam Language", () => {
  it("should parse nested unary operators", () => {
    expect(test("~ ! - + a")).to.eql("(~(!(-(+a))))");
    expect(test("a ! ! !")).to.eql("(((a!)!)!)");
  });
  it("should parse binary operators with correct precedence", () => {
    expect(test("a = b + c * d ^ e - f / g")).to.eql("(a=((b+(c*(d^e)))-(f/g)))");
  });
  it("should parse binary operators with correct associativity", () => {
    expect(test("a = b = c")).to.eql("(a=(b=c))");
    expect(test("a + b - c")).to.eql("((a+b)-c)");
    expect(test("a * b / c")).to.eql("((a*b)/c)");
    expect(test("a ^ b ^ c")).to.eql("(a^(b^c))");
  });
  it("should parse mixed unary and binary operators ", () => {
    expect(test("- a * b")).to.eql("((-a)*b)");
    expect(test("! a + b")).to.eql("((!a)+b)");
    expect(test("~ a ^ b")).to.eql("((~a)^b)");
    expect(test("- a !")).to.eql("(-(a!))");
    expect(test("! a !")).to.eql("(!(a!))");
  });
  it("should parse trinary operators", () => {
    expect(test("a ? b : c ? d : e")).to.eql("(a?b:(c?d:e))");
    expect(test("a ? b ? c : d : e")).to.eql("(a?(b?c:d):e)");
    expect(test("a + b ? c * d : e / f")).to.eql("((a+b)?(c*d):(e/f))");
  });
  it("should parse function calls", () => {
    expect(test("a ( )")).to.eql("a()");
    expect(test("a ( b )")).to.eql("a(b)");
    expect(test("a ( b , c )")).to.eql("a(b,c)");
    expect(test("a ( b ) ( c )")).to.eql("a(b)(c)");
    expect(test("a ( b ) + c ( d )")).to.eql("(a(b)+c(d))");
    expect(test("a ( b ? c : d , e + f )")).to.eql("a((b?c:d),(e+f))");
  });
  it("should parse groups", () => {
    expect(test("a + ( b + c ) + d")).to.eql("((a+(b+c))+d)");
    expect(test("a ^ ( b + c )")).to.eql("(a^(b+c))");
    expect(test("( ! a ) !")).to.eql("((!a)!)");
  });
});