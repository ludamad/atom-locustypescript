// These utilities are common to multiple language service features.
/* @internal */
var ts;
(function (ts) {
    function getEndLinePosition(line, sourceFile) {
        ts.Debug.assert(line >= 0);
        var lineStarts = sourceFile.getLineStarts();
        var lineIndex = line;
        if (lineIndex + 1 === lineStarts.length) {
            // last line - return EOF
            return sourceFile.text.length - 1;
        }
        else {
            // current line start
            var start = lineStarts[lineIndex];
            // take the start position of the next line -1 = it should be some line break
            var pos = lineStarts[lineIndex + 1] - 1;
            ts.Debug.assert(ts.isLineBreak(sourceFile.text.charCodeAt(pos)));
            // walk backwards skipping line breaks, stop the the beginning of current line.
            // i.e:
            // <some text>
            // $ <- end of line for this position should match the start position
            while (start <= pos && ts.isLineBreak(sourceFile.text.charCodeAt(pos))) {
                pos--;
            }
            return pos;
        }
    }
    ts.getEndLinePosition = getEndLinePosition;
    function getLineStartPositionForPosition(position, sourceFile) {
        var lineStarts = sourceFile.getLineStarts();
        var line = sourceFile.getLineAndCharacterOfPosition(position).line;
        return lineStarts[line];
    }
    ts.getLineStartPositionForPosition = getLineStartPositionForPosition;
    function rangeContainsRange(r1, r2) {
        return startEndContainsRange(r1.pos, r1.end, r2);
    }
    ts.rangeContainsRange = rangeContainsRange;
    function startEndContainsRange(start, end, range) {
        return start <= range.pos && end >= range.end;
    }
    ts.startEndContainsRange = startEndContainsRange;
    function rangeContainsStartEnd(range, start, end) {
        return range.pos <= start && range.end >= end;
    }
    ts.rangeContainsStartEnd = rangeContainsStartEnd;
    function rangeOverlapsWithStartEnd(r1, start, end) {
        return startEndOverlapsWithStartEnd(r1.pos, r1.end, start, end);
    }
    ts.rangeOverlapsWithStartEnd = rangeOverlapsWithStartEnd;
    function startEndOverlapsWithStartEnd(start1, end1, start2, end2) {
        var start = Math.max(start1, start2);
        var end = Math.min(end1, end2);
        return start < end;
    }
    ts.startEndOverlapsWithStartEnd = startEndOverlapsWithStartEnd;
    function positionBelongsToNode(candidate, position, sourceFile) {
        return candidate.end > position || !isCompletedNode(candidate, sourceFile);
    }
    ts.positionBelongsToNode = positionBelongsToNode;
    function isCompletedNode(n, sourceFile) {
        if (ts.nodeIsMissing(n)) {
            return false;
        }
        switch (n.kind) {
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.ObjectLiteralExpression:
            case ts.SyntaxKind.ObjectBindingPattern:
            case ts.SyntaxKind.TypeLiteral:
            case ts.SyntaxKind.Block:
            case ts.SyntaxKind.ModuleBlock:
            case ts.SyntaxKind.CaseBlock:
                return nodeEndsWith(n, ts.SyntaxKind.CloseBraceToken, sourceFile);
            case ts.SyntaxKind.CatchClause:
                return isCompletedNode(n.block, sourceFile);
            case ts.SyntaxKind.NewExpression:
                if (!n.arguments) {
                    return true;
                }
            // fall through
            case ts.SyntaxKind.CallExpression:
            case ts.SyntaxKind.ParenthesizedExpression:
            case ts.SyntaxKind.ParenthesizedType:
                return nodeEndsWith(n, ts.SyntaxKind.CloseParenToken, sourceFile);
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.ConstructorType:
                return isCompletedNode(n.type, sourceFile);
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.ConstructSignature:
            case ts.SyntaxKind.CallSignature:
            case ts.SyntaxKind.ArrowFunction:
                if (n.body) {
                    return isCompletedNode(n.body, sourceFile);
                }
                if (n.type) {
                    return isCompletedNode(n.type, sourceFile);
                }
                // Even though type parameters can be unclosed, we can get away with
                // having at least a closing paren.
                return hasChildOfKind(n, ts.SyntaxKind.CloseParenToken, sourceFile);
            case ts.SyntaxKind.ModuleDeclaration:
                return n.body && isCompletedNode(n.body, sourceFile);
            case ts.SyntaxKind.IfStatement:
                if (n.elseStatement) {
                    return isCompletedNode(n.elseStatement, sourceFile);
                }
                return isCompletedNode(n.thenStatement, sourceFile);
            case ts.SyntaxKind.ExpressionStatement:
                return isCompletedNode(n.expression, sourceFile);
            case ts.SyntaxKind.ArrayLiteralExpression:
            case ts.SyntaxKind.ArrayBindingPattern:
            case ts.SyntaxKind.ElementAccessExpression:
            case ts.SyntaxKind.ComputedPropertyName:
            case ts.SyntaxKind.TupleType:
                return nodeEndsWith(n, ts.SyntaxKind.CloseBracketToken, sourceFile);
            case ts.SyntaxKind.IndexSignature:
                if (n.type) {
                    return isCompletedNode(n.type, sourceFile);
                }
                return hasChildOfKind(n, ts.SyntaxKind.CloseBracketToken, sourceFile);
            case ts.SyntaxKind.CaseClause:
            case ts.SyntaxKind.DefaultClause:
                // there is no such thing as terminator token for CaseClause/DefaultClause so for simplicitly always consider them non-completed
                return false;
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.WhileStatement:
                return isCompletedNode(n.statement, sourceFile);
            case ts.SyntaxKind.DoStatement:
                // rough approximation: if DoStatement has While keyword - then if node is completed is checking the presence of ')';
                var hasWhileKeyword = findChildOfKind(n, ts.SyntaxKind.WhileKeyword, sourceFile);
                if (hasWhileKeyword) {
                    return nodeEndsWith(n, ts.SyntaxKind.CloseParenToken, sourceFile);
                }
                return isCompletedNode(n.statement, sourceFile);
            case ts.SyntaxKind.TypeQuery:
                return isCompletedNode(n.exprName, sourceFile);
            case ts.SyntaxKind.TypeOfExpression:
            case ts.SyntaxKind.DeleteExpression:
            case ts.SyntaxKind.VoidExpression:
            case ts.SyntaxKind.YieldExpression:
            case ts.SyntaxKind.SpreadElementExpression:
                var unaryWordExpression = n;
                return isCompletedNode(unaryWordExpression.expression, sourceFile);
            case ts.SyntaxKind.TaggedTemplateExpression:
                return isCompletedNode(n.template, sourceFile);
            case ts.SyntaxKind.TemplateExpression:
                var lastSpan = ts.lastOrUndefined(n.templateSpans);
                return isCompletedNode(lastSpan, sourceFile);
            case ts.SyntaxKind.TemplateSpan:
                return ts.nodeIsPresent(n.literal);
            case ts.SyntaxKind.PrefixUnaryExpression:
                return isCompletedNode(n.operand, sourceFile);
            case ts.SyntaxKind.BinaryExpression:
                return isCompletedNode(n.right, sourceFile);
            case ts.SyntaxKind.ConditionalExpression:
                return isCompletedNode(n.whenFalse, sourceFile);
            default:
                return true;
        }
    }
    ts.isCompletedNode = isCompletedNode;
    /*
     * Checks if node ends with 'expectedLastToken'.
     * If child at position 'length - 1' is 'SemicolonToken' it is skipped and 'expectedLastToken' is compared with child at position 'length - 2'.
     */
    function nodeEndsWith(n, expectedLastToken, sourceFile) {
        var children = n.getChildren(sourceFile);
        if (children.length) {
            var last = ts.lastOrUndefined(children);
            if (last.kind === expectedLastToken) {
                return true;
            }
            else if (last.kind === ts.SyntaxKind.SemicolonToken && children.length !== 1) {
                return children[children.length - 2].kind === expectedLastToken;
            }
        }
        return false;
    }
    function findListItemInfo(node) {
        var list = findContainingList(node);
        // It is possible at this point for syntaxList to be undefined, either if
        // node.parent had no list child, or if none of its list children contained
        // the span of node. If this happens, return undefined. The caller should
        // handle this case.
        if (!list) {
            return undefined;
        }
        var children = list.getChildren();
        var listItemIndex = ts.indexOf(children, node);
        return {
            listItemIndex: listItemIndex,
            list: list
        };
    }
    ts.findListItemInfo = findListItemInfo;
    function hasChildOfKind(n, kind, sourceFile) {
        return !!findChildOfKind(n, kind, sourceFile);
    }
    ts.hasChildOfKind = hasChildOfKind;
    function findChildOfKind(n, kind, sourceFile) {
        return ts.forEach(n.getChildren(sourceFile), function (c) { return c.kind === kind && c; });
    }
    ts.findChildOfKind = findChildOfKind;
    function findContainingList(node) {
        // The node might be a list element (nonsynthetic) or a comma (synthetic). Either way, it will
        // be parented by the container of the SyntaxList, not the SyntaxList itself.
        // In order to find the list item index, we first need to locate SyntaxList itself and then search
        // for the position of the relevant node (or comma).
        var syntaxList = ts.forEach(node.parent.getChildren(), function (c) {
            // find syntax list that covers the span of the node
            if (c.kind === ts.SyntaxKind.SyntaxList && c.pos <= node.pos && c.end >= node.end) {
                return c;
            }
        });
        // Either we didn't find an appropriate list, or the list must contain us.
        ts.Debug.assert(!syntaxList || ts.contains(syntaxList.getChildren(), node));
        return syntaxList;
    }
    ts.findContainingList = findContainingList;
    /* Gets the token whose text has range [start, end) and
     * position >= start and (position < end or (position === end && token is keyword or identifier))
     */
    function getTouchingWord(sourceFile, position) {
        return getTouchingToken(sourceFile, position, function (n) { return isWord(n.kind); });
    }
    ts.getTouchingWord = getTouchingWord;
    /* Gets the token whose text has range [start, end) and position >= start
     * and (position < end or (position === end && token is keyword or identifier or numeric\string litera))
     */
    function getTouchingPropertyName(sourceFile, position) {
        return getTouchingToken(sourceFile, position, function (n) { return isPropertyName(n.kind); });
    }
    ts.getTouchingPropertyName = getTouchingPropertyName;
    /** Returns the token if position is in [start, end) or if position === end and includeItemAtEndPosition(token) === true */
    function getTouchingToken(sourceFile, position, includeItemAtEndPosition) {
        return getTokenAtPositionWorker(sourceFile, position, /*allowPositionInLeadingTrivia*/ false, includeItemAtEndPosition);
    }
    ts.getTouchingToken = getTouchingToken;
    /** Returns a token if position is in [start-of-leading-trivia, end) */
    function getTokenAtPosition(sourceFile, position) {
        return getTokenAtPositionWorker(sourceFile, position, /*allowPositionInLeadingTrivia*/ true, /*includeItemAtEndPosition*/ undefined);
    }
    ts.getTokenAtPosition = getTokenAtPosition;
    /** Get the token whose text contains the position */
    function getTokenAtPositionWorker(sourceFile, position, allowPositionInLeadingTrivia, includeItemAtEndPosition) {
        var current = sourceFile;
        outer: while (true) {
            if (isToken(current)) {
                // exit early
                return current;
            }
            // find the child that contains 'position'
            for (var i = 0, n = current.getChildCount(sourceFile); i < n; i++) {
                var child = current.getChildAt(i);
                var start = allowPositionInLeadingTrivia ? child.getFullStart() : child.getStart(sourceFile);
                if (start <= position) {
                    var end = child.getEnd();
                    if (position < end || (position === end && child.kind === ts.SyntaxKind.EndOfFileToken)) {
                        current = child;
                        continue outer;
                    }
                    else if (includeItemAtEndPosition && end === position) {
                        var previousToken = findPrecedingToken(position, sourceFile, child);
                        if (previousToken && includeItemAtEndPosition(previousToken)) {
                            return previousToken;
                        }
                    }
                }
            }
            return current;
        }
    }
    /**
      * The token on the left of the position is the token that strictly includes the position
      * or sits to the left of the cursor if it is on a boundary. For example
      *
      *   fo|o               -> will return foo
      *   foo <comment> |bar -> will return foo
      *
      */
    function findTokenOnLeftOfPosition(file, position) {
        // Ideally, getTokenAtPosition should return a token. However, it is currently
        // broken, so we do a check to make sure the result was indeed a token.
        var tokenAtPosition = getTokenAtPosition(file, position);
        if (isToken(tokenAtPosition) && position > tokenAtPosition.getStart(file) && position < tokenAtPosition.getEnd()) {
            return tokenAtPosition;
        }
        return findPrecedingToken(position, file);
    }
    ts.findTokenOnLeftOfPosition = findTokenOnLeftOfPosition;
    function findNextToken(previousToken, parent) {
        return find(parent);
        function find(n) {
            if (isToken(n) && n.pos === previousToken.end) {
                // this is token that starts at the end of previous token - return it
                return n;
            }
            var children = n.getChildren();
            for (var _i = 0; _i < children.length; _i++) {
                var child = children[_i];
                var shouldDiveInChildNode = 
                // previous token is enclosed somewhere in the child
                (child.pos <= previousToken.pos && child.end > previousToken.end) ||
                    // previous token ends exactly at the beginning of child
                    (child.pos === previousToken.end);
                if (shouldDiveInChildNode && nodeHasTokens(child)) {
                    return find(child);
                }
            }
            return undefined;
        }
    }
    ts.findNextToken = findNextToken;
    function findPrecedingToken(position, sourceFile, startNode) {
        return find(startNode || sourceFile);
        function findRightmostToken(n) {
            if (isToken(n) || n.kind === ts.SyntaxKind.JsxText) {
                return n;
            }
            var children = n.getChildren();
            var candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
            return candidate && findRightmostToken(candidate);
        }
        function find(n) {
            if (isToken(n) || n.kind === ts.SyntaxKind.JsxText) {
                return n;
            }
            var children = n.getChildren();
            for (var i = 0, len = children.length; i < len; i++) {
                var child = children[i];
                // condition 'position < child.end' checks if child node end after the position
                // in the example below this condition will be false for 'aaaa' and 'bbbb' and true for 'ccc'
                // aaaa___bbbb___$__ccc
                // after we found child node with end after the position we check if start of the node is after the position.
                // if yes - then position is in the trivia and we need to look into the previous child to find the token in question.
                // if no - position is in the node itself so we should recurse in it.
                // NOTE: JsxText is a weird kind of node that can contain only whitespaces (since they are not counted as trivia).
                // if this is the case - then we should assume that token in question is located in previous child.
                if (position < child.end && (nodeHasTokens(child) || child.kind === ts.SyntaxKind.JsxText)) {
                    var start = child.getStart(sourceFile);
                    var lookInPreviousChild = (start >= position) ||
                        (child.kind === ts.SyntaxKind.JsxText && start === child.end); // whitespace only JsxText 
                    if (lookInPreviousChild) {
                        // actual start of the node is past the position - previous token should be at the end of previous child
                        var candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ i);
                        return candidate && findRightmostToken(candidate);
                    }
                    else {
                        // candidate should be in this node
                        return find(child);
                    }
                }
            }
            ts.Debug.assert(startNode !== undefined || n.kind === ts.SyntaxKind.SourceFile);
            // Here we know that none of child token nodes embrace the position, 
            // the only known case is when position is at the end of the file.
            // Try to find the rightmost token in the file without filtering.
            // Namely we are skipping the check: 'position < node.end'
            if (children.length) {
                var candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
                return candidate && findRightmostToken(candidate);
            }
        }
        /// finds last node that is considered as candidate for search (isCandidate(node) === true) starting from 'exclusiveStartPosition'
        function findRightmostChildNodeWithTokens(children, exclusiveStartPosition) {
            for (var i = exclusiveStartPosition - 1; i >= 0; --i) {
                if (nodeHasTokens(children[i])) {
                    return children[i];
                }
            }
        }
    }
    ts.findPrecedingToken = findPrecedingToken;
    function isInString(sourceFile, position) {
        var token = getTokenAtPosition(sourceFile, position);
        return token && token.kind === ts.SyntaxKind.StringLiteral && position > token.getStart();
    }
    ts.isInString = isInString;
    function isInComment(sourceFile, position) {
        return isInCommentHelper(sourceFile, position, /*predicate*/ undefined);
    }
    ts.isInComment = isInComment;
    /**
     * Returns true if the cursor at position in sourceFile is within a comment that additionally
     * satisfies predicate, and false otherwise.
     */
    function isInCommentHelper(sourceFile, position, predicate) {
        var token = getTokenAtPosition(sourceFile, position);
        if (token && position <= token.getStart()) {
            var commentRanges = ts.getLeadingCommentRanges(sourceFile.text, token.pos);
            // The end marker of a single-line comment does not include the newline character.
            // In the following case, we are inside a comment (^ denotes the cursor position):
            //
            //    // asdf   ^\n
            //
            // But for multi-line comments, we don't want to be inside the comment in the following case:
            //
            //    /* asdf */^
            //
            // Internally, we represent the end of the comment at the newline and closing '/', respectively.
            return predicate ?
                ts.forEach(commentRanges, function (c) { return c.pos < position &&
                    (c.kind == ts.SyntaxKind.SingleLineCommentTrivia ? position <= c.end : position < c.end) &&
                    predicate(c); }) :
                ts.forEach(commentRanges, function (c) { return c.pos < position &&
                    (c.kind == ts.SyntaxKind.SingleLineCommentTrivia ? position <= c.end : position < c.end); });
        }
        return false;
    }
    ts.isInCommentHelper = isInCommentHelper;
    function hasDocComment(sourceFile, position) {
        var token = getTokenAtPosition(sourceFile, position);
        // First, we have to see if this position actually landed in a comment.
        var commentRanges = ts.getLeadingCommentRanges(sourceFile.text, token.pos);
        return ts.forEach(commentRanges, jsDocPrefix);
        function jsDocPrefix(c) {
            var text = sourceFile.text;
            return text.length >= c.pos + 3 && text[c.pos] === '/' && text[c.pos + 1] === '*' && text[c.pos + 2] === '*';
        }
    }
    ts.hasDocComment = hasDocComment;
    /**
     * Get the corresponding JSDocTag node if the position is in a jsDoc comment
     */
    function getJsDocTagAtPosition(sourceFile, position) {
        var node = ts.getTokenAtPosition(sourceFile, position);
        if (isToken(node)) {
            switch (node.kind) {
                case ts.SyntaxKind.VarKeyword:
                case ts.SyntaxKind.LetKeyword:
                case ts.SyntaxKind.ConstKeyword:
                    // if the current token is var, let or const, skip the VariableDeclarationList
                    node = node.parent === undefined ? undefined : node.parent.parent;
                    break;
                default:
                    node = node.parent;
                    break;
            }
        }
        if (node) {
            var jsDocComment = node.jsDocComment;
            if (jsDocComment) {
                for (var _i = 0, _a = jsDocComment.tags; _i < _a.length; _i++) {
                    var tag = _a[_i];
                    if (tag.pos <= position && position <= tag.end) {
                        return tag;
                    }
                }
            }
        }
        return undefined;
    }
    ts.getJsDocTagAtPosition = getJsDocTagAtPosition;
    function nodeHasTokens(n) {
        // If we have a token or node that has a non-zero width, it must have tokens.
        // Note, that getWidth() does not take trivia into account.
        return n.getWidth() !== 0;
    }
    function getNodeModifiers(node) {
        var flags = ts.getCombinedNodeFlags(node);
        var result = [];
        if (flags & ts.NodeFlags.Private)
            result.push(ts.ScriptElementKindModifier.privateMemberModifier);
        if (flags & ts.NodeFlags.Protected)
            result.push(ts.ScriptElementKindModifier.protectedMemberModifier);
        if (flags & ts.NodeFlags.Public)
            result.push(ts.ScriptElementKindModifier.publicMemberModifier);
        if (flags & ts.NodeFlags.Static)
            result.push(ts.ScriptElementKindModifier.staticModifier);
        if (flags & ts.NodeFlags.Abstract)
            result.push(ts.ScriptElementKindModifier.abstractModifier);
        if (flags & ts.NodeFlags.Export)
            result.push(ts.ScriptElementKindModifier.exportedModifier);
        if (ts.isInAmbientContext(node))
            result.push(ts.ScriptElementKindModifier.ambientModifier);
        return result.length > 0 ? result.join(',') : ts.ScriptElementKindModifier.none;
    }
    ts.getNodeModifiers = getNodeModifiers;
    function getTypeArgumentOrTypeParameterList(node) {
        if (node.kind === ts.SyntaxKind.TypeReference || node.kind === ts.SyntaxKind.CallExpression) {
            return node.typeArguments;
        }
        if (ts.isFunctionLike(node) || node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            return node.typeParameters;
        }
        return undefined;
    }
    ts.getTypeArgumentOrTypeParameterList = getTypeArgumentOrTypeParameterList;
    function isToken(n) {
        return n.kind >= ts.SyntaxKind.FirstToken && n.kind <= ts.SyntaxKind.LastToken;
    }
    ts.isToken = isToken;
    function isWord(kind) {
        return kind === ts.SyntaxKind.Identifier || ts.isKeyword(kind);
    }
    ts.isWord = isWord;
    function isPropertyName(kind) {
        return kind === ts.SyntaxKind.StringLiteral || kind === ts.SyntaxKind.NumericLiteral || isWord(kind);
    }
    function isComment(kind) {
        return kind === ts.SyntaxKind.SingleLineCommentTrivia || kind === ts.SyntaxKind.MultiLineCommentTrivia;
    }
    ts.isComment = isComment;
    function isPunctuation(kind) {
        return ts.SyntaxKind.FirstPunctuation <= kind && kind <= ts.SyntaxKind.LastPunctuation;
    }
    ts.isPunctuation = isPunctuation;
    function isInsideTemplateLiteral(node, position) {
        return ts.isTemplateLiteralKind(node.kind)
            && (node.getStart() < position && position < node.getEnd()) || (!!node.isUnterminated && position === node.getEnd());
    }
    ts.isInsideTemplateLiteral = isInsideTemplateLiteral;
    function isAccessibilityModifier(kind) {
        switch (kind) {
            case ts.SyntaxKind.PublicKeyword:
            case ts.SyntaxKind.PrivateKeyword:
            case ts.SyntaxKind.ProtectedKeyword:
                return true;
        }
        return false;
    }
    ts.isAccessibilityModifier = isAccessibilityModifier;
    function compareDataObjects(dst, src) {
        for (var e in dst) {
            if (typeof dst[e] === "object") {
                if (!compareDataObjects(dst[e], src[e])) {
                    return false;
                }
            }
            else if (typeof dst[e] !== "function") {
                if (dst[e] !== src[e]) {
                    return false;
                }
            }
        }
        return true;
    }
    ts.compareDataObjects = compareDataObjects;
})(ts || (ts = {}));
// Display-part writer helpers
/* @internal */
var ts;
(function (ts) {
    function isFirstDeclarationOfSymbolParameter(symbol) {
        return symbol.declarations && symbol.declarations.length > 0 && symbol.declarations[0].kind === ts.SyntaxKind.Parameter;
    }
    ts.isFirstDeclarationOfSymbolParameter = isFirstDeclarationOfSymbolParameter;
    var displayPartWriter = getDisplayPartWriter();
    function getDisplayPartWriter() {
        var displayParts;
        var lineStart;
        var indent;
        resetWriter();
        return {
            displayParts: function () { return displayParts; },
            writeKeyword: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.keyword); },
            writeOperator: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.operator); },
            writePunctuation: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.punctuation); },
            writeSpace: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.space); },
            writeStringLiteral: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.stringLiteral); },
            writeParameter: function (text) { return writeKind(text, ts.SymbolDisplayPartKind.parameterName); },
            writeSymbol: writeSymbol,
            writeLine: writeLine,
            increaseIndent: function () { indent++; },
            decreaseIndent: function () { indent--; },
            clear: resetWriter,
            trackSymbol: function () { }
        };
        function writeIndent() {
            if (lineStart) {
                var indentString = ts.getIndentString(indent);
                if (indentString) {
                    displayParts.push(displayPart(indentString, ts.SymbolDisplayPartKind.space));
                }
                lineStart = false;
            }
        }
        function writeKind(text, kind) {
            writeIndent();
            displayParts.push(displayPart(text, kind));
        }
        function writeSymbol(text, symbol) {
            writeIndent();
            displayParts.push(symbolPart(text, symbol));
        }
        function writeLine() {
            displayParts.push(lineBreakPart());
            lineStart = true;
        }
        function resetWriter() {
            displayParts = [];
            lineStart = true;
            indent = 0;
        }
    }
    function symbolPart(text, symbol) {
        return displayPart(text, displayPartKind(symbol), symbol);
        function displayPartKind(symbol) {
            var flags = symbol.flags;
            if (flags & ts.SymbolFlags.Variable) {
                return isFirstDeclarationOfSymbolParameter(symbol) ? ts.SymbolDisplayPartKind.parameterName : ts.SymbolDisplayPartKind.localName;
            }
            else if (flags & ts.SymbolFlags.Property) {
                return ts.SymbolDisplayPartKind.propertyName;
            }
            else if (flags & ts.SymbolFlags.GetAccessor) {
                return ts.SymbolDisplayPartKind.propertyName;
            }
            else if (flags & ts.SymbolFlags.SetAccessor) {
                return ts.SymbolDisplayPartKind.propertyName;
            }
            else if (flags & ts.SymbolFlags.EnumMember) {
                return ts.SymbolDisplayPartKind.enumMemberName;
            }
            else if (flags & ts.SymbolFlags.Function) {
                return ts.SymbolDisplayPartKind.functionName;
            }
            else if (flags & ts.SymbolFlags.Class) {
                return ts.SymbolDisplayPartKind.className;
            }
            else if (flags & ts.SymbolFlags.Interface) {
                return ts.SymbolDisplayPartKind.interfaceName;
            }
            else if (flags & ts.SymbolFlags.Enum) {
                return ts.SymbolDisplayPartKind.enumName;
            }
            else if (flags & ts.SymbolFlags.Module) {
                return ts.SymbolDisplayPartKind.moduleName;
            }
            else if (flags & ts.SymbolFlags.Method) {
                return ts.SymbolDisplayPartKind.methodName;
            }
            else if (flags & ts.SymbolFlags.TypeParameter) {
                return ts.SymbolDisplayPartKind.typeParameterName;
            }
            else if (flags & ts.SymbolFlags.TypeAlias) {
                return ts.SymbolDisplayPartKind.aliasName;
            }
            else if (flags & ts.SymbolFlags.Alias) {
                return ts.SymbolDisplayPartKind.aliasName;
            }
            return ts.SymbolDisplayPartKind.text;
        }
    }
    ts.symbolPart = symbolPart;
    function displayPart(text, kind, symbol) {
        return {
            text: text,
            kind: ts.SymbolDisplayPartKind[kind]
        };
    }
    ts.displayPart = displayPart;
    function spacePart() {
        return displayPart(" ", ts.SymbolDisplayPartKind.space);
    }
    ts.spacePart = spacePart;
    function keywordPart(kind) {
        return displayPart(ts.tokenToString(kind), ts.SymbolDisplayPartKind.keyword);
    }
    ts.keywordPart = keywordPart;
    function punctuationPart(kind) {
        return displayPart(ts.tokenToString(kind), ts.SymbolDisplayPartKind.punctuation);
    }
    ts.punctuationPart = punctuationPart;
    function operatorPart(kind) {
        return displayPart(ts.tokenToString(kind), ts.SymbolDisplayPartKind.operator);
    }
    ts.operatorPart = operatorPart;
    function textOrKeywordPart(text) {
        var kind = ts.stringToToken(text);
        return kind === undefined
            ? textPart(text)
            : keywordPart(kind);
    }
    ts.textOrKeywordPart = textOrKeywordPart;
    function textPart(text) {
        return displayPart(text, ts.SymbolDisplayPartKind.text);
    }
    ts.textPart = textPart;
    var carriageReturnLineFeed = "\r\n";
    /**
     * The default is CRLF.
     */
    function getNewLineOrDefaultFromHost(host) {
        return host.getNewLine ? host.getNewLine() : carriageReturnLineFeed;
    }
    ts.getNewLineOrDefaultFromHost = getNewLineOrDefaultFromHost;
    function lineBreakPart() {
        return displayPart("\n", ts.SymbolDisplayPartKind.lineBreak);
    }
    ts.lineBreakPart = lineBreakPart;
    function mapToDisplayParts(writeDisplayParts) {
        writeDisplayParts(displayPartWriter);
        var result = displayPartWriter.displayParts();
        displayPartWriter.clear();
        return result;
    }
    ts.mapToDisplayParts = mapToDisplayParts;
    function typeToDisplayParts(typechecker, type, enclosingDeclaration, flags) {
        return mapToDisplayParts(function (writer) {
            typechecker.getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
        });
    }
    ts.typeToDisplayParts = typeToDisplayParts;
    function symbolToDisplayParts(typeChecker, symbol, enclosingDeclaration, meaning, flags) {
        return mapToDisplayParts(function (writer) {
            typeChecker.getSymbolDisplayBuilder().buildSymbolDisplay(symbol, writer, enclosingDeclaration, meaning, flags);
        });
    }
    ts.symbolToDisplayParts = symbolToDisplayParts;
    function signatureToDisplayParts(typechecker, signature, enclosingDeclaration, flags) {
        return mapToDisplayParts(function (writer) {
            typechecker.getSymbolDisplayBuilder().buildSignatureDisplay(signature, writer, enclosingDeclaration, flags);
        });
    }
    ts.signatureToDisplayParts = signatureToDisplayParts;
    function getDeclaredName(typeChecker, symbol, location) {
        // If this is an export or import specifier it could have been renamed using the 'as' syntax.
        // If so we want to search for whatever is under the cursor.
        if (isImportOrExportSpecifierName(location)) {
            return location.getText();
        }
        // Try to get the local symbol if we're dealing with an 'export default'
        // since that symbol has the "true" name.
        var localExportDefaultSymbol = ts.getLocalSymbolForExportDefault(symbol);
        var name = typeChecker.symbolToString(localExportDefaultSymbol || symbol);
        return name;
    }
    ts.getDeclaredName = getDeclaredName;
    function isImportOrExportSpecifierName(location) {
        return location.parent &&
            (location.parent.kind === ts.SyntaxKind.ImportSpecifier || location.parent.kind === ts.SyntaxKind.ExportSpecifier) &&
            location.parent.propertyName === location;
    }
    ts.isImportOrExportSpecifierName = isImportOrExportSpecifierName;
    /**
     * Strip off existed single quotes or double quotes from a given string
     *
     * @return non-quoted string
     */
    function stripQuotes(name) {
        var length = name.length;
        if (length >= 2 &&
            name.charCodeAt(0) === name.charCodeAt(length - 1) &&
            (name.charCodeAt(0) === ts.CharacterCodes.doubleQuote || name.charCodeAt(0) === ts.CharacterCodes.singleQuote)) {
            return name.substring(1, length - 1);
        }
        ;
        return name;
    }
    ts.stripQuotes = stripQuotes;
})(ts || (ts = {}));
//# sourceMappingURL=utilities.js.map