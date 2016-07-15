/// <reference path="checker.ts"/>
/* @internal */
var ts;
(function (ts) {
    function getDeclarationDiagnostics(host, resolver, targetSourceFile) {
        var diagnostics = [];
        var jsFilePath = ts.getOwnEmitOutputFilePath(targetSourceFile, host, ".js");
        emitDeclarations(host, resolver, diagnostics, jsFilePath, targetSourceFile);
        return diagnostics;
    }
    ts.getDeclarationDiagnostics = getDeclarationDiagnostics;
    function emitDeclarations(host, resolver, diagnostics, jsFilePath, root) {
        var newLine = host.getNewLine();
        var compilerOptions = host.getCompilerOptions();
        var write;
        var writeLine;
        var increaseIndent;
        var decreaseIndent;
        var writeTextOfNode;
        var writer = createAndSetNewTextWriterWithSymbolWriter();
        var enclosingDeclaration;
        var currentSourceFile;
        var reportedDeclarationError = false;
        var emitJsDocComments = compilerOptions.removeComments ? function (declaration) { } : writeJsDocComments;
        var emit = compilerOptions.stripInternal ? stripInternal : emitNode;
        var moduleElementDeclarationEmitInfo = [];
        var asynchronousSubModuleDeclarationEmitInfo;
        // Contains the reference paths that needs to go in the declaration file.
        // Collecting this separately because reference paths need to be first thing in the declaration file
        // and we could be collecting these paths from multiple files into single one with --out option
        var referencePathsOutput = "";
        if (root) {
            // Emitting just a single file, so emit references in this file only
            if (!compilerOptions.noResolve) {
                var addedGlobalFileReference = false;
                ts.forEach(root.referencedFiles, function (fileReference) {
                    var referencedFile = ts.tryResolveScriptReference(host, root, fileReference);
                    // All the references that are not going to be part of same file
                    if (referencedFile && ((referencedFile.flags & ts.NodeFlags.DeclarationFile) ||
                        ts.shouldEmitToOwnFile(referencedFile, compilerOptions) ||
                        !addedGlobalFileReference)) {
                        writeReferencePath(referencedFile);
                        if (!ts.isExternalModuleOrDeclarationFile(referencedFile)) {
                            addedGlobalFileReference = true;
                        }
                    }
                });
            }
            emitSourceFile(root);
            // create asynchronous output for the importDeclarations
            if (moduleElementDeclarationEmitInfo.length) {
                var oldWriter = writer;
                ts.forEach(moduleElementDeclarationEmitInfo, function (aliasEmitInfo) {
                    if (aliasEmitInfo.isVisible) {
                        ts.Debug.assert(aliasEmitInfo.node.kind === ts.SyntaxKind.ImportDeclaration);
                        createAndSetNewTextWriterWithSymbolWriter();
                        ts.Debug.assert(aliasEmitInfo.indent === 0);
                        writeImportDeclaration(aliasEmitInfo.node);
                        aliasEmitInfo.asynchronousOutput = writer.getText();
                    }
                });
                setWriter(oldWriter);
            }
        }
        else {
            // Emit references corresponding to this file
            var emittedReferencedFiles = [];
            ts.forEach(host.getSourceFiles(), function (sourceFile) {
                if (!ts.isExternalModuleOrDeclarationFile(sourceFile)) {
                    // Check what references need to be added
                    if (!compilerOptions.noResolve) {
                        ts.forEach(sourceFile.referencedFiles, function (fileReference) {
                            var referencedFile = ts.tryResolveScriptReference(host, sourceFile, fileReference);
                            // If the reference file is a declaration file or an external module, emit that reference
                            if (referencedFile && (ts.isExternalModuleOrDeclarationFile(referencedFile) &&
                                !ts.contains(emittedReferencedFiles, referencedFile))) {
                                writeReferencePath(referencedFile);
                                emittedReferencedFiles.push(referencedFile);
                            }
                        });
                    }
                    emitSourceFile(sourceFile);
                }
            });
        }
        return {
            reportedDeclarationError: reportedDeclarationError,
            moduleElementDeclarationEmitInfo: moduleElementDeclarationEmitInfo,
            synchronousDeclarationOutput: writer.getText(),
            referencePathsOutput: referencePathsOutput
        };
        function hasInternalAnnotation(range) {
            var text = currentSourceFile.text;
            var comment = text.substring(range.pos, range.end);
            return comment.indexOf("@internal") >= 0;
        }
        function stripInternal(node) {
            if (node) {
                var leadingCommentRanges = ts.getLeadingCommentRanges(currentSourceFile.text, node.pos);
                if (ts.forEach(leadingCommentRanges, hasInternalAnnotation)) {
                    return;
                }
                emitNode(node);
            }
        }
        function createAndSetNewTextWriterWithSymbolWriter() {
            var writer = ts.createTextWriter(newLine);
            writer.trackSymbol = trackSymbol;
            writer.writeKeyword = writer.write;
            writer.writeOperator = writer.write;
            writer.writePunctuation = writer.write;
            writer.writeSpace = writer.write;
            writer.writeStringLiteral = writer.writeLiteral;
            writer.writeParameter = writer.write;
            writer.writeSymbol = writer.write;
            setWriter(writer);
            return writer;
        }
        function setWriter(newWriter) {
            writer = newWriter;
            write = newWriter.write;
            writeTextOfNode = newWriter.writeTextOfNode;
            writeLine = newWriter.writeLine;
            increaseIndent = newWriter.increaseIndent;
            decreaseIndent = newWriter.decreaseIndent;
        }
        function writeAsynchronousModuleElements(nodes) {
            var oldWriter = writer;
            ts.forEach(nodes, function (declaration) {
                var nodeToCheck;
                if (declaration.kind === ts.SyntaxKind.VariableDeclaration) {
                    nodeToCheck = declaration.parent.parent;
                }
                else if (declaration.kind === ts.SyntaxKind.NamedImports || declaration.kind === ts.SyntaxKind.ImportSpecifier || declaration.kind === ts.SyntaxKind.ImportClause) {
                    ts.Debug.fail("We should be getting ImportDeclaration instead to write");
                }
                else {
                    nodeToCheck = declaration;
                }
                var moduleElementEmitInfo = ts.forEach(moduleElementDeclarationEmitInfo, function (declEmitInfo) { return declEmitInfo.node === nodeToCheck ? declEmitInfo : undefined; });
                if (!moduleElementEmitInfo && asynchronousSubModuleDeclarationEmitInfo) {
                    moduleElementEmitInfo = ts.forEach(asynchronousSubModuleDeclarationEmitInfo, function (declEmitInfo) { return declEmitInfo.node === nodeToCheck ? declEmitInfo : undefined; });
                }
                // If the alias was marked as not visible when we saw its declaration, we would have saved the aliasEmitInfo, but if we haven't yet visited the alias declaration
                // then we don't need to write it at this point. We will write it when we actually see its declaration
                // Eg.
                // export function bar(a: foo.Foo) { }
                // import foo = require("foo");
                // Writing of function bar would mark alias declaration foo as visible but we haven't yet visited that declaration so do nothing,
                // we would write alias foo declaration when we visit it since it would now be marked as visible
                if (moduleElementEmitInfo) {
                    if (moduleElementEmitInfo.node.kind === ts.SyntaxKind.ImportDeclaration) {
                        // we have to create asynchronous output only after we have collected complete information
                        // because it is possible to enable multiple bindings as asynchronously visible
                        moduleElementEmitInfo.isVisible = true;
                    }
                    else {
                        createAndSetNewTextWriterWithSymbolWriter();
                        for (var declarationIndent = moduleElementEmitInfo.indent; declarationIndent; declarationIndent--) {
                            increaseIndent();
                        }
                        if (nodeToCheck.kind === ts.SyntaxKind.ModuleDeclaration) {
                            ts.Debug.assert(asynchronousSubModuleDeclarationEmitInfo === undefined);
                            asynchronousSubModuleDeclarationEmitInfo = [];
                        }
                        writeModuleElement(nodeToCheck);
                        if (nodeToCheck.kind === ts.SyntaxKind.ModuleDeclaration) {
                            moduleElementEmitInfo.subModuleElementDeclarationEmitInfo = asynchronousSubModuleDeclarationEmitInfo;
                            asynchronousSubModuleDeclarationEmitInfo = undefined;
                        }
                        moduleElementEmitInfo.asynchronousOutput = writer.getText();
                    }
                }
            });
            setWriter(oldWriter);
        }
        function handleSymbolAccessibilityError(symbolAccesibilityResult) {
            if (symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.Accessible) {
                // write the aliases
                if (symbolAccesibilityResult && symbolAccesibilityResult.aliasesToMakeVisible) {
                    writeAsynchronousModuleElements(symbolAccesibilityResult.aliasesToMakeVisible);
                }
            }
            else {
                // Report error
                reportedDeclarationError = true;
                var errorInfo = writer.getSymbolAccessibilityDiagnostic(symbolAccesibilityResult);
                if (errorInfo) {
                    if (errorInfo.typeName) {
                        diagnostics.push(ts.createDiagnosticForNode(symbolAccesibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, ts.getSourceTextOfNodeFromSourceFile(currentSourceFile, errorInfo.typeName), symbolAccesibilityResult.errorSymbolName, symbolAccesibilityResult.errorModuleName));
                    }
                    else {
                        diagnostics.push(ts.createDiagnosticForNode(symbolAccesibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, symbolAccesibilityResult.errorSymbolName, symbolAccesibilityResult.errorModuleName));
                    }
                }
            }
        }
        function trackSymbol(symbol, enclosingDeclaration, meaning) {
            handleSymbolAccessibilityError(resolver.isSymbolAccessible(symbol, enclosingDeclaration, meaning));
        }
        function writeTypeOfDeclaration(declaration, type, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            write(": ");
            if (type) {
                // Write the type
                emitType(type);
            }
            else {
                resolver.writeTypeOfDeclaration(declaration, enclosingDeclaration, ts.TypeFormatFlags.UseTypeOfFunction, writer);
            }
        }
        function writeReturnTypeAtSignature(signature, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            write(": ");
            if (signature.type) {
                // Write the type
                emitType(signature.type);
            }
            else {
                resolver.writeReturnTypeOfSignatureDeclaration(signature, enclosingDeclaration, ts.TypeFormatFlags.UseTypeOfFunction, writer);
            }
        }
        function emitLines(nodes) {
            for (var _i = 0; _i < nodes.length; _i++) {
                var node = nodes[_i];
                emit(node);
            }
        }
        function emitSeparatedList(nodes, separator, eachNodeEmitFn, canEmitFn) {
            var currentWriterPos = writer.getTextPos();
            for (var _i = 0; _i < nodes.length; _i++) {
                var node = nodes[_i];
                if (!canEmitFn || canEmitFn(node)) {
                    if (currentWriterPos !== writer.getTextPos()) {
                        write(separator);
                    }
                    currentWriterPos = writer.getTextPos();
                    eachNodeEmitFn(node);
                }
            }
        }
        function emitCommaList(nodes, eachNodeEmitFn, canEmitFn) {
            emitSeparatedList(nodes, ", ", eachNodeEmitFn, canEmitFn);
        }
        function writeJsDocComments(declaration) {
            if (declaration) {
                var jsDocComments = ts.getJsDocComments(declaration, currentSourceFile);
                ts.emitNewLineBeforeLeadingComments(currentSourceFile, writer, declaration, jsDocComments);
                // jsDoc comments are emitted at /*leading comment1 */space/*leading comment*/space
                ts.emitComments(currentSourceFile, writer, jsDocComments, /*trailingSeparator*/ true, newLine, ts.writeCommentRange);
            }
        }
        function emitTypeWithNewGetSymbolAccessibilityDiagnostic(type, getSymbolAccessibilityDiagnostic) {
            writer.getSymbolAccessibilityDiagnostic = getSymbolAccessibilityDiagnostic;
            emitType(type);
        }
        function emitType(type) {
            switch (type.kind) {
                case ts.SyntaxKind.AnyKeyword:
                case ts.SyntaxKind.StringKeyword:
                case ts.SyntaxKind.NumberKeyword:
                case ts.SyntaxKind.BooleanKeyword:
                case ts.SyntaxKind.SymbolKeyword:
                case ts.SyntaxKind.VoidKeyword:
                case ts.SyntaxKind.StringLiteral:
                    return writeTextOfNode(currentSourceFile, type);
                case ts.SyntaxKind.ExpressionWithTypeArguments:
                    return emitExpressionWithTypeArguments(type);
                case ts.SyntaxKind.TypeReference:
                    return emitTypeReference(type);
                case ts.SyntaxKind.TypeQuery:
                    return emitTypeQuery(type);
                case ts.SyntaxKind.ArrayType:
                    return emitArrayType(type);
                case ts.SyntaxKind.TupleType:
                    return emitTupleType(type);
                case ts.SyntaxKind.UnionType:
                    return emitUnionType(type);
                case ts.SyntaxKind.IntersectionType:
                    return emitIntersectionType(type);
                case ts.SyntaxKind.ParenthesizedType:
                    return emitParenType(type);
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                    return emitSignatureDeclarationWithJsDocComments(type);
                case ts.SyntaxKind.TypeLiteral:
                    return emitTypeLiteral(type);
                case ts.SyntaxKind.Identifier:
                    return emitEntityName(type);
                case ts.SyntaxKind.QualifiedName:
                    return emitEntityName(type);
                case ts.SyntaxKind.TypePredicate:
                    return emitTypePredicate(type);
            }
            function writeEntityName(entityName) {
                if (entityName.kind === ts.SyntaxKind.Identifier) {
                    writeTextOfNode(currentSourceFile, entityName);
                }
                else {
                    var left = entityName.kind === ts.SyntaxKind.QualifiedName ? entityName.left : entityName.expression;
                    var right = entityName.kind === ts.SyntaxKind.QualifiedName ? entityName.right : entityName.name;
                    writeEntityName(left);
                    write(".");
                    writeTextOfNode(currentSourceFile, right);
                }
            }
            function emitEntityName(entityName) {
                var visibilityResult = resolver.isEntityNameVisible(entityName, 
                // Aliases can be written asynchronously so use correct enclosing declaration
                entityName.parent.kind === ts.SyntaxKind.ImportEqualsDeclaration ? entityName.parent : enclosingDeclaration);
                handleSymbolAccessibilityError(visibilityResult);
                writeEntityName(entityName);
            }
            function emitExpressionWithTypeArguments(node) {
                if (ts.isSupportedExpressionWithTypeArguments(node)) {
                    ts.Debug.assert(node.expression.kind === ts.SyntaxKind.Identifier || node.expression.kind === ts.SyntaxKind.PropertyAccessExpression);
                    emitEntityName(node.expression);
                    if (node.typeArguments) {
                        write("<");
                        emitCommaList(node.typeArguments, emitType);
                        write(">");
                    }
                }
            }
            function emitTypeReference(type) {
                emitEntityName(type.typeName);
                if (type.typeArguments) {
                    write("<");
                    emitCommaList(type.typeArguments, emitType);
                    write(">");
                }
            }
            function emitTypePredicate(type) {
                writeTextOfNode(currentSourceFile, type.parameterName);
                write(" is ");
                emitType(type.type);
            }
            function emitTypeQuery(type) {
                write("typeof ");
                emitEntityName(type.exprName);
            }
            function emitArrayType(type) {
                emitType(type.elementType);
                write("[]");
            }
            function emitTupleType(type) {
                write("[");
                emitCommaList(type.elementTypes, emitType);
                write("]");
            }
            function emitUnionType(type) {
                emitSeparatedList(type.types, " | ", emitType);
            }
            function emitIntersectionType(type) {
                emitSeparatedList(type.types, " & ", emitType);
            }
            function emitParenType(type) {
                write("(");
                emitType(type.type);
                write(")");
            }
            function emitTypeLiteral(type) {
                write("{");
                if (type.members.length) {
                    writeLine();
                    increaseIndent();
                    // write members
                    emitLines(type.members);
                    decreaseIndent();
                }
                write("}");
            }
        }
        function emitSourceFile(node) {
            currentSourceFile = node;
            enclosingDeclaration = node;
            emitLines(node.statements);
        }
        // Return a temp variable name to be used in `export default` statements.
        // The temp name will be of the form _default_counter.
        // Note that export default is only allowed at most once in a module, so we
        // do not need to keep track of created temp names.
        function getExportDefaultTempVariableName() {
            var baseName = "_default";
            if (!ts.hasProperty(currentSourceFile.identifiers, baseName)) {
                return baseName;
            }
            var count = 0;
            while (true) {
                var name_1 = baseName + "_" + (++count);
                if (!ts.hasProperty(currentSourceFile.identifiers, name_1)) {
                    return name_1;
                }
            }
        }
        function emitExportAssignment(node) {
            if (node.expression.kind === ts.SyntaxKind.Identifier) {
                write(node.isExportEquals ? "export = " : "export default ");
                writeTextOfNode(currentSourceFile, node.expression);
            }
            else {
                // Expression
                var tempVarName = getExportDefaultTempVariableName();
                write("declare var ");
                write(tempVarName);
                write(": ");
                writer.getSymbolAccessibilityDiagnostic = getDefaultExportAccessibilityDiagnostic;
                resolver.writeTypeOfExpression(node.expression, enclosingDeclaration, ts.TypeFormatFlags.UseTypeOfFunction, writer);
                write(";");
                writeLine();
                write(node.isExportEquals ? "export = " : "export default ");
                write(tempVarName);
            }
            write(";");
            writeLine();
            // Make all the declarations visible for the export name
            if (node.expression.kind === ts.SyntaxKind.Identifier) {
                var nodes = resolver.collectLinkedAliases(node.expression);
                // write each of these declarations asynchronously
                writeAsynchronousModuleElements(nodes);
            }
            function getDefaultExportAccessibilityDiagnostic(diagnostic) {
                return {
                    diagnosticMessage: ts.Diagnostics.Default_export_of_the_module_has_or_is_using_private_name_0,
                    errorNode: node
                };
            }
        }
        function isModuleElementVisible(node) {
            return resolver.isDeclarationVisible(node);
        }
        function emitModuleElement(node, isModuleElementVisible) {
            if (isModuleElementVisible) {
                writeModuleElement(node);
            }
            else if (node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
                (node.parent.kind === ts.SyntaxKind.SourceFile && ts.isExternalModule(currentSourceFile))) {
                var isVisible;
                if (asynchronousSubModuleDeclarationEmitInfo && node.parent.kind !== ts.SyntaxKind.SourceFile) {
                    // Import declaration of another module that is visited async so lets put it in right spot
                    asynchronousSubModuleDeclarationEmitInfo.push({
                        node: node,
                        outputPos: writer.getTextPos(),
                        indent: writer.getIndent(),
                        isVisible: isVisible
                    });
                }
                else {
                    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
                        var importDeclaration = node;
                        if (importDeclaration.importClause) {
                            isVisible = (importDeclaration.importClause.name && resolver.isDeclarationVisible(importDeclaration.importClause)) ||
                                isVisibleNamedBinding(importDeclaration.importClause.namedBindings);
                        }
                    }
                    moduleElementDeclarationEmitInfo.push({
                        node: node,
                        outputPos: writer.getTextPos(),
                        indent: writer.getIndent(),
                        isVisible: isVisible
                    });
                }
            }
        }
        function writeModuleElement(node) {
            switch (node.kind) {
                case ts.SyntaxKind.FunctionDeclaration:
                    return writeFunctionDeclaration(node);
                case ts.SyntaxKind.VariableStatement:
                    return writeVariableStatement(node);
                case ts.SyntaxKind.InterfaceDeclaration:
                    return writeInterfaceDeclaration(node);
                case ts.SyntaxKind.ClassDeclaration:
                    return writeClassDeclaration(node);
                case ts.SyntaxKind.TypeAliasDeclaration:
                    return writeTypeAliasDeclaration(node);
                case ts.SyntaxKind.EnumDeclaration:
                    return writeEnumDeclaration(node);
                case ts.SyntaxKind.ModuleDeclaration:
                    return writeModuleDeclaration(node);
                case ts.SyntaxKind.ImportEqualsDeclaration:
                    return writeImportEqualsDeclaration(node);
                case ts.SyntaxKind.ImportDeclaration:
                    return writeImportDeclaration(node);
                default:
                    ts.Debug.fail("Unknown symbol kind");
            }
        }
        function emitModuleElementDeclarationFlags(node) {
            // If the node is parented in the current source file we need to emit export declare or just export
            if (node.parent === currentSourceFile) {
                // If the node is exported
                if (node.flags & ts.NodeFlags.Export) {
                    write("export ");
                }
                if (node.flags & ts.NodeFlags.Default) {
                    write("default ");
                }
                else if (node.kind !== ts.SyntaxKind.InterfaceDeclaration) {
                    write("declare ");
                }
            }
        }
        function emitClassMemberDeclarationFlags(node) {
            if (node.flags & ts.NodeFlags.Private) {
                write("private ");
            }
            else if (node.flags & ts.NodeFlags.Protected) {
                write("protected ");
            }
            if (node.flags & ts.NodeFlags.Static) {
                write("static ");
            }
            if (node.flags & ts.NodeFlags.Abstract) {
                write("abstract ");
            }
        }
        function writeImportEqualsDeclaration(node) {
            // note usage of writer. methods instead of aliases created, just to make sure we are using
            // correct writer especially to handle asynchronous alias writing
            emitJsDocComments(node);
            if (node.flags & ts.NodeFlags.Export) {
                write("export ");
            }
            write("import ");
            writeTextOfNode(currentSourceFile, node.name);
            write(" = ");
            if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.moduleReference, getImportEntityNameVisibilityError);
                write(";");
            }
            else {
                write("require(");
                writeTextOfNode(currentSourceFile, ts.getExternalModuleImportEqualsDeclarationExpression(node));
                write(");");
            }
            writer.writeLine();
            function getImportEntityNameVisibilityError(symbolAccesibilityResult) {
                return {
                    diagnosticMessage: ts.Diagnostics.Import_declaration_0_is_using_private_name_1,
                    errorNode: node,
                    typeName: node.name
                };
            }
        }
        function isVisibleNamedBinding(namedBindings) {
            if (namedBindings) {
                if (namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
                    return resolver.isDeclarationVisible(namedBindings);
                }
                else {
                    return ts.forEach(namedBindings.elements, function (namedImport) { return resolver.isDeclarationVisible(namedImport); });
                }
            }
        }
        function writeImportDeclaration(node) {
            if (!node.importClause && !(node.flags & ts.NodeFlags.Export)) {
                // do not write non-exported import declarations that don't have import clauses
                return;
            }
            emitJsDocComments(node);
            if (node.flags & ts.NodeFlags.Export) {
                write("export ");
            }
            write("import ");
            if (node.importClause) {
                var currentWriterPos = writer.getTextPos();
                if (node.importClause.name && resolver.isDeclarationVisible(node.importClause)) {
                    writeTextOfNode(currentSourceFile, node.importClause.name);
                }
                if (node.importClause.namedBindings && isVisibleNamedBinding(node.importClause.namedBindings)) {
                    if (currentWriterPos !== writer.getTextPos()) {
                        // If the default binding was emitted, write the separated
                        write(", ");
                    }
                    if (node.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
                        write("* as ");
                        writeTextOfNode(currentSourceFile, node.importClause.namedBindings.name);
                    }
                    else {
                        write("{ ");
                        emitCommaList(node.importClause.namedBindings.elements, emitImportOrExportSpecifier, resolver.isDeclarationVisible);
                        write(" }");
                    }
                }
                write(" from ");
            }
            writeTextOfNode(currentSourceFile, node.moduleSpecifier);
            write(";");
            writer.writeLine();
        }
        function emitImportOrExportSpecifier(node) {
            if (node.propertyName) {
                writeTextOfNode(currentSourceFile, node.propertyName);
                write(" as ");
            }
            writeTextOfNode(currentSourceFile, node.name);
        }
        function emitExportSpecifier(node) {
            emitImportOrExportSpecifier(node);
            // Make all the declarations visible for the export name
            var nodes = resolver.collectLinkedAliases(node.propertyName || node.name);
            // write each of these declarations asynchronously
            writeAsynchronousModuleElements(nodes);
        }
        function emitExportDeclaration(node) {
            emitJsDocComments(node);
            write("export ");
            if (node.exportClause) {
                write("{ ");
                emitCommaList(node.exportClause.elements, emitExportSpecifier);
                write(" }");
            }
            else {
                write("*");
            }
            if (node.moduleSpecifier) {
                write(" from ");
                writeTextOfNode(currentSourceFile, node.moduleSpecifier);
            }
            write(";");
            writer.writeLine();
        }
        function writeModuleDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (node.flags & ts.NodeFlags.Namespace) {
                write("namespace ");
            }
            else {
                write("module ");
            }
            writeTextOfNode(currentSourceFile, node.name);
            while (node.body.kind !== ts.SyntaxKind.ModuleBlock) {
                node = node.body;
                write(".");
                writeTextOfNode(currentSourceFile, node.name);
            }
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.body.statements);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function writeTypeAliasDeclaration(node) {
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            write("type ");
            writeTextOfNode(currentSourceFile, node.name);
            emitTypeParameters(node.typeParameters);
            write(" = ");
            emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.type, getTypeAliasDeclarationVisibilityError);
            write(";");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
            function getTypeAliasDeclarationVisibilityError(symbolAccesibilityResult) {
                return {
                    diagnosticMessage: ts.Diagnostics.Exported_type_alias_0_has_or_is_using_private_name_1,
                    errorNode: node.type,
                    typeName: node.name
                };
            }
        }
        function writeEnumDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (ts.isConst(node)) {
                write("const ");
            }
            write("enum ");
            writeTextOfNode(currentSourceFile, node.name);
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
        }
        function emitEnumMemberDeclaration(node) {
            emitJsDocComments(node);
            writeTextOfNode(currentSourceFile, node.name);
            var enumMemberValue = resolver.getConstantValue(node);
            if (enumMemberValue !== undefined) {
                write(" = ");
                write(enumMemberValue.toString());
            }
            write(",");
            writeLine();
        }
        function isPrivateMethodTypeParameter(node) {
            return node.parent.kind === ts.SyntaxKind.MethodDeclaration && (node.parent.flags & ts.NodeFlags.Private);
        }
        function emitTypeParameters(typeParameters) {
            function emitTypeParameter(node) {
                increaseIndent();
                emitJsDocComments(node);
                decreaseIndent();
                writeTextOfNode(currentSourceFile, node.name);
                // If there is constraint present and this is not a type parameter of the private method emit the constraint
                if (node.constraint && !isPrivateMethodTypeParameter(node)) {
                    write(" extends ");
                    if (node.parent.kind === ts.SyntaxKind.FunctionType ||
                        node.parent.kind === ts.SyntaxKind.ConstructorType ||
                        (node.parent.parent && node.parent.parent.kind === ts.SyntaxKind.TypeLiteral)) {
                        ts.Debug.assert(node.parent.kind === ts.SyntaxKind.MethodDeclaration ||
                            node.parent.kind === ts.SyntaxKind.MethodSignature ||
                            node.parent.kind === ts.SyntaxKind.FunctionType ||
                            node.parent.kind === ts.SyntaxKind.ConstructorType ||
                            node.parent.kind === ts.SyntaxKind.CallSignature ||
                            node.parent.kind === ts.SyntaxKind.ConstructSignature);
                        emitType(node.constraint);
                    }
                    else {
                        emitTypeWithNewGetSymbolAccessibilityDiagnostic(node.constraint, getTypeParameterConstraintVisibilityError);
                    }
                }
                function getTypeParameterConstraintVisibilityError(symbolAccesibilityResult) {
                    // Type parameter constraints are named by user so we should always be able to name it
                    var diagnosticMessage;
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.ClassDeclaration:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_class_has_or_is_using_private_name_1;
                            break;
                        case ts.SyntaxKind.InterfaceDeclaration:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case ts.SyntaxKind.ConstructSignature:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case ts.SyntaxKind.CallSignature:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
                            break;
                        case ts.SyntaxKind.MethodDeclaration:
                        case ts.SyntaxKind.MethodSignature:
                            if (node.parent.flags & ts.NodeFlags.Static) {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                            }
                            else if (node.parent.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                            }
                            else {
                                diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                            }
                            break;
                        case ts.SyntaxKind.FunctionDeclaration:
                            diagnosticMessage = ts.Diagnostics.Type_parameter_0_of_exported_function_has_or_is_using_private_name_1;
                            break;
                        default:
                            ts.Debug.fail("This is unknown parent for type parameter: " + node.parent.kind);
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: node,
                        typeName: node.name
                    };
                }
            }
            if (typeParameters) {
                write("<");
                emitCommaList(typeParameters, emitTypeParameter);
                write(">");
            }
        }
        function emitHeritageClause(typeReferences, isImplementsList) {
            if (typeReferences) {
                write(isImplementsList ? " implements " : " extends ");
                emitCommaList(typeReferences, emitTypeOfTypeReference);
            }
            function emitTypeOfTypeReference(node) {
                if (ts.isSupportedExpressionWithTypeArguments(node)) {
                    emitTypeWithNewGetSymbolAccessibilityDiagnostic(node, getHeritageClauseVisibilityError);
                }
                else if (!isImplementsList && node.expression.kind === ts.SyntaxKind.NullKeyword) {
                    write("null");
                }
                function getHeritageClauseVisibilityError(symbolAccesibilityResult) {
                    var diagnosticMessage;
                    // Heritage clause is written by user so it can always be named
                    if (node.parent.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                        // Class or Interface implemented/extended is inaccessible
                        diagnosticMessage = isImplementsList ?
                            ts.Diagnostics.Implements_clause_of_exported_class_0_has_or_is_using_private_name_1 :
                            ts.Diagnostics.Extends_clause_of_exported_class_0_has_or_is_using_private_name_1;
                    }
                    else {
                        // interface is inaccessible
                        diagnosticMessage = ts.Diagnostics.Extends_clause_of_exported_interface_0_has_or_is_using_private_name_1;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: node,
                        typeName: node.parent.parent.name
                    };
                }
            }
        }
        function writeClassDeclaration(node) {
            function emitParameterProperties(constructorDeclaration) {
                if (constructorDeclaration) {
                    ts.forEach(constructorDeclaration.parameters, function (param) {
                        if (param.flags & ts.NodeFlags.AccessibilityModifier) {
                            emitPropertyDeclaration(param);
                        }
                    });
                }
            }
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (node.flags & ts.NodeFlags.Abstract) {
                write("abstract ");
            }
            write("class ");
            writeTextOfNode(currentSourceFile, node.name);
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitTypeParameters(node.typeParameters);
            var baseTypeNode = ts.getClassExtendsHeritageClauseElement(node);
            if (baseTypeNode) {
                emitHeritageClause([baseTypeNode], /*isImplementsList*/ false);
            }
            emitHeritageClause(ts.getClassImplementsHeritageClauseElements(node), /*isImplementsList*/ true);
            write(" {");
            writeLine();
            increaseIndent();
            emitParameterProperties(ts.getFirstConstructorWithBody(node));
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function writeInterfaceDeclaration(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            write("interface ");
            writeTextOfNode(currentSourceFile, node.name);
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            emitTypeParameters(node.typeParameters);
            emitHeritageClause(ts.getInterfaceBaseTypeNodes(node), /*isImplementsList*/ false);
            write(" {");
            writeLine();
            increaseIndent();
            emitLines(node.members);
            decreaseIndent();
            write("}");
            writeLine();
            enclosingDeclaration = prevEnclosingDeclaration;
        }
        function emitPropertyDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            emitJsDocComments(node);
            emitClassMemberDeclarationFlags(node);
            emitVariableDeclaration(node);
            write(";");
            writeLine();
        }
        function emitVariableDeclaration(node) {
            // If we are emitting property it isn't moduleElement and hence we already know it needs to be emitted
            // so there is no check needed to see if declaration is visible
            if (node.kind !== ts.SyntaxKind.VariableDeclaration || resolver.isDeclarationVisible(node)) {
                if (ts.isBindingPattern(node.name)) {
                    emitBindingPattern(node.name);
                }
                else {
                    // If this node is a computed name, it can only be a symbol, because we've already skipped
                    // it if it's not a well known symbol. In that case, the text of the name will be exactly
                    // what we want, namely the name expression enclosed in brackets.
                    writeTextOfNode(currentSourceFile, node.name);
                    // If optional property emit ?
                    if ((node.kind === ts.SyntaxKind.PropertyDeclaration || node.kind === ts.SyntaxKind.PropertySignature) && ts.hasQuestionToken(node)) {
                        write("?");
                    }
                    if ((node.kind === ts.SyntaxKind.PropertyDeclaration || node.kind === ts.SyntaxKind.PropertySignature) && node.parent.kind === ts.SyntaxKind.TypeLiteral) {
                        emitTypeOfVariableDeclarationFromTypeLiteral(node);
                    }
                    else if (!(node.flags & ts.NodeFlags.Private)) {
                        writeTypeOfDeclaration(node, node.type, getVariableDeclarationTypeVisibilityError);
                    }
                }
            }
            function getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult) {
                if (node.kind === ts.SyntaxKind.VariableDeclaration) {
                    return symbolAccesibilityResult.errorModuleName ?
                        symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                            ts.Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                            ts.Diagnostics.Exported_variable_0_has_or_is_using_name_1_from_private_module_2 :
                        ts.Diagnostics.Exported_variable_0_has_or_is_using_private_name_1;
                }
                else if (node.kind === ts.SyntaxKind.PropertyDeclaration || node.kind === ts.SyntaxKind.PropertySignature) {
                    // TODO(jfreeman): Deal with computed properties in error reporting.
                    if (node.flags & ts.NodeFlags.Static) {
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Public_static_property_0_of_exported_class_has_or_is_using_private_name_1;
                    }
                    else if (node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Public_property_0_of_exported_class_has_or_is_using_private_name_1;
                    }
                    else {
                        // Interfaces cannot have types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Property_0_of_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Property_0_of_exported_interface_has_or_is_using_private_name_1;
                    }
                }
            }
            function getVariableDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage = getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                return diagnosticMessage !== undefined ? {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node,
                    typeName: node.name
                } : undefined;
            }
            function emitBindingPattern(bindingPattern) {
                // Only select non-omitted expression from the bindingPattern's elements.
                // We have to do this to avoid emitting trailing commas.
                // For example:
                //      original: var [, c,,] = [ 2,3,4]
                //      emitted: declare var c: number; // instead of declare var c:number, ;
                var elements = [];
                for (var _i = 0, _a = bindingPattern.elements; _i < _a.length; _i++) {
                    var element = _a[_i];
                    if (element.kind !== ts.SyntaxKind.OmittedExpression) {
                        elements.push(element);
                    }
                }
                emitCommaList(elements, emitBindingElement);
            }
            function emitBindingElement(bindingElement) {
                function getBindingElementTypeVisibilityError(symbolAccesibilityResult) {
                    var diagnosticMessage = getVariableDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                    return diagnosticMessage !== undefined ? {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: bindingElement,
                        typeName: bindingElement.name
                    } : undefined;
                }
                if (bindingElement.name) {
                    if (ts.isBindingPattern(bindingElement.name)) {
                        emitBindingPattern(bindingElement.name);
                    }
                    else {
                        writeTextOfNode(currentSourceFile, bindingElement.name);
                        writeTypeOfDeclaration(bindingElement, /*type*/ undefined, getBindingElementTypeVisibilityError);
                    }
                }
            }
        }
        function emitTypeOfVariableDeclarationFromTypeLiteral(node) {
            // if this is property of type literal,
            // or is parameter of method/call/construct/index signature of type literal
            // emit only if type is specified
            if (node.type) {
                write(": ");
                emitType(node.type);
            }
        }
        function isVariableStatementVisible(node) {
            return ts.forEach(node.declarationList.declarations, function (varDeclaration) { return resolver.isDeclarationVisible(varDeclaration); });
        }
        function writeVariableStatement(node) {
            emitJsDocComments(node);
            emitModuleElementDeclarationFlags(node);
            if (ts.isLet(node.declarationList)) {
                write("let ");
            }
            else if (ts.isConst(node.declarationList)) {
                write("const ");
            }
            else {
                write("var ");
            }
            emitCommaList(node.declarationList.declarations, emitVariableDeclaration, resolver.isDeclarationVisible);
            write(";");
            writeLine();
        }
        function emitAccessorDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            var accessors = ts.getAllAccessorDeclarations(node.parent.members, node);
            var accessorWithTypeAnnotation;
            if (node === accessors.firstAccessor) {
                emitJsDocComments(accessors.getAccessor);
                emitJsDocComments(accessors.setAccessor);
                emitClassMemberDeclarationFlags(node);
                writeTextOfNode(currentSourceFile, node.name);
                if (!(node.flags & ts.NodeFlags.Private)) {
                    accessorWithTypeAnnotation = node;
                    var type = getTypeAnnotationFromAccessor(node);
                    if (!type) {
                        // couldn't get type for the first accessor, try the another one
                        var anotherAccessor = node.kind === ts.SyntaxKind.GetAccessor ? accessors.setAccessor : accessors.getAccessor;
                        type = getTypeAnnotationFromAccessor(anotherAccessor);
                        if (type) {
                            accessorWithTypeAnnotation = anotherAccessor;
                        }
                    }
                    writeTypeOfDeclaration(node, type, getAccessorDeclarationTypeVisibilityError);
                }
                write(";");
                writeLine();
            }
            function getTypeAnnotationFromAccessor(accessor) {
                if (accessor) {
                    return accessor.kind === ts.SyntaxKind.GetAccessor
                        ? accessor.type // Getter - return type
                        : accessor.parameters.length > 0
                            ? accessor.parameters[0].type // Setter parameter type
                            : undefined;
                }
            }
            function getAccessorDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage;
                if (accessorWithTypeAnnotation.kind === ts.SyntaxKind.SetAccessor) {
                    // Setters have to have type named and cannot infer it so, the type should always be named
                    if (accessorWithTypeAnnotation.parent.flags & ts.NodeFlags.Static) {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_private_name_1;
                    }
                    else {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_private_name_1;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: accessorWithTypeAnnotation.parameters[0],
                        // TODO(jfreeman): Investigate why we are passing node.name instead of node.parameters[0].name
                        typeName: accessorWithTypeAnnotation.name
                    };
                }
                else {
                    if (accessorWithTypeAnnotation.flags & ts.NodeFlags.Static) {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_private_name_0;
                    }
                    else {
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_private_name_0;
                    }
                    return {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: accessorWithTypeAnnotation.name,
                        typeName: undefined
                    };
                }
            }
        }
        function writeFunctionDeclaration(node) {
            if (ts.hasDynamicName(node)) {
                return;
            }
            // If we are emitting Method/Constructor it isn't moduleElement and hence already determined to be emitting
            // so no need to verify if the declaration is visible
            if (!resolver.isImplementationOfOverload(node)) {
                emitJsDocComments(node);
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    emitModuleElementDeclarationFlags(node);
                }
                else if (node.kind === ts.SyntaxKind.MethodDeclaration) {
                    emitClassMemberDeclarationFlags(node);
                }
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    write("function ");
                    writeTextOfNode(currentSourceFile, node.name);
                }
                else if (node.kind === ts.SyntaxKind.Constructor) {
                    write("constructor");
                }
                else {
                    writeTextOfNode(currentSourceFile, node.name);
                    if (ts.hasQuestionToken(node)) {
                        write("?");
                    }
                }
                emitSignatureDeclaration(node);
            }
        }
        function emitSignatureDeclarationWithJsDocComments(node) {
            emitJsDocComments(node);
            emitSignatureDeclaration(node);
        }
        function emitSignatureDeclaration(node) {
            // Construct signature or constructor type write new Signature
            if (node.kind === ts.SyntaxKind.ConstructSignature || node.kind === ts.SyntaxKind.ConstructorType) {
                write("new ");
            }
            emitTypeParameters(node.typeParameters);
            if (node.kind === ts.SyntaxKind.IndexSignature) {
                write("[");
            }
            else {
                write("(");
            }
            var prevEnclosingDeclaration = enclosingDeclaration;
            enclosingDeclaration = node;
            // Parameters
            emitCommaList(node.parameters, emitParameterDeclaration);
            if (node.kind === ts.SyntaxKind.IndexSignature) {
                write("]");
            }
            else {
                write(")");
            }
            // If this is not a constructor and is not private, emit the return type
            var isFunctionTypeOrConstructorType = node.kind === ts.SyntaxKind.FunctionType || node.kind === ts.SyntaxKind.ConstructorType;
            if (isFunctionTypeOrConstructorType || node.parent.kind === ts.SyntaxKind.TypeLiteral) {
                // Emit type literal signature return type only if specified
                if (node.type) {
                    write(isFunctionTypeOrConstructorType ? " => " : ": ");
                    emitType(node.type);
                }
            }
            else if (node.kind !== ts.SyntaxKind.Constructor && !(node.flags & ts.NodeFlags.Private)) {
                writeReturnTypeAtSignature(node, getReturnTypeVisibilityError);
            }
            enclosingDeclaration = prevEnclosingDeclaration;
            if (!isFunctionTypeOrConstructorType) {
                write(";");
                writeLine();
            }
            function getReturnTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage;
                switch (node.kind) {
                    case ts.SyntaxKind.ConstructSignature:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case ts.SyntaxKind.CallSignature:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case ts.SyntaxKind.IndexSignature:
                        // Interfaces cannot have return types that cannot be named
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_name_0;
                        break;
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                        if (node.flags & ts.NodeFlags.Static) {
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                    ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                    ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_name_0;
                        }
                        else if (node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                    ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                    ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_public_method_from_exported_class_has_or_is_using_private_name_0;
                        }
                        else {
                            // Interfaces cannot have return types that cannot be named
                            diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                                ts.Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_name_0_from_private_module_1 :
                                ts.Diagnostics.Return_type_of_method_from_exported_interface_has_or_is_using_private_name_0;
                        }
                        break;
                    case ts.SyntaxKind.FunctionDeclaration:
                        diagnosticMessage = symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_external_module_1_but_cannot_be_named :
                                ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_name_0_from_private_module_1 :
                            ts.Diagnostics.Return_type_of_exported_function_has_or_is_using_private_name_0;
                        break;
                    default:
                        ts.Debug.fail("This is unknown kind for signature: " + node.kind);
                }
                return {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node.name || node
                };
            }
        }
        function emitParameterDeclaration(node) {
            increaseIndent();
            emitJsDocComments(node);
            if (node.dotDotDotToken) {
                write("...");
            }
            if (ts.isBindingPattern(node.name)) {
                // For bindingPattern, we can't simply writeTextOfNode from the source file
                // because we want to omit the initializer and using writeTextOfNode will result in initializer get emitted.
                // Therefore, we will have to recursively emit each element in the bindingPattern.
                emitBindingPattern(node.name);
            }
            else {
                writeTextOfNode(currentSourceFile, node.name);
            }
            if (resolver.isOptionalParameter(node)) {
                write("?");
            }
            decreaseIndent();
            if (node.parent.kind === ts.SyntaxKind.FunctionType ||
                node.parent.kind === ts.SyntaxKind.ConstructorType ||
                node.parent.parent.kind === ts.SyntaxKind.TypeLiteral) {
                emitTypeOfVariableDeclarationFromTypeLiteral(node);
            }
            else if (!(node.parent.flags & ts.NodeFlags.Private)) {
                writeTypeOfDeclaration(node, node.type, getParameterDeclarationTypeVisibilityError);
            }
            function getParameterDeclarationTypeVisibilityError(symbolAccesibilityResult) {
                var diagnosticMessage = getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                return diagnosticMessage !== undefined ? {
                    diagnosticMessage: diagnosticMessage,
                    errorNode: node,
                    typeName: node.name
                } : undefined;
            }
            function getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult) {
                switch (node.parent.kind) {
                    case ts.SyntaxKind.Constructor:
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_name_1;
                    case ts.SyntaxKind.ConstructSignature:
                        // Interfaces cannot have parameter types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_name_1;
                    case ts.SyntaxKind.CallSignature:
                        // Interfaces cannot have parameter types that cannot be named
                        return symbolAccesibilityResult.errorModuleName ?
                            ts.Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_name_1;
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                        if (node.parent.flags & ts.NodeFlags.Static) {
                            return symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                    ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                    ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_name_1;
                        }
                        else if (node.parent.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                            return symbolAccesibilityResult.errorModuleName ?
                                symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                    ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                    ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_name_1;
                        }
                        else {
                            // Interfaces cannot have parameter types that cannot be named
                            return symbolAccesibilityResult.errorModuleName ?
                                ts.Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_name_1_from_private_module_2 :
                                ts.Diagnostics.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_name_1;
                        }
                    case ts.SyntaxKind.FunctionDeclaration:
                        return symbolAccesibilityResult.errorModuleName ?
                            symbolAccesibilityResult.accessibility === ts.SymbolAccessibility.CannotBeNamed ?
                                ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_external_module_2_but_cannot_be_named :
                                ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_name_1_from_private_module_2 :
                            ts.Diagnostics.Parameter_0_of_exported_function_has_or_is_using_private_name_1;
                    default:
                        ts.Debug.fail("This is unknown parent for parameter: " + node.parent.kind);
                }
            }
            function emitBindingPattern(bindingPattern) {
                // We have to explicitly emit square bracket and bracket because these tokens are not store inside the node.
                if (bindingPattern.kind === ts.SyntaxKind.ObjectBindingPattern) {
                    write("{");
                    emitCommaList(bindingPattern.elements, emitBindingElement);
                    write("}");
                }
                else if (bindingPattern.kind === ts.SyntaxKind.ArrayBindingPattern) {
                    write("[");
                    var elements = bindingPattern.elements;
                    emitCommaList(elements, emitBindingElement);
                    if (elements && elements.hasTrailingComma) {
                        write(", ");
                    }
                    write("]");
                }
            }
            function emitBindingElement(bindingElement) {
                function getBindingElementTypeVisibilityError(symbolAccesibilityResult) {
                    var diagnosticMessage = getParameterDeclarationTypeVisibilityDiagnosticMessage(symbolAccesibilityResult);
                    return diagnosticMessage !== undefined ? {
                        diagnosticMessage: diagnosticMessage,
                        errorNode: bindingElement,
                        typeName: bindingElement.name
                    } : undefined;
                }
                if (bindingElement.kind === ts.SyntaxKind.OmittedExpression) {
                    // If bindingElement is an omittedExpression (i.e. containing elision),
                    // we will emit blank space (although this may differ from users' original code,
                    // it allows emitSeparatedList to write separator appropriately)
                    // Example:
                    //      original: function foo([, x, ,]) {}
                    //      emit    : function foo([ , x,  , ]) {}
                    write(" ");
                }
                else if (bindingElement.kind === ts.SyntaxKind.BindingElement) {
                    if (bindingElement.propertyName) {
                        // bindingElement has propertyName property in the following case:
                        //      { y: [a,b,c] ...} -> bindingPattern will have a property called propertyName for "y"
                        // We have to explicitly emit the propertyName before descending into its binding elements.
                        // Example:
                        //      original: function foo({y: [a,b,c]}) {}
                        //      emit    : declare function foo({y: [a, b, c]}: { y: [any, any, any] }) void;
                        writeTextOfNode(currentSourceFile, bindingElement.propertyName);
                        write(": ");
                    }
                    if (bindingElement.name) {
                        if (ts.isBindingPattern(bindingElement.name)) {
                            // If it is a nested binding pattern, we will recursively descend into each element and emit each one separately.
                            // In the case of rest element, we will omit rest element.
                            // Example:
                            //      original: function foo([a, [[b]], c] = [1,[["string"]], 3]) {}
                            //      emit    : declare function foo([a, [[b]], c]: [number, [[string]], number]): void;
                            //      original with rest: function foo([a, ...c]) {}
                            //      emit              : declare function foo([a, ...c]): void;
                            emitBindingPattern(bindingElement.name);
                        }
                        else {
                            ts.Debug.assert(bindingElement.name.kind === ts.SyntaxKind.Identifier);
                            // If the node is just an identifier, we will simply emit the text associated with the node's name
                            // Example:
                            //      original: function foo({y = 10, x}) {}
                            //      emit    : declare function foo({y, x}: {number, any}): void;
                            if (bindingElement.dotDotDotToken) {
                                write("...");
                            }
                            writeTextOfNode(currentSourceFile, bindingElement.name);
                        }
                    }
                }
            }
        }
        function emitNode(node) {
            switch (node.kind) {
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.ImportEqualsDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.TypeAliasDeclaration:
                case ts.SyntaxKind.EnumDeclaration:
                    return emitModuleElement(node, isModuleElementVisible(node));
                case ts.SyntaxKind.VariableStatement:
                    return emitModuleElement(node, isVariableStatementVisible(node));
                case ts.SyntaxKind.ImportDeclaration:
                    // Import declaration without import clause is visible, otherwise it is not visible
                    return emitModuleElement(node, /*isModuleElementVisible*/ !node.importClause);
                case ts.SyntaxKind.ExportDeclaration:
                    return emitExportDeclaration(node);
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    return writeFunctionDeclaration(node);
                case ts.SyntaxKind.ConstructSignature:
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.IndexSignature:
                    return emitSignatureDeclarationWithJsDocComments(node);
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    return emitAccessorDeclaration(node);
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    return emitPropertyDeclaration(node);
                case ts.SyntaxKind.EnumMember:
                    return emitEnumMemberDeclaration(node);
                case ts.SyntaxKind.ExportAssignment:
                    return emitExportAssignment(node);
                case ts.SyntaxKind.SourceFile:
                    return emitSourceFile(node);
            }
        }
        function writeReferencePath(referencedFile) {
            var declFileName = referencedFile.flags & ts.NodeFlags.DeclarationFile
                ? referencedFile.fileName // Declaration file, use declaration file name
                : ts.shouldEmitToOwnFile(referencedFile, compilerOptions)
                    ? ts.getOwnEmitOutputFilePath(referencedFile, host, ".d.ts") // Own output file so get the .d.ts file
                    : ts.removeFileExtension(compilerOptions.outFile || compilerOptions.out) + ".d.ts"; // Global out file
            declFileName = ts.getRelativePathToDirectoryOrUrl(ts.getDirectoryPath(ts.normalizeSlashes(jsFilePath)), declFileName, host.getCurrentDirectory(), host.getCanonicalFileName, 
            /*isAbsolutePathAnUrl*/ false);
            referencePathsOutput += "/// <reference path=\"" + declFileName + "\" />" + newLine;
        }
    }
    /* @internal */
    function writeDeclarationFile(jsFilePath, sourceFile, host, resolver, diagnostics) {
        var emitDeclarationResult = emitDeclarations(host, resolver, diagnostics, jsFilePath, sourceFile);
        // TODO(shkamat): Should we not write any declaration file if any of them can produce error,
        // or should we just not write this file like we are doing now
        if (!emitDeclarationResult.reportedDeclarationError) {
            var declarationOutput = emitDeclarationResult.referencePathsOutput
                + getDeclarationOutput(emitDeclarationResult.synchronousDeclarationOutput, emitDeclarationResult.moduleElementDeclarationEmitInfo);
            ts.writeFile(host, diagnostics, ts.removeFileExtension(jsFilePath) + ".d.ts", declarationOutput, host.getCompilerOptions().emitBOM);
        }
        function getDeclarationOutput(synchronousDeclarationOutput, moduleElementDeclarationEmitInfo) {
            var appliedSyncOutputPos = 0;
            var declarationOutput = "";
            // apply asynchronous additions to the synchronous output
            ts.forEach(moduleElementDeclarationEmitInfo, function (aliasEmitInfo) {
                if (aliasEmitInfo.asynchronousOutput) {
                    declarationOutput += synchronousDeclarationOutput.substring(appliedSyncOutputPos, aliasEmitInfo.outputPos);
                    declarationOutput += getDeclarationOutput(aliasEmitInfo.asynchronousOutput, aliasEmitInfo.subModuleElementDeclarationEmitInfo);
                    appliedSyncOutputPos = aliasEmitInfo.outputPos;
                }
            });
            declarationOutput += synchronousDeclarationOutput.substring(appliedSyncOutputPos);
            return declarationOutput;
        }
    }
    ts.writeDeclarationFile = writeDeclarationFile;
})(ts || (ts = {}));
//# sourceMappingURL=declarationEmitter.js.map