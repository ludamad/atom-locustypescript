///<reference path='..\services.ts' />
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var SmartIndenter;
        (function (SmartIndenter) {
            var Value;
            (function (Value) {
                Value[Value["Unknown"] = -1] = "Unknown";
            })(Value || (Value = {}));
            function getIndentation(position, sourceFile, options) {
                if (position > sourceFile.text.length) {
                    return 0; // past EOF
                }
                var precedingToken = ts.findPrecedingToken(position, sourceFile);
                if (!precedingToken) {
                    return 0;
                }
                // no indentation in string \regex\template literals
                var precedingTokenIsLiteral = precedingToken.kind === ts.SyntaxKind.StringLiteral ||
                    precedingToken.kind === ts.SyntaxKind.RegularExpressionLiteral ||
                    precedingToken.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
                    precedingToken.kind === ts.SyntaxKind.TemplateHead ||
                    precedingToken.kind === ts.SyntaxKind.TemplateMiddle ||
                    precedingToken.kind === ts.SyntaxKind.TemplateTail;
                if (precedingTokenIsLiteral && precedingToken.getStart(sourceFile) <= position && precedingToken.end > position) {
                    return 0;
                }
                var lineAtPosition = sourceFile.getLineAndCharacterOfPosition(position).line;
                if (precedingToken.kind === ts.SyntaxKind.CommaToken && precedingToken.parent.kind !== ts.SyntaxKind.BinaryExpression) {
                    // previous token is comma that separates items in list - find the previous item and try to derive indentation from it
                    var actualIndentation = getActualIndentationForListItemBeforeComma(precedingToken, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation;
                    }
                }
                // try to find node that can contribute to indentation and includes 'position' starting from 'precedingToken'
                // if such node is found - compute initial indentation for 'position' inside this node
                var previous;
                var current = precedingToken;
                var currentStart;
                var indentationDelta;
                while (current) {
                    if (ts.positionBelongsToNode(current, position, sourceFile) && shouldIndentChildNode(current.kind, previous ? previous.kind : ts.SyntaxKind.Unknown)) {
                        currentStart = getStartLineAndCharacterForNode(current, sourceFile);
                        if (nextTokenIsCurlyBraceOnSameLineAsCursor(precedingToken, current, lineAtPosition, sourceFile)) {
                            indentationDelta = 0;
                        }
                        else {
                            indentationDelta = lineAtPosition !== currentStart.line ? options.IndentSize : 0;
                        }
                        break;
                    }
                    // check if current node is a list item - if yes, take indentation from it
                    var actualIndentation = getActualIndentationForListItem(current, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation;
                    }
                    actualIndentation = getLineIndentationWhenExpressionIsInMultiLine(current, sourceFile, options);
                    if (actualIndentation !== Value.Unknown) {
                        return actualIndentation + options.IndentSize;
                    }
                    previous = current;
                    current = current.parent;
                }
                if (!current) {
                    // no parent was found - return 0 to be indented on the level of SourceFile
                    return 0;
                }
                return getIndentationForNodeWorker(current, currentStart, /*ignoreActualIndentationRange*/ undefined, indentationDelta, sourceFile, options);
            }
            SmartIndenter.getIndentation = getIndentation;
            function getIndentationForNode(n, ignoreActualIndentationRange, sourceFile, options) {
                var start = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
                return getIndentationForNodeWorker(n, start, ignoreActualIndentationRange, /*indentationDelta*/ 0, sourceFile, options);
            }
            SmartIndenter.getIndentationForNode = getIndentationForNode;
            function getIndentationForNodeWorker(current, currentStart, ignoreActualIndentationRange, indentationDelta, sourceFile, options) {
                var parent = current.parent;
                var parentStart;
                // walk upwards and collect indentations for pairs of parent-child nodes
                // indentation is not added if parent and child nodes start on the same line or if parent is IfStatement and child starts on the same line with 'else clause'
                while (parent) {
                    var useActualIndentation = true;
                    if (ignoreActualIndentationRange) {
                        var start = current.getStart(sourceFile);
                        useActualIndentation = start < ignoreActualIndentationRange.pos || start > ignoreActualIndentationRange.end;
                    }
                    if (useActualIndentation) {
                        // check if current node is a list item - if yes, take indentation from it
                        var actualIndentation = getActualIndentationForListItem(current, sourceFile, options);
                        if (actualIndentation !== Value.Unknown) {
                            return actualIndentation + indentationDelta;
                        }
                    }
                    parentStart = getParentStart(parent, current, sourceFile);
                    var parentAndChildShareLine = parentStart.line === currentStart.line ||
                        childStartsOnTheSameLineWithElseInIfStatement(parent, current, currentStart.line, sourceFile);
                    if (useActualIndentation) {
                        // try to fetch actual indentation for current node from source text
                        var actualIndentation = getActualIndentationForNode(current, parent, currentStart, parentAndChildShareLine, sourceFile, options);
                        if (actualIndentation !== Value.Unknown) {
                            return actualIndentation + indentationDelta;
                        }
                        actualIndentation = getLineIndentationWhenExpressionIsInMultiLine(current, sourceFile, options);
                        if (actualIndentation !== Value.Unknown) {
                            return actualIndentation + indentationDelta;
                        }
                    }
                    // increase indentation if parent node wants its content to be indented and parent and child nodes don't start on the same line
                    if (shouldIndentChildNode(parent.kind, current.kind) && !parentAndChildShareLine) {
                        indentationDelta += options.IndentSize;
                    }
                    current = parent;
                    currentStart = parentStart;
                    parent = current.parent;
                }
                return indentationDelta;
            }
            function getParentStart(parent, child, sourceFile) {
                var containingList = getContainingList(child, sourceFile);
                if (containingList) {
                    return sourceFile.getLineAndCharacterOfPosition(containingList.pos);
                }
                return sourceFile.getLineAndCharacterOfPosition(parent.getStart(sourceFile));
            }
            /*
             * Function returns Value.Unknown if indentation cannot be determined
             */
            function getActualIndentationForListItemBeforeComma(commaToken, sourceFile, options) {
                // previous token is comma that separates items in list - find the previous item and try to derive indentation from it
                var commaItemInfo = ts.findListItemInfo(commaToken);
                if (commaItemInfo && commaItemInfo.listItemIndex > 0) {
                    return deriveActualIndentationFromList(commaItemInfo.list.getChildren(), commaItemInfo.listItemIndex - 1, sourceFile, options);
                }
                else {
                    // handle broken code gracefully
                    return Value.Unknown;
                }
            }
            /*
             * Function returns Value.Unknown if actual indentation for node should not be used (i.e because node is nested expression)
             */
            function getActualIndentationForNode(current, parent, currentLineAndChar, parentAndChildShareLine, sourceFile, options) {
                // actual indentation is used for statements\declarations if one of cases below is true:
                // - parent is SourceFile - by default immediate children of SourceFile are not indented except when user indents them manually
                // - parent and child are not on the same line
                var useActualIndentation = (ts.isDeclaration(current) || ts.isStatement(current)) &&
                    (parent.kind === ts.SyntaxKind.SourceFile || !parentAndChildShareLine);
                if (!useActualIndentation) {
                    return Value.Unknown;
                }
                return findColumnForFirstNonWhitespaceCharacterInLine(currentLineAndChar, sourceFile, options);
            }
            function nextTokenIsCurlyBraceOnSameLineAsCursor(precedingToken, current, lineAtPosition, sourceFile) {
                var nextToken = ts.findNextToken(precedingToken, current);
                if (!nextToken) {
                    return false;
                }
                if (nextToken.kind === ts.SyntaxKind.OpenBraceToken) {
                    // open braces are always indented at the parent level
                    return true;
                }
                else if (nextToken.kind === ts.SyntaxKind.CloseBraceToken) {
                    // close braces are indented at the parent level if they are located on the same line with cursor
                    // this means that if new line will be added at $ position, this case will be indented
                    // class A {
                    //    $
                    // }
                    /// and this one - not
                    // class A {
                    // $}
                    var nextTokenStartLine = getStartLineAndCharacterForNode(nextToken, sourceFile).line;
                    return lineAtPosition === nextTokenStartLine;
                }
                return false;
            }
            function getStartLineAndCharacterForNode(n, sourceFile) {
                return sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
            }
            function childStartsOnTheSameLineWithElseInIfStatement(parent, child, childStartLine, sourceFile) {
                if (parent.kind === ts.SyntaxKind.IfStatement && parent.elseStatement === child) {
                    var elseKeyword = ts.findChildOfKind(parent, ts.SyntaxKind.ElseKeyword, sourceFile);
                    ts.Debug.assert(elseKeyword !== undefined);
                    var elseKeywordStartLine = getStartLineAndCharacterForNode(elseKeyword, sourceFile).line;
                    return elseKeywordStartLine === childStartLine;
                }
                return false;
            }
            SmartIndenter.childStartsOnTheSameLineWithElseInIfStatement = childStartsOnTheSameLineWithElseInIfStatement;
            function getContainingList(node, sourceFile) {
                if (node.parent) {
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.TypeReference:
                            if (node.parent.typeArguments &&
                                ts.rangeContainsStartEnd(node.parent.typeArguments, node.getStart(sourceFile), node.getEnd())) {
                                return node.parent.typeArguments;
                            }
                            break;
                        case ts.SyntaxKind.ObjectLiteralExpression:
                            return node.parent.properties;
                        case ts.SyntaxKind.ArrayLiteralExpression:
                            return node.parent.elements;
                        case ts.SyntaxKind.FunctionDeclaration:
                        case ts.SyntaxKind.FunctionExpression:
                        case ts.SyntaxKind.ArrowFunction:
                        case ts.SyntaxKind.MethodDeclaration:
                        case ts.SyntaxKind.MethodSignature:
                        case ts.SyntaxKind.CallSignature:
                        case ts.SyntaxKind.ConstructSignature: {
                            var start = node.getStart(sourceFile);
                            if (node.parent.typeParameters &&
                                ts.rangeContainsStartEnd(node.parent.typeParameters, start, node.getEnd())) {
                                return node.parent.typeParameters;
                            }
                            if (ts.rangeContainsStartEnd(node.parent.parameters, start, node.getEnd())) {
                                return node.parent.parameters;
                            }
                            break;
                        }
                        case ts.SyntaxKind.NewExpression:
                        case ts.SyntaxKind.CallExpression: {
                            var start = node.getStart(sourceFile);
                            if (node.parent.typeArguments &&
                                ts.rangeContainsStartEnd(node.parent.typeArguments, start, node.getEnd())) {
                                return node.parent.typeArguments;
                            }
                            if (node.parent.arguments &&
                                ts.rangeContainsStartEnd(node.parent.arguments, start, node.getEnd())) {
                                return node.parent.arguments;
                            }
                            break;
                        }
                    }
                }
                return undefined;
            }
            function getActualIndentationForListItem(node, sourceFile, options) {
                var containingList = getContainingList(node, sourceFile);
                return containingList ? getActualIndentationFromList(containingList) : Value.Unknown;
                function getActualIndentationFromList(list) {
                    var index = ts.indexOf(list, node);
                    return index !== -1 ? deriveActualIndentationFromList(list, index, sourceFile, options) : Value.Unknown;
                }
            }
            function getLineIndentationWhenExpressionIsInMultiLine(node, sourceFile, options) {
                // actual indentation should not be used when:
                // - node is close parenthesis - this is the end of the expression
                if (node.kind === ts.SyntaxKind.CloseParenToken) {
                    return Value.Unknown;
                }
                if (node.parent && (node.parent.kind === ts.SyntaxKind.CallExpression ||
                    node.parent.kind === ts.SyntaxKind.NewExpression) &&
                    node.parent.expression !== node) {
                    var fullCallOrNewExpression = node.parent.expression;
                    var startingExpression = getStartingExpression(fullCallOrNewExpression);
                    if (fullCallOrNewExpression === startingExpression) {
                        return Value.Unknown;
                    }
                    var fullCallOrNewExpressionEnd = sourceFile.getLineAndCharacterOfPosition(fullCallOrNewExpression.end);
                    var startingExpressionEnd = sourceFile.getLineAndCharacterOfPosition(startingExpression.end);
                    if (fullCallOrNewExpressionEnd.line === startingExpressionEnd.line) {
                        return Value.Unknown;
                    }
                    return findColumnForFirstNonWhitespaceCharacterInLine(fullCallOrNewExpressionEnd, sourceFile, options);
                }
                return Value.Unknown;
                function getStartingExpression(node) {
                    while (true) {
                        switch (node.kind) {
                            case ts.SyntaxKind.CallExpression:
                            case ts.SyntaxKind.NewExpression:
                            case ts.SyntaxKind.PropertyAccessExpression:
                            case ts.SyntaxKind.ElementAccessExpression:
                                node = node.expression;
                                break;
                            default:
                                return node;
                        }
                    }
                    return node;
                }
            }
            function deriveActualIndentationFromList(list, index, sourceFile, options) {
                ts.Debug.assert(index >= 0 && index < list.length);
                var node = list[index];
                // walk toward the start of the list starting from current node and check if the line is the same for all items.
                // if end line for item [i - 1] differs from the start line for item [i] - find column of the first non-whitespace character on the line of item [i]
                var lineAndCharacter = getStartLineAndCharacterForNode(node, sourceFile);
                for (var i = index - 1; i >= 0; --i) {
                    if (list[i].kind === ts.SyntaxKind.CommaToken) {
                        continue;
                    }
                    // skip list items that ends on the same line with the current list element
                    var prevEndLine = sourceFile.getLineAndCharacterOfPosition(list[i].end).line;
                    if (prevEndLine !== lineAndCharacter.line) {
                        return findColumnForFirstNonWhitespaceCharacterInLine(lineAndCharacter, sourceFile, options);
                    }
                    lineAndCharacter = getStartLineAndCharacterForNode(list[i], sourceFile);
                }
                return Value.Unknown;
            }
            function findColumnForFirstNonWhitespaceCharacterInLine(lineAndCharacter, sourceFile, options) {
                var lineStart = sourceFile.getPositionOfLineAndCharacter(lineAndCharacter.line, 0);
                return findFirstNonWhitespaceColumn(lineStart, lineStart + lineAndCharacter.character, sourceFile, options);
            }
            /*
                Character is the actual index of the character since the beginning of the line.
                Column - position of the character after expanding tabs to spaces
                "0\t2$"
                value of 'character' for '$' is 3
                value of 'column' for '$' is 6 (assuming that tab size is 4)
            */
            function findFirstNonWhitespaceCharacterAndColumn(startPos, endPos, sourceFile, options) {
                var character = 0;
                var column = 0;
                for (var pos = startPos; pos < endPos; ++pos) {
                    var ch = sourceFile.text.charCodeAt(pos);
                    if (!ts.isWhiteSpace(ch)) {
                        break;
                    }
                    if (ch === ts.CharacterCodes.tab) {
                        column += options.TabSize + (column % options.TabSize);
                    }
                    else {
                        column++;
                    }
                    character++;
                }
                return { column: column, character: character };
            }
            SmartIndenter.findFirstNonWhitespaceCharacterAndColumn = findFirstNonWhitespaceCharacterAndColumn;
            function findFirstNonWhitespaceColumn(startPos, endPos, sourceFile, options) {
                return findFirstNonWhitespaceCharacterAndColumn(startPos, endPos, sourceFile, options).column;
            }
            SmartIndenter.findFirstNonWhitespaceColumn = findFirstNonWhitespaceColumn;
            function nodeContentIsAlwaysIndented(kind) {
                switch (kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ClassExpression:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.TypeAliasDeclaration:
                    case ts.SyntaxKind.ArrayLiteralExpression:
                    case ts.SyntaxKind.Block:
                    case ts.SyntaxKind.ModuleBlock:
                    case ts.SyntaxKind.ObjectLiteralExpression:
                    case ts.SyntaxKind.TypeLiteral:
                    case ts.SyntaxKind.TupleType:
                    case ts.SyntaxKind.CaseBlock:
                    case ts.SyntaxKind.DefaultClause:
                    case ts.SyntaxKind.CaseClause:
                    case ts.SyntaxKind.ParenthesizedExpression:
                    case ts.SyntaxKind.PropertyAccessExpression:
                    case ts.SyntaxKind.CallExpression:
                    case ts.SyntaxKind.NewExpression:
                    case ts.SyntaxKind.VariableStatement:
                    case ts.SyntaxKind.VariableDeclaration:
                    case ts.SyntaxKind.ExportAssignment:
                    case ts.SyntaxKind.ReturnStatement:
                    case ts.SyntaxKind.ConditionalExpression:
                    case ts.SyntaxKind.ArrayBindingPattern:
                    case ts.SyntaxKind.ObjectBindingPattern:
                    case ts.SyntaxKind.JsxElement:
                    case ts.SyntaxKind.JsxSelfClosingElement:
                    case ts.SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.ConstructSignature:
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.FunctionType:
                    case ts.SyntaxKind.ConstructorType:
                    case ts.SyntaxKind.ParenthesizedType:
                    case ts.SyntaxKind.TaggedTemplateExpression:
                    case ts.SyntaxKind.AwaitExpression:
                        return true;
                }
                return false;
            }
            function shouldIndentChildNode(parent, child) {
                if (nodeContentIsAlwaysIndented(parent)) {
                    return true;
                }
                switch (parent) {
                    case ts.SyntaxKind.DoStatement:
                    case ts.SyntaxKind.WhileStatement:
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForOfStatement:
                    case ts.SyntaxKind.ForStatement:
                    case ts.SyntaxKind.IfStatement:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.ArrowFunction:
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                        return child !== ts.SyntaxKind.Block;
                    default:
                        return false;
                }
            }
            SmartIndenter.shouldIndentChildNode = shouldIndentChildNode;
        })(SmartIndenter = formatting.SmartIndenter || (formatting.SmartIndenter = {}));
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
//# sourceMappingURL=smartIndenter.js.map