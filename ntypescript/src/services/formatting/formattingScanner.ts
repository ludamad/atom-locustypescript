/// <reference path="formatting.ts"/>
/// <reference path="..\..\compiler\scanner.ts"/>

/* @internal */
namespace ts.formatting {
    let scanner = createScanner(ScriptTarget.Latest, /*skipTrivia*/ false);

    export interface FormattingScanner {
        advance(): void;
        isOnToken(): boolean;
        readTokenInfo(n: Node): TokenInfo;
        lastTrailingTriviaWasNewLine(): boolean;
        close(): void;
    }

    const enum ScanAction{
        Scan,
        RescanGreaterThanToken,
        RescanSlashToken,
        RescanTemplateToken,
        RescanJsxIdentifier
    }

    export function getFormattingScanner(sourceFile: SourceFile, startPos: number, endPos: number): FormattingScanner {

        scanner.setText(sourceFile.text);
        scanner.setTextPos(startPos);

        let wasNewLine: boolean = true;
        let leadingTrivia: TextRangeWithKind[];
        let trailingTrivia: TextRangeWithKind[];
        
        let savedPos: number;
        let lastScanAction: ScanAction;
        let lastTokenInfo: TokenInfo;

        return {
            advance: advance,
            readTokenInfo: readTokenInfo,
            isOnToken: isOnToken,
            lastTrailingTriviaWasNewLine: () => wasNewLine,
            close: () => {
                lastTokenInfo = undefined;
                scanner.setText(undefined);
            }
        }

        function advance(): void {
            lastTokenInfo = undefined;
            let isStarted = scanner.getStartPos() !== startPos;

            if (isStarted) {
                if (trailingTrivia) {
                    Debug.assert(trailingTrivia.length !== 0);
                    wasNewLine = lastOrUndefined(trailingTrivia).kind === SyntaxKind.NewLineTrivia;
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

            let t: SyntaxKind;
            let pos = scanner.getStartPos();
            
            // Read leading trivia and token
            while (pos < endPos) {
                let t = scanner.getToken();
                if (!isTrivia(t)) {
                    break;
                }

                // consume leading trivia
                scanner.scan();
                let item = {
                    pos: pos,
                    end: scanner.getStartPos(),
                    kind: t
                }

                pos = scanner.getStartPos();

                if (!leadingTrivia) {
                    leadingTrivia = [];
                }
                leadingTrivia.push(item);
            }

            savedPos = scanner.getStartPos();
        }

        function shouldRescanGreaterThanToken(node: Node): boolean {
            if (node) {
                switch (node.kind) {
                    case SyntaxKind.GreaterThanEqualsToken:
                    case SyntaxKind.GreaterThanGreaterThanEqualsToken:
                    case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                    case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                    case SyntaxKind.GreaterThanGreaterThanToken:
                        return true;
                }
            }

            return false;
        }
        
        function shouldRescanJsxIdentifier(node: Node): boolean {
            if (node.parent) {
                switch(node.parent.kind) {
                    case SyntaxKind.JsxAttribute:
                    case SyntaxKind.JsxOpeningElement:
                    case SyntaxKind.JsxClosingElement:
                    case SyntaxKind.JsxSelfClosingElement:
                        return node.kind === SyntaxKind.Identifier;
                }
            }
            
            return false;
        }

        function shouldRescanSlashToken(container: Node): boolean {
            return container.kind === SyntaxKind.RegularExpressionLiteral;
        }

        function shouldRescanTemplateToken(container: Node): boolean {
            return container.kind === SyntaxKind.TemplateMiddle || 
                container.kind === SyntaxKind.TemplateTail;
        }

        function startsWithSlashToken(t: SyntaxKind): boolean {
            return t === SyntaxKind.SlashToken || t === SyntaxKind.SlashEqualsToken;
        }

        function readTokenInfo(n: Node): TokenInfo {
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
            let expectedScanAction = 
                shouldRescanGreaterThanToken(n)
                ? ScanAction.RescanGreaterThanToken
                : shouldRescanSlashToken(n) 
                    ? ScanAction.RescanSlashToken 
                    : shouldRescanTemplateToken(n)
                        ? ScanAction.RescanTemplateToken
                        : shouldRescanJsxIdentifier(n)
                            ? ScanAction.RescanJsxIdentifier 
                            : ScanAction.Scan

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
                Debug.assert(lastTokenInfo !== undefined);
                // readTokenInfo was called before but scan action differs - rescan text
                scanner.setTextPos(savedPos);
                scanner.scan();
            }

            let currentToken = scanner.getToken();

            if (expectedScanAction === ScanAction.RescanGreaterThanToken && currentToken === SyntaxKind.GreaterThanToken) {
                currentToken = scanner.reScanGreaterToken();
                Debug.assert(n.kind === currentToken);
                lastScanAction = ScanAction.RescanGreaterThanToken;
            }
            else if (expectedScanAction === ScanAction.RescanSlashToken && startsWithSlashToken(currentToken)) {
                currentToken = scanner.reScanSlashToken();
                Debug.assert(n.kind === currentToken);
                lastScanAction = ScanAction.RescanSlashToken;
            }
            else if (expectedScanAction === ScanAction.RescanTemplateToken && currentToken === SyntaxKind.CloseBraceToken) {
                currentToken = scanner.reScanTemplateToken();
                lastScanAction = ScanAction.RescanTemplateToken;
            }
            else if (expectedScanAction === ScanAction.RescanJsxIdentifier && currentToken === SyntaxKind.Identifier) {
                currentToken = scanner.scanJsxIdentifier();
                lastScanAction = ScanAction.RescanJsxIdentifier;
            }
            else {
                lastScanAction = ScanAction.Scan;
            }

            let token: TextRangeWithKind = {
                pos: scanner.getStartPos(),
                end: scanner.getTextPos(),
                kind: currentToken
            }

            // consume trailing trivia
            if (trailingTrivia) {
                trailingTrivia = undefined;
            }
            while(scanner.getStartPos() < endPos) {
                currentToken = scanner.scan();
                if (!isTrivia(currentToken)) {
                    break;
                }
                let trivia = {
                    pos: scanner.getStartPos(),
                    end: scanner.getTextPos(),
                    kind: currentToken
                };

                if (!trailingTrivia) {
                    trailingTrivia = [];
                }

                trailingTrivia.push(trivia);

                if (currentToken === SyntaxKind.NewLineTrivia) {
                    // move past new line
                    scanner.scan();
                    break;
                }
            }

            lastTokenInfo = {
                leadingTrivia: leadingTrivia,
                trailingTrivia: trailingTrivia,
                token: token
            }

            return fixTokenKind(lastTokenInfo, n);
        }

        function isOnToken(): boolean {
            let current = (lastTokenInfo && lastTokenInfo.token.kind) || scanner.getToken();
            let startPos = (lastTokenInfo && lastTokenInfo.token.pos) || scanner.getStartPos();
            return startPos < endPos && current !== SyntaxKind.EndOfFileToken && !isTrivia(current);
        }

        // when containing node in the tree is token 
        // but its kind differs from the kind that was returned by the scanner,
        // then kind needs to be fixed. This might happen in cases 
        // when parser interprets token differently, i.e keyword treated as identifier
        function fixTokenKind(tokenInfo: TokenInfo, container: Node): TokenInfo {
            if (isToken(container) && tokenInfo.token.kind !== container.kind) {
                tokenInfo.token.kind = container.kind;
            }
            return tokenInfo;
        }
    }
}