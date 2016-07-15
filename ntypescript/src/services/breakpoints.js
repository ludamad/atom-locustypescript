// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.
/// <reference path='services.ts' />
/* @internal */
var ts;
(function (ts) {
    var BreakpointResolver;
    (function (BreakpointResolver) {
        /**
         * Get the breakpoint span in given sourceFile
         */
        function spanInSourceFileAtLocation(sourceFile, position) {
            // Cannot set breakpoint in dts file
            if (sourceFile.flags & ts.NodeFlags.DeclarationFile) {
                return undefined;
            }
            var tokenAtLocation = ts.getTokenAtPosition(sourceFile, position);
            var lineOfPosition = sourceFile.getLineAndCharacterOfPosition(position).line;
            if (sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getStart()).line > lineOfPosition) {
                // Get previous token if the token is returned starts on new line
                // eg: let x =10; |--- cursor is here
                //     let y = 10; 
                // token at position will return let keyword on second line as the token but we would like to use 
                // token on same line if trailing trivia (comments or white spaces on same line) part of the last token on that line
                tokenAtLocation = ts.findPrecedingToken(tokenAtLocation.pos, sourceFile);
                // Its a blank line
                if (!tokenAtLocation || sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getEnd()).line !== lineOfPosition) {
                    return undefined;
                }
            }
            // Cannot set breakpoint in ambient declarations
            if (ts.isInAmbientContext(tokenAtLocation)) {
                return undefined;
            }
            // Get the span in the node based on its syntax
            return spanInNode(tokenAtLocation);
            function textSpan(startNode, endNode) {
                return ts.createTextSpanFromBounds(startNode.getStart(), (endNode || startNode).getEnd());
            }
            function spanInNodeIfStartsOnSameLine(node, otherwiseOnNode) {
                if (node && lineOfPosition === sourceFile.getLineAndCharacterOfPosition(node.getStart()).line) {
                    return spanInNode(node);
                }
                return spanInNode(otherwiseOnNode);
            }
            function spanInPreviousNode(node) {
                return spanInNode(ts.findPrecedingToken(node.pos, sourceFile));
            }
            function spanInNextNode(node) {
                return spanInNode(ts.findNextToken(node, node.parent));
            }
            function spanInNode(node) {
                if (node) {
                    if (ts.isExpression(node)) {
                        if (node.parent.kind === ts.SyntaxKind.DoStatement) {
                            // Set span as if on while keyword
                            return spanInPreviousNode(node);
                        }
                        if (node.parent.kind === ts.SyntaxKind.ForStatement) {
                            // For now lets set the span on this expression, fix it later
                            return textSpan(node);
                        }
                        if (node.parent.kind === ts.SyntaxKind.BinaryExpression && node.parent.operatorToken.kind === ts.SyntaxKind.CommaToken) {
                            // if this is comma expression, the breakpoint is possible in this expression
                            return textSpan(node);
                        }
                        if (node.parent.kind === ts.SyntaxKind.ArrowFunction && node.parent.body === node) {
                            // If this is body of arrow function, it is allowed to have the breakpoint
                            return textSpan(node);
                        }
                    }
                    switch (node.kind) {
                        case ts.SyntaxKind.VariableStatement:
                            // Span on first variable declaration
                            return spanInVariableDeclaration(node.declarationList.declarations[0]);
                        case ts.SyntaxKind.VariableDeclaration:
                        case ts.SyntaxKind.PropertyDeclaration:
                        case ts.SyntaxKind.PropertySignature:
                            return spanInVariableDeclaration(node);
                        case ts.SyntaxKind.Parameter:
                            return spanInParameterDeclaration(node);
                        case ts.SyntaxKind.FunctionDeclaration:
                        case ts.SyntaxKind.MethodDeclaration:
                        case ts.SyntaxKind.MethodSignature:
                        case ts.SyntaxKind.GetAccessor:
                        case ts.SyntaxKind.SetAccessor:
                        case ts.SyntaxKind.Constructor:
                        case ts.SyntaxKind.FunctionExpression:
                        case ts.SyntaxKind.ArrowFunction:
                            return spanInFunctionDeclaration(node);
                        case ts.SyntaxKind.Block:
                            if (ts.isFunctionBlock(node)) {
                                return spanInFunctionBlock(node);
                            }
                        // Fall through
                        case ts.SyntaxKind.ModuleBlock:
                            return spanInBlock(node);
                        case ts.SyntaxKind.CatchClause:
                            return spanInBlock(node.block);
                        case ts.SyntaxKind.ExpressionStatement:
                            // span on the expression
                            return textSpan(node.expression);
                        case ts.SyntaxKind.ReturnStatement:
                            // span on return keyword and expression if present
                            return textSpan(node.getChildAt(0), node.expression);
                        case ts.SyntaxKind.WhileStatement:
                            // Span on while(...)
                            return textSpan(node, ts.findNextToken(node.expression, node));
                        case ts.SyntaxKind.DoStatement:
                            // span in statement of the do statement
                            return spanInNode(node.statement);
                        case ts.SyntaxKind.DebuggerStatement:
                            // span on debugger keyword
                            return textSpan(node.getChildAt(0));
                        case ts.SyntaxKind.IfStatement:
                            // set on if(..) span
                            return textSpan(node, ts.findNextToken(node.expression, node));
                        case ts.SyntaxKind.LabeledStatement:
                            // span in statement
                            return spanInNode(node.statement);
                        case ts.SyntaxKind.BreakStatement:
                        case ts.SyntaxKind.ContinueStatement:
                            // On break or continue keyword and label if present
                            return textSpan(node.getChildAt(0), node.label);
                        case ts.SyntaxKind.ForStatement:
                            return spanInForStatement(node);
                        case ts.SyntaxKind.ForInStatement:
                        case ts.SyntaxKind.ForOfStatement:
                            // span on for (a in ...)
                            return textSpan(node, ts.findNextToken(node.expression, node));
                        case ts.SyntaxKind.SwitchStatement:
                            // span on switch(...)
                            return textSpan(node, ts.findNextToken(node.expression, node));
                        case ts.SyntaxKind.CaseClause:
                        case ts.SyntaxKind.DefaultClause:
                            // span in first statement of the clause
                            return spanInNode(node.statements[0]);
                        case ts.SyntaxKind.TryStatement:
                            // span in try block
                            return spanInBlock(node.tryBlock);
                        case ts.SyntaxKind.ThrowStatement:
                            // span in throw ...
                            return textSpan(node, node.expression);
                        case ts.SyntaxKind.ExportAssignment:
                            // span on export = id
                            return textSpan(node, node.expression);
                        case ts.SyntaxKind.ImportEqualsDeclaration:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleReference);
                        case ts.SyntaxKind.ImportDeclaration:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleSpecifier);
                        case ts.SyntaxKind.ExportDeclaration:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleSpecifier);
                        case ts.SyntaxKind.ModuleDeclaration:
                            // span on complete module if it is instantiated
                            if (ts.getModuleInstanceState(node) !== ts.ModuleInstanceState.Instantiated) {
                                return undefined;
                            }
                        case ts.SyntaxKind.ClassDeclaration:
                        case ts.SyntaxKind.EnumDeclaration:
                        case ts.SyntaxKind.EnumMember:
                        case ts.SyntaxKind.CallExpression:
                        case ts.SyntaxKind.NewExpression:
                            // span on complete node
                            return textSpan(node);
                        case ts.SyntaxKind.WithStatement:
                            // span in statement
                            return spanInNode(node.statement);
                        // No breakpoint in interface, type alias
                        case ts.SyntaxKind.InterfaceDeclaration:
                        case ts.SyntaxKind.TypeAliasDeclaration:
                            return undefined;
                        // Tokens:
                        case ts.SyntaxKind.SemicolonToken:
                        case ts.SyntaxKind.EndOfFileToken:
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile));
                        case ts.SyntaxKind.CommaToken:
                            return spanInPreviousNode(node);
                        case ts.SyntaxKind.OpenBraceToken:
                            return spanInOpenBraceToken(node);
                        case ts.SyntaxKind.CloseBraceToken:
                            return spanInCloseBraceToken(node);
                        case ts.SyntaxKind.OpenParenToken:
                            return spanInOpenParenToken(node);
                        case ts.SyntaxKind.CloseParenToken:
                            return spanInCloseParenToken(node);
                        case ts.SyntaxKind.ColonToken:
                            return spanInColonToken(node);
                        case ts.SyntaxKind.GreaterThanToken:
                        case ts.SyntaxKind.LessThanToken:
                            return spanInGreaterThanOrLessThanToken(node);
                        // Keywords:
                        case ts.SyntaxKind.WhileKeyword:
                            return spanInWhileKeyword(node);
                        case ts.SyntaxKind.ElseKeyword:
                        case ts.SyntaxKind.CatchKeyword:
                        case ts.SyntaxKind.FinallyKeyword:
                            return spanInNextNode(node);
                        default:
                            // If this is name of property assignment, set breakpoint in the initializer
                            if (node.parent.kind === ts.SyntaxKind.PropertyAssignment && node.parent.name === node) {
                                return spanInNode(node.parent.initializer);
                            }
                            // Breakpoint in type assertion goes to its operand
                            if (node.parent.kind === ts.SyntaxKind.TypeAssertionExpression && node.parent.type === node) {
                                return spanInNode(node.parent.expression);
                            }
                            // return type of function go to previous token
                            if (ts.isFunctionLike(node.parent) && node.parent.type === node) {
                                return spanInPreviousNode(node);
                            }
                            // Default go to parent to set the breakpoint
                            return spanInNode(node.parent);
                    }
                }
                function spanInVariableDeclaration(variableDeclaration) {
                    // If declaration of for in statement, just set the span in parent
                    if (variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForInStatement ||
                        variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForOfStatement) {
                        return spanInNode(variableDeclaration.parent.parent);
                    }
                    var isParentVariableStatement = variableDeclaration.parent.parent.kind === ts.SyntaxKind.VariableStatement;
                    var isDeclarationOfForStatement = variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForStatement && ts.contains(variableDeclaration.parent.parent.initializer.declarations, variableDeclaration);
                    var declarations = isParentVariableStatement
                        ? variableDeclaration.parent.parent.declarationList.declarations
                        : isDeclarationOfForStatement
                            ? variableDeclaration.parent.parent.initializer.declarations
                            : undefined;
                    // Breakpoint is possible in variableDeclaration only if there is initialization
                    if (variableDeclaration.initializer || (variableDeclaration.flags & ts.NodeFlags.Export)) {
                        if (declarations && declarations[0] === variableDeclaration) {
                            if (isParentVariableStatement) {
                                // First declaration - include let keyword
                                return textSpan(variableDeclaration.parent, variableDeclaration);
                            }
                            else {
                                ts.Debug.assert(isDeclarationOfForStatement);
                                // Include let keyword from for statement declarations in the span
                                return textSpan(ts.findPrecedingToken(variableDeclaration.pos, sourceFile, variableDeclaration.parent), variableDeclaration);
                            }
                        }
                        else {
                            // Span only on this declaration
                            return textSpan(variableDeclaration);
                        }
                    }
                    else if (declarations && declarations[0] !== variableDeclaration) {
                        // If we cant set breakpoint on this declaration, set it on previous one
                        var indexOfCurrentDeclaration = ts.indexOf(declarations, variableDeclaration);
                        return spanInVariableDeclaration(declarations[indexOfCurrentDeclaration - 1]);
                    }
                }
                function canHaveSpanInParameterDeclaration(parameter) {
                    // Breakpoint is possible on parameter only if it has initializer, is a rest parameter, or has public or private modifier
                    return !!parameter.initializer || parameter.dotDotDotToken !== undefined ||
                        !!(parameter.flags & ts.NodeFlags.Public) || !!(parameter.flags & ts.NodeFlags.Private);
                }
                function spanInParameterDeclaration(parameter) {
                    if (canHaveSpanInParameterDeclaration(parameter)) {
                        return textSpan(parameter);
                    }
                    else {
                        var functionDeclaration = parameter.parent;
                        var indexOfParameter = ts.indexOf(functionDeclaration.parameters, parameter);
                        if (indexOfParameter) {
                            // Not a first parameter, go to previous parameter
                            return spanInParameterDeclaration(functionDeclaration.parameters[indexOfParameter - 1]);
                        }
                        else {
                            // Set breakpoint in the function declaration body
                            return spanInNode(functionDeclaration.body);
                        }
                    }
                }
                function canFunctionHaveSpanInWholeDeclaration(functionDeclaration) {
                    return !!(functionDeclaration.flags & ts.NodeFlags.Export) ||
                        (functionDeclaration.parent.kind === ts.SyntaxKind.ClassDeclaration && functionDeclaration.kind !== ts.SyntaxKind.Constructor);
                }
                function spanInFunctionDeclaration(functionDeclaration) {
                    // No breakpoints in the function signature
                    if (!functionDeclaration.body) {
                        return undefined;
                    }
                    if (canFunctionHaveSpanInWholeDeclaration(functionDeclaration)) {
                        // Set the span on whole function declaration
                        return textSpan(functionDeclaration);
                    }
                    // Set span in function body
                    return spanInNode(functionDeclaration.body);
                }
                function spanInFunctionBlock(block) {
                    var nodeForSpanInBlock = block.statements.length ? block.statements[0] : block.getLastToken();
                    if (canFunctionHaveSpanInWholeDeclaration(block.parent)) {
                        return spanInNodeIfStartsOnSameLine(block.parent, nodeForSpanInBlock);
                    }
                    return spanInNode(nodeForSpanInBlock);
                }
                function spanInBlock(block) {
                    switch (block.parent.kind) {
                        case ts.SyntaxKind.ModuleDeclaration:
                            if (ts.getModuleInstanceState(block.parent) !== ts.ModuleInstanceState.Instantiated) {
                                return undefined;
                            }
                        // Set on parent if on same line otherwise on first statement
                        case ts.SyntaxKind.WhileStatement:
                        case ts.SyntaxKind.IfStatement:
                        case ts.SyntaxKind.ForInStatement:
                        case ts.SyntaxKind.ForOfStatement:
                            return spanInNodeIfStartsOnSameLine(block.parent, block.statements[0]);
                        // Set span on previous token if it starts on same line otherwise on the first statement of the block
                        case ts.SyntaxKind.ForStatement:
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(block.pos, sourceFile, block.parent), block.statements[0]);
                    }
                    // Default action is to set on first statement
                    return spanInNode(block.statements[0]);
                }
                function spanInForStatement(forStatement) {
                    if (forStatement.initializer) {
                        if (forStatement.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                            var variableDeclarationList = forStatement.initializer;
                            if (variableDeclarationList.declarations.length > 0) {
                                return spanInNode(variableDeclarationList.declarations[0]);
                            }
                        }
                        else {
                            return spanInNode(forStatement.initializer);
                        }
                    }
                    if (forStatement.condition) {
                        return textSpan(forStatement.condition);
                    }
                    if (forStatement.incrementor) {
                        return textSpan(forStatement.incrementor);
                    }
                }
                // Tokens:
                function spanInOpenBraceToken(node) {
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.EnumDeclaration:
                            var enumDeclaration = node.parent;
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile, node.parent), enumDeclaration.members.length ? enumDeclaration.members[0] : enumDeclaration.getLastToken(sourceFile));
                        case ts.SyntaxKind.ClassDeclaration:
                            var classDeclaration = node.parent;
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile, node.parent), classDeclaration.members.length ? classDeclaration.members[0] : classDeclaration.getLastToken(sourceFile));
                        case ts.SyntaxKind.CaseBlock:
                            return spanInNodeIfStartsOnSameLine(node.parent.parent, node.parent.clauses[0]);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInCloseBraceToken(node) {
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.ModuleBlock:
                            // If this is not instantiated module block no bp span
                            if (ts.getModuleInstanceState(node.parent.parent) !== ts.ModuleInstanceState.Instantiated) {
                                return undefined;
                            }
                        case ts.SyntaxKind.EnumDeclaration:
                        case ts.SyntaxKind.ClassDeclaration:
                            // Span on close brace token
                            return textSpan(node);
                        case ts.SyntaxKind.Block:
                            if (ts.isFunctionBlock(node.parent)) {
                                // Span on close brace token
                                return textSpan(node);
                            }
                        // fall through.
                        case ts.SyntaxKind.CatchClause:
                            return spanInNode(ts.lastOrUndefined(node.parent.statements));
                            ;
                        case ts.SyntaxKind.CaseBlock:
                            // breakpoint in last statement of the last clause
                            var caseBlock = node.parent;
                            var lastClause = ts.lastOrUndefined(caseBlock.clauses);
                            if (lastClause) {
                                return spanInNode(ts.lastOrUndefined(lastClause.statements));
                            }
                            return undefined;
                        // Default to parent node
                        default:
                            return spanInNode(node.parent);
                    }
                }
                function spanInOpenParenToken(node) {
                    if (node.parent.kind === ts.SyntaxKind.DoStatement) {
                        // Go to while keyword and do action instead
                        return spanInPreviousNode(node);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInCloseParenToken(node) {
                    // Is this close paren token of parameter list, set span in previous token
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.FunctionExpression:
                        case ts.SyntaxKind.FunctionDeclaration:
                        case ts.SyntaxKind.ArrowFunction:
                        case ts.SyntaxKind.MethodDeclaration:
                        case ts.SyntaxKind.MethodSignature:
                        case ts.SyntaxKind.GetAccessor:
                        case ts.SyntaxKind.SetAccessor:
                        case ts.SyntaxKind.Constructor:
                        case ts.SyntaxKind.WhileStatement:
                        case ts.SyntaxKind.DoStatement:
                        case ts.SyntaxKind.ForStatement:
                            return spanInPreviousNode(node);
                        // Default to parent node
                        default:
                            return spanInNode(node.parent);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInColonToken(node) {
                    // Is this : specifying return annotation of the function declaration
                    if (ts.isFunctionLike(node.parent) || node.parent.kind === ts.SyntaxKind.PropertyAssignment) {
                        return spanInPreviousNode(node);
                    }
                    return spanInNode(node.parent);
                }
                function spanInGreaterThanOrLessThanToken(node) {
                    if (node.parent.kind === ts.SyntaxKind.TypeAssertionExpression) {
                        return spanInNode(node.parent.expression);
                    }
                    return spanInNode(node.parent);
                }
                function spanInWhileKeyword(node) {
                    if (node.parent.kind === ts.SyntaxKind.DoStatement) {
                        // Set span on while expression
                        return textSpan(node, ts.findNextToken(node.parent.expression, node.parent));
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
            }
        }
        BreakpointResolver.spanInSourceFileAtLocation = spanInSourceFileAtLocation;
    })(BreakpointResolver = ts.BreakpointResolver || (ts.BreakpointResolver = {}));
})(ts || (ts = {}));
//# sourceMappingURL=breakpoints.js.map