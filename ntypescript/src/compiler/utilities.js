/// <reference path="binder.ts" />
/* @internal */
var ts;
(function (ts) {
    function getDeclarationOfKind(symbol, kind) {
        var declarations = symbol.declarations;
        if (declarations) {
            for (var _i = 0; _i < declarations.length; _i++) {
                var declaration = declarations[_i];
                if (declaration.kind === kind) {
                    return declaration;
                }
            }
        }
        return undefined;
    }
    ts.getDeclarationOfKind = getDeclarationOfKind;
    // Pool writers to avoid needing to allocate them for every symbol we write.
    var stringWriters = [];
    function getSingleLineStringWriter() {
        if (stringWriters.length === 0) {
            var str = "";
            var writeText = function (text) { return str += text; };
            return {
                string: function () { return str; },
                writeKeyword: writeText,
                writeOperator: writeText,
                writePunctuation: writeText,
                writeSpace: writeText,
                writeStringLiteral: writeText,
                writeParameter: writeText,
                writeSymbol: writeText,
                // Completely ignore indentation for string writers.  And map newlines to
                // a single space.
                writeLine: function () { return str += " "; },
                increaseIndent: function () { },
                decreaseIndent: function () { },
                clear: function () { return str = ""; },
                trackSymbol: function () { }
            };
        }
        return stringWriters.pop();
    }
    ts.getSingleLineStringWriter = getSingleLineStringWriter;
    function releaseStringWriter(writer) {
        writer.clear();
        stringWriters.push(writer);
    }
    ts.releaseStringWriter = releaseStringWriter;
    function getFullWidth(node) {
        return node.end - node.pos;
    }
    ts.getFullWidth = getFullWidth;
    function arrayIsEqualTo(arr1, arr2, comparer) {
        if (!arr1 || !arr2) {
            return arr1 === arr2;
        }
        if (arr1.length !== arr2.length) {
            return false;
        }
        for (var i = 0; i < arr1.length; ++i) {
            var equals = comparer ? comparer(arr1[i], arr2[i]) : arr1[i] === arr2[i];
            if (!equals) {
                return false;
            }
        }
        return true;
    }
    ts.arrayIsEqualTo = arrayIsEqualTo;
    function hasResolvedModule(sourceFile, moduleNameText) {
        return sourceFile.resolvedModules && ts.hasProperty(sourceFile.resolvedModules, moduleNameText);
    }
    ts.hasResolvedModule = hasResolvedModule;
    function getResolvedModule(sourceFile, moduleNameText) {
        return hasResolvedModule(sourceFile, moduleNameText) ? sourceFile.resolvedModules[moduleNameText] : undefined;
    }
    ts.getResolvedModule = getResolvedModule;
    function setResolvedModule(sourceFile, moduleNameText, resolvedModule) {
        if (!sourceFile.resolvedModules) {
            sourceFile.resolvedModules = {};
        }
        sourceFile.resolvedModules[moduleNameText] = resolvedModule;
    }
    ts.setResolvedModule = setResolvedModule;
    // Returns true if this node contains a parse error anywhere underneath it.
    function containsParseError(node) {
        aggregateChildData(node);
        return (node.parserContextFlags & ts.ParserContextFlags.ThisNodeOrAnySubNodesHasError) !== 0;
    }
    ts.containsParseError = containsParseError;
    function aggregateChildData(node) {
        if (!(node.parserContextFlags & ts.ParserContextFlags.HasAggregatedChildData)) {
            // A node is considered to contain a parse error if:
            //  a) the parser explicitly marked that it had an error
            //  b) any of it's children reported that it had an error.
            var thisNodeOrAnySubNodesHasError = ((node.parserContextFlags & ts.ParserContextFlags.ThisNodeHasError) !== 0) ||
                ts.forEachChild(node, containsParseError);
            // If so, mark ourselves accordingly.
            if (thisNodeOrAnySubNodesHasError) {
                node.parserContextFlags |= ts.ParserContextFlags.ThisNodeOrAnySubNodesHasError;
            }
            // Also mark that we've propogated the child information to this node.  This way we can
            // always consult the bit directly on this node without needing to check its children
            // again.
            node.parserContextFlags |= ts.ParserContextFlags.HasAggregatedChildData;
        }
    }
    function getSourceFileOfNode(node) {
        while (node && node.kind !== ts.SyntaxKind.SourceFile) {
            node = node.parent;
        }
        return node;
    }
    ts.getSourceFileOfNode = getSourceFileOfNode;
    function getStartPositionOfLine(line, sourceFile) {
        ts.Debug.assert(line >= 0);
        return ts.getLineStarts(sourceFile)[line];
    }
    ts.getStartPositionOfLine = getStartPositionOfLine;
    // This is a useful function for debugging purposes.
    function nodePosToString(node) {
        var file = getSourceFileOfNode(node);
        var loc = ts.getLineAndCharacterOfPosition(file, node.pos);
        return file.fileName + "(" + (loc.line + 1) + "," + (loc.character + 1) + ")";
    }
    ts.nodePosToString = nodePosToString;
    function getStartPosOfNode(node) {
        return node.pos;
    }
    ts.getStartPosOfNode = getStartPosOfNode;
    // Returns true if this node is missing from the actual source code.  'missing' is different
    // from 'undefined/defined'.  When a node is undefined (which can happen for optional nodes
    // in the tree), it is definitel missing.  HOwever, a node may be defined, but still be
    // missing.  This happens whenever the parser knows it needs to parse something, but can't
    // get anything in the source code that it expects at that location.  For example:
    //
    //          let a: ;
    //
    // Here, the Type in the Type-Annotation is not-optional (as there is a colon in the source
    // code).  So the parser will attempt to parse out a type, and will create an actual node.
    // However, this node will be 'missing' in the sense that no actual source-code/tokens are
    // contained within it.
    function nodeIsMissing(node) {
        if (!node) {
            return true;
        }
        return node.pos === node.end && node.pos >= 0 && node.kind !== ts.SyntaxKind.EndOfFileToken;
    }
    ts.nodeIsMissing = nodeIsMissing;
    function nodeIsPresent(node) {
        return !nodeIsMissing(node);
    }
    ts.nodeIsPresent = nodeIsPresent;
    function getTokenPosOfNode(node, sourceFile) {
        // With nodes that have no width (i.e. 'Missing' nodes), we actually *don't*
        // want to skip trivia because this will launch us forward to the next token.
        if (nodeIsMissing(node)) {
            return node.pos;
        }
        return ts.skipTrivia((sourceFile || getSourceFileOfNode(node)).text, node.pos);
    }
    ts.getTokenPosOfNode = getTokenPosOfNode;
    function getNonDecoratorTokenPosOfNode(node, sourceFile) {
        if (nodeIsMissing(node) || !node.decorators) {
            return getTokenPosOfNode(node, sourceFile);
        }
        return ts.skipTrivia((sourceFile || getSourceFileOfNode(node)).text, node.decorators.end);
    }
    ts.getNonDecoratorTokenPosOfNode = getNonDecoratorTokenPosOfNode;
    function getSourceTextOfNodeFromSourceFile(sourceFile, node, includeTrivia) {
        if (includeTrivia === void 0) { includeTrivia = false; }
        if (nodeIsMissing(node) /* [ConcreteTypeScript]: */ || !sourceFile) {
            return "";
        }
        var text = sourceFile.text;
        return text.substring(includeTrivia ? node.pos : ts.skipTrivia(text, node.pos), node.end);
    }
    ts.getSourceTextOfNodeFromSourceFile = getSourceTextOfNodeFromSourceFile;
    function getTextOfNodeFromSourceText(sourceText, node) {
        if (nodeIsMissing(node)) {
            return "";
        }
        return sourceText.substring(ts.skipTrivia(sourceText, node.pos), node.end);
    }
    ts.getTextOfNodeFromSourceText = getTextOfNodeFromSourceText;
    function getTextOfNode(node, includeTrivia) {
        if (includeTrivia === void 0) { includeTrivia = false; }
        return getSourceTextOfNodeFromSourceFile(getSourceFileOfNode(node), node, includeTrivia);
    }
    ts.getTextOfNode = getTextOfNode;
    // Add an extra underscore to identifiers that start with two underscores to avoid issues with magic names like '__proto__'
    function escapeIdentifier(identifier) {
        return identifier.length >= 2 && identifier.charCodeAt(0) === ts.CharacterCodes._ && identifier.charCodeAt(1) === ts.CharacterCodes._ ? "_" + identifier : identifier;
    }
    ts.escapeIdentifier = escapeIdentifier;
    // Remove extra underscore from escaped identifier
    function unescapeIdentifier(identifier) {
        return identifier.length >= 3 && identifier.charCodeAt(0) === ts.CharacterCodes._ && identifier.charCodeAt(1) === ts.CharacterCodes._ && identifier.charCodeAt(2) === ts.CharacterCodes._ ? identifier.substr(1) : identifier;
    }
    ts.unescapeIdentifier = unescapeIdentifier;
    // Make an identifier from an external module name by extracting the string after the last "/" and replacing
    // all non-alphanumeric characters with underscores
    function makeIdentifierFromModuleName(moduleName) {
        return ts.getBaseFileName(moduleName).replace(/^(\d)/, "_$1").replace(/\W/g, "_");
    }
    ts.makeIdentifierFromModuleName = makeIdentifierFromModuleName;
    function isBlockOrCatchScoped(declaration) {
        return (getCombinedNodeFlags(declaration) & ts.NodeFlags.BlockScoped) !== 0 ||
            isCatchClauseVariableDeclaration(declaration);
    }
    ts.isBlockOrCatchScoped = isBlockOrCatchScoped;
    // Gets the nearest enclosing block scope container that has the provided node
    // as a descendant, that is not the provided node.
    function getEnclosingBlockScopeContainer(node) {
        var current = node.parent;
        while (current) {
            if (isFunctionLike(current)) {
                return current;
            }
            switch (current.kind) {
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.CaseBlock:
                case ts.SyntaxKind.CatchClause:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                    return current;
                case ts.SyntaxKind.Block:
                    // function block is not considered block-scope container
                    // see comment in binder.ts: bind(...), case for SyntaxKind.Block
                    if (!isFunctionLike(current.parent)) {
                        return current;
                    }
            }
            current = current.parent;
        }
    }
    ts.getEnclosingBlockScopeContainer = getEnclosingBlockScopeContainer;
    function isCatchClauseVariableDeclaration(declaration) {
        return declaration &&
            declaration.kind === ts.SyntaxKind.VariableDeclaration &&
            declaration.parent &&
            declaration.parent.kind === ts.SyntaxKind.CatchClause;
    }
    ts.isCatchClauseVariableDeclaration = isCatchClauseVariableDeclaration;
    // Return display name of an identifier
    // Computed property names will just be emitted as "[<expr>]", where <expr> is the source
    // text of the expression in the computed property.
    function declarationNameToString(name) {
        return getFullWidth(name) === 0 ? "(Missing)" : getTextOfNode(name);
    }
    ts.declarationNameToString = declarationNameToString;
    function createDiagnosticForNode(node, message, arg0, arg1, arg2) {
        var sourceFile = getSourceFileOfNode(node);
        var span = getErrorSpanForNode(sourceFile, node);
        return ts.createFileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2);
    }
    ts.createDiagnosticForNode = createDiagnosticForNode;
    function createDiagnosticForNodeFromMessageChain(node, messageChain) {
        var sourceFile = getSourceFileOfNode(node);
        var span = getErrorSpanForNode(sourceFile, node);
        return {
            file: sourceFile,
            start: span.start,
            length: span.length,
            code: messageChain.code,
            category: messageChain.category,
            messageText: messageChain.next ? messageChain : messageChain.messageText
        };
    }
    ts.createDiagnosticForNodeFromMessageChain = createDiagnosticForNodeFromMessageChain;
    function getSpanOfTokenAtPosition(sourceFile, pos) {
        var scanner = ts.createScanner(sourceFile.languageVersion, /*skipTrivia*/ true, sourceFile.languageVariant, sourceFile.text, /*onError:*/ undefined, pos);
        scanner.scan();
        var start = scanner.getTokenPos();
        return ts.createTextSpanFromBounds(start, scanner.getTextPos());
    }
    ts.getSpanOfTokenAtPosition = getSpanOfTokenAtPosition;
    function getErrorSpanForNode(sourceFile, node) {
        var errorNode = node;
        switch (node.kind) {
            case ts.SyntaxKind.SourceFile:
                var pos_1 = ts.skipTrivia(sourceFile.text, 0, /*stopAfterLineBreak*/ false);
                if (pos_1 === sourceFile.text.length) {
                    // file is empty - return span for the beginning of the file
                    return ts.createTextSpan(0, 0);
                }
                return getSpanOfTokenAtPosition(sourceFile, pos_1);
            // This list is a work in progress. Add missing node kinds to improve their error
            // spans.
            case ts.SyntaxKind.VariableDeclaration:
            case ts.SyntaxKind.BindingElement:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.ModuleDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
                errorNode = node.name;
                break;
        }
        if (errorNode === undefined) {
            // If we don't have a better node, then just set the error on the first token of
            // construct.
            return getSpanOfTokenAtPosition(sourceFile, node.pos);
        }
        var pos = nodeIsMissing(errorNode)
            ? errorNode.pos
            : ts.skipTrivia(sourceFile.text, errorNode.pos);
        return ts.createTextSpanFromBounds(pos, errorNode.end);
    }
    ts.getErrorSpanForNode = getErrorSpanForNode;
    function isExternalModule(file) {
        return file.externalModuleIndicator !== undefined;
    }
    ts.isExternalModule = isExternalModule;
    function isDeclarationFile(file) {
        return (file.flags & ts.NodeFlags.DeclarationFile) !== 0;
    }
    ts.isDeclarationFile = isDeclarationFile;
    function isConstEnumDeclaration(node) {
        return node.kind === ts.SyntaxKind.EnumDeclaration && isConst(node);
    }
    ts.isConstEnumDeclaration = isConstEnumDeclaration;
    function walkUpBindingElementsAndPatterns(node) {
        while (node && (node.kind === ts.SyntaxKind.BindingElement || isBindingPattern(node))) {
            node = node.parent;
        }
        return node;
    }
    // Returns the node flags for this node and all relevant parent nodes.  This is done so that
    // nodes like variable declarations and binding elements can returned a view of their flags
    // that includes the modifiers from their container.  i.e. flags like export/declare aren't
    // stored on the variable declaration directly, but on the containing variable statement
    // (if it has one).  Similarly, flags for let/const are store on the variable declaration
    // list.  By calling this function, all those flags are combined so that the client can treat
    // the node as if it actually had those flags.
    function getCombinedNodeFlags(node) {
        node = walkUpBindingElementsAndPatterns(node);
        var flags = node.flags;
        if (node.kind === ts.SyntaxKind.VariableDeclaration) {
            node = node.parent;
        }
        if (node && node.kind === ts.SyntaxKind.VariableDeclarationList) {
            flags |= node.flags;
            node = node.parent;
        }
        if (node && node.kind === ts.SyntaxKind.VariableStatement) {
            flags |= node.flags;
        }
        return flags;
    }
    ts.getCombinedNodeFlags = getCombinedNodeFlags;
    function isConst(node) {
        return !!(getCombinedNodeFlags(node) & ts.NodeFlags.Const);
    }
    ts.isConst = isConst;
    function isLet(node) {
        return !!(getCombinedNodeFlags(node) & ts.NodeFlags.Let);
    }
    ts.isLet = isLet;
    function isPrologueDirective(node) {
        return node.kind === ts.SyntaxKind.ExpressionStatement && node.expression.kind === ts.SyntaxKind.StringLiteral;
    }
    ts.isPrologueDirective = isPrologueDirective;
    function getLeadingCommentRangesOfNode(node, sourceFileOfNode) {
        return ts.getLeadingCommentRanges(sourceFileOfNode.text, node.pos);
    }
    ts.getLeadingCommentRangesOfNode = getLeadingCommentRangesOfNode;
    function getJsDocComments(node, sourceFileOfNode) {
        var commentRanges = (node.kind === ts.SyntaxKind.Parameter || node.kind === ts.SyntaxKind.TypeParameter) ?
            ts.concatenate(ts.getTrailingCommentRanges(sourceFileOfNode.text, node.pos), ts.getLeadingCommentRanges(sourceFileOfNode.text, node.pos)) :
            getLeadingCommentRangesOfNode(node, sourceFileOfNode);
        return ts.filter(commentRanges, isJsDocComment);
        function isJsDocComment(comment) {
            // True if the comment starts with '/**' but not if it is '/**/'
            return sourceFileOfNode.text.charCodeAt(comment.pos + 1) === ts.CharacterCodes.asterisk &&
                sourceFileOfNode.text.charCodeAt(comment.pos + 2) === ts.CharacterCodes.asterisk &&
                sourceFileOfNode.text.charCodeAt(comment.pos + 3) !== ts.CharacterCodes.slash;
        }
    }
    ts.getJsDocComments = getJsDocComments;
    ts.fullTripleSlashReferencePathRegEx = /^(\/\/\/\s*<reference\s+path\s*=\s*)('|")(.+?)\2.*?\/>/;
    ts.fullTripleSlashAMDReferencePathRegEx = /^(\/\/\/\s*<amd-dependency\s+path\s*=\s*)('|")(.+?)\2.*?\/>/;
    function isTypeNode(node) {
        if (ts.SyntaxKind.FirstTypeNode <= node.kind && node.kind <= ts.SyntaxKind.LastTypeNode) {
            return true;
        }
        switch (node.kind) {
            case ts.SyntaxKind.AnyKeyword:
            case ts.SyntaxKind.NumberKeyword:
            case ts.SyntaxKind.StringKeyword:
            case ts.SyntaxKind.BooleanKeyword:
            case ts.SyntaxKind.SymbolKeyword:
            case ts.SyntaxKind.BecomesType:
                return true;
            case ts.SyntaxKind.VoidKeyword:
                return node.parent.kind !== ts.SyntaxKind.VoidExpression;
            case ts.SyntaxKind.StringLiteral:
                // Specialized signatures can have string literals as their parameters' type names
                return node.parent.kind === ts.SyntaxKind.Parameter;
            case ts.SyntaxKind.ExpressionWithTypeArguments:
                return !isExpressionWithTypeArgumentsInClassExtendsClause(node);
            // Identifiers and qualified names may be type nodes, depending on their context. Climb
            // above them to find the lowest container
            case ts.SyntaxKind.Identifier:
                // If the identifier is the RHS of a qualified name, then it's a type iff its parent is.
                if (node.parent.kind === ts.SyntaxKind.QualifiedName && node.parent.right === node) {
                    node = node.parent;
                }
                else if (node.parent.kind === ts.SyntaxKind.PropertyAccessExpression && node.parent.name === node) {
                    node = node.parent;
                }
            // fall through
            case ts.SyntaxKind.QualifiedName:
            case ts.SyntaxKind.PropertyAccessExpression:
                // At this point, node is either a qualified name or an identifier
                ts.Debug.assert(node.kind === ts.SyntaxKind.Identifier || node.kind === ts.SyntaxKind.QualifiedName || node.kind === ts.SyntaxKind.PropertyAccessExpression, "'node' was expected to be a qualified name, identifier or property access in 'isTypeNode'.");
                var parent_1 = node.parent;
                if (parent_1.kind === ts.SyntaxKind.TypeQuery) {
                    return false;
                }
                // Do not recursively call isTypeNode on the parent. In the example:
                //
                //     let a: A.B.C;
                //
                // Calling isTypeNode would consider the qualified name A.B a type node. Only C or
                // A.B.C is a type node.
                if (ts.SyntaxKind.FirstTypeNode <= parent_1.kind && parent_1.kind <= ts.SyntaxKind.LastTypeNode) {
                    return true;
                }
                switch (parent_1.kind) {
                    case ts.SyntaxKind.ExpressionWithTypeArguments:
                        return !isExpressionWithTypeArgumentsInClassExtendsClause(parent_1);
                    case ts.SyntaxKind.TypeParameter:
                        return node === parent_1.constraint;
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.PropertySignature:
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.VariableDeclaration:
                        return node === parent_1.type;
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.ArrowFunction:
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                        return node === parent_1.type;
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.ConstructSignature:
                    case ts.SyntaxKind.IndexSignature:
                        return node === parent_1.type;
                    case ts.SyntaxKind.TypeAssertionExpression:
                        return node === parent_1.type;
                    case ts.SyntaxKind.CallExpression:
                    case ts.SyntaxKind.NewExpression:
                        return parent_1.typeArguments && ts.indexOf(parent_1.typeArguments, node) >= 0;
                    case ts.SyntaxKind.TaggedTemplateExpression:
                        // TODO (drosen): TaggedTemplateExpressions may eventually support type arguments.
                        return false;
                }
        }
        return false;
    }
    ts.isTypeNode = isTypeNode;
    // Warning: This has the same semantics as the forEach family of functions,
    //          in that traversal terminates in the event that 'visitor' supplies a truthy value.
    function forEachReturnStatement(body, visitor) {
        return traverse(body);
        function traverse(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ReturnStatement:
                    return visitor(node);
                case ts.SyntaxKind.CaseBlock:
                case ts.SyntaxKind.Block:
                case ts.SyntaxKind.IfStatement:
                case ts.SyntaxKind.DoStatement:
                case ts.SyntaxKind.WhileStatement:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                case ts.SyntaxKind.WithStatement:
                case ts.SyntaxKind.SwitchStatement:
                case ts.SyntaxKind.CaseClause:
                case ts.SyntaxKind.DefaultClause:
                case ts.SyntaxKind.LabeledStatement:
                case ts.SyntaxKind.TryStatement:
                case ts.SyntaxKind.CatchClause:
                    return ts.forEachChild(node, traverse);
            }
        }
    }
    ts.forEachReturnStatement = forEachReturnStatement;
    function forEachYieldExpression(body, visitor) {
        return traverse(body);
        function traverse(node) {
            switch (node.kind) {
                case ts.SyntaxKind.YieldExpression:
                    visitor(node);
                    var operand = node.expression;
                    if (operand) {
                        traverse(operand);
                    }
                case ts.SyntaxKind.EnumDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.TypeAliasDeclaration:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.ClassExpression:
                    // These are not allowed inside a generator now, but eventually they may be allowed
                    // as local types. Regardless, any yield statements contained within them should be
                    // skipped in this traversal.
                    return;
                default:
                    if (isFunctionLike(node)) {
                        var name_1 = node.name;
                        if (name_1 && name_1.kind === ts.SyntaxKind.ComputedPropertyName) {
                            // Note that we will not include methods/accessors of a class because they would require
                            // first descending into the class. This is by design.
                            traverse(name_1.expression);
                            return;
                        }
                    }
                    else if (!isTypeNode(node)) {
                        // This is the general case, which should include mostly expressions and statements.
                        // Also includes NodeArrays.
                        ts.forEachChild(node, traverse);
                    }
            }
        }
    }
    ts.forEachYieldExpression = forEachYieldExpression;
    function isVariableLike(node) {
        if (node) {
            switch (node.kind) {
                case ts.SyntaxKind.BindingElement:
                case ts.SyntaxKind.EnumMember:
                case ts.SyntaxKind.Parameter:
                case ts.SyntaxKind.PropertyAssignment:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.ShorthandPropertyAssignment:
                case ts.SyntaxKind.VariableDeclaration:
                    return true;
            }
        }
        return false;
    }
    ts.isVariableLike = isVariableLike;
    function isAccessor(node) {
        return node && (node.kind === ts.SyntaxKind.GetAccessor || node.kind === ts.SyntaxKind.SetAccessor);
    }
    ts.isAccessor = isAccessor;
    function isClassLike(node) {
        return node && (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.ClassExpression);
    }
    ts.isClassLike = isClassLike;
    function isFunctionLike(node) {
        if (node) {
            switch (node.kind) {
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.ArrowFunction:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.ConstructSignature:
                case ts.SyntaxKind.IndexSignature:
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                    return true;
            }
        }
        return false;
    }
    ts.isFunctionLike = isFunctionLike;
    function introducesArgumentsExoticObject(node) {
        switch (node.kind) {
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
                return true;
        }
        return false;
    }
    ts.introducesArgumentsExoticObject = introducesArgumentsExoticObject;
    function isFunctionBlock(node) {
        return node && node.kind === ts.SyntaxKind.Block && isFunctionLike(node.parent);
    }
    ts.isFunctionBlock = isFunctionBlock;
    function isObjectLiteralMethod(node) {
        return node && node.kind === ts.SyntaxKind.MethodDeclaration && node.parent.kind === ts.SyntaxKind.ObjectLiteralExpression;
    }
    ts.isObjectLiteralMethod = isObjectLiteralMethod;
    function getContainingFunction(node) {
        while (true) {
            node = node.parent;
            if (!node || isFunctionLike(node)) {
                return node;
            }
        }
    }
    ts.getContainingFunction = getContainingFunction;
    function getContainingClass(node) {
        while (true) {
            node = node.parent;
            if (!node || isClassLike(node)) {
                return node;
            }
        }
    }
    ts.getContainingClass = getContainingClass;
    function getThisContainer(node, includeArrowFunctions) {
        while (true) {
            node = node.parent;
            if (!node) {
                return undefined;
            }
            switch (node.kind) {
                case ts.SyntaxKind.ComputedPropertyName:
                    // If the grandparent node is an object literal (as opposed to a class),
                    // then the computed property is not a 'this' container.
                    // A computed property name in a class needs to be a this container
                    // so that we can error on it.
                    if (isClassLike(node.parent.parent)) {
                        return node;
                    }
                    // If this is a computed property, then the parent should not
                    // make it a this container. The parent might be a property
                    // in an object literal, like a method or accessor. But in order for
                    // such a parent to be a this container, the reference must be in
                    // the *body* of the container.
                    node = node.parent;
                    break;
                case ts.SyntaxKind.Decorator:
                    // Decorators are always applied outside of the body of a class or method.
                    if (node.parent.kind === ts.SyntaxKind.Parameter && isClassElement(node.parent.parent)) {
                        // If the decorator's parent is a Parameter, we resolve the this container from
                        // the grandparent class declaration.
                        node = node.parent.parent;
                    }
                    else if (isClassElement(node.parent)) {
                        // If the decorator's parent is a class element, we resolve the 'this' container
                        // from the parent class declaration.
                        node = node.parent;
                    }
                    break;
                case ts.SyntaxKind.ArrowFunction:
                    if (!includeArrowFunctions) {
                        continue;
                    }
                // Fall through
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.EnumDeclaration:
                case ts.SyntaxKind.SourceFile:
                    return node;
            }
        }
    }
    ts.getThisContainer = getThisContainer;
    function getSuperContainer(node, includeFunctions) {
        while (true) {
            node = node.parent;
            if (!node)
                return node;
            switch (node.kind) {
                case ts.SyntaxKind.ComputedPropertyName:
                    // If the grandparent node is an object literal (as opposed to a class),
                    // then the computed property is not a 'super' container.
                    // A computed property name in a class needs to be a super container
                    // so that we can error on it.
                    if (isClassLike(node.parent.parent)) {
                        return node;
                    }
                    // If this is a computed property, then the parent should not
                    // make it a super container. The parent might be a property
                    // in an object literal, like a method or accessor. But in order for
                    // such a parent to be a super container, the reference must be in
                    // the *body* of the container.
                    node = node.parent;
                    break;
                case ts.SyntaxKind.Decorator:
                    // Decorators are always applied outside of the body of a class or method.
                    if (node.parent.kind === ts.SyntaxKind.Parameter && isClassElement(node.parent.parent)) {
                        // If the decorator's parent is a Parameter, we resolve the this container from
                        // the grandparent class declaration.
                        node = node.parent.parent;
                    }
                    else if (isClassElement(node.parent)) {
                        // If the decorator's parent is a class element, we resolve the 'this' container
                        // from the parent class declaration.
                        node = node.parent;
                    }
                    break;
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    if (!includeFunctions) {
                        continue;
                    }
                case ts.SyntaxKind.BrandPropertyDeclaration:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    return node;
            }
        }
    }
    ts.getSuperContainer = getSuperContainer;
    function getEntityNameFromTypeNode(node) {
        if (node) {
            switch (node.kind) {
                case ts.SyntaxKind.TypeReference:
                    return node.typeName;
                case ts.SyntaxKind.ExpressionWithTypeArguments:
                    return node.expression;
                case ts.SyntaxKind.Identifier:
                case ts.SyntaxKind.QualifiedName:
                    return node;
            }
        }
        return undefined;
    }
    ts.getEntityNameFromTypeNode = getEntityNameFromTypeNode;
    function getInvokedExpression(node) {
        if (node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
            return node.tag;
        }
        // Will either be a CallExpression, NewExpression, or Decorator.
        return node.expression;
    }
    ts.getInvokedExpression = getInvokedExpression;
    function nodeCanBeDecorated(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                // classes are valid targets
                return true;
            case ts.SyntaxKind.PropertyDeclaration:
                // property declarations are valid if their parent is a class declaration.
                return node.parent.kind === ts.SyntaxKind.ClassDeclaration;
            case ts.SyntaxKind.Parameter:
                // if the parameter's parent has a body and its grandparent is a class declaration, this is a valid target;
                return node.parent.body && node.parent.parent.kind === ts.SyntaxKind.ClassDeclaration;
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.MethodDeclaration:
                // if this method has a body and its parent is a class declaration, this is a valid target.
                return node.body && node.parent.kind === ts.SyntaxKind.ClassDeclaration;
        }
        return false;
    }
    ts.nodeCanBeDecorated = nodeCanBeDecorated;
    function nodeIsDecorated(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                if (node.decorators) {
                    return true;
                }
                return false;
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.Parameter:
                if (node.decorators) {
                    return true;
                }
                return false;
            case ts.SyntaxKind.GetAccessor:
                if (node.body && node.decorators) {
                    return true;
                }
                return false;
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.SetAccessor:
                if (node.body && node.decorators) {
                    return true;
                }
                return false;
        }
        return false;
    }
    ts.nodeIsDecorated = nodeIsDecorated;
    function childIsDecorated(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration:
                return ts.forEach(node.members, nodeOrChildIsDecorated);
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.SetAccessor:
                return ts.forEach(node.parameters, nodeIsDecorated);
        }
        return false;
    }
    ts.childIsDecorated = childIsDecorated;
    function nodeOrChildIsDecorated(node) {
        return nodeIsDecorated(node) || childIsDecorated(node);
    }
    ts.nodeOrChildIsDecorated = nodeOrChildIsDecorated;
    function isExpression(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ThisKeyword:
            case ts.SyntaxKind.SuperKeyword:
            case ts.SyntaxKind.NullKeyword:
            case ts.SyntaxKind.TrueKeyword:
            case ts.SyntaxKind.FalseKeyword:
            case ts.SyntaxKind.RegularExpressionLiteral:
            case ts.SyntaxKind.ArrayLiteralExpression:
            case ts.SyntaxKind.ObjectLiteralExpression:
            case ts.SyntaxKind.PropertyAccessExpression:
            case ts.SyntaxKind.ElementAccessExpression:
            case ts.SyntaxKind.CallExpression:
            case ts.SyntaxKind.NewExpression:
            case ts.SyntaxKind.TaggedTemplateExpression:
            case ts.SyntaxKind.AsExpression:
            case ts.SyntaxKind.TypeAssertionExpression:
            case ts.SyntaxKind.ParenthesizedExpression:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.ArrowFunction:
            case ts.SyntaxKind.VoidExpression:
            case ts.SyntaxKind.DeleteExpression:
            case ts.SyntaxKind.TypeOfExpression:
            case ts.SyntaxKind.PrefixUnaryExpression:
            case ts.SyntaxKind.PostfixUnaryExpression:
            case ts.SyntaxKind.BinaryExpression:
            case ts.SyntaxKind.ConditionalExpression:
            case ts.SyntaxKind.SpreadElementExpression:
            case ts.SyntaxKind.TemplateExpression:
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            case ts.SyntaxKind.OmittedExpression:
            case ts.SyntaxKind.JsxElement:
            case ts.SyntaxKind.JsxSelfClosingElement:
            case ts.SyntaxKind.YieldExpression:
                return true;
            case ts.SyntaxKind.QualifiedName:
                while (node.parent.kind === ts.SyntaxKind.QualifiedName) {
                    node = node.parent;
                }
                return node.parent.kind === ts.SyntaxKind.TypeQuery;
            case ts.SyntaxKind.Identifier:
                if (node.parent.kind === ts.SyntaxKind.TypeQuery) {
                    return true;
                }
            // fall through
            case ts.SyntaxKind.NumericLiteral:
            case ts.SyntaxKind.StringLiteral:
                var parent_2 = node.parent;
                switch (parent_2.kind) {
                    case ts.SyntaxKind.VariableDeclaration:
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.PropertySignature:
                    case ts.SyntaxKind.EnumMember:
                    case ts.SyntaxKind.PropertyAssignment:
                    case ts.SyntaxKind.BindingElement:
                        return parent_2.initializer === node;
                    case ts.SyntaxKind.ExpressionStatement:
                    case ts.SyntaxKind.IfStatement:
                    case ts.SyntaxKind.DoStatement:
                    case ts.SyntaxKind.WhileStatement:
                    case ts.SyntaxKind.ReturnStatement:
                    case ts.SyntaxKind.WithStatement:
                    case ts.SyntaxKind.SwitchStatement:
                    case ts.SyntaxKind.CaseClause:
                    case ts.SyntaxKind.ThrowStatement:
                    case ts.SyntaxKind.SwitchStatement:
                        return parent_2.expression === node;
                    case ts.SyntaxKind.ForStatement:
                        var forStatement = parent_2;
                        return (forStatement.initializer === node && forStatement.initializer.kind !== ts.SyntaxKind.VariableDeclarationList) ||
                            forStatement.condition === node ||
                            forStatement.incrementor === node;
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForOfStatement:
                        var forInStatement = parent_2;
                        return (forInStatement.initializer === node && forInStatement.initializer.kind !== ts.SyntaxKind.VariableDeclarationList) ||
                            forInStatement.expression === node;
                    case ts.SyntaxKind.TypeAssertionExpression:
                    case ts.SyntaxKind.AsExpression:
                        return node === parent_2.expression;
                    case ts.SyntaxKind.TemplateSpan:
                        return node === parent_2.expression;
                    case ts.SyntaxKind.ComputedPropertyName:
                        return node === parent_2.expression;
                    case ts.SyntaxKind.Decorator:
                    case ts.SyntaxKind.JsxExpression:
                        return true;
                    case ts.SyntaxKind.ExpressionWithTypeArguments:
                        return parent_2.expression === node && isExpressionWithTypeArgumentsInClassExtendsClause(parent_2);
                    default:
                        if (isExpression(parent_2)) {
                            return true;
                        }
                }
        }
        return false;
    }
    ts.isExpression = isExpression;
    function isInstantiatedModule(node, preserveConstEnums) {
        var moduleState = ts.getModuleInstanceState(node);
        return moduleState === ts.ModuleInstanceState.Instantiated ||
            (preserveConstEnums && moduleState === ts.ModuleInstanceState.ConstEnumOnly);
    }
    ts.isInstantiatedModule = isInstantiatedModule;
    function isExternalModuleImportEqualsDeclaration(node) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration && node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference;
    }
    ts.isExternalModuleImportEqualsDeclaration = isExternalModuleImportEqualsDeclaration;
    function getExternalModuleImportEqualsDeclarationExpression(node) {
        ts.Debug.assert(isExternalModuleImportEqualsDeclaration(node));
        return node.moduleReference.expression;
    }
    ts.getExternalModuleImportEqualsDeclarationExpression = getExternalModuleImportEqualsDeclarationExpression;
    function isInternalModuleImportEqualsDeclaration(node) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration && node.moduleReference.kind !== ts.SyntaxKind.ExternalModuleReference;
    }
    ts.isInternalModuleImportEqualsDeclaration = isInternalModuleImportEqualsDeclaration;
    function getExternalModuleName(node) {
        if (node.kind === ts.SyntaxKind.ImportDeclaration) {
            return node.moduleSpecifier;
        }
        if (node.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
            var reference = node.moduleReference;
            if (reference.kind === ts.SyntaxKind.ExternalModuleReference) {
                return reference.expression;
            }
        }
        if (node.kind === ts.SyntaxKind.ExportDeclaration) {
            return node.moduleSpecifier;
        }
    }
    ts.getExternalModuleName = getExternalModuleName;
    function hasQuestionToken(node) {
        if (node) {
            switch (node.kind) {
                case ts.SyntaxKind.Parameter:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.ShorthandPropertyAssignment:
                case ts.SyntaxKind.PropertyAssignment:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    return node.questionToken !== undefined;
            }
        }
        return false;
    }
    ts.hasQuestionToken = hasQuestionToken;
    function isJSDocConstructSignature(node) {
        return node.kind === ts.SyntaxKind.JSDocFunctionType &&
            node.parameters.length > 0 &&
            node.parameters[0].type.kind === ts.SyntaxKind.JSDocConstructorType;
    }
    ts.isJSDocConstructSignature = isJSDocConstructSignature;
    function getJSDocTag(node, kind) {
        if (node && node.jsDocComment) {
            for (var _i = 0, _a = node.jsDocComment.tags; _i < _a.length; _i++) {
                var tag = _a[_i];
                if (tag.kind === kind) {
                    return tag;
                }
            }
        }
    }
    function getJSDocTypeTag(node) {
        return getJSDocTag(node, ts.SyntaxKind.JSDocTypeTag);
    }
    ts.getJSDocTypeTag = getJSDocTypeTag;
    function getJSDocReturnTag(node) {
        return getJSDocTag(node, ts.SyntaxKind.JSDocReturnTag);
    }
    ts.getJSDocReturnTag = getJSDocReturnTag;
    function getJSDocTemplateTag(node) {
        return getJSDocTag(node, ts.SyntaxKind.JSDocTemplateTag);
    }
    ts.getJSDocTemplateTag = getJSDocTemplateTag;
    function getCorrespondingJSDocParameterTag(parameter) {
        if (parameter.name && parameter.name.kind === ts.SyntaxKind.Identifier) {
            // If it's a parameter, see if the parent has a jsdoc comment with an @param
            // annotation.
            var parameterName = parameter.name.text;
            var docComment = parameter.parent.jsDocComment;
            if (docComment) {
                return ts.forEach(docComment.tags, function (t) {
                    if (t.kind === ts.SyntaxKind.JSDocParameterTag) {
                        var parameterTag = t;
                        var name_2 = parameterTag.preParameterName || parameterTag.postParameterName;
                        if (name_2.text === parameterName) {
                            return t;
                        }
                    }
                });
            }
        }
    }
    ts.getCorrespondingJSDocParameterTag = getCorrespondingJSDocParameterTag;
    function hasRestParameter(s) {
        return isRestParameter(ts.lastOrUndefined(s.parameters));
    }
    ts.hasRestParameter = hasRestParameter;
    function isRestParameter(node) {
        if (node) {
            if (node.parserContextFlags & ts.ParserContextFlags.JavaScriptFile) {
                if (node.type && node.type.kind === ts.SyntaxKind.JSDocVariadicType) {
                    return true;
                }
                var paramTag = getCorrespondingJSDocParameterTag(node);
                if (paramTag && paramTag.typeExpression) {
                    return paramTag.typeExpression.type.kind === ts.SyntaxKind.JSDocVariadicType;
                }
            }
            return node.dotDotDotToken !== undefined;
        }
        return false;
    }
    ts.isRestParameter = isRestParameter;
    function isLiteralKind(kind) {
        return ts.SyntaxKind.FirstLiteralToken <= kind && kind <= ts.SyntaxKind.LastLiteralToken;
    }
    ts.isLiteralKind = isLiteralKind;
    function isTextualLiteralKind(kind) {
        return kind === ts.SyntaxKind.StringLiteral || kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
    }
    ts.isTextualLiteralKind = isTextualLiteralKind;
    function isTemplateLiteralKind(kind) {
        return ts.SyntaxKind.FirstTemplateToken <= kind && kind <= ts.SyntaxKind.LastTemplateToken;
    }
    ts.isTemplateLiteralKind = isTemplateLiteralKind;
    function isBindingPattern(node) {
        return !!node && (node.kind === ts.SyntaxKind.ArrayBindingPattern || node.kind === ts.SyntaxKind.ObjectBindingPattern);
    }
    ts.isBindingPattern = isBindingPattern;
    function isInAmbientContext(node) {
        while (node) {
            if (node.flags & (ts.NodeFlags.Ambient | ts.NodeFlags.DeclarationFile)) {
                return true;
            }
            node = node.parent;
        }
        return false;
    }
    ts.isInAmbientContext = isInAmbientContext;
    function isDeclaration(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ArrowFunction:
            case ts.SyntaxKind.BindingElement:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.ExportSpecifier:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.ImportClause:
            case ts.SyntaxKind.ImportEqualsDeclaration:
            case ts.SyntaxKind.ImportSpecifier:
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.ModuleDeclaration:
            case ts.SyntaxKind.NamespaceImport:
            case ts.SyntaxKind.Parameter:
            case ts.SyntaxKind.ThisParameter:
            case ts.SyntaxKind.PropertyAssignment:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.ShorthandPropertyAssignment:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.TypeParameter:
            case ts.SyntaxKind.VariableDeclaration:
                return true;
        }
        return false;
    }
    ts.isDeclaration = isDeclaration;
    function isStatement(n) {
        switch (n.kind) {
            case ts.SyntaxKind.BreakStatement:
            case ts.SyntaxKind.ContinueStatement:
            case ts.SyntaxKind.DebuggerStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ExpressionStatement:
            case ts.SyntaxKind.EmptyStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.LabeledStatement:
            case ts.SyntaxKind.ReturnStatement:
            case ts.SyntaxKind.SwitchStatement:
            case ts.SyntaxKind.ThrowKeyword:
            case ts.SyntaxKind.TryStatement:
            case ts.SyntaxKind.VariableStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.WithStatement:
            case ts.SyntaxKind.ExportAssignment:
                return true;
            default:
                return false;
        }
    }
    ts.isStatement = isStatement;
    function isClassElement(n) {
        switch (n.kind) {
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.IndexSignature:
                return true;
            default:
                return false;
        }
    }
    ts.isClassElement = isClassElement;
    // True if the given identifier, string literal, or number literal is the name of a declaration node
    function isDeclarationName(name) {
        if (name.kind !== ts.SyntaxKind.Identifier && name.kind !== ts.SyntaxKind.StringLiteral && name.kind !== ts.SyntaxKind.NumericLiteral) {
            return false;
        }
        var parent = name.parent;
        if (parent.kind === ts.SyntaxKind.ImportSpecifier || parent.kind === ts.SyntaxKind.ExportSpecifier) {
            if (parent.propertyName) {
                return true;
            }
        }
        if (isDeclaration(parent)) {
            return parent.name === name;
        }
        return false;
    }
    ts.isDeclarationName = isDeclarationName;
    // Return true if the given identifier is classified as an IdentifierName
    function isIdentifierName(node) {
        var parent = node.parent;
        switch (parent.kind) {
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.PropertyAssignment:
            case ts.SyntaxKind.PropertyAccessExpression:
                // Name in member declaration or property name in property access
                return parent.name === node;
            case ts.SyntaxKind.QualifiedName:
                // Name on right hand side of dot in a type query
                if (parent.right === node) {
                    while (parent.kind === ts.SyntaxKind.QualifiedName) {
                        parent = parent.parent;
                    }
                    return parent.kind === ts.SyntaxKind.TypeQuery;
                }
                return false;
            case ts.SyntaxKind.BindingElement:
            case ts.SyntaxKind.ImportSpecifier:
                // Property name in binding element or import specifier
                return parent.propertyName === node;
            case ts.SyntaxKind.ExportSpecifier:
                // Any name in an export specifier
                return true;
        }
        return false;
    }
    ts.isIdentifierName = isIdentifierName;
    // An alias symbol is created by one of the following declarations:
    // import <symbol> = ...
    // import <symbol> from ...
    // import * as <symbol> from ...
    // import { x as <symbol> } from ...
    // export { x as <symbol> } from ...
    // export = ...
    // export default ...
    function isAliasSymbolDeclaration(node) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
            node.kind === ts.SyntaxKind.ImportClause && !!node.name ||
            node.kind === ts.SyntaxKind.NamespaceImport ||
            node.kind === ts.SyntaxKind.ImportSpecifier ||
            node.kind === ts.SyntaxKind.ExportSpecifier ||
            node.kind === ts.SyntaxKind.ExportAssignment && node.expression.kind === ts.SyntaxKind.Identifier;
    }
    ts.isAliasSymbolDeclaration = isAliasSymbolDeclaration;
    function getClassExtendsHeritageClauseElement(node) {
        var heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
        return heritageClause && heritageClause.types.length > 0 ? heritageClause.types[0] : undefined;
    }
    ts.getClassExtendsHeritageClauseElement = getClassExtendsHeritageClauseElement;
    function getClassImplementsHeritageClauseElements(node) {
        var heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ImplementsKeyword);
        return heritageClause ? heritageClause.types : undefined;
    }
    ts.getClassImplementsHeritageClauseElements = getClassImplementsHeritageClauseElements;
    // [/ConcreteTypeScript]
    function getDeclareTypeBaseTypeNodes(node) {
        var heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
        return heritageClause ? heritageClause.types : undefined;
    }
    ts.getDeclareTypeBaseTypeNodes = getDeclareTypeBaseTypeNodes;
    // [ConcreteTypeScript]
    function getInterfaceBaseTypeNodes(node) {
        var heritageClause = getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
        return heritageClause ? heritageClause.types : undefined;
    }
    ts.getInterfaceBaseTypeNodes = getInterfaceBaseTypeNodes;
    function getHeritageClause(clauses, kind) {
        if (clauses) {
            for (var _i = 0; _i < clauses.length; _i++) {
                var clause = clauses[_i];
                if (clause.token === kind) {
                    return clause;
                }
            }
        }
        return undefined;
    }
    ts.getHeritageClause = getHeritageClause;
    function tryResolveScriptReference(host, sourceFile, reference) {
        if (!host.getCompilerOptions().noResolve) {
            var referenceFileName = ts.isRootedDiskPath(reference.fileName) ? reference.fileName : ts.combinePaths(ts.getDirectoryPath(sourceFile.fileName), reference.fileName);
            referenceFileName = ts.getNormalizedAbsolutePath(referenceFileName, host.getCurrentDirectory());
            return host.getSourceFile(referenceFileName);
        }
    }
    ts.tryResolveScriptReference = tryResolveScriptReference;
    function getAncestor(node, kind) {
        while (node) {
            if (node.kind === kind) {
                return node;
            }
            node = node.parent;
        }
        return undefined;
    }
    ts.getAncestor = getAncestor;
    function getFileReferenceFromReferencePath(comment, commentRange) {
        var simpleReferenceRegEx = /^\/\/\/\s*<reference\s+/gim;
        var isNoDefaultLibRegEx = /^(\/\/\/\s*<reference\s+no-default-lib\s*=\s*)('|")(.+?)\2\s*\/>/gim;
        if (simpleReferenceRegEx.exec(comment)) {
            if (isNoDefaultLibRegEx.exec(comment)) {
                return {
                    isNoDefaultLib: true
                };
            }
            else {
                var matchResult = ts.fullTripleSlashReferencePathRegEx.exec(comment);
                if (matchResult) {
                    var start = commentRange.pos;
                    var end = commentRange.end;
                    return {
                        fileReference: {
                            pos: start,
                            end: end,
                            fileName: matchResult[3]
                        },
                        isNoDefaultLib: false
                    };
                }
                else {
                    return {
                        diagnosticMessage: ts.Diagnostics.Invalid_reference_directive_syntax,
                        isNoDefaultLib: false
                    };
                }
            }
        }
        return undefined;
    }
    ts.getFileReferenceFromReferencePath = getFileReferenceFromReferencePath;
    function isKeyword(token) {
        return ts.SyntaxKind.FirstKeyword <= token && token <= ts.SyntaxKind.LastKeyword;
    }
    ts.isKeyword = isKeyword;
    function isTrivia(token) {
        return ts.SyntaxKind.FirstTriviaToken <= token && token <= ts.SyntaxKind.LastTriviaToken;
    }
    ts.isTrivia = isTrivia;
    function isAsyncFunctionLike(node) {
        return isFunctionLike(node) && (node.flags & ts.NodeFlags.Async) !== 0 && !isAccessor(node);
    }
    ts.isAsyncFunctionLike = isAsyncFunctionLike;
    /**
     * A declaration has a dynamic name if both of the following are true:
     *   1. The declaration has a computed property name
     *   2. The computed name is *not* expressed as Symbol.<name>, where name
     *      is a property of the Symbol constructor that denotes a built in
     *      Symbol.
     */
    function hasDynamicName(declaration) {
        return declaration.name &&
            declaration.name.kind === ts.SyntaxKind.ComputedPropertyName &&
            !isWellKnownSymbolSyntactically(declaration.name.expression);
    }
    ts.hasDynamicName = hasDynamicName;
    /**
     * Checks if the expression is of the form:
     *    Symbol.name
     * where Symbol is literally the word "Symbol", and name is any identifierName
     */
    function isWellKnownSymbolSyntactically(node) {
        return node.kind === ts.SyntaxKind.PropertyAccessExpression && isESSymbolIdentifier(node.expression);
    }
    ts.isWellKnownSymbolSyntactically = isWellKnownSymbolSyntactically;
    function getPropertyNameForPropertyNameNode(name) {
        if (name.kind === ts.SyntaxKind.Identifier || name.kind === ts.SyntaxKind.StringLiteral || name.kind === ts.SyntaxKind.NumericLiteral) {
            return name.text;
        }
        if (name.kind === ts.SyntaxKind.ComputedPropertyName) {
            var nameExpression = name.expression;
            if (isWellKnownSymbolSyntactically(nameExpression)) {
                var rightHandSideName = nameExpression.name.text;
                return getPropertyNameForKnownSymbolName(rightHandSideName);
            }
        }
        return undefined;
    }
    ts.getPropertyNameForPropertyNameNode = getPropertyNameForPropertyNameNode;
    function getPropertyNameForKnownSymbolName(symbolName) {
        return "__@" + symbolName;
    }
    ts.getPropertyNameForKnownSymbolName = getPropertyNameForKnownSymbolName;
    /**
     * Includes the word "Symbol" with unicode escapes
     */
    function isESSymbolIdentifier(node) {
        return node.kind === ts.SyntaxKind.Identifier && node.text === "Symbol";
    }
    ts.isESSymbolIdentifier = isESSymbolIdentifier;
    function isModifier(token) {
        switch (token) {
            case ts.SyntaxKind.AbstractKeyword:
            case ts.SyntaxKind.AsyncKeyword:
            case ts.SyntaxKind.ConstKeyword:
            case ts.SyntaxKind.DeclareKeyword:
            case ts.SyntaxKind.DefaultKeyword:
            case ts.SyntaxKind.ExportKeyword:
            case ts.SyntaxKind.PublicKeyword:
            case ts.SyntaxKind.PrivateKeyword:
            case ts.SyntaxKind.ProtectedKeyword:
            case ts.SyntaxKind.StaticKeyword:
                return true;
        }
        return false;
    }
    ts.isModifier = isModifier;
    function isParameterDeclaration(node) {
        var root = getRootDeclaration(node);
        return root.kind === ts.SyntaxKind.Parameter;
    }
    ts.isParameterDeclaration = isParameterDeclaration;
    function getRootDeclaration(node) {
        while (node.kind === ts.SyntaxKind.BindingElement) {
            node = node.parent.parent;
        }
        return node;
    }
    ts.getRootDeclaration = getRootDeclaration;
    function nodeStartsNewLexicalEnvironment(n) {
        return isFunctionLike(n) || n.kind === ts.SyntaxKind.ModuleDeclaration || n.kind === ts.SyntaxKind.SourceFile;
    }
    ts.nodeStartsNewLexicalEnvironment = nodeStartsNewLexicalEnvironment;
    function cloneEntityName(node) {
        if (node.kind === ts.SyntaxKind.Identifier) {
            var clone_1 = createSynthesizedNode(ts.SyntaxKind.Identifier);
            clone_1.text = node.text;
            return clone_1;
        }
        else {
            var clone_2 = createSynthesizedNode(ts.SyntaxKind.QualifiedName);
            clone_2.left = cloneEntityName(node.left);
            clone_2.left.parent = clone_2;
            clone_2.right = cloneEntityName(node.right);
            clone_2.right.parent = clone_2;
            return clone_2;
        }
    }
    ts.cloneEntityName = cloneEntityName;
    function nodeIsSynthesized(node) {
        return node.pos === -1;
    }
    ts.nodeIsSynthesized = nodeIsSynthesized;
    function createSynthesizedNode(kind, startsOnNewLine) {
        var node = ts.createNode(kind);
        node.startsOnNewLine = startsOnNewLine;
        return node;
    }
    ts.createSynthesizedNode = createSynthesizedNode;
    function createSynthesizedNodeArray() {
        var array = [];
        array.pos = -1;
        array.end = -1;
        return array;
    }
    ts.createSynthesizedNodeArray = createSynthesizedNodeArray;
    function createDiagnosticCollection() {
        var nonFileDiagnostics = [];
        var fileDiagnostics = {};
        var diagnosticsModified = false;
        var modificationCount = 0;
        return {
            add: add,
            getGlobalDiagnostics: getGlobalDiagnostics,
            getDiagnostics: getDiagnostics,
            getModificationCount: getModificationCount,
            reattachFileDiagnostics: reattachFileDiagnostics
        };
        function getModificationCount() {
            return modificationCount;
        }
        function reattachFileDiagnostics(newFile) {
            if (!ts.hasProperty(fileDiagnostics, newFile.fileName)) {
                return;
            }
            for (var _i = 0, _a = fileDiagnostics[newFile.fileName]; _i < _a.length; _i++) {
                var diagnostic = _a[_i];
                diagnostic.file = newFile;
            }
        }
        function add(diagnostic) {
            var diagnostics;
            if (diagnostic.file) {
                diagnostics = fileDiagnostics[diagnostic.file.fileName];
                if (!diagnostics) {
                    diagnostics = [];
                    fileDiagnostics[diagnostic.file.fileName] = diagnostics;
                }
            }
            else {
                diagnostics = nonFileDiagnostics;
            }
            diagnostics.push(diagnostic);
            diagnosticsModified = true;
            modificationCount++;
        }
        function getGlobalDiagnostics() {
            sortAndDeduplicate();
            return nonFileDiagnostics;
        }
        function getDiagnostics(fileName) {
            sortAndDeduplicate();
            if (fileName) {
                return fileDiagnostics[fileName] || [];
            }
            var allDiagnostics = [];
            function pushDiagnostic(d) {
                allDiagnostics.push(d);
            }
            ts.forEach(nonFileDiagnostics, pushDiagnostic);
            for (var key in fileDiagnostics) {
                if (ts.hasProperty(fileDiagnostics, key)) {
                    ts.forEach(fileDiagnostics[key], pushDiagnostic);
                }
            }
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function sortAndDeduplicate() {
            if (!diagnosticsModified) {
                return;
            }
            diagnosticsModified = false;
            nonFileDiagnostics = ts.sortAndDeduplicateDiagnostics(nonFileDiagnostics);
            for (var key in fileDiagnostics) {
                if (ts.hasProperty(fileDiagnostics, key)) {
                    fileDiagnostics[key] = ts.sortAndDeduplicateDiagnostics(fileDiagnostics[key]);
                }
            }
        }
    }
    ts.createDiagnosticCollection = createDiagnosticCollection;
    // This consists of the first 19 unprintable ASCII characters, canonical escapes, lineSeparator,
    // paragraphSeparator, and nextLine. The latter three are just desirable to suppress new lines in
    // the language service. These characters should be escaped when printing, and if any characters are added,
    // the map below must be updated. Note that this regexp *does not* include the 'delete' character.
    // There is no reason for this other than that JSON.stringify does not handle it either.
    var escapedCharsRegExp = /[\\\"\u0000-\u001f\t\v\f\b\r\n\u2028\u2029\u0085]/g;
    var escapedCharsMap = {
        "\0": "\\0",
        "\t": "\\t",
        "\v": "\\v",
        "\f": "\\f",
        "\b": "\\b",
        "\r": "\\r",
        "\n": "\\n",
        "\\": "\\\\",
        "\"": "\\\"",
        "\u2028": "\\u2028",
        "\u2029": "\\u2029",
        "\u0085": "\\u0085" // nextLine
    };
    /**
     * Based heavily on the abstract 'Quote'/'QuoteJSONString' operation from ECMA-262 (24.3.2.2),
     * but augmented for a few select characters (e.g. lineSeparator, paragraphSeparator, nextLine)
     * Note that this doesn't actually wrap the input in double quotes.
     */
    function escapeString(s) {
        s = escapedCharsRegExp.test(s) ? s.replace(escapedCharsRegExp, getReplacement) : s;
        return s;
        function getReplacement(c) {
            return escapedCharsMap[c] || get16BitUnicodeEscapeSequence(c.charCodeAt(0));
        }
    }
    ts.escapeString = escapeString;
    function isIntrinsicJsxName(name) {
        var ch = name.substr(0, 1);
        return ch.toLowerCase() === ch;
    }
    ts.isIntrinsicJsxName = isIntrinsicJsxName;
    function get16BitUnicodeEscapeSequence(charCode) {
        var hexCharCode = charCode.toString(16).toUpperCase();
        var paddedHexCode = ("0000" + hexCharCode).slice(-4);
        return "\\u" + paddedHexCode;
    }
    var nonAsciiCharacters = /[^\u0000-\u007F]/g;
    function escapeNonAsciiCharacters(s) {
        // Replace non-ASCII characters with '\uNNNN' escapes if any exist.
        // Otherwise just return the original string.
        return nonAsciiCharacters.test(s) ?
            s.replace(nonAsciiCharacters, function (c) { return get16BitUnicodeEscapeSequence(c.charCodeAt(0)); }) :
            s;
    }
    ts.escapeNonAsciiCharacters = escapeNonAsciiCharacters;
    var indentStrings = ["", "    "];
    function getIndentString(level) {
        if (indentStrings[level] === undefined) {
            indentStrings[level] = getIndentString(level - 1) + indentStrings[1];
        }
        return indentStrings[level];
    }
    ts.getIndentString = getIndentString;
    function getIndentSize() {
        return indentStrings[1].length;
    }
    ts.getIndentSize = getIndentSize;
    function createTextWriter(newLine) {
        var output = "";
        var indent = 0;
        var lineStart = true;
        var lineCount = 0;
        var linePos = 0;
        function write(s) {
            if (s && s.length) {
                if (lineStart) {
                    output += getIndentString(indent);
                    lineStart = false;
                }
                output += s;
            }
        }
        function rawWrite(s) {
            if (s !== undefined) {
                if (lineStart) {
                    lineStart = false;
                }
                output += s;
            }
        }
        function writeLiteral(s) {
            if (s && s.length) {
                write(s);
                var lineStartsOfS = ts.computeLineStarts(s);
                if (lineStartsOfS.length > 1) {
                    lineCount = lineCount + lineStartsOfS.length - 1;
                    linePos = output.length - s.length + ts.lastOrUndefined(lineStartsOfS);
                }
            }
        }
        function writeLine() {
            if (!lineStart) {
                output += newLine;
                lineCount++;
                linePos = output.length;
                lineStart = true;
            }
        }
        function writeTextOfNode(sourceFile, node) {
            write(getSourceTextOfNodeFromSourceFile(sourceFile, node));
        }
        return {
            write: write,
            rawWrite: rawWrite,
            writeTextOfNode: writeTextOfNode,
            writeLiteral: writeLiteral,
            writeLine: writeLine,
            increaseIndent: function () { return indent++; },
            decreaseIndent: function () { return indent--; },
            getIndent: function () { return indent; },
            getTextPos: function () { return output.length; },
            getLine: function () { return lineCount + 1; },
            getColumn: function () { return lineStart ? indent * getIndentSize() + 1 : output.length - linePos + 1; },
            getText: function () { return output; }
        };
    }
    ts.createTextWriter = createTextWriter;
    function getOwnEmitOutputFilePath(sourceFile, host, extension) {
        var compilerOptions = host.getCompilerOptions();
        var emitOutputFilePathWithoutExtension;
        if (compilerOptions.outDir) {
            emitOutputFilePathWithoutExtension = ts.removeFileExtension(getSourceFilePathInNewDir(sourceFile, host, compilerOptions.outDir));
        }
        else {
            emitOutputFilePathWithoutExtension = ts.removeFileExtension(sourceFile.fileName);
        }
        return emitOutputFilePathWithoutExtension + extension;
    }
    ts.getOwnEmitOutputFilePath = getOwnEmitOutputFilePath;
    function getSourceFilePathInNewDir(sourceFile, host, newDirPath) {
        var sourceFilePath = ts.getNormalizedAbsolutePath(sourceFile.fileName, host.getCurrentDirectory());
        sourceFilePath = sourceFilePath.replace(host.getCommonSourceDirectory(), "");
        return ts.combinePaths(newDirPath, sourceFilePath);
    }
    ts.getSourceFilePathInNewDir = getSourceFilePathInNewDir;
    function writeFile(host, diagnostics, fileName, data, writeByteOrderMark) {
        host.writeFile(fileName, data, writeByteOrderMark, function (hostErrorMessage) {
            diagnostics.push(ts.createCompilerDiagnostic(ts.Diagnostics.Could_not_write_file_0_Colon_1, fileName, hostErrorMessage));
        });
    }
    ts.writeFile = writeFile;
    function getLineOfLocalPosition(currentSourceFile, pos) {
        return ts.getLineAndCharacterOfPosition(currentSourceFile, pos).line;
    }
    ts.getLineOfLocalPosition = getLineOfLocalPosition;
    function getFirstConstructorWithBody(node) {
        return ts.forEach(node.members, function (member) {
            if (member.kind === ts.SyntaxKind.Constructor && nodeIsPresent(member.body)) {
                return member;
            }
        });
    }
    ts.getFirstConstructorWithBody = getFirstConstructorWithBody;
    function getSetAccessorTypeAnnotationNode(accessor) {
        return accessor && accessor.parameters.length > 0 && accessor.parameters[0].type;
    }
    ts.getSetAccessorTypeAnnotationNode = getSetAccessorTypeAnnotationNode;
    function shouldEmitToOwnFile(sourceFile, compilerOptions) {
        if (!isDeclarationFile(sourceFile)) {
            if ((isExternalModule(sourceFile) || !(compilerOptions.outFile || compilerOptions.out))) {
                // 1. in-browser single file compilation scenario
                // 2. non .js file
                return compilerOptions.isolatedModules || !ts.fileExtensionIs(sourceFile.fileName, ".js");
            }
            return false;
        }
        return false;
    }
    ts.shouldEmitToOwnFile = shouldEmitToOwnFile;
    function getAllAccessorDeclarations(declarations, accessor) {
        var firstAccessor;
        var secondAccessor;
        var getAccessor;
        var setAccessor;
        if (hasDynamicName(accessor)) {
            firstAccessor = accessor;
            if (accessor.kind === ts.SyntaxKind.GetAccessor) {
                getAccessor = accessor;
            }
            else if (accessor.kind === ts.SyntaxKind.SetAccessor) {
                setAccessor = accessor;
            }
            else {
                ts.Debug.fail("Accessor has wrong kind");
            }
        }
        else {
            ts.forEach(declarations, function (member) {
                if ((member.kind === ts.SyntaxKind.GetAccessor || member.kind === ts.SyntaxKind.SetAccessor)
                    && (member.flags & ts.NodeFlags.Static) === (accessor.flags & ts.NodeFlags.Static)) {
                    var memberName = getPropertyNameForPropertyNameNode(member.name);
                    var accessorName = getPropertyNameForPropertyNameNode(accessor.name);
                    if (memberName === accessorName) {
                        if (!firstAccessor) {
                            firstAccessor = member;
                        }
                        else if (!secondAccessor) {
                            secondAccessor = member;
                        }
                        if (member.kind === ts.SyntaxKind.GetAccessor && !getAccessor) {
                            getAccessor = member;
                        }
                        if (member.kind === ts.SyntaxKind.SetAccessor && !setAccessor) {
                            setAccessor = member;
                        }
                    }
                }
            });
        }
        return {
            firstAccessor: firstAccessor,
            secondAccessor: secondAccessor,
            getAccessor: getAccessor,
            setAccessor: setAccessor
        };
    }
    ts.getAllAccessorDeclarations = getAllAccessorDeclarations;
    function emitNewLineBeforeLeadingComments(currentSourceFile, writer, node, leadingComments) {
        // If the leading comments start on different line than the start of node, write new line
        if (leadingComments && leadingComments.length && node.pos !== leadingComments[0].pos &&
            getLineOfLocalPosition(currentSourceFile, node.pos) !== getLineOfLocalPosition(currentSourceFile, leadingComments[0].pos)) {
            writer.writeLine();
        }
    }
    ts.emitNewLineBeforeLeadingComments = emitNewLineBeforeLeadingComments;
    function emitComments(currentSourceFile, writer, comments, trailingSeparator, newLine, writeComment) {
        var emitLeadingSpace = !trailingSeparator;
        ts.forEach(comments, function (comment) {
            if (emitLeadingSpace) {
                writer.write(" ");
                emitLeadingSpace = false;
            }
            writeComment(currentSourceFile, writer, comment, newLine);
            if (comment.hasTrailingNewLine) {
                writer.writeLine();
            }
            else if (trailingSeparator) {
                writer.write(" ");
            }
            else {
                // Emit leading space to separate comment during next comment emit
                emitLeadingSpace = true;
            }
        });
    }
    ts.emitComments = emitComments;
    function writeCommentRange(currentSourceFile, writer, comment, newLine) {
        if (currentSourceFile.text.charCodeAt(comment.pos + 1) === ts.CharacterCodes.asterisk) {
            var firstCommentLineAndCharacter = ts.getLineAndCharacterOfPosition(currentSourceFile, comment.pos);
            var lineCount = ts.getLineStarts(currentSourceFile).length;
            var firstCommentLineIndent;
            for (var pos = comment.pos, currentLine = firstCommentLineAndCharacter.line; pos < comment.end; currentLine++) {
                var nextLineStart = (currentLine + 1) === lineCount
                    ? currentSourceFile.text.length + 1
                    : getStartPositionOfLine(currentLine + 1, currentSourceFile);
                if (pos !== comment.pos) {
                    // If we are not emitting first line, we need to write the spaces to adjust the alignment
                    if (firstCommentLineIndent === undefined) {
                        firstCommentLineIndent = calculateIndent(getStartPositionOfLine(firstCommentLineAndCharacter.line, currentSourceFile), comment.pos);
                    }
                    // These are number of spaces writer is going to write at current indent
                    var currentWriterIndentSpacing = writer.getIndent() * getIndentSize();
                    // Number of spaces we want to be writing
                    // eg: Assume writer indent
                    // module m {
                    //         /* starts at character 9 this is line 1
                    //    * starts at character pos 4 line                        --1  = 8 - 8 + 3
                    //   More left indented comment */                            --2  = 8 - 8 + 2
                    //     class c { }
                    // }
                    // module m {
                    //     /* this is line 1 -- Assume current writer indent 8
                    //      * line                                                --3 = 8 - 4 + 5
                    //            More right indented comment */                  --4 = 8 - 4 + 11
                    //     class c { }
                    // }
                    var spacesToEmit = currentWriterIndentSpacing - firstCommentLineIndent + calculateIndent(pos, nextLineStart);
                    if (spacesToEmit > 0) {
                        var numberOfSingleSpacesToEmit = spacesToEmit % getIndentSize();
                        var indentSizeSpaceString = getIndentString((spacesToEmit - numberOfSingleSpacesToEmit) / getIndentSize());
                        // Write indent size string ( in eg 1: = "", 2: "" , 3: string with 8 spaces 4: string with 12 spaces
                        writer.rawWrite(indentSizeSpaceString);
                        // Emit the single spaces (in eg: 1: 3 spaces, 2: 2 spaces, 3: 1 space, 4: 3 spaces)
                        while (numberOfSingleSpacesToEmit) {
                            writer.rawWrite(" ");
                            numberOfSingleSpacesToEmit--;
                        }
                    }
                    else {
                        // No spaces to emit write empty string
                        writer.rawWrite("");
                    }
                }
                // Write the comment line text
                writeTrimmedCurrentLine(pos, nextLineStart);
                pos = nextLineStart;
            }
        }
        else {
            // Single line comment of style //....
            writer.write(currentSourceFile.text.substring(comment.pos, comment.end));
        }
        function writeTrimmedCurrentLine(pos, nextLineStart) {
            var end = Math.min(comment.end, nextLineStart - 1);
            var currentLineText = currentSourceFile.text.substring(pos, end).replace(/^\s+|\s+$/g, "");
            if (currentLineText) {
                // trimmed forward and ending spaces text
                writer.write(currentLineText);
                if (end !== comment.end) {
                    writer.writeLine();
                }
            }
            else {
                // Empty string - make sure we write empty line
                writer.writeLiteral(newLine);
            }
        }
        function calculateIndent(pos, end) {
            var currentLineIndent = 0;
            for (; pos < end && ts.isWhiteSpace(currentSourceFile.text.charCodeAt(pos)); pos++) {
                if (currentSourceFile.text.charCodeAt(pos) === ts.CharacterCodes.tab) {
                    // Tabs = TabSize = indent size and go to next tabStop
                    currentLineIndent += getIndentSize() - (currentLineIndent % getIndentSize());
                }
                else {
                    // Single space
                    currentLineIndent++;
                }
            }
            return currentLineIndent;
        }
    }
    ts.writeCommentRange = writeCommentRange;
    function modifierToFlag(token) {
        switch (token) {
            case ts.SyntaxKind.StaticKeyword: return ts.NodeFlags.Static;
            case ts.SyntaxKind.PublicKeyword: return ts.NodeFlags.Public;
            case ts.SyntaxKind.ProtectedKeyword: return ts.NodeFlags.Protected;
            case ts.SyntaxKind.PrivateKeyword: return ts.NodeFlags.Private;
            case ts.SyntaxKind.AbstractKeyword: return ts.NodeFlags.Abstract;
            case ts.SyntaxKind.ExportKeyword: return ts.NodeFlags.Export;
            case ts.SyntaxKind.DeclareKeyword: return ts.NodeFlags.Ambient;
            case ts.SyntaxKind.ConstKeyword: return ts.NodeFlags.Const;
            case ts.SyntaxKind.DefaultKeyword: return ts.NodeFlags.Default;
            case ts.SyntaxKind.AsyncKeyword: return ts.NodeFlags.Async;
        }
        return 0;
    }
    ts.modifierToFlag = modifierToFlag;
    function isLeftHandSideExpression(expr) {
        if (expr) {
            switch (expr.kind) {
                case ts.SyntaxKind.PropertyAccessExpression:
                case ts.SyntaxKind.ElementAccessExpression:
                case ts.SyntaxKind.NewExpression:
                case ts.SyntaxKind.CallExpression:
                case ts.SyntaxKind.JsxElement:
                case ts.SyntaxKind.JsxSelfClosingElement:
                case ts.SyntaxKind.TaggedTemplateExpression:
                case ts.SyntaxKind.ArrayLiteralExpression:
                case ts.SyntaxKind.ParenthesizedExpression:
                case ts.SyntaxKind.ObjectLiteralExpression:
                case ts.SyntaxKind.ClassExpression:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.Identifier:
                case ts.SyntaxKind.RegularExpressionLiteral:
                case ts.SyntaxKind.NumericLiteral:
                case ts.SyntaxKind.StringLiteral:
                case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                case ts.SyntaxKind.TemplateExpression:
                case ts.SyntaxKind.FalseKeyword:
                case ts.SyntaxKind.NullKeyword:
                case ts.SyntaxKind.ThisKeyword:
                case ts.SyntaxKind.TrueKeyword:
                case ts.SyntaxKind.SuperKeyword:
                    return true;
            }
        }
        return false;
    }
    ts.isLeftHandSideExpression = isLeftHandSideExpression;
    function isAssignmentOperator(token) {
        return token >= ts.SyntaxKind.FirstAssignment && token <= ts.SyntaxKind.LastAssignment;
    }
    ts.isAssignmentOperator = isAssignmentOperator;
    function isExpressionWithTypeArgumentsInClassExtendsClause(node) {
        return node.kind === ts.SyntaxKind.ExpressionWithTypeArguments &&
            node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
            isClassLike(node.parent.parent);
    }
    ts.isExpressionWithTypeArgumentsInClassExtendsClause = isExpressionWithTypeArgumentsInClassExtendsClause;
    // Returns false if this heritage clause element's expression contains something unsupported
    // (i.e. not a name or dotted name).
    function isSupportedExpressionWithTypeArguments(node) {
        return isSupportedExpressionWithTypeArgumentsRest(node.expression);
    }
    ts.isSupportedExpressionWithTypeArguments = isSupportedExpressionWithTypeArguments;
    function isSupportedExpressionWithTypeArgumentsRest(node) {
        if (node.kind === ts.SyntaxKind.Identifier) {
            return true;
        }
        else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
            return isSupportedExpressionWithTypeArgumentsRest(node.expression);
        }
        else {
            return false;
        }
    }
    function isRightSideOfQualifiedNameOrPropertyAccess(node) {
        return (node.parent.kind === ts.SyntaxKind.QualifiedName && node.parent.right === node) ||
            (node.parent.kind === ts.SyntaxKind.PropertyAccessExpression && node.parent.name === node);
    }
    ts.isRightSideOfQualifiedNameOrPropertyAccess = isRightSideOfQualifiedNameOrPropertyAccess;
    function isEmptyObjectLiteralOrArrayLiteral(expression) {
        var kind = expression.kind;
        if (kind === ts.SyntaxKind.ObjectLiteralExpression) {
            return expression.properties.length === 0;
        }
        if (kind === ts.SyntaxKind.ArrayLiteralExpression) {
            return expression.elements.length === 0;
        }
        return false;
    }
    ts.isEmptyObjectLiteralOrArrayLiteral = isEmptyObjectLiteralOrArrayLiteral;
    function getLocalSymbolForExportDefault(symbol) {
        return symbol && symbol.valueDeclaration && (symbol.valueDeclaration.flags & ts.NodeFlags.Default) ? symbol.valueDeclaration.localSymbol : undefined;
    }
    ts.getLocalSymbolForExportDefault = getLocalSymbolForExportDefault;
    function isJavaScript(fileName) {
        return ts.fileExtensionIs(fileName, ".js");
    }
    ts.isJavaScript = isJavaScript;
    function isTsx(fileName) {
        return ts.fileExtensionIs(fileName, ".tsx");
    }
    ts.isTsx = isTsx;
    /**
     * Replace each instance of non-ascii characters by one, two, three, or four escape sequences
     * representing the UTF-8 encoding of the character, and return the expanded char code list.
     */
    function getExpandedCharCodes(input) {
        var output = [];
        var length = input.length;
        for (var i = 0; i < length; i++) {
            var charCode = input.charCodeAt(i);
            // handel utf8
            if (charCode < 0x80) {
                output.push(charCode);
            }
            else if (charCode < 0x800) {
                output.push((charCode >> 6) | 192);
                output.push((charCode & 63) | 128);
            }
            else if (charCode < 0x10000) {
                output.push((charCode >> 12) | 224);
                output.push(((charCode >> 6) & 63) | 128);
                output.push((charCode & 63) | 128);
            }
            else if (charCode < 0x20000) {
                output.push((charCode >> 18) | 240);
                output.push(((charCode >> 12) & 63) | 128);
                output.push(((charCode >> 6) & 63) | 128);
                output.push((charCode & 63) | 128);
            }
            else {
                ts.Debug.assert(false, "Unexpected code point");
            }
        }
        return output;
    }
    var base64Digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    /**
     * Converts a string to a base-64 encoded ASCII string.
     */
    function convertToBase64(input) {
        var result = "";
        var charCodes = getExpandedCharCodes(input);
        var i = 0;
        var length = charCodes.length;
        var byte1, byte2, byte3, byte4;
        while (i < length) {
            // Convert every 6-bits in the input 3 character points
            // into a base64 digit
            byte1 = charCodes[i] >> 2;
            byte2 = (charCodes[i] & 3) << 4 | charCodes[i + 1] >> 4;
            byte3 = (charCodes[i + 1] & 15) << 2 | charCodes[i + 2] >> 6;
            byte4 = charCodes[i + 2] & 63;
            // We are out of characters in the input, set the extra
            // digits to 64 (padding character).
            if (i + 1 >= length) {
                byte3 = byte4 = 64;
            }
            else if (i + 2 >= length) {
                byte4 = 64;
            }
            // Write to the ouput
            result += base64Digits.charAt(byte1) + base64Digits.charAt(byte2) + base64Digits.charAt(byte3) + base64Digits.charAt(byte4);
            i += 3;
        }
        return result;
    }
    ts.convertToBase64 = convertToBase64;
    var carriageReturnLineFeed = "\r\n";
    var lineFeed = "\n";
    function getNewLineCharacter(options) {
        if (options.newLine === ts.NewLineKind.CarriageReturnLineFeed) {
            return carriageReturnLineFeed;
        }
        else if (options.newLine === ts.NewLineKind.LineFeed) {
            return lineFeed;
        }
        else if (ts.sys) {
            return ts.sys.newLine;
        }
        return carriageReturnLineFeed;
    }
    ts.getNewLineCharacter = getNewLineCharacter;
})(ts || (ts = {}));
var ts;
(function (ts) {
    function getDefaultLibFileName(options) {
        return options.target === ts.ScriptTarget.ES6 ? "lib.es6.d.ts" : "lib.d.ts";
    }
    ts.getDefaultLibFileName = getDefaultLibFileName;
    function textSpanEnd(span) {
        return span.start + span.length;
    }
    ts.textSpanEnd = textSpanEnd;
    function textSpanIsEmpty(span) {
        return span.length === 0;
    }
    ts.textSpanIsEmpty = textSpanIsEmpty;
    function textSpanContainsPosition(span, position) {
        return position >= span.start && position < textSpanEnd(span);
    }
    ts.textSpanContainsPosition = textSpanContainsPosition;
    // Returns true if 'span' contains 'other'.
    function textSpanContainsTextSpan(span, other) {
        return other.start >= span.start && textSpanEnd(other) <= textSpanEnd(span);
    }
    ts.textSpanContainsTextSpan = textSpanContainsTextSpan;
    function textSpanOverlapsWith(span, other) {
        var overlapStart = Math.max(span.start, other.start);
        var overlapEnd = Math.min(textSpanEnd(span), textSpanEnd(other));
        return overlapStart < overlapEnd;
    }
    ts.textSpanOverlapsWith = textSpanOverlapsWith;
    function textSpanOverlap(span1, span2) {
        var overlapStart = Math.max(span1.start, span2.start);
        var overlapEnd = Math.min(textSpanEnd(span1), textSpanEnd(span2));
        if (overlapStart < overlapEnd) {
            return createTextSpanFromBounds(overlapStart, overlapEnd);
        }
        return undefined;
    }
    ts.textSpanOverlap = textSpanOverlap;
    function textSpanIntersectsWithTextSpan(span, other) {
        return other.start <= textSpanEnd(span) && textSpanEnd(other) >= span.start;
    }
    ts.textSpanIntersectsWithTextSpan = textSpanIntersectsWithTextSpan;
    function textSpanIntersectsWith(span, start, length) {
        var end = start + length;
        return start <= textSpanEnd(span) && end >= span.start;
    }
    ts.textSpanIntersectsWith = textSpanIntersectsWith;
    function decodedTextSpanIntersectsWith(start1, length1, start2, length2) {
        var end1 = start1 + length1;
        var end2 = start2 + length2;
        return start2 <= end1 && end2 >= start1;
    }
    ts.decodedTextSpanIntersectsWith = decodedTextSpanIntersectsWith;
    function textSpanIntersectsWithPosition(span, position) {
        return position <= textSpanEnd(span) && position >= span.start;
    }
    ts.textSpanIntersectsWithPosition = textSpanIntersectsWithPosition;
    function textSpanIntersection(span1, span2) {
        var intersectStart = Math.max(span1.start, span2.start);
        var intersectEnd = Math.min(textSpanEnd(span1), textSpanEnd(span2));
        if (intersectStart <= intersectEnd) {
            return createTextSpanFromBounds(intersectStart, intersectEnd);
        }
        return undefined;
    }
    ts.textSpanIntersection = textSpanIntersection;
    function createTextSpan(start, length) {
        if (start < 0) {
            throw new Error("start < 0");
        }
        if (length < 0) {
            throw new Error("length < 0");
        }
        return { start: start, length: length };
    }
    ts.createTextSpan = createTextSpan;
    function createTextSpanFromBounds(start, end) {
        return createTextSpan(start, end - start);
    }
    ts.createTextSpanFromBounds = createTextSpanFromBounds;
    function textChangeRangeNewSpan(range) {
        return createTextSpan(range.span.start, range.newLength);
    }
    ts.textChangeRangeNewSpan = textChangeRangeNewSpan;
    function textChangeRangeIsUnchanged(range) {
        return textSpanIsEmpty(range.span) && range.newLength === 0;
    }
    ts.textChangeRangeIsUnchanged = textChangeRangeIsUnchanged;
    function createTextChangeRange(span, newLength) {
        if (newLength < 0) {
            throw new Error("newLength < 0");
        }
        return { span: span, newLength: newLength };
    }
    ts.createTextChangeRange = createTextChangeRange;
    ts.unchangedTextChangeRange = createTextChangeRange(createTextSpan(0, 0), 0);
    /**
     * Called to merge all the changes that occurred across several versions of a script snapshot
     * into a single change.  i.e. if a user keeps making successive edits to a script we will
     * have a text change from V1 to V2, V2 to V3, ..., Vn.
     *
     * This function will then merge those changes into a single change range valid between V1 and
     * Vn.
     */
    function collapseTextChangeRangesAcrossMultipleVersions(changes) {
        if (changes.length === 0) {
            return ts.unchangedTextChangeRange;
        }
        if (changes.length === 1) {
            return changes[0];
        }
        // We change from talking about { { oldStart, oldLength }, newLength } to { oldStart, oldEnd, newEnd }
        // as it makes things much easier to reason about.
        var change0 = changes[0];
        var oldStartN = change0.span.start;
        var oldEndN = textSpanEnd(change0.span);
        var newEndN = oldStartN + change0.newLength;
        for (var i = 1; i < changes.length; i++) {
            var nextChange = changes[i];
            // Consider the following case:
            // i.e. two edits.  The first represents the text change range { { 10, 50 }, 30 }.  i.e. The span starting
            // at 10, with length 50 is reduced to length 30.  The second represents the text change range { { 30, 30 }, 40 }.
            // i.e. the span starting at 30 with length 30 is increased to length 40.
            //
            //      0         10        20        30        40        50        60        70        80        90        100
            //      -------------------------------------------------------------------------------------------------------
            //                |                                                 /
            //                |                                            /----
            //  T1            |                                       /----
            //                |                                  /----
            //                |                             /----
            //      -------------------------------------------------------------------------------------------------------
            //                                     |                            \
            //                                     |                               \
            //   T2                                |                                 \
            //                                     |                                   \
            //                                     |                                      \
            //      -------------------------------------------------------------------------------------------------------
            //
            // Merging these turns out to not be too difficult.  First, determining the new start of the change is trivial
            // it's just the min of the old and new starts.  i.e.:
            //
            //      0         10        20        30        40        50        60        70        80        90        100
            //      ------------------------------------------------------------*------------------------------------------
            //                |                                                 /
            //                |                                            /----
            //  T1            |                                       /----
            //                |                                  /----
            //                |                             /----
            //      ----------------------------------------$-------------------$------------------------------------------
            //                .                    |                            \
            //                .                    |                               \
            //   T2           .                    |                                 \
            //                .                    |                                   \
            //                .                    |                                      \
            //      ----------------------------------------------------------------------*--------------------------------
            //
            // (Note the dots represent the newly inferrred start.
            // Determining the new and old end is also pretty simple.  Basically it boils down to paying attention to the
            // absolute positions at the asterixes, and the relative change between the dollar signs. Basically, we see
            // which if the two $'s precedes the other, and we move that one forward until they line up.  in this case that
            // means:
            //
            //      0         10        20        30        40        50        60        70        80        90        100
            //      --------------------------------------------------------------------------------*----------------------
            //                |                                                                     /
            //                |                                                                /----
            //  T1            |                                                           /----
            //                |                                                      /----
            //                |                                                 /----
            //      ------------------------------------------------------------$------------------------------------------
            //                .                    |                            \
            //                .                    |                               \
            //   T2           .                    |                                 \
            //                .                    |                                   \
            //                .                    |                                      \
            //      ----------------------------------------------------------------------*--------------------------------
            //
            // In other words (in this case), we're recognizing that the second edit happened after where the first edit
            // ended with a delta of 20 characters (60 - 40).  Thus, if we go back in time to where the first edit started
            // that's the same as if we started at char 80 instead of 60.
            //
            // As it so happens, the same logic applies if the second edit precedes the first edit.  In that case rahter
            // than pusing the first edit forward to match the second, we'll push the second edit forward to match the
            // first.
            //
            // In this case that means we have { oldStart: 10, oldEnd: 80, newEnd: 70 } or, in TextChangeRange
            // semantics: { { start: 10, length: 70 }, newLength: 60 }
            //
            // The math then works out as follows.
            // If we have { oldStart1, oldEnd1, newEnd1 } and { oldStart2, oldEnd2, newEnd2 } then we can compute the
            // final result like so:
            //
            // {
            //      oldStart3: Min(oldStart1, oldStart2),
            //      oldEnd3  : Max(oldEnd1, oldEnd1 + (oldEnd2 - newEnd1)),
            //      newEnd3  : Max(newEnd2, newEnd2 + (newEnd1 - oldEnd2))
            // }
            var oldStart1 = oldStartN;
            var oldEnd1 = oldEndN;
            var newEnd1 = newEndN;
            var oldStart2 = nextChange.span.start;
            var oldEnd2 = textSpanEnd(nextChange.span);
            var newEnd2 = oldStart2 + nextChange.newLength;
            oldStartN = Math.min(oldStart1, oldStart2);
            oldEndN = Math.max(oldEnd1, oldEnd1 + (oldEnd2 - newEnd1));
            newEndN = Math.max(newEnd2, newEnd2 + (newEnd1 - oldEnd2));
        }
        return createTextChangeRange(createTextSpanFromBounds(oldStartN, oldEndN), /*newLength:*/ newEndN - oldStartN);
    }
    ts.collapseTextChangeRangesAcrossMultipleVersions = collapseTextChangeRangesAcrossMultipleVersions;
    function getTypeParameterOwner(d) {
        if (d && d.kind === ts.SyntaxKind.TypeParameter) {
            for (var current = d; current; current = current.parent) {
                if (ts.isFunctionLike(current) || ts.isClassLike(current) || current.kind === ts.SyntaxKind.InterfaceDeclaration) {
                    return current;
                }
            }
        }
    }
    ts.getTypeParameterOwner = getTypeParameterOwner;
})(ts || (ts = {}));
//# sourceMappingURL=utilities.js.map