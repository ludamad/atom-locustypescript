///<reference path='services.ts' />
/* @internal */
var ts;
(function (ts) {
    var SignatureHelp;
    (function (SignatureHelp) {
        // A partially written generic type expression is not guaranteed to have the correct syntax tree. the expression could be parsed as less than/greater than expression or a comma expression
        // or some other combination depending on what the user has typed so far. For the purposes of signature help we need to consider any location after "<" as a possible generic type reference. 
        // To do this, the method will back parse the expression starting at the position required. it will try to parse the current expression as a generic type expression, if it did succeed it 
        // will return the generic identifier that started the expression (e.g. "foo" in "foo<any, |"). It is then up to the caller to ensure that this is a valid generic expression through 
        // looking up the type. The method will also keep track of the parameter index inside the expression.
        //public static isInPartiallyWrittenTypeArgumentList(syntaxTree: TypeScript.SyntaxTree, position: number): any {
        //    let token = Syntax.findTokenOnLeft(syntaxTree.sourceUnit(), position, /*includeSkippedTokens*/ true);
        //    if (token && TypeScript.Syntax.hasAncestorOfKind(token, TypeScript.SyntaxKind.TypeParameterList)) {
        //        // We are in the wrong generic list. bail out
        //        return null;
        //    }
        //    let stack = 0;
        //    let argumentIndex = 0;
        //    whileLoop:
        //    while (token) {
        //        switch (token.kind()) {
        //            case TypeScript.SyntaxKind.LessThanToken:
        //                if (stack === 0) {
        //                    // Found the beginning of the generic argument expression
        //                    let lessThanToken = token;
        //                    token = previousToken(token, /*includeSkippedTokens*/ true);
        //                    if (!token || token.kind() !== TypeScript.SyntaxKind.IdentifierName) {
        //                        break whileLoop;
        //                    }
        //                    // Found the name, return the data
        //                    return {
        //                        genericIdentifer: token,
        //                        lessThanToken: lessThanToken,
        //                        argumentIndex: argumentIndex
        //                    };
        //                }
        //                else if (stack < 0) {
        //                    // Seen one too many less than tokens, bail out
        //                    break whileLoop;
        //                }
        //                else {
        //                    stack--;
        //                }
        //                break;
        //            case TypeScript.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
        //                stack++;
        //            // Intentaion fall through
        //            case TypeScript.SyntaxKind.GreaterThanToken:
        //                stack++;
        //                break;
        //            case TypeScript.SyntaxKind.CommaToken:
        //                if (stack == 0) {
        //                    argumentIndex++;
        //                }
        //                break;
        //            case TypeScript.SyntaxKind.CloseBraceToken:
        //                // This can be object type, skip untill we find the matching open brace token
        //                let unmatchedOpenBraceTokens = 0;
        //                // Skip untill the matching open brace token
        //                token = SignatureInfoHelpers.moveBackUpTillMatchingTokenKind(token, TypeScript.SyntaxKind.CloseBraceToken, TypeScript.SyntaxKind.OpenBraceToken);
        //                if (!token) {
        //                    // No matching token was found. bail out
        //                    break whileLoop;
        //                }
        //                break;
        //            case TypeScript.SyntaxKind.EqualsGreaterThanToken:
        //                // This can be a function type or a constructor type. In either case, we want to skip the function defintion
        //                token = previousToken(token, /*includeSkippedTokens*/ true);
        //                if (token && token.kind() === TypeScript.SyntaxKind.CloseParenToken) {
        //                    // Skip untill the matching open paren token
        //                    token = SignatureInfoHelpers.moveBackUpTillMatchingTokenKind(token, TypeScript.SyntaxKind.CloseParenToken, TypeScript.SyntaxKind.OpenParenToken);
        //                    if (token && token.kind() === TypeScript.SyntaxKind.GreaterThanToken) {
        //                        // Another generic type argument list, skip it\
        //                        token = SignatureInfoHelpers.moveBackUpTillMatchingTokenKind(token, TypeScript.SyntaxKind.GreaterThanToken, TypeScript.SyntaxKind.LessThanToken);
        //                    }
        //                    if (token && token.kind() === TypeScript.SyntaxKind.NewKeyword) {
        //                        // In case this was a constructor type, skip the new keyword
        //                        token = previousToken(token, /*includeSkippedTokens*/ true);
        //                    }
        //                    if (!token) {
        //                        // No matching token was found. bail out
        //                        break whileLoop;
        //                    }
        //                }
        //                else {
        //                    // This is not a funtion type. exit the main loop
        //                    break whileLoop;
        //                }
        //                break;
        //            case TypeScript.SyntaxKind.IdentifierName:
        //            case TypeScript.SyntaxKind.AnyKeyword:
        //            case TypeScript.SyntaxKind.NumberKeyword:
        //            case TypeScript.SyntaxKind.StringKeyword:
        //            case TypeScript.SyntaxKind.VoidKeyword:
        //            case TypeScript.SyntaxKind.BooleanKeyword:
        //            case TypeScript.SyntaxKind.DotToken:
        //            case TypeScript.SyntaxKind.OpenBracketToken:
        //            case TypeScript.SyntaxKind.CloseBracketToken:
        //                // Valid tokens in a type name. Skip.
        //                break;
        //            default:
        //                break whileLoop;
        //        }
        //        token = previousToken(token, /*includeSkippedTokens*/ true);
        //    }
        //    return null;
        //}
        //private static moveBackUpTillMatchingTokenKind(token: TypeScript.ISyntaxToken, tokenKind: TypeScript.SyntaxKind, matchingTokenKind: TypeScript.SyntaxKind): TypeScript.ISyntaxToken {
        //    if (!token || token.kind() !== tokenKind) {
        //        throw TypeScript.Errors.invalidOperation();
        //    }
        //    // Skip the current token
        //    token = previousToken(token, /*includeSkippedTokens*/ true);
        //    let stack = 0;
        //    while (token) {
        //        if (token.kind() === matchingTokenKind) {
        //            if (stack === 0) {
        //                // Found the matching token, return
        //                return token;
        //            }
        //            else if (stack < 0) {
        //                // tokens overlapped.. bail out.
        //                break;
        //            }
        //            else {
        //                stack--;
        //            }
        //        }
        //        else if (token.kind() === tokenKind) {
        //            stack++;
        //        }
        //        // Move back
        //        token = previousToken(token, /*includeSkippedTokens*/ true);
        //    }
        //    // Did not find matching token
        //    return null;
        //}
        var emptyArray = [];
        var ArgumentListKind;
        (function (ArgumentListKind) {
            ArgumentListKind[ArgumentListKind["TypeArguments"] = 0] = "TypeArguments";
            ArgumentListKind[ArgumentListKind["CallArguments"] = 1] = "CallArguments";
            ArgumentListKind[ArgumentListKind["TaggedTemplateArguments"] = 2] = "TaggedTemplateArguments";
        })(ArgumentListKind || (ArgumentListKind = {}));
        function getSignatureHelpItems(program, sourceFile, position, cancellationToken) {
            var typeChecker = program.getTypeChecker();
            // Decide whether to show signature help
            var startingToken = ts.findTokenOnLeftOfPosition(sourceFile, position);
            if (!startingToken) {
                // We are at the beginning of the file
                return undefined;
            }
            var argumentInfo = getContainingArgumentInfo(startingToken);
            cancellationToken.throwIfCancellationRequested();
            // Semantic filtering of signature help
            if (!argumentInfo) {
                return undefined;
            }
            var call = argumentInfo.invocation;
            var candidates = [];
            var resolvedSignature = typeChecker.getResolvedSignature(call, candidates);
            cancellationToken.throwIfCancellationRequested();
            if (!candidates.length) {
                // We didn't have any sig help items produced by the TS compiler.  If this is a JS 
                // file, then see if we can figure out anything better.
                if (ts.isJavaScript(sourceFile.fileName)) {
                    return createJavaScriptSignatureHelpItems(argumentInfo);
                }
                return undefined;
            }
            return createSignatureHelpItems(candidates, resolvedSignature, argumentInfo);
            function createJavaScriptSignatureHelpItems(argumentInfo) {
                if (argumentInfo.invocation.kind !== ts.SyntaxKind.CallExpression) {
                    return undefined;
                }
                // See if we can find some symbol with the call expression name that has call signatures.
                var callExpression = argumentInfo.invocation;
                var expression = callExpression.expression;
                var name = expression.kind === ts.SyntaxKind.Identifier
                    ? expression
                    : expression.kind === ts.SyntaxKind.PropertyAccessExpression
                        ? expression.name
                        : undefined;
                if (!name || !name.text) {
                    return undefined;
                }
                var typeChecker = program.getTypeChecker();
                for (var _i = 0, _a = program.getSourceFiles(); _i < _a.length; _i++) {
                    var sourceFile_1 = _a[_i];
                    var nameToDeclarations = sourceFile_1.getNamedDeclarations();
                    var declarations = ts.getProperty(nameToDeclarations, name.text);
                    if (declarations) {
                        for (var _b = 0; _b < declarations.length; _b++) {
                            var declaration = declarations[_b];
                            var symbol = declaration.symbol;
                            if (symbol) {
                                var type = typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
                                if (type) {
                                    var callSignatures = type.getCallSignatures();
                                    if (callSignatures && callSignatures.length) {
                                        return createSignatureHelpItems(callSignatures, callSignatures[0], argumentInfo);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            /**
             * Returns relevant information for the argument list and the current argument if we are
             * in the argument of an invocation; returns undefined otherwise.
             */
            function getImmediatelyContainingArgumentInfo(node) {
                if (node.parent.kind === ts.SyntaxKind.CallExpression || node.parent.kind === ts.SyntaxKind.NewExpression) {
                    var callExpression = node.parent;
                    // There are 3 cases to handle:
                    //   1. The token introduces a list, and should begin a sig help session
                    //   2. The token is either not associated with a list, or ends a list, so the session should end
                    //   3. The token is buried inside a list, and should give sig help
                    //
                    // The following are examples of each:
                    //
                    //    Case 1:
                    //          foo<#T, U>(#a, b)    -> The token introduces a list, and should begin a sig help session
                    //    Case 2:
                    //          fo#o<T, U>#(a, b)#   -> The token is either not associated with a list, or ends a list, so the session should end
                    //    Case 3:
                    //          foo<T#, U#>(a#, #b#) -> The token is buried inside a list, and should give sig help
                    // Find out if 'node' is an argument, a type argument, or neither
                    if (node.kind === ts.SyntaxKind.LessThanToken ||
                        node.kind === ts.SyntaxKind.OpenParenToken) {
                        // Find the list that starts right *after* the < or ( token.
                        // If the user has just opened a list, consider this item 0.
                        var list = getChildListThatStartsWithOpenerToken(callExpression, node, sourceFile);
                        var isTypeArgList = callExpression.typeArguments && callExpression.typeArguments.pos === list.pos;
                        ts.Debug.assert(list !== undefined);
                        return {
                            kind: isTypeArgList ? ArgumentListKind.TypeArguments : ArgumentListKind.CallArguments,
                            invocation: callExpression,
                            argumentsSpan: getApplicableSpanForArguments(list),
                            argumentIndex: 0,
                            argumentCount: getArgumentCount(list)
                        };
                    }
                    // findListItemInfo can return undefined if we are not in parent's argument list
                    // or type argument list. This includes cases where the cursor is:
                    //   - To the right of the closing paren, non-substitution template, or template tail.
                    //   - Between the type arguments and the arguments (greater than token)
                    //   - On the target of the call (parent.func)
                    //   - On the 'new' keyword in a 'new' expression
                    var listItemInfo = ts.findListItemInfo(node);
                    if (listItemInfo) {
                        var list = listItemInfo.list;
                        var isTypeArgList = callExpression.typeArguments && callExpression.typeArguments.pos === list.pos;
                        var argumentIndex = getArgumentIndex(list, node);
                        var argumentCount = getArgumentCount(list);
                        ts.Debug.assert(argumentIndex === 0 || argumentIndex < argumentCount, "argumentCount < argumentIndex, " + argumentCount + " < " + argumentIndex);
                        return {
                            kind: isTypeArgList ? ArgumentListKind.TypeArguments : ArgumentListKind.CallArguments,
                            invocation: callExpression,
                            argumentsSpan: getApplicableSpanForArguments(list),
                            argumentIndex: argumentIndex,
                            argumentCount: argumentCount
                        };
                    }
                }
                else if (node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral && node.parent.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                    // Check if we're actually inside the template;
                    // otherwise we'll fall out and return undefined.
                    if (ts.isInsideTemplateLiteral(node, position)) {
                        return getArgumentListInfoForTemplate(node.parent, /*argumentIndex*/ 0);
                    }
                }
                else if (node.kind === ts.SyntaxKind.TemplateHead && node.parent.parent.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                    var templateExpression = node.parent;
                    var tagExpression = templateExpression.parent;
                    ts.Debug.assert(templateExpression.kind === ts.SyntaxKind.TemplateExpression);
                    var argumentIndex = ts.isInsideTemplateLiteral(node, position) ? 0 : 1;
                    return getArgumentListInfoForTemplate(tagExpression, argumentIndex);
                }
                else if (node.parent.kind === ts.SyntaxKind.TemplateSpan && node.parent.parent.parent.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                    var templateSpan = node.parent;
                    var templateExpression = templateSpan.parent;
                    var tagExpression = templateExpression.parent;
                    ts.Debug.assert(templateExpression.kind === ts.SyntaxKind.TemplateExpression);
                    // If we're just after a template tail, don't show signature help.
                    if (node.kind === ts.SyntaxKind.TemplateTail && !ts.isInsideTemplateLiteral(node, position)) {
                        return undefined;
                    }
                    var spanIndex = templateExpression.templateSpans.indexOf(templateSpan);
                    var argumentIndex = getArgumentIndexForTemplatePiece(spanIndex, node);
                    return getArgumentListInfoForTemplate(tagExpression, argumentIndex);
                }
                return undefined;
            }
            function getArgumentIndex(argumentsList, node) {
                // The list we got back can include commas.  In the presence of errors it may 
                // also just have nodes without commas.  For example "Foo(a b c)" will have 3 
                // args without commas.   We want to find what index we're at.  So we count
                // forward until we hit ourselves, only incrementing the index if it isn't a
                // comma.
                //
                // Note: the subtlety around trailing commas (in getArgumentCount) does not apply
                // here.  That's because we're only walking forward until we hit the node we're
                // on.  In that case, even if we're after the trailing comma, we'll still see
                // that trailing comma in the list, and we'll have generated the appropriate
                // arg index.
                var argumentIndex = 0;
                var listChildren = argumentsList.getChildren();
                for (var _i = 0; _i < listChildren.length; _i++) {
                    var child = listChildren[_i];
                    if (child === node) {
                        break;
                    }
                    if (child.kind !== ts.SyntaxKind.CommaToken) {
                        argumentIndex++;
                    }
                }
                return argumentIndex;
            }
            function getArgumentCount(argumentsList) {
                // The argument count for a list is normally the number of non-comma children it has.
                // For example, if you have "Foo(a,b)" then there will be three children of the arg
                // list 'a' '<comma>' 'b'.  So, in this case the arg count will be 2.  However, there
                // is a small subtlety.  If you have  "Foo(a,)", then the child list will just have
                // 'a' '<comma>'.  So, in the case where the last child is a comma, we increase the
                // arg count by one to compensate.
                //
                // Note: this subtlety only applies to the last comma.  If you had "Foo(a,,"  then 
                // we'll have:  'a' '<comma>' '<missing>' 
                // That will give us 2 non-commas.  We then add one for the last comma, givin us an
                // arg count of 3.
                var listChildren = argumentsList.getChildren();
                var argumentCount = ts.countWhere(listChildren, function (arg) { return arg.kind !== ts.SyntaxKind.CommaToken; });
                if (listChildren.length > 0 && ts.lastOrUndefined(listChildren).kind === ts.SyntaxKind.CommaToken) {
                    argumentCount++;
                }
                return argumentCount;
            }
            // spanIndex is either the index for a given template span.
            // This does not give appropriate results for a NoSubstitutionTemplateLiteral
            function getArgumentIndexForTemplatePiece(spanIndex, node) {
                // Because the TemplateStringsArray is the first argument, we have to offset each substitution expression by 1.
                // There are three cases we can encounter:
                //      1. We are precisely in the template literal (argIndex = 0).
                //      2. We are in or to the right of the substitution expression (argIndex = spanIndex + 1).
                //      3. We are directly to the right of the template literal, but because we look for the token on the left,
                //          not enough to put us in the substitution expression; we should consider ourselves part of
                //          the *next* span's expression by offsetting the index (argIndex = (spanIndex + 1) + 1).
                //
                // Example: f  `# abcd $#{#  1 + 1#  }# efghi ${ #"#hello"#  }  #  `
                //              ^       ^ ^       ^   ^          ^ ^      ^     ^
                // Case:        1       1 3       2   1          3 2      2     1
                ts.Debug.assert(position >= node.getStart(), "Assumed 'position' could not occur before node.");
                if (ts.isTemplateLiteralKind(node.kind)) {
                    if (ts.isInsideTemplateLiteral(node, position)) {
                        return 0;
                    }
                    return spanIndex + 2;
                }
                return spanIndex + 1;
            }
            function getArgumentListInfoForTemplate(tagExpression, argumentIndex) {
                // argumentCount is either 1 or (numSpans + 1) to account for the template strings array argument.
                var argumentCount = tagExpression.template.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
                    ? 1
                    : tagExpression.template.templateSpans.length + 1;
                ts.Debug.assert(argumentIndex === 0 || argumentIndex < argumentCount, "argumentCount < argumentIndex, " + argumentCount + " < " + argumentIndex);
                return {
                    kind: ArgumentListKind.TaggedTemplateArguments,
                    invocation: tagExpression,
                    argumentsSpan: getApplicableSpanForTaggedTemplate(tagExpression),
                    argumentIndex: argumentIndex,
                    argumentCount: argumentCount
                };
            }
            function getApplicableSpanForArguments(argumentsList) {
                // We use full start and skip trivia on the end because we want to include trivia on
                // both sides. For example,
                //
                //    foo(   /*comment */     a, b, c      /*comment*/     )
                //        |                                               |
                //
                // The applicable span is from the first bar to the second bar (inclusive,
                // but not including parentheses)
                var applicableSpanStart = argumentsList.getFullStart();
                var applicableSpanEnd = ts.skipTrivia(sourceFile.text, argumentsList.getEnd(), /*stopAfterLineBreak*/ false);
                return ts.createTextSpan(applicableSpanStart, applicableSpanEnd - applicableSpanStart);
            }
            function getApplicableSpanForTaggedTemplate(taggedTemplate) {
                var template = taggedTemplate.template;
                var applicableSpanStart = template.getStart();
                var applicableSpanEnd = template.getEnd();
                // We need to adjust the end position for the case where the template does not have a tail.
                // Otherwise, we will not show signature help past the expression.
                // For example,
                //
                //      `  ${ 1 + 1        foo(10)
                //       |        |
                //
                // This is because a Missing node has no width. However, what we actually want is to include trivia
                // leading up to the next token in case the user is about to type in a TemplateMiddle or TemplateTail.
                if (template.kind === ts.SyntaxKind.TemplateExpression) {
                    var lastSpan = ts.lastOrUndefined(template.templateSpans);
                    if (lastSpan.literal.getFullWidth() === 0) {
                        applicableSpanEnd = ts.skipTrivia(sourceFile.text, applicableSpanEnd, /*stopAfterLineBreak*/ false);
                    }
                }
                return ts.createTextSpan(applicableSpanStart, applicableSpanEnd - applicableSpanStart);
            }
            function getContainingArgumentInfo(node) {
                for (var n = node; n.kind !== ts.SyntaxKind.SourceFile; n = n.parent) {
                    if (ts.isFunctionBlock(n)) {
                        return undefined;
                    }
                    // If the node is not a subspan of its parent, this is a big problem.
                    // There have been crashes that might be caused by this violation.
                    if (n.pos < n.parent.pos || n.end > n.parent.end) {
                        ts.Debug.fail("Node of kind " + n.kind + " is not a subspan of its parent of kind " + n.parent.kind);
                    }
                    var argumentInfo_1 = getImmediatelyContainingArgumentInfo(n);
                    if (argumentInfo_1) {
                        return argumentInfo_1;
                    }
                }
                return undefined;
            }
            function getChildListThatStartsWithOpenerToken(parent, openerToken, sourceFile) {
                var children = parent.getChildren(sourceFile);
                var indexOfOpenerToken = children.indexOf(openerToken);
                ts.Debug.assert(indexOfOpenerToken >= 0 && children.length > indexOfOpenerToken + 1);
                return children[indexOfOpenerToken + 1];
            }
            /**
             * The selectedItemIndex could be negative for several reasons.
             *     1. There are too many arguments for all of the overloads
             *     2. None of the overloads were type compatible
             * The solution here is to try to pick the best overload by picking
             * either the first one that has an appropriate number of parameters,
             * or the one with the most parameters.
             */
            function selectBestInvalidOverloadIndex(candidates, argumentCount) {
                var maxParamsSignatureIndex = -1;
                var maxParams = -1;
                for (var i = 0; i < candidates.length; i++) {
                    var candidate = candidates[i];
                    if (candidate.hasRestParameter || candidate.parameters.length >= argumentCount) {
                        return i;
                    }
                    if (candidate.parameters.length > maxParams) {
                        maxParams = candidate.parameters.length;
                        maxParamsSignatureIndex = i;
                    }
                }
                return maxParamsSignatureIndex;
            }
            function createSignatureHelpItems(candidates, bestSignature, argumentListInfo) {
                var applicableSpan = argumentListInfo.argumentsSpan;
                var isTypeParameterList = argumentListInfo.kind === ArgumentListKind.TypeArguments;
                var invocation = argumentListInfo.invocation;
                var callTarget = ts.getInvokedExpression(invocation);
                var callTargetSymbol = typeChecker.getSymbolAtLocation(callTarget);
                var callTargetDisplayParts = callTargetSymbol && ts.symbolToDisplayParts(typeChecker, callTargetSymbol, /*enclosingDeclaration*/ undefined, /*meaning*/ undefined);
                var items = ts.map(candidates, function (candidateSignature) {
                    var signatureHelpParameters;
                    var prefixDisplayParts = [];
                    var suffixDisplayParts = [];
                    if (callTargetDisplayParts) {
                        ts.addRange(prefixDisplayParts, callTargetDisplayParts);
                    }
                    if (isTypeParameterList) {
                        prefixDisplayParts.push(ts.punctuationPart(ts.SyntaxKind.LessThanToken));
                        var typeParameters = candidateSignature.typeParameters;
                        signatureHelpParameters = typeParameters && typeParameters.length > 0 ? ts.map(typeParameters, createSignatureHelpParameterForTypeParameter) : emptyArray;
                        suffixDisplayParts.push(ts.punctuationPart(ts.SyntaxKind.GreaterThanToken));
                        var parameterParts = ts.mapToDisplayParts(function (writer) {
                            return typeChecker.getSymbolDisplayBuilder().buildDisplayForParametersAndDelimiters(candidateSignature.resolvedThisType, candidateSignature.parameters, writer, invocation);
                        });
                        ts.addRange(suffixDisplayParts, parameterParts);
                    }
                    else {
                        var typeParameterParts = ts.mapToDisplayParts(function (writer) {
                            return typeChecker.getSymbolDisplayBuilder().buildDisplayForTypeParametersAndDelimiters(candidateSignature.typeParameters, writer, invocation);
                        });
                        ts.addRange(prefixDisplayParts, typeParameterParts);
                        prefixDisplayParts.push(ts.punctuationPart(ts.SyntaxKind.OpenParenToken));
                        var parameters = candidateSignature.parameters;
                        signatureHelpParameters = parameters.length > 0 ? ts.map(parameters, createSignatureHelpParameterForParameter) : emptyArray;
                        suffixDisplayParts.push(ts.punctuationPart(ts.SyntaxKind.CloseParenToken));
                    }
                    var returnTypeParts = ts.mapToDisplayParts(function (writer) {
                        return typeChecker.getSymbolDisplayBuilder().buildReturnTypeDisplay(candidateSignature, writer, invocation);
                    });
                    ts.addRange(suffixDisplayParts, returnTypeParts);
                    return {
                        isVariadic: candidateSignature.hasRestParameter,
                        prefixDisplayParts: prefixDisplayParts,
                        suffixDisplayParts: suffixDisplayParts,
                        separatorDisplayParts: [ts.punctuationPart(ts.SyntaxKind.CommaToken), ts.spacePart()],
                        parameters: signatureHelpParameters,
                        documentation: candidateSignature.getDocumentationComment()
                    };
                });
                var argumentIndex = argumentListInfo.argumentIndex;
                // argumentCount is the *apparent* number of arguments.
                var argumentCount = argumentListInfo.argumentCount;
                var selectedItemIndex = candidates.indexOf(bestSignature);
                if (selectedItemIndex < 0) {
                    selectedItemIndex = selectBestInvalidOverloadIndex(candidates, argumentCount);
                }
                ts.Debug.assert(argumentIndex === 0 || argumentIndex < argumentCount, "argumentCount < argumentIndex, " + argumentCount + " < " + argumentIndex);
                return {
                    items: items,
                    applicableSpan: applicableSpan,
                    selectedItemIndex: selectedItemIndex,
                    argumentIndex: argumentIndex,
                    argumentCount: argumentCount
                };
                function createSignatureHelpParameterForParameter(parameter) {
                    var displayParts = ts.mapToDisplayParts(function (writer) {
                        return typeChecker.getSymbolDisplayBuilder().buildParameterDisplay(parameter, writer, invocation);
                    });
                    return {
                        name: parameter.name,
                        documentation: parameter.getDocumentationComment(),
                        displayParts: displayParts,
                        isOptional: typeChecker.isOptionalParameter(parameter.valueDeclaration)
                    };
                }
                function createSignatureHelpParameterForTypeParameter(typeParameter) {
                    var displayParts = ts.mapToDisplayParts(function (writer) {
                        return typeChecker.getSymbolDisplayBuilder().buildTypeParameterDisplay(typeParameter, writer, invocation);
                    });
                    return {
                        name: typeParameter.symbol.name,
                        documentation: emptyArray,
                        displayParts: displayParts,
                        isOptional: false
                    };
                }
            }
        }
        SignatureHelp.getSignatureHelpItems = getSignatureHelpItems;
    })(SignatureHelp = ts.SignatureHelp || (ts.SignatureHelp = {}));
})(ts || (ts = {}));
//# sourceMappingURL=signatureHelp.js.map