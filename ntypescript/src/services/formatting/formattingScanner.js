/// <reference path="formatting.ts"/>
/// <reference path="..\..\compiler\scanner.ts"/>
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var scanner = ts.createScanner(ts.ScriptTarget.Latest, /*skipTrivia*/ false);
        var ScanAction;
        (function (ScanAction) {
            ScanAction[ScanAction["Scan"] = 0] = "Scan";
            ScanAction[ScanAction["RescanGreaterThanToken"] = 1] = "RescanGreaterThanToken";
            ScanAction[ScanAction["RescanSlashToken"] = 2] = "RescanSlashToken";
            ScanAction[ScanAction["RescanTemplateToken"] = 3] = "RescanTemplateToken";
            ScanAction[ScanAction["RescanJsxIdentifier"] = 4] = "RescanJsxIdentifier";
        })(ScanAction || (ScanAction = {}));
        function getFormattingScanner(sourceFile, startPos, endPos) {
            scanner.setText(sourceFile.text);
            scanner.setTextPos(startPos);
            var wasNewLine = true;
            var leadingTrivia;
            var trailingTrivia;
            var savedPos;
            var lastScanAction;
            var lastTokenInfo;
            return {
                advance: advance,
                readTokenInfo: readTokenInfo,
                isOnToken: isOnToken,
                lastTrailingTriviaWasNewLine: function () { return wasNewLine; },
                close: function () {
                    lastTokenInfo = undefined;
                    scanner.setText(undefined);
                }
            };
            function advance() {
                lastTokenInfo = undefined;
                var isStarted = scanner.getStartPos() !== startPos;
                if (isStarted) {
                    if (trailingTrivia) {
                        ts.Debug.assert(trailingTrivia.length !== 0);
                        wasNewLine = ts.lastOrUndefined(trailingTrivia).kind === ts.SyntaxKind.NewLineTrivia;
                    }
                    else {
                        wasNewLine = false;
                    }
                }
                leadingTrivia = undefined;
                trailingTrivia = undefined;
                if (!isStarted) {
                    scanner.scan();
                }
                var t;
                var pos = scanner.getStartPos();
                // Read leading trivia and token
                while (pos < endPos) {
                    var t_1 = scanner.getToken();
                    if (!ts.isTrivia(t_1)) {
                        break;
                    }
                    // consume leading trivia
                    scanner.scan();
                    var item = {
                        pos: pos,
                        end: scanner.getStartPos(),
                        kind: t_1
                    };
                    pos = scanner.getStartPos();
                    if (!leadingTrivia) {
                        leadingTrivia = [];
                    }
                    leadingTrivia.push(item);
                }
                savedPos = scanner.getStartPos();
            }
            function shouldRescanGreaterThanToken(node) {
                if (node) {
                    switch (node.kind) {
                        case ts.SyntaxKind.GreaterThanEqualsToken:
                        case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                        case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                        case ts.SyntaxKind.GreaterThanGreaterThanToken:
                            return true;
                    }
                }
                return false;
            }
            function shouldRescanJsxIdentifier(node) {
                if (node.parent) {
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.JsxAttribute:
                        case ts.SyntaxKind.JsxOpeningElement:
                        case ts.SyntaxKind.JsxClosingElement:
                        case ts.SyntaxKind.JsxSelfClosingElement:
                            return node.kind === ts.SyntaxKind.Identifier;
                    }
                }
                return false;
            }
            function shouldRescanSlashToken(container) {
                return container.kind === ts.SyntaxKind.RegularExpressionLiteral;
            }
            function shouldRescanTemplateToken(container) {
                return container.kind === ts.SyntaxKind.TemplateMiddle ||
                    container.kind === ts.SyntaxKind.TemplateTail;
            }
            function startsWithSlashToken(t) {
                return t === ts.SyntaxKind.SlashToken || t === ts.SyntaxKind.SlashEqualsToken;
            }
            function readTokenInfo(n) {
                if (!isOnToken()) {
                    // scanner is not on the token (either advance was not called yet or scanner is already past the end position)
                    return {
                        leadingTrivia: leadingTrivia,
                        trailingTrivia: undefined,
                        token: undefined
                    };
                }
                // normally scanner returns the smallest available token
                // check the kind of context node to determine if scanner should have more greedy behavior and consume more text.
                var expectedScanAction = shouldRescanGreaterThanToken(n)
                    ? ScanAction.RescanGreaterThanToken
                    : shouldRescanSlashToken(n)
                        ? ScanAction.RescanSlashToken
                        : shouldRescanTemplateToken(n)
                            ? ScanAction.RescanTemplateToken
                            : shouldRescanJsxIdentifier(n)
                                ? ScanAction.RescanJsxIdentifier
                                : ScanAction.Scan;
                if (lastTokenInfo && expectedScanAction === lastScanAction) {
                    // readTokenInfo was called before with the same expected scan action.
                    // No need to re-scan text, return existing 'lastTokenInfo'
                    // it is ok to call fixTokenKind here since it does not affect
                    // what portion of text is consumed. In opposize rescanning can change it,
                    // i.e. for '>=' when originally scanner eats just one character
                    // and rescanning forces it to consume more.
                    return fixTokenKind(lastTokenInfo, n);
                }
                if (scanner.getStartPos() !== savedPos) {
                    ts.Debug.assert(lastTokenInfo !== undefined);
                    // readTokenInfo was called before but scan action differs - rescan text
                    scanner.setTextPos(savedPos);
                    scanner.scan();
                }
                var currentToken = scanner.getToken();
                if (expectedScanAction === ScanAction.RescanGreaterThanToken && currentToken === ts.SyntaxKind.GreaterThanToken) {
                    currentToken = scanner.reScanGreaterToken();
                    ts.Debug.assert(n.kind === currentToken);
                    lastScanAction = ScanAction.RescanGreaterThanToken;
                }
                else if (expectedScanAction === ScanAction.RescanSlashToken && startsWithSlashToken(currentToken)) {
                    currentToken = scanner.reScanSlashToken();
                    ts.Debug.assert(n.kind === currentToken);
                    lastScanAction = ScanAction.RescanSlashToken;
                }
                else if (expectedScanAction === ScanAction.RescanTemplateToken && currentToken === ts.SyntaxKind.CloseBraceToken) {
                    currentToken = scanner.reScanTemplateToken();
                    lastScanAction = ScanAction.RescanTemplateToken;
                }
                else if (expectedScanAction === ScanAction.RescanJsxIdentifier && currentToken === ts.SyntaxKind.Identifier) {
                    currentToken = scanner.scanJsxIdentifier();
                    lastScanAction = ScanAction.RescanJsxIdentifier;
                }
                else {
                    lastScanAction = ScanAction.Scan;
                }
                var token = {
                    pos: scanner.getStartPos(),
                    end: scanner.getTextPos(),
                    kind: currentToken
                };
                // consume trailing trivia
                if (trailingTrivia) {
                    trailingTrivia = undefined;
                }
                while (scanner.getStartPos() < endPos) {
                    currentToken = scanner.scan();
                    if (!ts.isTrivia(currentToken)) {
                        break;
                    }
                    var trivia = {
                        pos: scanner.getStartPos(),
                        end: scanner.getTextPos(),
                        kind: currentToken
                    };
                    if (!trailingTrivia) {
                        trailingTrivia = [];
                    }
                    trailingTrivia.push(trivia);
                    if (currentToken === ts.SyntaxKind.NewLineTrivia) {
                        // move past new line
                        scanner.scan();
                        break;
                    }
                }
                lastTokenInfo = {
                    leadingTrivia: leadingTrivia,
                    trailingTrivia: trailingTrivia,
                    token: token
                };
                return fixTokenKind(lastTokenInfo, n);
            }
            function isOnToken() {
                var current = (lastTokenInfo && lastTokenInfo.token.kind) || scanner.getToken();
                var startPos = (lastTokenInfo && lastTokenInfo.token.pos) || scanner.getStartPos();
                return startPos < endPos && current !== ts.SyntaxKind.EndOfFileToken && !ts.isTrivia(current);
            }
            // when containing node in the tree is token 
            // but its kind differs from the kind that was returned by the scanner,
            // then kind needs to be fixed. This might happen in cases 
            // when parser interprets token differently, i.e keyword treated as identifier
            function fixTokenKind(tokenInfo, container) {
                if (ts.isToken(container) && tokenInfo.token.kind !== container.kind) {
                    tokenInfo.token.kind = container.kind;
                }
                return tokenInfo;
            }
        }
        formatting.getFormattingScanner = getFormattingScanner;
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
//# sourceMappingURL=formattingScanner.js.map