///<reference path='references.ts' />
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var Shared;
        (function (Shared) {
            var TokenRangeAccess = (function () {
                function TokenRangeAccess(from, to, except) {
                    this.tokens = [];
                    for (var token = from; token <= to; token++) {
                        if (except.indexOf(token) < 0) {
                            this.tokens.push(token);
                        }
                    }
                }
                TokenRangeAccess.prototype.GetTokens = function () {
                    return this.tokens;
                };
                TokenRangeAccess.prototype.Contains = function (token) {
                    return this.tokens.indexOf(token) >= 0;
                };
                return TokenRangeAccess;
            })();
            Shared.TokenRangeAccess = TokenRangeAccess;
            var TokenValuesAccess = (function () {
                function TokenValuesAccess(tks) {
                    this.tokens = tks && tks.length ? tks : [];
                }
                TokenValuesAccess.prototype.GetTokens = function () {
                    return this.tokens;
                };
                TokenValuesAccess.prototype.Contains = function (token) {
                    return this.tokens.indexOf(token) >= 0;
                };
                return TokenValuesAccess;
            })();
            Shared.TokenValuesAccess = TokenValuesAccess;
            var TokenSingleValueAccess = (function () {
                function TokenSingleValueAccess(token) {
                    this.token = token;
                }
                TokenSingleValueAccess.prototype.GetTokens = function () {
                    return [this.token];
                };
                TokenSingleValueAccess.prototype.Contains = function (tokenValue) {
                    return tokenValue === this.token;
                };
                return TokenSingleValueAccess;
            })();
            Shared.TokenSingleValueAccess = TokenSingleValueAccess;
            var TokenAllAccess = (function () {
                function TokenAllAccess() {
                }
                TokenAllAccess.prototype.GetTokens = function () {
                    var result = [];
                    for (var token = ts.SyntaxKind.FirstToken; token <= ts.SyntaxKind.LastToken; token++) {
                        result.push(token);
                    }
                    return result;
                };
                TokenAllAccess.prototype.Contains = function (tokenValue) {
                    return true;
                };
                TokenAllAccess.prototype.toString = function () {
                    return "[allTokens]";
                };
                return TokenAllAccess;
            })();
            Shared.TokenAllAccess = TokenAllAccess;
            var TokenRange = (function () {
                function TokenRange(tokenAccess) {
                    this.tokenAccess = tokenAccess;
                }
                TokenRange.FromToken = function (token) {
                    return new TokenRange(new TokenSingleValueAccess(token));
                };
                TokenRange.FromTokens = function (tokens) {
                    return new TokenRange(new TokenValuesAccess(tokens));
                };
                TokenRange.FromRange = function (f, to, except) {
                    if (except === void 0) { except = []; }
                    return new TokenRange(new TokenRangeAccess(f, to, except));
                };
                TokenRange.AllTokens = function () {
                    return new TokenRange(new TokenAllAccess());
                };
                TokenRange.prototype.GetTokens = function () {
                    return this.tokenAccess.GetTokens();
                };
                TokenRange.prototype.Contains = function (token) {
                    return this.tokenAccess.Contains(token);
                };
                TokenRange.prototype.toString = function () {
                    return this.tokenAccess.toString();
                };
                TokenRange.Any = TokenRange.AllTokens();
                TokenRange.AnyIncludingMultilineComments = TokenRange.FromTokens(TokenRange.Any.GetTokens().concat([ts.SyntaxKind.MultiLineCommentTrivia]));
                TokenRange.Keywords = TokenRange.FromRange(ts.SyntaxKind.FirstKeyword, ts.SyntaxKind.LastKeyword);
                TokenRange.BinaryOperators = TokenRange.FromRange(ts.SyntaxKind.FirstBinaryOperator, ts.SyntaxKind.LastBinaryOperator);
                TokenRange.BinaryKeywordOperators = TokenRange.FromTokens([ts.SyntaxKind.InKeyword, ts.SyntaxKind.InstanceOfKeyword, ts.SyntaxKind.OfKeyword, ts.SyntaxKind.AsKeyword, ts.SyntaxKind.IsKeyword]);
                TokenRange.UnaryPrefixOperators = TokenRange.FromTokens([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken, ts.SyntaxKind.TildeToken, ts.SyntaxKind.ExclamationToken]);
                TokenRange.UnaryPrefixExpressions = TokenRange.FromTokens([ts.SyntaxKind.NumericLiteral, ts.SyntaxKind.Identifier, ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.ThisKeyword, ts.SyntaxKind.NewKeyword]);
                TokenRange.UnaryPreincrementExpressions = TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.ThisKeyword, ts.SyntaxKind.NewKeyword]);
                TokenRange.UnaryPostincrementExpressions = TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.NewKeyword]);
                TokenRange.UnaryPredecrementExpressions = TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.ThisKeyword, ts.SyntaxKind.NewKeyword]);
                TokenRange.UnaryPostdecrementExpressions = TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.NewKeyword]);
                TokenRange.Comments = TokenRange.FromTokens([ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia]);
                TokenRange.TypeNames = TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.StringKeyword, ts.SyntaxKind.BooleanKeyword, ts.SyntaxKind.SymbolKeyword, ts.SyntaxKind.VoidKeyword, ts.SyntaxKind.AnyKeyword]);
                return TokenRange;
            })();
            Shared.TokenRange = TokenRange;
        })(Shared = formatting.Shared || (formatting.Shared = {}));
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
//# sourceMappingURL=tokenRange.js.map