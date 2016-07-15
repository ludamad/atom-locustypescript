/// <reference path="binder.ts"/>
/// <reference path="ctsTestEvaluator.ts"/>
/// <reference path="ctsUtilities.ts"/>
/// <reference path="ctsTypes.ts"/>
/* @internal */
var ts;
(function (ts) {
    var nextSymbolId = 1;
    var nextNodeId = 1;
    var nextMergeId = 1;
    function getNodeId(node) {
        if (!node.id)
            node.id = nextNodeId++;
        return node.id;
    }
    ts.getNodeId = getNodeId;
    ts.checkTime = 0;
    function getSymbolId(symbol) {
        if (!symbol.id) {
            symbol.id = nextSymbolId++;
        }
        return symbol.id;
    }
    ts.getSymbolId = getSymbolId;
    function createTypeChecker(host, produceDiagnostics) {
        // Cancellation that controls whether or not we can cancel in the middle of type checking.
        // In general cancelling is *not* safe for the type checker.  We might be in the middle of
        // computing something, and we will leave our internals in an inconsistent state.  Callers
        // who set the cancellation token should catch if a cancellation exception occurs, and
        // should throw away and create a new TypeChecker.
        //
        // Currently we only support setting the cancellation token when getting diagnostics.  This
        // is because diagnostics can be quite expensive, and we want to allow hosts to bail out if
        // they no longer need the information (for example, if the user started editing again).
        var cancellationToken;
        var Symbol = ts.objectAllocator.getSymbolConstructor();
        var Type = ts.objectAllocator.getTypeConstructor();
        var Signature = ts.objectAllocator.getSignatureConstructor();
        var typeCount = 0;
        var emptyArray = [];
        var emptySymbols = {};
        var compilerOptions = host.getCompilerOptions();
        var languageVersion = compilerOptions.target || ts.ScriptTarget.ES3;
        var emitResolver = createResolver();
        var undefinedSymbol = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient, "undefined");
        var argumentsSymbol = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient, "arguments");
        var jsxElementClassType = undefined;
        // [ConcreteTypeScript]
        var ignoredLocusTypeStack = [];
        var resolvingLocusTypeStack = [];
        // [/ConcreteTypeScript]
        var checker = {
            getNodeCount: function () { return ts.sum(host.getSourceFiles(), "nodeCount"); },
            getIdentifierCount: function () { return ts.sum(host.getSourceFiles(), "identifierCount"); },
            getSymbolCount: function () { return ts.sum(host.getSourceFiles(), "symbolCount"); },
            getTypeCount: function () { return typeCount; },
            isUndefinedSymbol: function (symbol) { return symbol === undefinedSymbol; },
            isArgumentsSymbol: function (symbol) { return symbol === argumentsSymbol; },
            getDiagnostics: getDiagnostics,
            getGlobalDiagnostics: getGlobalDiagnostics,
            // [ConcreteTypeScript]
            getFlowDataAtLocation: getFlowDataAtLocation,
            getFlowDataForType: getFlowDataForType,
            getTypeFromTypeNode: getTypeFromTypeNode,
            createType: createType,
            getPrimitiveTypeInfo: getPrimitiveTypeInfo,
            getTypeOfSymbol: getTypeOfSymbol,
            unconcrete: unconcrete,
            createConcreteType: createConcreteType,
            isTypeIdenticalTo: isTypeIdenticalTo,
            resolveName: resolveName,
            compareTypes: compareTypes,
            checkTypeSubtypeOf: checkTypeSubtypeOf,
            checkTypeAssignableTo: checkTypeAssignableTo,
            isSignatureAssignableTo: isSignatureAssignableTo,
            checkTypeRelatedTo: checkTypeRelatedTo,
            checkSourceFile: checkSourceFile,
            isTypeAny: isTypeAny,
            // [/ConcreteTypeScript]
            // The language service will always care about the narrowed type of a symbol, because that is
            // the type the language says the symbol should have.
            getTypeOfSymbolAtLocation: getNarrowedTypeOfSymbol,
            getDeclaredTypeOfSymbol: getDeclaredTypeOfSymbol,
            getPropertiesOfType: getPropertiesOfType,
            getPropertyOfType: getPropertyOfType,
            getSignaturesOfType: getSignaturesOfType,
            getIndexTypeOfType: getIndexTypeOfType,
            getBaseTypes: getBaseTypes,
            getReturnTypeOfSignature: getReturnTypeOfSignature,
            getSymbolsInScope: getSymbolsInScope,
            getSymbolAtLocation: getSymbolAtLocation,
            getShorthandAssignmentValueSymbol: getShorthandAssignmentValueSymbol,
            getTypeAtLocation: getTypeOfNode,
            typeToString: typeToString,
            getSymbolDisplayBuilder: getSymbolDisplayBuilder,
            symbolToString: symbolToString,
            getAugmentedPropertiesOfType: getAugmentedPropertiesOfType,
            getRootSymbols: getRootSymbols,
            getContextualType: getContextualType,
            getFullyQualifiedName: getFullyQualifiedName,
            getResolvedSignature: getResolvedSignature,
            getConstantValue: getConstantValue,
            isValidPropertyAccess: isValidPropertyAccess,
            getSignatureFromDeclaration: getSignatureFromDeclaration,
            isImplementationOfOverload: isImplementationOfOverload,
            getAliasedSymbol: resolveAlias,
            getEmitResolver: getEmitResolver,
            getExportsOfModule: getExportsOfModuleAsArray,
            getJsxElementAttributesType: getJsxElementAttributesType,
            getJsxIntrinsicTagNames: getJsxIntrinsicTagNames,
            isOptionalParameter: isOptionalParameter
        };
        var unknownSymbol = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient, "unknown");
        var resolvingSymbol = createSymbol(ts.SymbolFlags.Transient, "__resolving__");
        var anyType = createIntrinsicType(ts.TypeFlags.Any, "any");
        var stringType = createIntrinsicType(ts.TypeFlags.String, "string");
        var numberType = createIntrinsicType(ts.TypeFlags.Number, "number");
        var floatNumberType = createIntrinsicType(ts.TypeFlags.Number | ts.TypeFlags.FloatHint, "floatNumber"); // [ConcreteTypeScript]
        var intNumberType = createIntrinsicType(ts.TypeFlags.Number | ts.TypeFlags.IntHint, "intNumber"); // [ConcreteTypeScript]
        var booleanType = createIntrinsicType(ts.TypeFlags.Boolean, "boolean");
        var esSymbolType = createIntrinsicType(ts.TypeFlags.ESSymbol, "symbol");
        var voidType = createIntrinsicType(ts.TypeFlags.Void, "void");
        var undefinedType = createIntrinsicType(ts.TypeFlags.Undefined | ts.TypeFlags.ContainsUndefinedOrNull, "undefined");
        var nullType = createIntrinsicType(ts.TypeFlags.Null | ts.TypeFlags.ContainsUndefinedOrNull, "null");
        var unknownType = createIntrinsicType(ts.TypeFlags.Any, "unknown");
        var circularType = createIntrinsicType(ts.TypeFlags.Any, "__circular__");
        // [ConcreteTypeScript]
        var concreteStringType = createConcreteType(stringType);
        var concreteNumberType = createConcreteType(numberType);
        // [/ConcreteTypeScript]
        var emptyObjectType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        var emptyGenericType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        emptyGenericType.instantiations = {};
        var anyFunctionType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        // The anyFunctionType contains the anyFunctionType by definition. The flag is further propagated
        // in getPropagatingFlagsOfTypes, and it is checked in inferFromTypes.
        anyFunctionType.flags |= ts.TypeFlags.ContainsAnyFunctionType;
        var noConstraintType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        var anySignature = createSignature(undefined, undefined, emptyArray, anyType, undefined, 0, false, false);
        var unknownSignature = createSignature(undefined, undefined, emptyArray, unknownType, undefined, 0, false, false);
        var globals = {};
        var globalESSymbolConstructorSymbol;
        var getGlobalPromiseConstructorSymbol;
        var globalObjectType;
        var globalFunctionType;
        var globalArrayType;
        var globalStringType;
        var globalNumberType;
        var globalBooleanType;
        var globalRegExpType;
        var globalTemplateStringsArrayType;
        var globalESSymbolType;
        var jsxElementType;
        /** Lazily loaded, use getJsxIntrinsicElementType() */
        var jsxIntrinsicElementsType;
        var globalIterableType;
        var globalIteratorType;
        var globalIterableIteratorType;
        var anyArrayType;
        var getGlobalClassDecoratorType;
        var getGlobalParameterDecoratorType;
        var getGlobalPropertyDecoratorType;
        var getGlobalMethodDecoratorType;
        var getGlobalTypedPropertyDescriptorType;
        var getGlobalPromiseType;
        var tryGetGlobalPromiseType;
        var getGlobalPromiseLikeType;
        var getInstantiatedGlobalPromiseLikeType;
        var getGlobalPromiseConstructorLikeType;
        var getGlobalThenableType;
        var tupleTypes = {};
        var unionTypes = {};
        var intersectionTypes = {};
        var stringLiteralTypes = {};
        var emitExtends = false;
        var emitDecorate = false;
        var emitParam = false;
        var emitAwaiter = false;
        var emitGenerator = false;
        var resolutionTargets = [];
        var resolutionResults = [];
        var resolutionPropertyNames = [];
        var mergedSymbols = [];
        var symbolLinks = [];
        var nodeLinks = [];
        var potentialThisCollisions = [];
        var awaitedTypeStack = [];
        var diagnostics = ts.createDiagnosticCollection();
        var primitiveTypeInfo = {
            "string": {
                type: stringType,
                flags: ts.TypeFlags.StringLike
            },
            "number": {
                type: numberType,
                flags: ts.TypeFlags.NumberLike
            },
            "boolean": {
                type: booleanType,
                flags: ts.TypeFlags.Boolean
            },
            "symbol": {
                type: esSymbolType,
                flags: ts.TypeFlags.ESSymbol
            }
        };
        function getPrimitiveTypeInfo() {
            return primitiveTypeInfo;
        }
        var JsxNames = {
            JSX: "JSX",
            IntrinsicElements: "IntrinsicElements",
            ElementClass: "ElementClass",
            ElementAttributesPropertyNameContainer: "ElementAttributesProperty",
            Element: "Element"
        };
        var subtypeRelation = {};
        var assignableRelation = {};
        var identityRelation = {};
        // This is for caching the result of getSymbolDisplayBuilder. Do not access directly.
        var _displayBuilder;
        var TypeSystemPropertyName;
        (function (TypeSystemPropertyName) {
            TypeSystemPropertyName[TypeSystemPropertyName["Type"] = 0] = "Type";
            TypeSystemPropertyName[TypeSystemPropertyName["ResolvedBaseConstructorType"] = 1] = "ResolvedBaseConstructorType";
            TypeSystemPropertyName[TypeSystemPropertyName["DeclaredType"] = 2] = "DeclaredType";
            TypeSystemPropertyName[TypeSystemPropertyName["ResolvedReturnType"] = 3] = "ResolvedReturnType";
        })(TypeSystemPropertyName || (TypeSystemPropertyName = {}));
        initializeTypeChecker();
        return checker;
        function getEmitResolver(sourceFile, cancellationToken) {
            // Ensure we have all the type information in place for this file so that all the
            // emitter questions of this resolver will return the right information.
            getDiagnostics(sourceFile, cancellationToken);
            return emitResolver;
        }
        function showStack() {
            //console.log((<any>new Error()).stack);
        }
        function error(location, message, arg0, arg1, arg2) {
            showStack();
            var diagnostic = location
                ? ts.createDiagnosticForNode(location, message, arg0, arg1, arg2)
                : ts.createCompilerDiagnostic(message, arg0, arg1, arg2);
            // [/ConcreteTypeScript]
            diagnostics.add(diagnostic);
        }
        function createSymbol(flags, name) {
            return new Symbol(flags, name);
        }
        function getExcludedSymbolFlags(flags) {
            var result = 0;
            if (flags & ts.SymbolFlags.BlockScopedVariable)
                result |= ts.SymbolFlags.BlockScopedVariableExcludes;
            if (flags & ts.SymbolFlags.FunctionScopedVariable)
                result |= ts.SymbolFlags.FunctionScopedVariableExcludes;
            if (flags & ts.SymbolFlags.Property)
                result |= ts.SymbolFlags.PropertyExcludes;
            if (flags & ts.SymbolFlags.EnumMember)
                result |= ts.SymbolFlags.EnumMemberExcludes;
            if (flags & ts.SymbolFlags.Function)
                result |= ts.SymbolFlags.FunctionExcludes;
            if (flags & ts.SymbolFlags.Class)
                result |= ts.SymbolFlags.ClassExcludes;
            if (flags & ts.SymbolFlags.Interface)
                result |= ts.SymbolFlags.InterfaceExcludes;
            if (flags & ts.SymbolFlags.RegularEnum)
                result |= ts.SymbolFlags.RegularEnumExcludes;
            if (flags & ts.SymbolFlags.ConstEnum)
                result |= ts.SymbolFlags.ConstEnumExcludes;
            if (flags & ts.SymbolFlags.ValueModule)
                result |= ts.SymbolFlags.ValueModuleExcludes;
            if (flags & ts.SymbolFlags.Method)
                result |= ts.SymbolFlags.MethodExcludes;
            if (flags & ts.SymbolFlags.GetAccessor)
                result |= ts.SymbolFlags.GetAccessorExcludes;
            if (flags & ts.SymbolFlags.SetAccessor)
                result |= ts.SymbolFlags.SetAccessorExcludes;
            if (flags & ts.SymbolFlags.TypeParameter)
                result |= ts.SymbolFlags.TypeParameterExcludes;
            if (flags & ts.SymbolFlags.TypeAlias)
                result |= ts.SymbolFlags.TypeAliasExcludes;
            if (flags & ts.SymbolFlags.Declare)
                result |= ts.SymbolFlags.BrandTypeExcludes;
            if (flags & ts.SymbolFlags.Alias)
                result |= ts.SymbolFlags.AliasExcludes;
            return result;
        }
        function recordMergedSymbol(target, source) {
            if (!source.mergeId)
                source.mergeId = nextMergeId++;
            mergedSymbols[source.mergeId] = target;
        }
        function cloneSymbol(symbol) {
            var result = createSymbol(symbol.flags | ts.SymbolFlags.Merged, symbol.name);
            result.declarations = symbol.declarations && symbol.declarations.slice(0);
            result.parent = symbol.parent;
            if (symbol.valueDeclaration)
                result.valueDeclaration = symbol.valueDeclaration;
            if (symbol.constEnumOnlyModule)
                result.constEnumOnlyModule = true;
            if (symbol.members)
                result.members = cloneSymbolTable(symbol.members);
            if (symbol.exports)
                result.exports = cloneSymbolTable(symbol.exports);
            recordMergedSymbol(result, symbol);
            return result;
        }
        function mergeSymbol(target, source) {
            if (!(target.flags & getExcludedSymbolFlags(source.flags))) {
                if (source.flags & ts.SymbolFlags.ValueModule && target.flags & ts.SymbolFlags.ValueModule && target.constEnumOnlyModule && !source.constEnumOnlyModule) {
                    // reset flag when merging instantiated module into value module that has only const enums
                    target.constEnumOnlyModule = false;
                }
                target.flags |= source.flags;
                if (!target.valueDeclaration && source.valueDeclaration)
                    target.valueDeclaration = source.valueDeclaration;
                ts.forEach(source.declarations, function (node) {
                    target.declarations.push(node);
                });
                if (source.members) {
                    if (!target.members)
                        target.members = {};
                    mergeSymbolTable(target.members, source.members);
                }
                if (source.exports) {
                    if (!target.exports)
                        target.exports = {};
                    mergeSymbolTable(target.exports, source.exports);
                }
                recordMergedSymbol(target, source);
            }
            else {
                var message = target.flags & ts.SymbolFlags.BlockScopedVariable || source.flags & ts.SymbolFlags.BlockScopedVariable
                    ? ts.Diagnostics.Cannot_redeclare_block_scoped_variable_0 : ts.Diagnostics.Duplicate_identifier_0;
                ts.forEach(source.declarations, function (node) {
                    error(node.name ? node.name : node, message, symbolToString(source));
                });
                ts.forEach(target.declarations, function (node) {
                    error(node.name ? node.name : node, message, symbolToString(source));
                });
            }
        }
        function cloneSymbolTable(symbolTable) {
            var result = {};
            for (var id in symbolTable) {
                if (ts.hasProperty(symbolTable, id)) {
                    result[id] = symbolTable[id];
                }
            }
            return result;
        }
        function mergeSymbolTable(target, source) {
            for (var id in source) {
                if (ts.hasProperty(source, id)) {
                    if (!ts.hasProperty(target, id)) {
                        target[id] = source[id];
                    }
                    else {
                        var symbol = target[id];
                        if (!(symbol.flags & ts.SymbolFlags.Merged)) {
                            target[id] = symbol = cloneSymbol(symbol);
                        }
                        mergeSymbol(symbol, source[id]);
                    }
                }
            }
        }
        function getSymbolLinks(symbol) {
            if (symbol.flags & ts.SymbolFlags.Transient) {
                var trans = symbol;
                symbol.symbolLinks = trans;
                return trans;
            }
            var id = getSymbolId(symbol);
            return symbolLinks[id] || (symbol.symbolLinks = symbolLinks[id] = {});
        }
        function getNodeLinks(node) {
            var nodeId = getNodeId(node);
            return nodeLinks[nodeId] || (node.nodeLinks = nodeLinks[nodeId] = {});
        }
        function getSourceFile(node) {
            return ts.getAncestor(node, ts.SyntaxKind.SourceFile);
        }
        function isGlobalSourceFile(node) {
            return node.kind === ts.SyntaxKind.SourceFile && !ts.isExternalModule(node);
        }
        function getSymbol(symbols, name, meaning) {
            if (meaning && ts.hasProperty(symbols, name)) {
                var symbol = symbols[name];
                ts.Debug.assert((symbol.flags & ts.SymbolFlags.Instantiated) === 0, "Should never get an instantiated symbol here.");
                if (symbol.flags & meaning) {
                    return symbol;
                }
                if (symbol.flags & ts.SymbolFlags.Alias) {
                    var target = resolveAlias(symbol);
                    // Unknown symbol means an error occurred in alias resolution, treat it as positive answer to avoid cascading errors
                    if (target === unknownSymbol || target.flags & meaning) {
                        return symbol;
                    }
                }
            }
            // return undefined if we can't find a symbol.
        }
        /** Returns true if node1 is defined before node 2**/
        function isDefinedBefore(node1, node2) {
            var file1 = ts.getSourceFileOfNode(node1);
            var file2 = ts.getSourceFileOfNode(node2);
            if (file1 === file2) {
                return node1.pos <= node2.pos;
            }
            if (!compilerOptions.outFile && !compilerOptions.out) {
                return true;
            }
            var sourceFiles = host.getSourceFiles();
            return sourceFiles.indexOf(file1) <= sourceFiles.indexOf(file2);
        }
        // Resolve a given name for a given meaning at a given location. An error is reported if the name was not found and
        // the nameNotFoundMessage argument is not undefined. Returns the resolved symbol, or undefined if no symbol with
        // the given name can be found.
        function resolveName(location, name, meaning, nameNotFoundMessage, nameArg) {
            var result;
            var lastLocation;
            var propertyWithInvalidInitializer;
            var errorLocation = location;
            var grandparent;
            loop: while (location) {
                // Locals of a source file are not in scope (because they get merged into the global symbol table)
                if (location.locals && !isGlobalSourceFile(location)) {
                    if (result = getSymbol(location.locals, name, meaning)) {
                        // Type parameters of a function are in scope in the entire function declaration, including the parameter
                        // list and return type. However, local types are only in scope in the function body.
                        if (!(meaning & ts.SymbolFlags.Type) ||
                            !(result.flags & (ts.SymbolFlags.Type & ~ts.SymbolFlags.TypeParameter)) ||
                            !ts.isFunctionLike(location) ||
                            lastLocation === location.body) {
                            break loop;
                        }
                        result = undefined;
                    }
                }
                switch (location.kind) {
                    case ts.SyntaxKind.SourceFile:
                        if (!ts.isExternalModule(location))
                            break;
                    case ts.SyntaxKind.ModuleDeclaration:
                        var moduleExports = getSymbolOfNode(location).exports;
                        if (location.kind === ts.SyntaxKind.SourceFile ||
                            (location.kind === ts.SyntaxKind.ModuleDeclaration && location.name.kind === ts.SyntaxKind.StringLiteral)) {
                            // It's an external module. Because of module/namespace merging, a module's exports are in scope,
                            // yet we never want to treat an export specifier as putting a member in scope. Therefore,
                            // if the name we find is purely an export specifier, it is not actually considered in scope.
                            // Two things to note about this:
                            //     1. We have to check this without calling getSymbol. The problem with calling getSymbol
                            //        on an export specifier is that it might find the export specifier itself, and try to
                            //        resolve it as an alias. This will cause the checker to consider the export specifier
                            //        a circular alias reference when it might not be.
                            //     2. We check === SymbolFlags.Alias in order to check that the symbol is *purely*
                            //        an alias. If we used &, we'd be throwing out symbols that have non alias aspects,
                            //        which is not the desired behavior.
                            if (ts.hasProperty(moduleExports, name) &&
                                moduleExports[name].flags === ts.SymbolFlags.Alias &&
                                ts.getDeclarationOfKind(moduleExports[name], ts.SyntaxKind.ExportSpecifier)) {
                                break;
                            }
                            result = moduleExports["default"];
                            var localSymbol = ts.getLocalSymbolForExportDefault(result);
                            if (result && localSymbol && (result.flags & meaning) && localSymbol.name === name) {
                                break loop;
                            }
                            result = undefined;
                        }
                        if (result = getSymbol(moduleExports, name, meaning & ts.SymbolFlags.ModuleMember)) {
                            break loop;
                        }
                        break;
                    case ts.SyntaxKind.EnumDeclaration:
                        if (result = getSymbol(getSymbolOfNode(location).exports, name, meaning & ts.SymbolFlags.EnumMember)) {
                            break loop;
                        }
                        break;
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.PropertySignature:
                        // TypeScript 1.0 spec (April 2014): 8.4.1
                        // Initializer expressions for instance member variables are evaluated in the scope
                        // of the class constructor body but are not permitted to reference parameters or
                        // local variables of the constructor. This effectively means that entities from outer scopes
                        // by the same name as a constructor parameter or local variable are inaccessible
                        // in initializer expressions for instance member variables.
                        if (ts.isClassLike(location.parent) && !(location.flags & ts.NodeFlags.Static)) {
                            var ctor = findConstructorDeclaration(location.parent);
                            if (ctor && ctor.locals) {
                                if (getSymbol(ctor.locals, name, meaning & ts.SymbolFlags.Value)) {
                                    // Remember the property node, it will be used later to report appropriate error
                                    propertyWithInvalidInitializer = location;
                                }
                            }
                        }
                        break;
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ClassExpression:
                    case ts.SyntaxKind.InterfaceDeclaration:
                        if (result = getSymbol(getSymbolOfNode(location).members, name, meaning & ts.SymbolFlags.Type)) {
                            if (lastLocation && lastLocation.flags & ts.NodeFlags.Static) {
                                // TypeScript 1.0 spec (April 2014): 3.4.1
                                // The scope of a type parameter extends over the entire declaration with which the type
                                // parameter list is associated, with the exception of static member declarations in classes.
                                error(errorLocation, ts.Diagnostics.Static_members_cannot_reference_class_type_parameters);
                                return undefined;
                            }
                            break loop;
                        }
                        if (location.kind === ts.SyntaxKind.ClassExpression && meaning & ts.SymbolFlags.Class) {
                            var className = location.name;
                            if (className && name === className.text) {
                                result = location.symbol;
                                break loop;
                            }
                        }
                        break;
                    // It is not legal to reference a class's own type parameters from a computed property name that
                    // belongs to the class. For example:
                    //
                    //   function foo<T>() { return '' }
                    //   class C<T> { // <-- Class's own type parameter T
                    //       [foo<T>()]() { } // <-- Reference to T from class's own computed property
                    //   }
                    //
                    case ts.SyntaxKind.ComputedPropertyName:
                        grandparent = location.parent.parent;
                        if (ts.isClassLike(grandparent) || grandparent.kind === ts.SyntaxKind.InterfaceDeclaration) {
                            // A reference to this grandparent's type parameters would be an error
                            if (result = getSymbol(getSymbolOfNode(grandparent).members, name, meaning & ts.SymbolFlags.Type)) {
                                error(errorLocation, ts.Diagnostics.A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type);
                                return undefined;
                            }
                        }
                        break;
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.ArrowFunction:
                        if (meaning & ts.SymbolFlags.Variable && name === "arguments") {
                            result = argumentsSymbol;
                            break loop;
                        }
                        break;
                    case ts.SyntaxKind.FunctionExpression:
                        if (meaning & ts.SymbolFlags.Variable && name === "arguments") {
                            result = argumentsSymbol;
                            break loop;
                        }
                        if (meaning & ts.SymbolFlags.Function) {
                            var functionName = location.name;
                            if (functionName && name === functionName.text) {
                                result = location.symbol;
                                break loop;
                            }
                        }
                        break;
                    case ts.SyntaxKind.Decorator:
                        // Decorators are resolved at the class declaration. Resolving at the parameter
                        // or member would result in looking up locals in the method.
                        //
                        //   function y() {}
                        //   class C {
                        //       method(@y x, y) {} // <-- decorator y should be resolved at the class declaration, not the parameter.
                        //   }
                        //
                        if (location.parent && location.parent.kind === ts.SyntaxKind.Parameter) {
                            location = location.parent;
                        }
                        //
                        //   function y() {}
                        //   class C {
                        //       @y method(x, y) {} // <-- decorator y should be resolved at the class declaration, not the method.
                        //   }
                        //
                        if (location.parent && ts.isClassElement(location.parent)) {
                            location = location.parent;
                        }
                        break;
                }
                lastLocation = location;
                location = location.parent;
            }
            if (!result) {
                result = getSymbol(globals, name, meaning);
            }
            if (!result) {
                if (nameNotFoundMessage) {
                    error(errorLocation, nameNotFoundMessage, typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg));
                }
                return undefined;
            }
            // Perform extra checks only if error reporting was requested
            if (nameNotFoundMessage) {
                if (propertyWithInvalidInitializer) {
                    // We have a match, but the reference occurred within a property initializer and the identifier also binds
                    // to a local variable in the constructor where the code will be emitted.
                    var propertyName = propertyWithInvalidInitializer.name;
                    error(errorLocation, ts.Diagnostics.Initializer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor, ts.declarationNameToString(propertyName), typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg));
                    return undefined;
                }
                // Only check for block-scoped variable if we are looking for the
                // name with variable meaning
                //      For example,
                //          declare module foo {
                //              interface bar {}
                //          }
                //      let foo/*1*/: foo/*2*/.bar;
                // The foo at /*1*/ and /*2*/ will share same symbol with two meaning
                // block - scope variable and namespace module. However, only when we
                // try to resolve name in /*1*/ which is used in variable position,
                // we want to check for block- scoped
                if (meaning & ts.SymbolFlags.BlockScopedVariable && result.flags & ts.SymbolFlags.BlockScopedVariable) {
                    checkResolvedBlockScopedVariable(result, errorLocation);
                }
            }
            return result;
        }
        function checkResolvedBlockScopedVariable(result, errorLocation) {
            ts.Debug.assert((result.flags & ts.SymbolFlags.BlockScopedVariable) !== 0);
            // Block-scoped variables cannot be used before their definition
            var declaration = ts.forEach(result.declarations, function (d) { return ts.isBlockOrCatchScoped(d) ? d : undefined; });
            ts.Debug.assert(declaration !== undefined, "Block-scoped variable declaration is undefined");
            // first check if usage is lexically located after the declaration
            var isUsedBeforeDeclaration = !isDefinedBefore(declaration, errorLocation);
            if (!isUsedBeforeDeclaration) {
                // lexical check succeeded however code still can be illegal.
                // - block scoped variables cannot be used in its initializers
                //   let x = x; // illegal but usage is lexically after definition
                // - in ForIn/ForOf statements variable cannot be contained in expression part
                //   for (let x in x)
                //   for (let x of x)
                // climb up to the variable declaration skipping binding patterns
                var variableDeclaration = ts.getAncestor(declaration, ts.SyntaxKind.VariableDeclaration);
                var container = ts.getEnclosingBlockScopeContainer(variableDeclaration);
                if (variableDeclaration.parent.parent.kind === ts.SyntaxKind.VariableStatement ||
                    variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForStatement) {
                    // variable statement/for statement case,
                    // use site should not be inside variable declaration (initializer of declaration or binding element)
                    isUsedBeforeDeclaration = isSameScopeDescendentOf(errorLocation, variableDeclaration, container);
                }
                else if (variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForOfStatement ||
                    variableDeclaration.parent.parent.kind === ts.SyntaxKind.ForInStatement) {
                    // ForIn/ForOf case - use site should not be used in expression part
                    var expression = variableDeclaration.parent.parent.expression;
                    isUsedBeforeDeclaration = isSameScopeDescendentOf(errorLocation, expression, container);
                }
            }
            if (isUsedBeforeDeclaration) {
                error(errorLocation, ts.Diagnostics.Block_scoped_variable_0_used_before_its_declaration, ts.declarationNameToString(declaration.name));
            }
        }
        /* Starting from 'initial' node walk up the parent chain until 'stopAt' node is reached.
         * If at any point current node is equal to 'parent' node - return true.
         * Return false if 'stopAt' node is reached or isFunctionLike(current) === true.
         */
        function isSameScopeDescendentOf(initial, parent, stopAt) {
            if (!parent) {
                return false;
            }
            for (var current = initial; current && current !== stopAt && !ts.isFunctionLike(current); current = current.parent) {
                if (current === parent) {
                    return true;
                }
            }
            return false;
        }
        function getAnyImportSyntax(node) {
            if (ts.isAliasSymbolDeclaration(node)) {
                if (node.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
                    return node;
                }
                while (node && node.kind !== ts.SyntaxKind.ImportDeclaration) {
                    node = node.parent;
                }
                return node;
            }
        }
        function getDeclarationOfAliasSymbol(symbol) {
            return ts.forEach(symbol.declarations, function (d) { return ts.isAliasSymbolDeclaration(d) ? d : undefined; });
        }
        function getTargetOfImportEqualsDeclaration(node) {
            if (node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
                return resolveExternalModuleSymbol(resolveExternalModuleName(node, ts.getExternalModuleImportEqualsDeclarationExpression(node)));
            }
            return getSymbolOfPartOfRightHandSideOfImportEquals(node.moduleReference, node);
        }
        // [ConcreteTypeScript]
        // Is the type runtime checkable?
        // Implies the type can be strongly concrete.
        function isRuntimeCheckable(target) {
            if (isTypeAny(target)) {
                return false;
            }
            else if (target.flags & ts.TypeFlags.Union) {
                return target.isRuntimeCheckable;
            }
            else if (target.flags & ts.TypeFlags.Intersection) {
                for (var _i = 0, _a = target.types; _i < _a.length; _i++) {
                    var type = _a[_i];
                    if (isRuntimeCheckable(type)) {
                        return true;
                    }
                }
            }
            else {
                return !!(target.flags & ts.TypeFlags.RuntimeCheckable);
            }
        }
        function areAllRuntimeCheckable(target) {
            for (var i = 0; i < target.length; i++) {
                if (!isRuntimeCheckable(target[i]))
                    return false;
            }
            return true;
        }
        // [ConcreteTypeScript]
        // Wrap a type as a concrete type.
        // If mustBeRuntimeCheckable is true, errors if the type is not runtime-checkable.
        function createConcreteType(target, mustBeRuntimeCheckable) {
            if (mustBeRuntimeCheckable === void 0) { mustBeRuntimeCheckable = true; }
            ts.Debug.assert(target != null);
            if (target.flags & ts.TypeFlags.Intersection) {
                return getIntersectionType(target.types.map(createConcreteTypeIfCheckable));
            }
            var type = target.concreteType;
            if (!type) {
                if (mustBeRuntimeCheckable && !isRuntimeCheckable(target)) {
                    throw new Error("Cannot create concrete type out of '" + typeToString(target) + "'!.");
                }
                if (!canBeConcrete(target)) {
                    throw new Error("Cannot create concrete type out of '" + typeToString(target) + "'!.");
                }
                type = target.concreteType = createType(ts.TypeFlags.Concrete);
                type.baseType = target;
            }
            return type;
        }
        function createConcreteTypeIfCheckable(target) {
            if (!isRuntimeCheckable(target)) {
                return target;
            }
            return createConcreteType(target);
        }
        // [ConcreteTypeScript]
        // A weaker notion than 'isRuntimeCheckable'.
        // Weak concrete types are used for function, module, and class declaration sites.
        // They allow checks to be bypassed if used directly, but not across binding sites.
        // Weak concrete types lose their concreteness whenever getBindingType is called.
        function canBeConcrete(target) {
            if (isTypeAny(target)) {
                return false;
            }
            // Interface types don't support even the weak form of concreteness.
            // We could use them to represent information about cemented objects,
            // but we have more appropriate types for those scenarios.
            if (target.flags & ts.TypeFlags.Interface) {
                return false;
            }
            // Union types and intersection types can only be strongly concrete.
            if (target.flags & (ts.TypeFlags.Union | ts.TypeFlags.Intersection)) {
                return isRuntimeCheckable(target);
            }
            // All other types can be weakly concrete if they stem from a cemented declaration.
            return true;
        }
        function isWeakConcreteType(target) {
            return isConcreteType(target) && !isRuntimeCheckable(unconcrete(target));
        }
        // [ConcreteTypeScript]
        // If we detect weak concreteness, as described above, strip concreteness
        // off from a type.
        function stripWeakConcreteType(target) {
            return isWeakConcreteType(target) ? unconcrete(target) : target;
        }
        function isConcreteType(type) {
            if (type.flags & ts.TypeFlags.Intersection) {
                for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                    var subtype = _a[_i];
                    if (isConcreteType(subtype)) {
                        return true;
                    }
                }
            }
            return !!(type.flags & ts.TypeFlags.Concrete);
        }
        // Force a type to its non-concrete equivalent
        function unconcrete(target) {
            ts.Debug.assert(target != null);
            if (isConcreteType(target)) {
                if (target.flags & ts.TypeFlags.Intersection) {
                    return getIntersectionType(target.types.map(unconcrete));
                }
                else {
                    return target.baseType;
                }
            }
            else {
                return target;
            }
        }
        // [ConcreteTypeScript]
        function nodeMustCheck(node, type) {
            ts.Debug.assert(!getNodeLinks(node).mustCheck || getNodeLinks(node).mustCheck === type);
            getNodeLinks(node).mustCheck = type;
            getNodeLinks(node).checkVar = getTempTypeVar(ts.getSourceFileOfNode(node), type);
        }
        /* Check for assignability problems related to concreteness, namely
         * requiring checks or float/int coercion, and mark the given node as
         * requiring those checks */
        function checkCtsCoercion(node, fromType, toType) {
            /* If the target type is concrete and value type isn't, must check,
             * unless it's known null or undefined */
            if (isConcreteType(toType) && !isConcreteType(fromType) &&
                fromType !== nullType && fromType !== undefinedType) {
                nodeMustCheck(node, toType);
            }
            // If the target is float and expression isn't, must coerce
            if ((isConcreteType(toType) && unconcrete(toType).flags & ts.TypeFlags.FloatHint) &&
                !(isConcreteType(fromType) && unconcrete(fromType).flags & ts.TypeFlags.FloatHint)) {
                getNodeLinks(node).mustFloat = true;
            }
            // And similar for int
            if ((isConcreteType(toType) && unconcrete(toType).flags & ts.TypeFlags.IntHint) &&
                !(isConcreteType(fromType) && unconcrete(fromType).flags & ts.TypeFlags.IntHint)) {
                getNodeLinks(node).mustInt = true;
            }
        }
        // [/ConcreteTypeScript]
        function getTargetOfImportClause(node) {
            var moduleSymbol = resolveExternalModuleName(node, node.parent.moduleSpecifier);
            if (moduleSymbol) {
                var exportDefaultSymbol = resolveSymbol(moduleSymbol.exports["default"]);
                if (!exportDefaultSymbol) {
                    error(node.name, ts.Diagnostics.Module_0_has_no_default_export, symbolToString(moduleSymbol));
                }
                return exportDefaultSymbol;
            }
        }
        function getTargetOfNamespaceImport(node) {
            var moduleSpecifier = node.parent.parent.moduleSpecifier;
            return resolveESModuleSymbol(resolveExternalModuleName(node, moduleSpecifier), moduleSpecifier);
        }
        function getMemberOfModuleVariable(moduleSymbol, name) {
            if (moduleSymbol.flags & ts.SymbolFlags.Variable) {
                var typeAnnotation = moduleSymbol.valueDeclaration.type;
                if (typeAnnotation) {
                    return getPropertyOfType(getTypeFromTypeNode(typeAnnotation), name);
                }
            }
        }
        // This function creates a synthetic symbol that combines the value side of one symbol with the
        // type/namespace side of another symbol. Consider this example:
        //
        //   declare module graphics {
        //       interface Point {
        //           x: number;
        //           y: number;
        //       }
        //   }
        //   declare var graphics: {
        //       Point: new (x: number, y: number) => graphics.Point;
        //   }
        //   declare module "graphics" {
        //       export = graphics;
        //   }
        //
        // An 'import { Point } from "graphics"' needs to create a symbol that combines the value side 'Point'
        // property with the type/namespace side interface 'Point'.
        function combineValueAndTypeSymbols(valueSymbol, typeSymbol) {
            if (valueSymbol.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Namespace)) {
                return valueSymbol;
            }
            var result = createSymbol(valueSymbol.flags | typeSymbol.flags, valueSymbol.name);
            result.declarations = ts.concatenate(valueSymbol.declarations, typeSymbol.declarations);
            result.parent = valueSymbol.parent || typeSymbol.parent;
            if (valueSymbol.valueDeclaration)
                result.valueDeclaration = valueSymbol.valueDeclaration;
            if (typeSymbol.members)
                result.members = typeSymbol.members;
            if (valueSymbol.exports)
                result.exports = valueSymbol.exports;
            return result;
        }
        function getExportOfModule(symbol, name) {
            if (symbol.flags & ts.SymbolFlags.Module) {
                var exports_1 = getExportsOfSymbol(symbol);
                if (ts.hasProperty(exports_1, name)) {
                    return resolveSymbol(exports_1[name]);
                }
            }
        }
        function getPropertyOfVariable(symbol, name) {
            if (symbol.flags & ts.SymbolFlags.Variable) {
                var typeAnnotation = symbol.valueDeclaration.type;
                if (typeAnnotation) {
                    return resolveSymbol(getPropertyOfType(getTypeFromTypeNode(typeAnnotation), name));
                }
            }
        }
        function getExternalModuleMember(node, specifier) {
            var moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier);
            var targetSymbol = resolveESModuleSymbol(moduleSymbol, node.moduleSpecifier);
            if (targetSymbol) {
                var name_1 = specifier.propertyName || specifier.name;
                if (name_1.text) {
                    var symbolFromModule = getExportOfModule(targetSymbol, name_1.text);
                    var symbolFromVariable = getPropertyOfVariable(targetSymbol, name_1.text);
                    var symbol = symbolFromModule && symbolFromVariable ?
                        combineValueAndTypeSymbols(symbolFromVariable, symbolFromModule) :
                        symbolFromModule || symbolFromVariable;
                    if (!symbol) {
                        error(name_1, ts.Diagnostics.Module_0_has_no_exported_member_1, getFullyQualifiedName(moduleSymbol), ts.declarationNameToString(name_1));
                    }
                    return symbol;
                }
            }
        }
        function getTargetOfImportSpecifier(node) {
            return getExternalModuleMember(node.parent.parent.parent, node);
        }
        function getTargetOfExportSpecifier(node) {
            return node.parent.parent.moduleSpecifier ?
                getExternalModuleMember(node.parent.parent, node) :
                resolveEntityName(node.propertyName || node.name, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace);
        }
        function getTargetOfExportAssignment(node) {
            return resolveEntityName(node.expression, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace);
        }
        function getTargetOfAliasDeclaration(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportEqualsDeclaration:
                    return getTargetOfImportEqualsDeclaration(node);
                case ts.SyntaxKind.ImportClause:
                    return getTargetOfImportClause(node);
                case ts.SyntaxKind.NamespaceImport:
                    return getTargetOfNamespaceImport(node);
                case ts.SyntaxKind.ImportSpecifier:
                    return getTargetOfImportSpecifier(node);
                case ts.SyntaxKind.ExportSpecifier:
                    return getTargetOfExportSpecifier(node);
                case ts.SyntaxKind.ExportAssignment:
                    return getTargetOfExportAssignment(node);
            }
        }
        function resolveSymbol(symbol) {
            return symbol && symbol.flags & ts.SymbolFlags.Alias && !(symbol.flags & (ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace)) ? resolveAlias(symbol) : symbol;
        }
        function resolveAlias(symbol) {
            ts.Debug.assert((symbol.flags & ts.SymbolFlags.Alias) !== 0, "Should only get Alias here.");
            var links = getSymbolLinks(symbol);
            if (!links.target) {
                links.target = resolvingSymbol;
                var node = getDeclarationOfAliasSymbol(symbol);
                var target = getTargetOfAliasDeclaration(node);
                if (links.target === resolvingSymbol) {
                    links.target = target || unknownSymbol;
                }
                else {
                    error(node, ts.Diagnostics.Circular_definition_of_import_alias_0, symbolToString(symbol));
                }
            }
            else if (links.target === resolvingSymbol) {
                links.target = unknownSymbol;
            }
            return links.target;
        }
        function markExportAsReferenced(node) {
            var symbol = getSymbolOfNode(node);
            var target = resolveAlias(symbol);
            if (target) {
                var markAlias = (target === unknownSymbol && compilerOptions.isolatedModules) ||
                    (target !== unknownSymbol && (target.flags & ts.SymbolFlags.Value) && !isConstEnumOrConstEnumOnlyModule(target));
                if (markAlias) {
                    markAliasSymbolAsReferenced(symbol);
                }
            }
        }
        // When an alias symbol is referenced, we need to mark the entity it references as referenced and in turn repeat that until
        // we reach a non-alias or an exported entity (which is always considered referenced). We do this by checking the target of
        // the alias as an expression (which recursively takes us back here if the target references another alias).
        function markAliasSymbolAsReferenced(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.referenced) {
                links.referenced = true;
                var node = getDeclarationOfAliasSymbol(symbol);
                if (node.kind === ts.SyntaxKind.ExportAssignment) {
                    // export default <symbol>
                    checkExpressionCached(node.expression);
                }
                else if (node.kind === ts.SyntaxKind.ExportSpecifier) {
                    // export { <symbol> } or export { <symbol> as foo }
                    checkExpressionCached(node.propertyName || node.name);
                }
                else if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                    // import foo = <symbol>
                    checkExpressionCached(node.moduleReference);
                }
            }
        }
        // This function is only for imports with entity names
        function getSymbolOfPartOfRightHandSideOfImportEquals(entityName, importDeclaration) {
            if (!importDeclaration) {
                importDeclaration = ts.getAncestor(entityName, ts.SyntaxKind.ImportEqualsDeclaration);
                ts.Debug.assert(importDeclaration !== undefined);
            }
            // There are three things we might try to look for. In the following examples,
            // the search term is enclosed in |...|:
            //
            //     import a = |b|; // Namespace
            //     import a = |b.c|; // Value, type, namespace
            //     import a = |b.c|.d; // Namespace
            if (entityName.kind === ts.SyntaxKind.Identifier && ts.isRightSideOfQualifiedNameOrPropertyAccess(entityName)) {
                entityName = entityName.parent;
            }
            // Check for case 1 and 3 in the above example
            if (entityName.kind === ts.SyntaxKind.Identifier || entityName.parent.kind === ts.SyntaxKind.QualifiedName) {
                return resolveEntityName(entityName, ts.SymbolFlags.Namespace);
            }
            else {
                // Case 2 in above example
                // entityName.kind could be a QualifiedName or a Missing identifier
                ts.Debug.assert(entityName.parent.kind === ts.SyntaxKind.ImportEqualsDeclaration);
                return resolveEntityName(entityName, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace);
            }
        }
        function getFullyQualifiedName(symbol) {
            return symbol.parent ? getFullyQualifiedName(symbol.parent) + "." + symbolToString(symbol) : symbolToString(symbol);
        }
        // Resolves a qualified name and any involved aliases
        function resolveEntityName(name, meaning, ignoreErrors) {
            if (ts.nodeIsMissing(name)) {
                return undefined;
            }
            var symbol;
            if (name.kind === ts.SyntaxKind.Identifier) {
                var message = meaning === ts.SymbolFlags.Namespace ? ts.Diagnostics.Cannot_find_namespace_0 : ts.Diagnostics.Cannot_find_name_0;
                symbol = resolveName(name, name.text, meaning, ignoreErrors ? undefined : message, name);
                if (!symbol) {
                    return undefined;
                }
            }
            else if (name.kind === ts.SyntaxKind.QualifiedName || name.kind === ts.SyntaxKind.PropertyAccessExpression) {
                var left = name.kind === ts.SyntaxKind.QualifiedName ? name.left : name.expression;
                var right = name.kind === ts.SyntaxKind.QualifiedName ? name.right : name.name;
                var namespace = resolveEntityName(left, ts.SymbolFlags.Namespace, ignoreErrors);
                if (!namespace || namespace === unknownSymbol || ts.nodeIsMissing(right)) {
                    return undefined;
                }
                symbol = getSymbol(getExportsOfSymbol(namespace), right.text, meaning);
                if (!symbol) {
                    if (!ignoreErrors) {
                        error(right, ts.Diagnostics.Module_0_has_no_exported_member_1, getFullyQualifiedName(namespace), ts.declarationNameToString(right));
                    }
                    return undefined;
                }
            }
            else {
                ts.Debug.fail("Unknown entity name kind.");
            }
            ts.Debug.assert((symbol.flags & ts.SymbolFlags.Instantiated) === 0, "Should never get an instantiated symbol here.");
            return symbol.flags & meaning ? symbol : resolveAlias(symbol);
        }
        function isExternalModuleNameRelative(moduleName) {
            // TypeScript 1.0 spec (April 2014): 11.2.1
            // An external module name is "relative" if the first term is "." or "..".
            return moduleName.substr(0, 2) === "./" || moduleName.substr(0, 3) === "../" || moduleName.substr(0, 2) === ".\\" || moduleName.substr(0, 3) === "..\\";
        }
        function resolveExternalModuleName(location, moduleReferenceExpression) {
            if (moduleReferenceExpression.kind !== ts.SyntaxKind.StringLiteral) {
                return;
            }
            var moduleReferenceLiteral = moduleReferenceExpression;
            var searchPath = ts.getDirectoryPath(getSourceFile(location).fileName);
            // Module names are escaped in our symbol table.  However, string literal values aren't.
            // Escape the name in the "require(...)" clause to ensure we find the right symbol.
            var moduleName = ts.escapeIdentifier(moduleReferenceLiteral.text);
            if (!moduleName) {
                return;
            }
            var isRelative = isExternalModuleNameRelative(moduleName);
            if (!isRelative) {
                var symbol = getSymbol(globals, "\"" + moduleName + "\"", ts.SymbolFlags.ValueModule);
                if (symbol) {
                    return symbol;
                }
            }
            var resolvedModule = ts.getResolvedModule(getSourceFile(location), moduleReferenceLiteral.text);
            var sourceFile = resolvedModule && host.getSourceFile(resolvedModule.resolvedFileName);
            if (sourceFile) {
                if (sourceFile.symbol) {
                    return sourceFile.symbol;
                }
                error(moduleReferenceLiteral, ts.Diagnostics.File_0_is_not_a_module, sourceFile.fileName);
                return;
            }
            error(moduleReferenceLiteral, ts.Diagnostics.Cannot_find_module_0, moduleName);
        }
        // An external module with an 'export =' declaration resolves to the target of the 'export =' declaration,
        // and an external module with no 'export =' declaration resolves to the module itself.
        function resolveExternalModuleSymbol(moduleSymbol) {
            return moduleSymbol && resolveSymbol(moduleSymbol.exports["export="]) || moduleSymbol;
        }
        // An external module with an 'export =' declaration may be referenced as an ES6 module provided the 'export ='
        // references a symbol that is at least declared as a module or a variable. The target of the 'export =' may
        // combine other declarations with the module or variable (e.g. a class/module, function/module, interface/variable).
        function resolveESModuleSymbol(moduleSymbol, moduleReferenceExpression) {
            var symbol = resolveExternalModuleSymbol(moduleSymbol);
            if (symbol && !(symbol.flags & (ts.SymbolFlags.Module | ts.SymbolFlags.Variable))) {
                error(moduleReferenceExpression, ts.Diagnostics.Module_0_resolves_to_a_non_module_entity_and_cannot_be_imported_using_this_construct, symbolToString(moduleSymbol));
                symbol = undefined;
            }
            return symbol;
        }
        function getExportAssignmentSymbol(moduleSymbol) {
            return moduleSymbol.exports["export="];
        }
        function getExportsOfModuleAsArray(moduleSymbol) {
            return symbolsToArray(getExportsOfModule(moduleSymbol));
        }
        function getExportsOfSymbol(symbol) {
            return symbol.flags & ts.SymbolFlags.Module ? getExportsOfModule(symbol) : symbol.exports || emptySymbols;
        }
        function getExportsOfModule(moduleSymbol) {
            var links = getSymbolLinks(moduleSymbol);
            return links.resolvedExports || (links.resolvedExports = getExportsForModule(moduleSymbol));
        }
        function extendExportSymbols(target, source) {
            for (var id in source) {
                if (id !== "default" && !ts.hasProperty(target, id)) {
                    target[id] = source[id];
                }
            }
        }
        function getExportsForModule(moduleSymbol) {
            var result;
            var visitedSymbols = [];
            visit(moduleSymbol);
            return result || moduleSymbol.exports;
            // The ES6 spec permits export * declarations in a module to circularly reference the module itself. For example,
            // module 'a' can 'export * from "b"' and 'b' can 'export * from "a"' without error.
            function visit(symbol) {
                if (symbol && symbol.flags & ts.SymbolFlags.HasExports && !ts.contains(visitedSymbols, symbol)) {
                    visitedSymbols.push(symbol);
                    if (symbol !== moduleSymbol) {
                        if (!result) {
                            result = cloneSymbolTable(moduleSymbol.exports);
                        }
                        extendExportSymbols(result, symbol.exports);
                    }
                    // All export * declarations are collected in an __export symbol by the binder
                    var exportStars = symbol.exports["__export"];
                    if (exportStars) {
                        for (var _i = 0, _a = exportStars.declarations; _i < _a.length; _i++) {
                            var node = _a[_i];
                            visit(resolveExternalModuleName(node, node.moduleSpecifier));
                        }
                    }
                }
            }
        }
        function getMergedSymbol(symbol) {
            var merged;
            return symbol && symbol.mergeId && (merged = mergedSymbols[symbol.mergeId]) ? merged : symbol;
        }
        function getSymbolOfNode(node) {
            return getMergedSymbol(node.symbol);
        }
        function getParentOfSymbol(symbol) {
            return getMergedSymbol(symbol.parent);
        }
        function getExportSymbolOfValueSymbolIfExported(symbol) {
            return symbol && (symbol.flags & ts.SymbolFlags.ExportValue) !== 0
                ? getMergedSymbol(symbol.exportSymbol)
                : symbol;
        }
        function symbolIsValue(symbol) {
            // If it is an instantiated symbol, then it is a value if the symbol it is an
            // instantiation of is a value.
            if (symbol.flags & ts.SymbolFlags.Instantiated) {
                return symbolIsValue(getSymbolLinks(symbol).target);
            }
            // If the symbol has the value flag, it is trivially a value.
            if (symbol.flags & ts.SymbolFlags.Value) {
                return true;
            }
            // If it is an alias, then it is a value if the symbol it resolves to is a value.
            if (symbol.flags & ts.SymbolFlags.Alias) {
                return (resolveAlias(symbol).flags & ts.SymbolFlags.Value) !== 0;
            }
            return false;
        }
        function findConstructorDeclaration(node) {
            var members = node.members;
            for (var _i = 0; _i < members.length; _i++) {
                var member = members[_i];
                if (member.kind === ts.SyntaxKind.Constructor && ts.nodeIsPresent(member.body)) {
                    return member;
                }
            }
        }
        function createType(flags) {
            var result = new Type(checker, flags);
            result.id = typeCount++;
            return result;
        }
        function createIntrinsicType(kind, intrinsicName) {
            var type = createType(kind);
            type.intrinsicName = intrinsicName;
            return type;
        }
        function createObjectType(kind, symbol) {
            var type = createType(kind);
            type.symbol = symbol;
            return type;
        }
        // A reserved member name starts with two underscores, but the third character cannot be an underscore
        // or the @ symbol. A third underscore indicates an escaped form of an identifer that started
        // with at least two underscores. The @ character indicates that the name is denoted by a well known ES
        // Symbol instance.
        function isReservedMemberName(name) {
            return name.charCodeAt(0) === ts.CharacterCodes._ &&
                name.charCodeAt(1) === ts.CharacterCodes._ &&
                name.charCodeAt(2) !== ts.CharacterCodes._ &&
                name.charCodeAt(2) !== ts.CharacterCodes.at;
        }
        function getNamedMembers(members) {
            var result;
            for (var id in members) {
                if (ts.hasProperty(members, id)) {
                    if (!isReservedMemberName(id)) {
                        if (!result)
                            result = [];
                        var symbol = members[id];
                        if (symbolIsValue(symbol)) {
                            result.push(symbol);
                        }
                    }
                }
            }
            return result || emptyArray;
        }
        function setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType) {
            type.members = members;
            type.properties = getNamedMembers(members);
            type.callSignatures = callSignatures;
            type.constructSignatures = constructSignatures;
            if (stringIndexType)
                type.stringIndexType = stringIndexType;
            if (numberIndexType)
                type.numberIndexType = numberIndexType;
            return type;
        }
        function createAnonymousType(symbol, members, callSignatures, constructSignatures, stringIndexType, numberIndexType) {
            return setObjectTypeMembers(createObjectType(ts.TypeFlags.Anonymous, symbol), members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function forEachSymbolTableInScope(enclosingDeclaration, callback) {
            var result;
            for (var location_1 = enclosingDeclaration; location_1; location_1 = location_1.parent) {
                // Locals of a source file are not in scope (because they get merged into the global symbol table)
                if (location_1.locals && !isGlobalSourceFile(location_1)) {
                    if (result = callback(location_1.locals)) {
                        return result;
                    }
                }
                switch (location_1.kind) {
                    case ts.SyntaxKind.SourceFile:
                        if (!ts.isExternalModule(location_1)) {
                            break;
                        }
                    case ts.SyntaxKind.ModuleDeclaration:
                        if (result = callback(getSymbolOfNode(location_1).exports)) {
                            return result;
                        }
                        break;
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                        if (result = callback(getSymbolOfNode(location_1).members)) {
                            return result;
                        }
                        break;
                }
            }
            return callback(globals);
        }
        function getQualifiedLeftMeaning(rightMeaning) {
            // If we are looking in value space, the parent meaning is value, other wise it is namespace
            return rightMeaning === ts.SymbolFlags.Value ? ts.SymbolFlags.Value : ts.SymbolFlags.Namespace;
        }
        function getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, useOnlyExternalAliasing) {
            function getAccessibleSymbolChainFromSymbolTable(symbols) {
                function canQualifySymbol(symbolFromSymbolTable, meaning) {
                    // If the symbol is equivalent and doesn't need further qualification, this symbol is accessible
                    if (!needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning)) {
                        return true;
                    }
                    // If symbol needs qualification, make sure that parent is accessible, if it is then this symbol is accessible too
                    var accessibleParent = getAccessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, getQualifiedLeftMeaning(meaning), useOnlyExternalAliasing);
                    return !!accessibleParent;
                }
                function isAccessible(symbolFromSymbolTable, resolvedAliasSymbol) {
                    if (symbol === (resolvedAliasSymbol || symbolFromSymbolTable)) {
                        // if the symbolFromSymbolTable is not external module (it could be if it was determined as ambient external module and would be in globals table)
                        // and if symbolfrom symbolTable or alias resolution matches the symbol,
                        // check the symbol can be qualified, it is only then this symbol is accessible
                        return !ts.forEach(symbolFromSymbolTable.declarations, hasExternalModuleSymbol) &&
                            canQualifySymbol(symbolFromSymbolTable, meaning);
                    }
                }
                // If symbol is directly available by its name in the symbol table
                if (isAccessible(ts.lookUp(symbols, symbol.name))) {
                    return [symbol];
                }
                // Check if symbol is any of the alias
                return ts.forEachValue(symbols, function (symbolFromSymbolTable) {
                    if (symbolFromSymbolTable.flags & ts.SymbolFlags.Alias
                        && symbolFromSymbolTable.name !== "export="
                        && !ts.getDeclarationOfKind(symbolFromSymbolTable, ts.SyntaxKind.ExportSpecifier)) {
                        if (!useOnlyExternalAliasing ||
                            // Is this external alias, then use it to name
                            ts.forEach(symbolFromSymbolTable.declarations, ts.isExternalModuleImportEqualsDeclaration)) {
                            var resolvedImportedSymbol = resolveAlias(symbolFromSymbolTable);
                            if (isAccessible(symbolFromSymbolTable, resolveAlias(symbolFromSymbolTable))) {
                                return [symbolFromSymbolTable];
                            }
                            // Look in the exported members, if we can find accessibleSymbolChain, symbol is accessible using this chain
                            // but only if the symbolFromSymbolTable can be qualified
                            var accessibleSymbolsFromExports = resolvedImportedSymbol.exports ? getAccessibleSymbolChainFromSymbolTable(resolvedImportedSymbol.exports) : undefined;
                            if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, getQualifiedLeftMeaning(meaning))) {
                                return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
                            }
                        }
                    }
                });
            }
            if (symbol) {
                return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
            }
        }
        function needsQualification(symbol, enclosingDeclaration, meaning) {
            var qualify = false;
            forEachSymbolTableInScope(enclosingDeclaration, function (symbolTable) {
                // If symbol of this name is not available in the symbol table we are ok
                if (!ts.hasProperty(symbolTable, symbol.name)) {
                    // Continue to the next symbol table
                    return false;
                }
                // If the symbol with this name is present it should refer to the symbol
                var symbolFromSymbolTable = symbolTable[symbol.name];
                if (symbolFromSymbolTable === symbol) {
                    // No need to qualify
                    return true;
                }
                // Qualify if the symbol from symbol table has same meaning as expected
                symbolFromSymbolTable = (symbolFromSymbolTable.flags & ts.SymbolFlags.Alias && !ts.getDeclarationOfKind(symbolFromSymbolTable, ts.SyntaxKind.ExportSpecifier)) ? resolveAlias(symbolFromSymbolTable) : symbolFromSymbolTable;
                if (symbolFromSymbolTable.flags & meaning) {
                    qualify = true;
                    return true;
                }
                // Continue to the next symbol table
                return false;
            });
            return qualify;
        }
        function isSymbolAccessible(symbol, enclosingDeclaration, meaning) {
            if (symbol && enclosingDeclaration && !(symbol.flags & ts.SymbolFlags.TypeParameter)) {
                var initialSymbol = symbol;
                var meaningToLook = meaning;
                while (symbol) {
                    // Symbol is accessible if it by itself is accessible
                    var accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaningToLook, /*useOnlyExternalAliasing*/ false);
                    if (accessibleSymbolChain) {
                        var hasAccessibleDeclarations = hasVisibleDeclarations(accessibleSymbolChain[0]);
                        if (!hasAccessibleDeclarations) {
                            return {
                                accessibility: ts.SymbolAccessibility.NotAccessible,
                                errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning),
                                errorModuleName: symbol !== initialSymbol ? symbolToString(symbol, enclosingDeclaration, ts.SymbolFlags.Namespace) : undefined
                            };
                        }
                        return hasAccessibleDeclarations;
                    }
                    // If we haven't got the accessible symbol, it doesn't mean the symbol is actually inaccessible.
                    // It could be a qualified symbol and hence verify the path
                    // e.g.:
                    // module m {
                    //     export class c {
                    //     }
                    // }
                    // let x: typeof m.c
                    // In the above example when we start with checking if typeof m.c symbol is accessible,
                    // we are going to see if c can be accessed in scope directly.
                    // But it can't, hence the accessible is going to be undefined, but that doesn't mean m.c is inaccessible
                    // It is accessible if the parent m is accessible because then m.c can be accessed through qualification
                    meaningToLook = getQualifiedLeftMeaning(meaning);
                    symbol = getParentOfSymbol(symbol);
                }
                // This could be a symbol that is not exported in the external module
                // or it could be a symbol from different external module that is not aliased and hence cannot be named
                var symbolExternalModule = ts.forEach(initialSymbol.declarations, getExternalModuleContainer);
                if (symbolExternalModule) {
                    var enclosingExternalModule = getExternalModuleContainer(enclosingDeclaration);
                    if (symbolExternalModule !== enclosingExternalModule) {
                        // name from different external module that is not visible
                        return {
                            accessibility: ts.SymbolAccessibility.CannotBeNamed,
                            errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning),
                            errorModuleName: symbolToString(symbolExternalModule)
                        };
                    }
                }
                // Just a local name that is not accessible
                return {
                    accessibility: ts.SymbolAccessibility.NotAccessible,
                    errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning)
                };
            }
            return { accessibility: ts.SymbolAccessibility.Accessible };
            function getExternalModuleContainer(declaration) {
                for (; declaration; declaration = declaration.parent) {
                    if (hasExternalModuleSymbol(declaration)) {
                        return getSymbolOfNode(declaration);
                    }
                }
            }
        }
        function hasExternalModuleSymbol(declaration) {
            return (declaration.kind === ts.SyntaxKind.ModuleDeclaration && declaration.name.kind === ts.SyntaxKind.StringLiteral) ||
                (declaration.kind === ts.SyntaxKind.SourceFile && ts.isExternalModule(declaration));
        }
        function hasVisibleDeclarations(symbol) {
            var aliasesToMakeVisible;
            if (ts.forEach(symbol.declarations, function (declaration) { return !getIsDeclarationVisible(declaration); })) {
                return undefined;
            }
            return { accessibility: ts.SymbolAccessibility.Accessible, aliasesToMakeVisible: aliasesToMakeVisible };
            function getIsDeclarationVisible(declaration) {
                if (!isDeclarationVisible(declaration)) {
                    // Mark the unexported alias as visible if its parent is visible
                    // because these kind of aliases can be used to name types in declaration file
                    var anyImportSyntax = getAnyImportSyntax(declaration);
                    if (anyImportSyntax &&
                        !(anyImportSyntax.flags & ts.NodeFlags.Export) &&
                        isDeclarationVisible(anyImportSyntax.parent)) {
                        getNodeLinks(declaration).isVisible = true;
                        if (aliasesToMakeVisible) {
                            if (!ts.contains(aliasesToMakeVisible, anyImportSyntax)) {
                                aliasesToMakeVisible.push(anyImportSyntax);
                            }
                        }
                        else {
                            aliasesToMakeVisible = [anyImportSyntax];
                        }
                        return true;
                    }
                    // Declaration is not visible
                    return false;
                }
                return true;
            }
        }
        function isEntityNameVisible(entityName, enclosingDeclaration) {
            // get symbol of the first identifier of the entityName
            var meaning;
            if (entityName.parent.kind === ts.SyntaxKind.TypeQuery) {
                // Typeof value
                meaning = ts.SymbolFlags.Value | ts.SymbolFlags.ExportValue;
            }
            else if (entityName.kind === ts.SyntaxKind.QualifiedName || entityName.kind === ts.SyntaxKind.PropertyAccessExpression ||
                entityName.parent.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
                // Left identifier from type reference or TypeAlias
                // Entity name of the import declaration
                meaning = ts.SymbolFlags.Namespace;
            }
            else {
                // Type Reference or TypeAlias entity = Identifier
                meaning = ts.SymbolFlags.Type;
            }
            var firstIdentifier = getFirstIdentifier(entityName);
            var symbol = resolveName(enclosingDeclaration, firstIdentifier.text, meaning, /*nodeNotFoundErrorMessage*/ undefined, /*nameArg*/ undefined);
            // Verify if the symbol is accessible
            return (symbol && hasVisibleDeclarations(symbol)) || {
                accessibility: ts.SymbolAccessibility.NotAccessible,
                errorSymbolName: ts.getTextOfNode(firstIdentifier),
                errorNode: firstIdentifier
            };
        }
        function writeKeyword(writer, kind) {
            writer.writeKeyword(ts.tokenToString(kind));
        }
        function writePunctuation(writer, kind) {
            writer.writePunctuation(ts.tokenToString(kind));
        }
        function writeSpace(writer) {
            writer.writeSpace(" ");
        }
        function symbolToString(symbol, enclosingDeclaration, meaning) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildSymbolDisplay(symbol, writer, enclosingDeclaration, meaning);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            return result;
        }
        function signatureToString(signature, enclosingDeclaration, flags) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildSignatureDisplay(signature, writer, enclosingDeclaration, flags);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            return result;
        }
        function typeToString(type, enclosingDeclaration, flags) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            var maxLength = compilerOptions.noErrorTruncation || flags & ts.TypeFormatFlags.NoTruncation ? undefined : 100;
            if (maxLength && result.length >= maxLength) {
                result = result.substr(0, maxLength - "...".length) + "...";
            }
            return result;
        }
        function getTypeAliasForTypeLiteral(type) {
            if (type.symbol && type.symbol.flags & ts.SymbolFlags.TypeLiteral) {
                var node = type.symbol.declarations[0].parent;
                while (node.kind === ts.SyntaxKind.ParenthesizedType) {
                    node = node.parent;
                }
                if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                    return getSymbolOfNode(node);
                }
            }
            return undefined;
        }
        function getSymbolDisplayBuilder() {
            function getNameOfSymbol(symbol) {
                // [ConcreteTypeScript]
                if (symbol.flags & ts.SymbolFlags.Prototype) {
                    getTypeOfSymbol(symbol); // Ensure code runs.
                    return symbol.declarations[0].name.text;
                }
                // [/ConcreteTypeScript]
                if (symbol.declarations && symbol.declarations.length) {
                    var declaration = symbol.declarations[0];
                    if (declaration.name) {
                        return ts.declarationNameToString(declaration.name);
                    }
                    switch (declaration.kind) {
                        case ts.SyntaxKind.ClassExpression:
                            return "(Anonymous class)";
                        case ts.SyntaxKind.FunctionExpression:
                        case ts.SyntaxKind.ArrowFunction:
                            return "(Anonymous function)";
                    }
                }
                return symbol.name;
            }
            /**
             * Writes only the name of the symbol out to the writer. Uses the original source text
             * for the name of the symbol if it is available to match how the user inputted the name.
             */
            function appendSymbolNameOnly(symbol, writer) {
                writer.writeSymbol(getNameOfSymbol(symbol), symbol);
            }
            /**
             * Enclosing declaration is optional when we don't want to get qualified name in the enclosing declaration scope
             * Meaning needs to be specified if the enclosing declaration is given
             */
            function buildSymbolDisplay(symbol, writer, enclosingDeclaration, meaning, flags, typeFlags) {
                var parentSymbol;
                function appendParentTypeArgumentsAndSymbolName(symbol) {
                    if (parentSymbol) {
                        // Write type arguments of instantiated class/interface here
                        if (flags & ts.SymbolFormatFlags.WriteTypeParametersOrArguments) {
                            if (symbol.flags & ts.SymbolFlags.Instantiated) {
                                buildDisplayForTypeArgumentsAndDelimiters(getTypeParametersOfClassOrInterface(parentSymbol), symbol.mapper, writer, enclosingDeclaration);
                            }
                            else {
                                buildTypeParameterDisplayFromSymbol(parentSymbol, writer, enclosingDeclaration);
                            }
                        }
                        writePunctuation(writer, ts.SyntaxKind.DotToken);
                    }
                    parentSymbol = symbol;
                    appendSymbolNameOnly(symbol, writer);
                }
                // Let the writer know we just wrote out a symbol.  The declaration emitter writer uses
                // this to determine if an import it has previously seen (and not written out) needs
                // to be written to the file once the walk of the tree is complete.
                //
                // NOTE(cyrusn): This approach feels somewhat unfortunate.  A simple pass over the tree
                // up front (for example, during checking) could determine if we need to emit the imports
                // and we could then access that data during declaration emit.
                writer.trackSymbol(symbol, enclosingDeclaration, meaning);
                function walkSymbol(symbol, meaning) {
                    if (symbol) {
                        var accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, !!(flags & ts.SymbolFormatFlags.UseOnlyExternalAliasing));
                        if (!accessibleSymbolChain ||
                            needsQualification(accessibleSymbolChain[0], enclosingDeclaration, accessibleSymbolChain.length === 1 ? meaning : getQualifiedLeftMeaning(meaning))) {
                            // Go up and add our parent.
                            walkSymbol(getParentOfSymbol(accessibleSymbolChain ? accessibleSymbolChain[0] : symbol), getQualifiedLeftMeaning(meaning));
                        }
                        if (accessibleSymbolChain) {
                            for (var _i = 0; _i < accessibleSymbolChain.length; _i++) {
                                var accessibleSymbol = accessibleSymbolChain[_i];
                                appendParentTypeArgumentsAndSymbolName(accessibleSymbol);
                            }
                        }
                        else {
                            // If we didn't find accessible symbol chain for this symbol, break if this is external module
                            if (!parentSymbol && ts.forEach(symbol.declarations, hasExternalModuleSymbol)) {
                                return;
                            }
                            // if this is anonymous type break
                            if (symbol.flags & ts.SymbolFlags.TypeLiteral || symbol.flags & ts.SymbolFlags.ObjectLiteral) {
                                return;
                            }
                            appendParentTypeArgumentsAndSymbolName(symbol);
                        }
                    }
                }
                // Get qualified name if the symbol is not a type parameter
                // and there is an enclosing declaration or we specifically
                // asked for it
                var isTypeParameter = symbol.flags & ts.SymbolFlags.TypeParameter;
                var typeFormatFlag = ts.TypeFormatFlags.UseFullyQualifiedType & typeFlags;
                if (!isTypeParameter && (enclosingDeclaration || typeFormatFlag)) {
                    walkSymbol(symbol, meaning);
                    return;
                }
                return appendParentTypeArgumentsAndSymbolName(symbol);
            }
            function buildTypeDisplay(type, writer, enclosingDeclaration, globalFlags, symbolStack) {
                var globalFlagsToPass = globalFlags & ts.TypeFormatFlags.WriteOwnNameForAnyLike;
                return writeType(type, globalFlags);
                function writeType(type, flags) {
                    if (type.symbol && type.symbol.flags & ts.SymbolFlags.Prototype) {
                        writeType(getDeclaredTypeOfSymbol(type.symbol.parent), globalFlags);
                        writer.writeOperator('.');
                    }
                    // Write undefined/null type as any
                    if (type.flags & ts.TypeFlags.Intrinsic) {
                        // Special handling for unknown / resolving types, they should show up as any and not unknown or __resolving
                        writer.writeKeyword(!(globalFlags & ts.TypeFormatFlags.WriteOwnNameForAnyLike) && isTypeAny(type)
                            ? "any"
                            : type.intrinsicName);
                    }
                    else if (type.flags & ts.TypeFlags.Reference) {
                        writeTypeReference(type, flags);
                    }
                    else if (type.flags & ts.TypeFlags.Declare) {
                        /*                        let declareTypeDecl = <DeclareTypeDeclaration>getSymbolDecl(type.symbol, SyntaxKind.DeclareType);
                                                if (declareTypeDecl.parent.kind === SyntaxKind.BrandTypeDeclaration) {
                                                    writer.writeSymbol((<DeclareTypeNode>declareTypeDecl.parent).name.text, (<DeclareTypeNode>declareTypeDecl.parent).symbol);
                                                    writer.writeOperator(".prototype");
                                                } else { */
                        //writer.writeOperator("declare");
                        buildSymbolDisplay(type.symbol, writer, enclosingDeclaration, ts.SymbolFlags.Type, ts.SymbolFormatFlags.None, flags);
                    }
                    else if (type.flags & ts.TypeFlags.IntermediateFlow) {
                        var flowData = getFlowDataForType(type);
                        if (isIntermediateFlowTypeSubtypeOfTarget(type)) {
                            return buildTypeDisplay(type.targetType, writer, enclosingDeclaration, globalFlags, symbolStack);
                        }
                        var formalType = flowDataFormalType(flowData);
                        var members = Object.keys(flowData.memberSet);
                        if (members.length === 0 || !isTypeIdenticalTo(formalType, emptyObjectType)) {
                            buildTypeDisplay(formalType, writer, enclosingDeclaration, globalFlags, symbolStack);
                            if (members.length > 0) {
                                writer.writeOperator(" has ");
                            }
                        }
                        if (members.length > 0) {
                            writer.writeOperator("{");
                            for (var i = 0; i < members.length; i++) {
                                if (i !== 0) {
                                    writer.writeOperator(', ');
                                }
                                writer.writeOperator(members[i] + ": ");
                                buildTypeDisplay(flowTypeGet(ts.getProperty(flowData.memberSet, members[i])), writer, enclosingDeclaration, globalFlags, symbolStack);
                            }
                            writer.writeOperator("}");
                        }
                        writer.writeOperator(" becomes ");
                        if (type.targetType) {
                            buildTypeDisplay(type.targetType, writer, enclosingDeclaration, globalFlags, symbolStack);
                        }
                        else {
                            writer.writeOperator(":");
                        }
                    }
                    else if (type.flags & (ts.TypeFlags.Class | ts.TypeFlags.Interface | ts.TypeFlags.Declare | ts.TypeFlags.Enum | ts.TypeFlags.TypeParameter | ts.TypeFlags.Declare)) {
                        // [/ConcreteTypeScript]
                        // The specified symbol flags need to be reinterpreted as type flags
                        buildSymbolDisplay(type.symbol, writer, enclosingDeclaration, ts.SymbolFlags.Type, ts.SymbolFormatFlags.None, flags);
                    }
                    else if (type.flags & ts.TypeFlags.Tuple) {
                        writeTupleType(type);
                    }
                    else if (type.flags & ts.TypeFlags.UnionOrIntersection) {
                        writeUnionOrIntersectionType(type, flags);
                    }
                    else if (type.flags & ts.TypeFlags.Anonymous) {
                        writeAnonymousType(type, flags);
                    }
                    else if (type.flags & ts.TypeFlags.StringLiteral) {
                        writer.writeStringLiteral(type.text);
                    }
                    else if (isConcreteType(type)) {
                        writer.writeOperator("!");
                        writeType(type.baseType, flags);
                    }
                    else {
                        // Should never get here
                        // { ... }
                        writePunctuation(writer, ts.SyntaxKind.OpenBraceToken);
                        writeSpace(writer);
                        writePunctuation(writer, ts.SyntaxKind.DotDotDotToken);
                        writeSpace(writer);
                        writePunctuation(writer, ts.SyntaxKind.CloseBraceToken);
                    }
                }
                function writeTypeList(types, delimiter) {
                    for (var i = 0; i < types.length; i++) {
                        if (i > 0) {
                            if (delimiter !== ts.SyntaxKind.CommaToken) {
                                writeSpace(writer);
                            }
                            writePunctuation(writer, delimiter);
                            writeSpace(writer);
                        }
                        writeType(types[i], delimiter === ts.SyntaxKind.CommaToken ? ts.TypeFormatFlags.None : ts.TypeFormatFlags.InElementType);
                    }
                }
                function writeSymbolTypeReference(symbol, typeArguments, pos, end) {
                    // Unnamed function expressions, arrow functions, and unnamed class expressions have reserved names that
                    // we don't want to display
                    if (!isReservedMemberName(symbol.name)) {
                        buildSymbolDisplay(symbol, writer, enclosingDeclaration, ts.SymbolFlags.Type);
                    }
                    if (pos < end) {
                        writePunctuation(writer, ts.SyntaxKind.LessThanToken);
                        writeType(typeArguments[pos++], ts.TypeFormatFlags.None);
                        while (pos < end) {
                            writePunctuation(writer, ts.SyntaxKind.CommaToken);
                            writeSpace(writer);
                            writeType(typeArguments[pos++], ts.TypeFormatFlags.None);
                        }
                        writePunctuation(writer, ts.SyntaxKind.GreaterThanToken);
                    }
                }
                function writeTypeReference(type, flags) {
                    var typeArguments = type.typeArguments;
                    if (type.target === globalArrayType && !(flags & ts.TypeFormatFlags.WriteArrayAsGenericType)) {
                        writeType(typeArguments[0], ts.TypeFormatFlags.InElementType);
                        writePunctuation(writer, ts.SyntaxKind.OpenBracketToken);
                        writePunctuation(writer, ts.SyntaxKind.CloseBracketToken);
                    }
                    else {
                        // Write the type reference in the format f<A>.g<B>.C<X, Y> where A and B are type arguments
                        // for outer type parameters, and f and g are the respective declaring containers of those
                        // type parameters.
                        var outerTypeParameters = type.target.outerTypeParameters;
                        var i = 0;
                        if (outerTypeParameters) {
                            var length_1 = outerTypeParameters.length;
                            while (i < length_1) {
                                // Find group of type arguments for type parameters with the same declaring container.
                                var start = i;
                                var parent_1 = getParentSymbolOfTypeParameter(outerTypeParameters[i]);
                                do {
                                    i++;
                                } while (i < length_1 && getParentSymbolOfTypeParameter(outerTypeParameters[i]) === parent_1);
                                // When type parameters are their own type arguments for the whole group (i.e. we have
                                // the default outer type arguments), we don't show the group.
                                if (!ts.rangeEquals(outerTypeParameters, typeArguments, start, i)) {
                                    writeSymbolTypeReference(parent_1, typeArguments, start, i);
                                    writePunctuation(writer, ts.SyntaxKind.DotToken);
                                }
                            }
                        }
                        writeSymbolTypeReference(type.symbol, typeArguments, i, typeArguments.length);
                    }
                }
                function writeTupleType(type) {
                    writePunctuation(writer, ts.SyntaxKind.OpenBracketToken);
                    writeTypeList(type.elementTypes, ts.SyntaxKind.CommaToken);
                    writePunctuation(writer, ts.SyntaxKind.CloseBracketToken);
                }
                function writeUnionOrIntersectionType(type, flags) {
                    if (flags & ts.TypeFormatFlags.InElementType) {
                        writePunctuation(writer, ts.SyntaxKind.OpenParenToken);
                    }
                    writeTypeList(type.types, type.flags & ts.TypeFlags.Union ? ts.SyntaxKind.BarToken : ts.SyntaxKind.AmpersandToken);
                    if (flags & ts.TypeFormatFlags.InElementType) {
                        writePunctuation(writer, ts.SyntaxKind.CloseParenToken);
                    }
                }
                function writeAnonymousType(type, flags) {
                    var symbol = type.symbol;
                    if (symbol) {
                        // Always use 'typeof T' for type of class, enum, and module objects
                        if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Declare | ts.SymbolFlags.Enum | ts.SymbolFlags.ValueModule)) {
                            writeTypeofSymbol(type, flags);
                        }
                        else if (shouldWriteTypeOfFunctionSymbol()) {
                            writeTypeofSymbol(type, flags);
                        }
                        else if (ts.contains(symbolStack, symbol)) {
                            // If type is an anonymous type literal in a type alias declaration, use type alias name
                            var typeAlias = getTypeAliasForTypeLiteral(type);
                            if (typeAlias) {
                                // The specified symbol flags need to be reinterpreted as type flags
                                buildSymbolDisplay(typeAlias, writer, enclosingDeclaration, ts.SymbolFlags.Type, ts.SymbolFormatFlags.None, flags);
                            }
                            else {
                                // Recursive usage, use any
                                writeKeyword(writer, ts.SyntaxKind.AnyKeyword);
                            }
                        }
                        else {
                            // Since instantiations of the same anonymous type have the same symbol, tracking symbols instead
                            // of types allows us to catch circular references to instantiations of the same anonymous type
                            if (!symbolStack) {
                                symbolStack = [];
                            }
                            symbolStack.push(symbol);
                            writeLiteralType(type, flags);
                            symbolStack.pop();
                        }
                    }
                    else {
                        // Anonymous types with no symbol are never circular
                        writeLiteralType(type, flags);
                    }
                    function shouldWriteTypeOfFunctionSymbol() {
                        var isStaticMethodSymbol = !!(symbol.flags & ts.SymbolFlags.Method &&
                            ts.forEach(symbol.declarations, function (declaration) { return declaration.flags & ts.NodeFlags.Static; }));
                        var isNonLocalFunctionSymbol = !!(symbol.flags & ts.SymbolFlags.Function) &&
                            (symbol.parent ||
                                ts.forEach(symbol.declarations, function (declaration) {
                                    return declaration.parent.kind === ts.SyntaxKind.SourceFile || declaration.parent.kind === ts.SyntaxKind.ModuleBlock;
                                }));
                        if (isStaticMethodSymbol || isNonLocalFunctionSymbol) {
                            // typeof is allowed only for static/non local functions
                            return !!(flags & ts.TypeFormatFlags.UseTypeOfFunction) ||
                                (ts.contains(symbolStack, symbol)); // it is type of the symbol uses itself recursively
                        }
                    }
                }
                function writeTypeofSymbol(type, typeFormatFlags) {
                    writeKeyword(writer, ts.SyntaxKind.TypeOfKeyword);
                    writeSpace(writer);
                    buildSymbolDisplay(type.symbol, writer, enclosingDeclaration, ts.SymbolFlags.Value, ts.SymbolFormatFlags.None, typeFormatFlags);
                }
                function getIndexerParameterName(type, indexKind, fallbackName) {
                    var declaration = getIndexDeclarationOfSymbol(type.symbol, indexKind);
                    if (!declaration) {
                        // declaration might not be found if indexer was added from the contextual type.
                        // in this case use fallback name
                        return fallbackName;
                    }
                    ts.Debug.assert(declaration.parameters.length !== 0);
                    return ts.declarationNameToString(declaration.parameters[0].name);
                }
                function writeLiteralType(type, flags) {
                    var resolved = resolveStructuredTypeMembers(type);
                    // [ConcreteTypeScript] 
                    var props = resolved.properties;
                    props = props.filter(function (prop) { return !(prop.flags & ts.SymbolFlags.Prototype); });
                    // [ConcreteTypeScript] 
                    if (!props.length && !resolved.stringIndexType && !resolved.numberIndexType) {
                        if (!resolved.callSignatures.length && !resolved.constructSignatures.length) {
                            writePunctuation(writer, ts.SyntaxKind.OpenBraceToken);
                            writePunctuation(writer, ts.SyntaxKind.CloseBraceToken);
                            return;
                        }
                        if (resolved.callSignatures.length === 1 && !resolved.constructSignatures.length) {
                            if (flags & ts.TypeFormatFlags.InElementType) {
                                writePunctuation(writer, ts.SyntaxKind.OpenParenToken);
                            }
                            buildSignatureDisplay(resolved.callSignatures[0], writer, enclosingDeclaration, globalFlagsToPass | ts.TypeFormatFlags.WriteArrowStyleSignature, symbolStack);
                            if (flags & ts.TypeFormatFlags.InElementType) {
                                writePunctuation(writer, ts.SyntaxKind.CloseParenToken);
                            }
                            return;
                        }
                        if (resolved.constructSignatures.length === 1 && !resolved.callSignatures.length) {
                            if (flags & ts.TypeFormatFlags.InElementType) {
                                writePunctuation(writer, ts.SyntaxKind.OpenParenToken);
                            }
                            writeKeyword(writer, ts.SyntaxKind.NewKeyword);
                            writeSpace(writer);
                            buildSignatureDisplay(resolved.constructSignatures[0], writer, enclosingDeclaration, globalFlagsToPass | ts.TypeFormatFlags.WriteArrowStyleSignature, symbolStack);
                            if (flags & ts.TypeFormatFlags.InElementType) {
                                writePunctuation(writer, ts.SyntaxKind.CloseParenToken);
                            }
                            return;
                        }
                    }
                    writePunctuation(writer, ts.SyntaxKind.OpenBraceToken);
                    writer.writeLine();
                    writer.increaseIndent();
                    for (var _i = 0, _a = resolved.callSignatures; _i < _a.length; _i++) {
                        var signature = _a[_i];
                        buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, symbolStack);
                        writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                        writer.writeLine();
                    }
                    for (var _b = 0, _c = resolved.constructSignatures; _b < _c.length; _b++) {
                        var signature = _c[_b];
                        writeKeyword(writer, ts.SyntaxKind.NewKeyword);
                        writeSpace(writer);
                        buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, symbolStack);
                        writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                        writer.writeLine();
                    }
                    if (resolved.stringIndexType) {
                        // [x: string]:
                        writePunctuation(writer, ts.SyntaxKind.OpenBracketToken);
                        writer.writeParameter(getIndexerParameterName(resolved, ts.IndexKind.String, /*fallbackName*/ "x"));
                        writePunctuation(writer, ts.SyntaxKind.ColonToken);
                        writeSpace(writer);
                        writeKeyword(writer, ts.SyntaxKind.StringKeyword);
                        writePunctuation(writer, ts.SyntaxKind.CloseBracketToken);
                        writePunctuation(writer, ts.SyntaxKind.ColonToken);
                        writeSpace(writer);
                        writeType(resolved.stringIndexType, ts.TypeFormatFlags.None);
                        writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                        writer.writeLine();
                    }
                    if (resolved.numberIndexType) {
                        // [x: number]:
                        writePunctuation(writer, ts.SyntaxKind.OpenBracketToken);
                        writer.writeParameter(getIndexerParameterName(resolved, ts.IndexKind.Number, /*fallbackName*/ "x"));
                        writePunctuation(writer, ts.SyntaxKind.ColonToken);
                        writeSpace(writer);
                        writeKeyword(writer, ts.SyntaxKind.NumberKeyword);
                        writePunctuation(writer, ts.SyntaxKind.CloseBracketToken);
                        writePunctuation(writer, ts.SyntaxKind.ColonToken);
                        writeSpace(writer);
                        writeType(resolved.numberIndexType, ts.TypeFormatFlags.None);
                        writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                        writer.writeLine();
                    }
                    for (var _d = 0; _d < props.length; _d++) {
                        var p = props[_d];
                        var t = getTypeOfSymbol(p);
                        if (p.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method) && !getPropertiesOfObjectType(t).length) {
                            var signatures = getSignaturesOfType(t, ts.SignatureKind.Call);
                            for (var _e = 0; _e < signatures.length; _e++) {
                                var signature = signatures[_e];
                                buildSymbolDisplay(p, writer);
                                if (p.flags & ts.SymbolFlags.Optional) {
                                    writePunctuation(writer, ts.SyntaxKind.QuestionToken);
                                }
                                buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, symbolStack);
                                writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                                writer.writeLine();
                            }
                        }
                        else {
                            buildSymbolDisplay(p, writer);
                            if (p.flags & ts.SymbolFlags.Optional) {
                                writePunctuation(writer, ts.SyntaxKind.QuestionToken);
                            }
                            writePunctuation(writer, ts.SyntaxKind.ColonToken);
                            writeSpace(writer);
                            writeType(t, ts.TypeFormatFlags.None);
                            writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                            writer.writeLine();
                        }
                    }
                    writer.decreaseIndent();
                    writePunctuation(writer, ts.SyntaxKind.CloseBraceToken);
                }
            }
            function buildTypeParameterDisplayFromSymbol(symbol, writer, enclosingDeclaraiton, flags) {
                var targetSymbol = getTargetSymbol(symbol);
                if (targetSymbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Declare) | targetSymbol.flags & ts.SymbolFlags.Interface || targetSymbol.flags & ts.SymbolFlags.TypeAlias) {
                    buildDisplayForTypeParametersAndDelimiters(getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol), writer, enclosingDeclaraiton, flags);
                }
            }
            function buildTypeParameterDisplay(tp, writer, enclosingDeclaration, flags, symbolStack) {
                appendSymbolNameOnly(tp.symbol, writer);
                var constraint = getConstraintOfTypeParameter(tp);
                if (constraint) {
                    writeSpace(writer);
                    writeKeyword(writer, ts.SyntaxKind.ExtendsKeyword);
                    writeSpace(writer);
                    buildTypeDisplay(constraint, writer, enclosingDeclaration, flags, symbolStack);
                }
            }
            function buildParameterDisplay(p, writer, enclosingDeclaration, flags, symbolStack) {
                var parameterNode = p.valueDeclaration;
                if (ts.isRestParameter(parameterNode)) {
                    writePunctuation(writer, ts.SyntaxKind.DotDotDotToken);
                }
                appendSymbolNameOnly(p, writer);
                if (isOptionalParameter(parameterNode)) {
                    writePunctuation(writer, ts.SyntaxKind.QuestionToken);
                }
                writePunctuation(writer, ts.SyntaxKind.ColonToken);
                writeSpace(writer);
                buildTypeDisplay(getTypeOfSymbol(p), writer, enclosingDeclaration, flags, symbolStack);
            }
            function buildDisplayForTypeParametersAndDelimiters(typeParameters, writer, enclosingDeclaration, flags, symbolStack) {
                if (typeParameters && typeParameters.length) {
                    writePunctuation(writer, ts.SyntaxKind.LessThanToken);
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (i > 0) {
                            writePunctuation(writer, ts.SyntaxKind.CommaToken);
                            writeSpace(writer);
                        }
                        buildTypeParameterDisplay(typeParameters[i], writer, enclosingDeclaration, flags, symbolStack);
                    }
                    writePunctuation(writer, ts.SyntaxKind.GreaterThanToken);
                }
            }
            function buildDisplayForTypeArgumentsAndDelimiters(typeParameters, mapper, writer, enclosingDeclaration, flags, symbolStack) {
                if (typeParameters && typeParameters.length) {
                    writePunctuation(writer, ts.SyntaxKind.LessThanToken);
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (i > 0) {
                            writePunctuation(writer, ts.SyntaxKind.CommaToken);
                            writeSpace(writer);
                        }
                        buildTypeDisplay(mapper(typeParameters[i]), writer, enclosingDeclaration, ts.TypeFormatFlags.None);
                    }
                    writePunctuation(writer, ts.SyntaxKind.GreaterThanToken);
                }
            }
            function buildDisplayForParametersAndDelimiters(thisType, parameters, writer, enclosingDeclaration, flags, symbolStack) {
                writePunctuation(writer, ts.SyntaxKind.OpenParenToken);
                if (thisType) {
                    writer.writePunctuation("this: ");
                    buildTypeDisplay(thisType, writer);
                    if (parameters.length > 0) {
                        writePunctuation(writer, ts.SyntaxKind.SemicolonToken);
                        writer.writePunctuation(" ");
                    }
                }
                for (var i = 0; i < parameters.length; i++) {
                    if (i > 0) {
                        writePunctuation(writer, ts.SyntaxKind.CommaToken);
                        writeSpace(writer);
                    }
                    buildParameterDisplay(parameters[i], writer, enclosingDeclaration, flags, symbolStack);
                }
                writePunctuation(writer, ts.SyntaxKind.CloseParenToken);
            }
            function buildReturnTypeDisplay(signature, writer, enclosingDeclaration, flags, symbolStack) {
                if (flags & ts.TypeFormatFlags.WriteArrowStyleSignature) {
                    writeSpace(writer);
                    writePunctuation(writer, ts.SyntaxKind.EqualsGreaterThanToken);
                }
                else {
                    writePunctuation(writer, ts.SyntaxKind.ColonToken);
                }
                writeSpace(writer);
                var returnType;
                if (signature.typePredicate) {
                    writer.writeParameter(signature.typePredicate.parameterName);
                    writeSpace(writer);
                    writeKeyword(writer, ts.SyntaxKind.IsKeyword);
                    writeSpace(writer);
                    returnType = signature.typePredicate.type;
                }
                else {
                    returnType = getReturnTypeOfSignature(signature);
                }
                buildTypeDisplay(returnType, writer, enclosingDeclaration, flags, symbolStack);
            }
            function buildSignatureDisplay(signature, writer, enclosingDeclaration, flags, symbolStack) {
                if (signature.target && (flags & ts.TypeFormatFlags.WriteTypeArgumentsOfSignature)) {
                    // Instantiated signature, write type arguments instead
                    // This is achieved by passing in the mapper separately
                    buildDisplayForTypeArgumentsAndDelimiters(signature.target.typeParameters, signature.mapper, writer, enclosingDeclaration);
                }
                else {
                    buildDisplayForTypeParametersAndDelimiters(signature.typeParameters, writer, enclosingDeclaration, flags, symbolStack);
                }
                buildDisplayForParametersAndDelimiters(signature.resolvedThisType, signature.parameters, writer, enclosingDeclaration, flags, symbolStack);
                buildReturnTypeDisplay(signature, writer, enclosingDeclaration, flags, symbolStack);
            }
            return _displayBuilder || (_displayBuilder = {
                buildSymbolDisplay: buildSymbolDisplay,
                buildTypeDisplay: buildTypeDisplay,
                buildTypeParameterDisplay: buildTypeParameterDisplay,
                buildParameterDisplay: buildParameterDisplay,
                buildDisplayForParametersAndDelimiters: buildDisplayForParametersAndDelimiters,
                buildDisplayForTypeParametersAndDelimiters: buildDisplayForTypeParametersAndDelimiters,
                buildTypeParameterDisplayFromSymbol: buildTypeParameterDisplayFromSymbol,
                buildSignatureDisplay: buildSignatureDisplay,
                buildReturnTypeDisplay: buildReturnTypeDisplay
            });
        }
        function isDeclarationVisible(node) {
            function getContainingExternalModule(node) {
                for (; node; node = node.parent) {
                    if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                        if (node.name.kind === ts.SyntaxKind.StringLiteral) {
                            return node;
                        }
                    }
                    else if (node.kind === ts.SyntaxKind.SourceFile) {
                        return ts.isExternalModule(node) ? node : undefined;
                    }
                }
                ts.Debug.fail("getContainingModule cant reach here");
            }
            function isUsedInExportAssignment(node) {
                // Get source File and see if it is external module and has export assigned symbol
                var externalModule = getContainingExternalModule(node);
                var exportAssignmentSymbol;
                var resolvedExportSymbol;
                if (externalModule) {
                    // This is export assigned symbol node
                    var externalModuleSymbol = getSymbolOfNode(externalModule);
                    exportAssignmentSymbol = getExportAssignmentSymbol(externalModuleSymbol);
                    var symbolOfNode = getSymbolOfNode(node);
                    if (isSymbolUsedInExportAssignment(symbolOfNode)) {
                        return true;
                    }
                    // if symbolOfNode is alias declaration, resolve the symbol declaration and check
                    if (symbolOfNode.flags & ts.SymbolFlags.Alias) {
                        return isSymbolUsedInExportAssignment(resolveAlias(symbolOfNode));
                    }
                }
                // Check if the symbol is used in export assignment
                function isSymbolUsedInExportAssignment(symbol) {
                    if (exportAssignmentSymbol === symbol) {
                        return true;
                    }
                    if (exportAssignmentSymbol && !!(exportAssignmentSymbol.flags & ts.SymbolFlags.Alias)) {
                        // if export assigned symbol is alias declaration, resolve the alias
                        resolvedExportSymbol = resolvedExportSymbol || resolveAlias(exportAssignmentSymbol);
                        if (resolvedExportSymbol === symbol) {
                            return true;
                        }
                        // Container of resolvedExportSymbol is visible
                        return ts.forEach(resolvedExportSymbol.declarations, function (current) {
                            while (current) {
                                if (current === node) {
                                    return true;
                                }
                                current = current.parent;
                            }
                        });
                    }
                }
            }
            function determineIfDeclarationIsVisible() {
                switch (node.kind) {
                    case ts.SyntaxKind.BindingElement:
                        return isDeclarationVisible(node.parent.parent);
                    case ts.SyntaxKind.VariableDeclaration:
                        if (ts.isBindingPattern(node.name) &&
                            !node.name.elements.length) {
                            // If the binding pattern is empty, this variable declaration is not visible
                            return false;
                        }
                    // Otherwise fall through
                    case ts.SyntaxKind.ModuleDeclaration:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.TypeAliasDeclaration:
                    case ts.SyntaxKind.BrandTypeDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                        var parent_2 = getDeclarationContainer(node);
                        // If the node is not exported or it is not ambient module element (except import declaration)
                        if (!(ts.getCombinedNodeFlags(node) & ts.NodeFlags.Export) &&
                            !(node.kind !== ts.SyntaxKind.ImportEqualsDeclaration && parent_2.kind !== ts.SyntaxKind.SourceFile && ts.isInAmbientContext(parent_2))) {
                            return isGlobalSourceFile(parent_2);
                        }
                        // Exported members/ambient module elements (exception import declaration) are visible if parent is visible
                        return isDeclarationVisible(parent_2);
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.PropertySignature:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                        if (node.flags & (ts.NodeFlags.Private | ts.NodeFlags.Protected)) {
                            // Private/protected properties/methods are not visible
                            return false;
                        }
                    // Public properties/methods are visible if its parents are visible, so let it fall into next case statement
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.ConstructSignature:
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.IndexSignature:
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.ModuleBlock:
                    case ts.SyntaxKind.FunctionType:
                    case ts.SyntaxKind.ConstructorType:
                    case ts.SyntaxKind.TypeLiteral:
                    case ts.SyntaxKind.TypeReference:
                    case ts.SyntaxKind.ArrayType:
                    case ts.SyntaxKind.TupleType:
                    case ts.SyntaxKind.UnionType:
                    case ts.SyntaxKind.IntersectionType:
                    case ts.SyntaxKind.ParenthesizedType:
                        return isDeclarationVisible(node.parent);
                    // Default binding, import specifier and namespace import is visible
                    // only on demand so by default it is not visible
                    case ts.SyntaxKind.ImportClause:
                    case ts.SyntaxKind.NamespaceImport:
                    case ts.SyntaxKind.ImportSpecifier:
                        return false;
                    // Type parameters are always visible
                    case ts.SyntaxKind.TypeParameter:
                    // Source file is always visible
                    case ts.SyntaxKind.SourceFile:
                        return true;
                    // Export assignements do not create name bindings outside the module
                    case ts.SyntaxKind.ExportAssignment:
                        return false;
                    default:
                        ts.Debug.fail("isDeclarationVisible unknown: SyntaxKind: " + node.kind);
                }
            }
            if (node) {
                var links = getNodeLinks(node);
                if (links.isVisible === undefined) {
                    links.isVisible = !!determineIfDeclarationIsVisible();
                }
                return links.isVisible;
            }
        }
        function collectLinkedAliases(node) {
            var exportSymbol;
            if (node.parent && node.parent.kind === ts.SyntaxKind.ExportAssignment) {
                exportSymbol = resolveName(node.parent, node.text, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias, ts.Diagnostics.Cannot_find_name_0, node);
            }
            else if (node.parent.kind === ts.SyntaxKind.ExportSpecifier) {
                var exportSpecifier = node.parent;
                exportSymbol = exportSpecifier.parent.parent.moduleSpecifier ?
                    getExternalModuleMember(exportSpecifier.parent.parent, exportSpecifier) :
                    resolveEntityName(exportSpecifier.propertyName || exportSpecifier.name, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias);
            }
            var result = [];
            if (exportSymbol) {
                buildVisibleNodeList(exportSymbol.declarations);
            }
            return result;
            function buildVisibleNodeList(declarations) {
                ts.forEach(declarations, function (declaration) {
                    getNodeLinks(declaration).isVisible = true;
                    var resultNode = getAnyImportSyntax(declaration) || declaration;
                    if (!ts.contains(result, resultNode)) {
                        result.push(resultNode);
                    }
                    if (ts.isInternalModuleImportEqualsDeclaration(declaration)) {
                        // Add the referenced top container visible
                        var internalModuleReference = declaration.moduleReference;
                        var firstIdentifier = getFirstIdentifier(internalModuleReference);
                        var importSymbol = resolveName(declaration, firstIdentifier.text, ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace, ts.Diagnostics.Cannot_find_name_0, firstIdentifier);
                        buildVisibleNodeList(importSymbol.declarations);
                    }
                });
            }
        }
        /**
         * Push an entry on the type resolution stack. If an entry with the given target and the given property name
         * is already on the stack, and no entries in between already have a type, then a circularity has occurred.
         * In this case, the result values of the existing entry and all entries pushed after it are changed to false,
         * and the value false is returned. Otherwise, the new entry is just pushed onto the stack, and true is returned.
         * In order to see if the same query has already been done before, the target object and the propertyName both
         * must match the one passed in.
         *
         * @param target The symbol, type, or signature whose type is being queried
         * @param propertyName The property name that should be used to query the target for its type
         */
        function pushTypeResolution(target, propertyName) {
            var resolutionCycleStartIndex = findResolutionCycleStartIndex(target, propertyName);
            if (resolutionCycleStartIndex >= 0) {
                // A cycle was found
                var length_2 = resolutionTargets.length;
                for (var i = resolutionCycleStartIndex; i < length_2; i++) {
                    resolutionResults[i] = false;
                }
                return false;
            }
            resolutionTargets.push(target);
            resolutionResults.push(true);
            resolutionPropertyNames.push(propertyName);
            return true;
        }
        function findResolutionCycleStartIndex(target, propertyName) {
            for (var i = resolutionTargets.length - 1; i >= 0; i--) {
                if (hasType(resolutionTargets[i], resolutionPropertyNames[i])) {
                    return -1;
                }
                if (resolutionTargets[i] === target && resolutionPropertyNames[i] === propertyName) {
                    return i;
                }
            }
            return -1;
        }
        function hasType(target, propertyName) {
            if (propertyName === TypeSystemPropertyName.Type) {
                return getSymbolLinks(target).type;
            }
            if (propertyName === TypeSystemPropertyName.DeclaredType) {
                return getSymbolLinks(target).declaredType;
            }
            if (propertyName === TypeSystemPropertyName.ResolvedBaseConstructorType) {
                ts.Debug.assert(!!(target.flags & ts.TypeFlags.Class));
                return target.resolvedBaseConstructorType;
            }
            if (propertyName === TypeSystemPropertyName.ResolvedReturnType) {
                return target.resolvedReturnType;
            }
            ts.Debug.fail("Unhandled TypeSystemPropertyName " + propertyName);
        }
        // Pop an entry from the type resolution stack and return its associated result value. The result value will
        // be true if no circularities were detected, or false if a circularity was found.
        function popTypeResolution() {
            resolutionTargets.pop();
            resolutionPropertyNames.pop();
            return resolutionResults.pop();
        }
        function getDeclarationContainer(node) {
            node = ts.getRootDeclaration(node);
            // Parent chain:
            // VaribleDeclaration -> VariableDeclarationList -> VariableStatement -> 'Declaration Container'
            return node.kind === ts.SyntaxKind.VariableDeclaration ? node.parent.parent.parent : node.parent;
        }
        // [ConcreteTypeScript]
        function getParentTypeOfPrototypeProperty(prototype) {
            if (prototype.parent.declarations && ts.isFunctionLike(prototype.parent.declarations[0])) {
                var decl = prototype.parent.declarations[0];
                if (decl.parameters.thisParam) {
                    return getDeclaredTypeOfSymbol(decl.parameters.thisParam.type.symbol);
                }
            }
            else {
                return getDeclaredTypeOfSymbol(prototype.parent);
            }
        }
        // [ConcreteTypeScript]
        function getIntermediateFlowTypeOfPrototype(prototype, type) {
            return createIntermediateFlowType(prototype.valueDeclaration, /*TODO */ emptyObjectType, createConcreteType(type), prototype.valueDeclaration);
        }
        function getTypeOfPrototypeProperty(prototype, parentType) {
            // TypeScript 1.0 spec (April 2014): 8.4
            // Every class automatically contains a static property member named 'prototype',
            // the type of which is an instantiation of the class type with type Any supplied as a type argument for each type parameter.
            // It is an error to explicitly declare a static property member with the name 'prototype'.
            // [ConcreteTypeScript] We make the prototype property its own locus type
            var links = getSymbolLinks(prototype);
            if (!links.type) {
                var classType = parentType || getParentTypeOfPrototypeProperty(prototype);
                if (classType) {
                    classType.prototypeDeclareType = links.type;
                }
                prototype.classType = classType;
                return createConcreteType(getDeclaredTypeOfSymbol(prototype));
            }
            return links.type;
            // [/ConcreteTypeScript]
        }
        // Return the type of the given property in the given type, or undefined if no such property exists
        function getTypeOfPropertyOfType(type, name) {
            var prop = getPropertyOfType(type, name);
            return prop ? getTypeOfSymbol(prop) : undefined;
        }
        function isTypeAny(type) {
            return type && (type.flags & ts.TypeFlags.Any) !== 0;
        }
        // Return the inferred type for a binding element
        function getTypeForBindingElement(declaration) {
            var pattern = declaration.parent;
            var parentType = getTypeForVariableLikeDeclaration(pattern.parent);
            // If parent has the unknown (error) type, then so does this binding element
            if (parentType === unknownType) {
                return unknownType;
            }
            // If no type was specified or inferred for parent, or if the specified or inferred type is any,
            // infer from the initializer of the binding element if one is present. Otherwise, go with the
            // undefined or any type of the parent.
            if (!parentType || isTypeAny(parentType)) {
                if (declaration.initializer) {
                    // [ConcreteTypeScript] 
                    var type_1 = checkExpressionCached(declaration.initializer);
                    // Call getBindingType to not allow IntermediateFlowType's or weak concrete types to propagate.                }
                    return getBindingType(type_1);
                }
            }
            var type;
            if (pattern.kind === ts.SyntaxKind.ObjectBindingPattern) {
                // Use explicitly specified property name ({ p: xxx } form), or otherwise the implied name ({ p } form)
                var name_2 = declaration.propertyName || declaration.name;
                // Use type of the specified property, or otherwise, for a numeric name, the type of the numeric index signature,
                // or otherwise the type of the string index signature.
                type = getTypeOfPropertyOfType(parentType, name_2.text) ||
                    isNumericLiteralName(name_2.text) && getIndexTypeOfType(parentType, ts.IndexKind.Number) ||
                    getIndexTypeOfType(parentType, ts.IndexKind.String);
                if (!type) {
                    error(name_2, ts.Diagnostics.Type_0_has_no_property_1_and_no_string_index_signature, typeToString(parentType), ts.declarationNameToString(name_2));
                    return unknownType;
                }
            }
            else {
                // This elementType will be used if the specific property corresponding to this index is not
                // present (aka the tuple element property). This call also checks that the parentType is in
                // fact an iterable or array (depending on target language).
                var elementType = checkIteratedTypeOrElementType(parentType, pattern, /*allowStringInput*/ false);
                if (!declaration.dotDotDotToken) {
                    // Use specific property type when parent is a tuple or numeric index type when parent is an array
                    var propName = "" + ts.indexOf(pattern.elements, declaration);
                    type = isTupleLikeType(parentType)
                        ? getTypeOfPropertyOfType(parentType, propName)
                        : elementType;
                    if (!type) {
                        if (isTupleType(parentType)) {
                            error(declaration, ts.Diagnostics.Tuple_type_0_with_length_1_cannot_be_assigned_to_tuple_with_length_2, typeToString(parentType), parentType.elementTypes.length, pattern.elements.length);
                        }
                        else {
                            error(declaration, ts.Diagnostics.Type_0_has_no_property_1, typeToString(parentType), propName);
                        }
                        return unknownType;
                    }
                }
                else {
                    // Rest element has an array type with the same element type as the parent type
                    type = createArrayType(elementType);
                }
            }
            return type;
        }
        // Return the inferred type for a variable, parameter, or property declaration
        function getTypeForVariableLikeDeclaration(declaration) {
            // A variable declared in a for..in statement is always of type any
            if (declaration.parent.parent.kind === ts.SyntaxKind.ForInStatement) {
                return anyType;
            }
            if (declaration.parent.parent.kind === ts.SyntaxKind.ForOfStatement) {
                // checkRightHandSideOfForOf will return undefined if the for-of expression type was
                // missing properties/signatures required to get its iteratedType (like
                // [Symbol.iterator] or next). This may be because we accessed properties from anyType,
                // or it may have led to an error inside getElementTypeOfIterable.
                return checkRightHandSideOfForOf(declaration.parent.parent.expression) || anyType;
            }
            if (ts.isBindingPattern(declaration.parent)) {
                return getTypeForBindingElement(declaration);
            }
            // Use type from type annotation if one is present
            if (declaration.type) {
                return getTypeFromTypeNode(declaration.type);
            }
            if (declaration.kind === ts.SyntaxKind.Parameter) {
                var func = declaration.parent;
                // For a parameter of a set accessor, use the type of the get accessor if one is present
                if (func.kind === ts.SyntaxKind.SetAccessor && !ts.hasDynamicName(func)) {
                    var getter = ts.getDeclarationOfKind(declaration.parent.symbol, ts.SyntaxKind.GetAccessor);
                    if (getter) {
                        return getReturnTypeOfSignature(getSignatureFromDeclaration(getter));
                    }
                }
                // Use contextual parameter type if one is available
                var type = getContextuallyTypedParameterType(declaration);
                if (type) {
                    return type;
                }
            }
            // Use the type of the initializer expression if one is present
            if (declaration.initializer) {
                return getBindingType(checkExpressionCached(declaration.initializer)); // [ConcreteTypeScript] Use binding type
            }
            // If it is a short-hand property assignment, use the type of the identifier
            if (declaration.kind === ts.SyntaxKind.ShorthandPropertyAssignment) {
                return getBindingType(checkIdentifier(declaration.name)); // [ConcreteTypeScript] Use binding type
            }
            // If the declaration specifies a binding pattern, use the type implied by the binding pattern
            if (ts.isBindingPattern(declaration.name)) {
                var bindingPatternType = getTypeFromBindingPattern(declaration.name, /*includePatternInType*/ false);
                return getBindingType(bindingPatternType); // [ConcreteTypeScript] Use binding type
            }
            // No type specified and nothing can be inferred
            return undefined;
        }
        // Return the type implied by a binding pattern element. This is the type of the initializer of the element if
        // one is present. Otherwise, if the element is itself a binding pattern, it is the type implied by the binding
        // pattern. Otherwise, it is the type any.
        function getTypeFromBindingElement(element, includePatternInType) {
            if (element.initializer) {
                return getWidenedType(checkExpressionCached(element.initializer));
            }
            if (ts.isBindingPattern(element.name)) {
                return getTypeFromBindingPattern(element.name, includePatternInType);
            }
            return anyType;
        }
        // Return the type implied by an object binding pattern
        function getTypeFromObjectBindingPattern(pattern, includePatternInType) {
            var members = {};
            ts.forEach(pattern.elements, function (e) {
                var flags = ts.SymbolFlags.Property | ts.SymbolFlags.Transient | (e.initializer ? ts.SymbolFlags.Optional : 0);
                var name = e.propertyName || e.name;
                var symbol = createSymbol(flags, name.text);
                symbol.type = getTypeFromBindingElement(e, includePatternInType);
                symbol.bindingElement = e;
                members[symbol.name] = symbol;
            });
            var result = createAnonymousType(undefined, members, emptyArray, emptyArray, undefined, undefined);
            if (includePatternInType) {
                result.pattern = pattern;
            }
            return result;
        }
        // Return the type implied by an array binding pattern
        function getTypeFromArrayBindingPattern(pattern, includePatternInType) {
            var elements = pattern.elements;
            if (elements.length === 0 || elements[elements.length - 1].dotDotDotToken) {
                return languageVersion >= ts.ScriptTarget.ES6 ? createIterableType(anyType) : anyArrayType;
            }
            // If the pattern has at least one element, and no rest element, then it should imply a tuple type.
            var elementTypes = ts.map(elements, function (e) { return e.kind === ts.SyntaxKind.OmittedExpression ? anyType : getTypeFromBindingElement(e, includePatternInType); });
            if (includePatternInType) {
                var result = createNewTupleType(elementTypes);
                result.pattern = pattern;
                return result;
            }
            return createTupleType(elementTypes);
        }
        // Return the type implied by a binding pattern. This is the type implied purely by the binding pattern itself
        // and without regard to its context (i.e. without regard any type annotation or initializer associated with the
        // declaration in which the binding pattern is contained). For example, the implied type of [x, y] is [any, any]
        // and the implied type of { x, y: z = 1 } is { x: any; y: number; }. The type implied by a binding pattern is
        // used as the contextual type of an initializer associated with the binding pattern. Also, for a destructuring
        // parameter with no type annotation or initializer, the type implied by the binding pattern becomes the type of
        // the parameter.
        function getTypeFromBindingPattern(pattern, includePatternInType) {
            return pattern.kind === ts.SyntaxKind.ObjectBindingPattern
                ? getTypeFromObjectBindingPattern(pattern, includePatternInType)
                : getTypeFromArrayBindingPattern(pattern, includePatternInType);
        }
        // Return the type associated with a variable, parameter, or property declaration. In the simple case this is the type
        // specified in a type annotation or inferred from an initializer. However, in the case of a destructuring declaration it
        // is a bit more involved. For example:
        //
        //   var [x, s = ""] = [1, "one"];
        //
        // Here, the array literal [1, "one"] is contextually typed by the type [any, string], which is the implied type of the
        // binding pattern [x, s = ""]. Because the contextual type is a tuple type, the resulting type of [1, "one"] is the
        // tuple type [number, string]. Thus, the type inferred for 'x' is number and the type inferred for 's' is string.
        function getWidenedTypeForVariableLikeDeclaration(declaration, reportErrors) {
            var type = getTypeForVariableLikeDeclaration(declaration);
            if (type) {
                if (reportErrors) {
                    reportErrorsFromWidening(declaration, type);
                }
                // During a normal type check we'll never get to here with a property assignment (the check of the containing
                // object literal uses a different path). We exclude widening only so that language services and type verification
                // tools see the actual type.
                return declaration.kind !== ts.SyntaxKind.PropertyAssignment ? getWidenedType(type) : type;
            }
            // Rest parameters default to type any[], other parameters default to type any
            type = declaration.dotDotDotToken ? anyArrayType : anyType;
            // Report implicit any errors unless this is a private property within an ambient declaration
            if (reportErrors && compilerOptions.noImplicitAny) {
                var root = ts.getRootDeclaration(declaration);
                if (!isPrivateWithinAmbient(root) && !(root.kind === ts.SyntaxKind.Parameter && isPrivateWithinAmbient(root.parent))) {
                    reportImplicitAnyError(declaration, type);
                }
            }
            return type;
        }
        function getTypeOfVariableOrParameterOrProperty(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                // Handle prototype property
                if (symbol.flags & ts.SymbolFlags.Prototype) {
                    return links.type = getTypeOfPrototypeProperty(symbol);
                }
                // Handle catch clause variables
                var declaration = symbol.valueDeclaration;
                if (!declaration) {
                    return links.type = anyType;
                }
                if (declaration.parent.kind === ts.SyntaxKind.CatchClause) {
                    return links.type = anyType;
                }
                // Handle export default expressions
                if (declaration.kind === ts.SyntaxKind.ExportAssignment) {
                    return links.type = checkExpression(declaration.expression);
                }
                // Handle variable, parameter or property
                if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
                    return unknownType;
                }
                var type = getWidenedTypeForVariableLikeDeclaration(declaration, /*reportErrors*/ true);
                if (!popTypeResolution()) {
                    if (symbol.valueDeclaration.type) {
                        // Variable has type annotation that circularly references the variable itself
                        type = unknownType;
                        error(symbol.valueDeclaration, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_its_own_type_annotation, symbolToString(symbol));
                    }
                    else {
                        // Variable has initializer that circularly references the variable itself
                        type = anyType;
                        if (compilerOptions.noImplicitAny) {
                            error(symbol.valueDeclaration, ts.Diagnostics._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initializer, symbolToString(symbol));
                        }
                    }
                }
                links.type = type;
            }
            return links.type;
        }
        function getAnnotatedAccessorType(accessor) {
            if (accessor) {
                if (accessor.kind === ts.SyntaxKind.GetAccessor) {
                    return accessor.type && getTypeFromTypeNode(accessor.type);
                }
                else {
                    var setterTypeAnnotation = ts.getSetAccessorTypeAnnotationNode(accessor);
                    return setterTypeAnnotation && getTypeFromTypeNode(setterTypeAnnotation);
                }
            }
            return undefined;
        }
        function getTypeOfAccessors(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                if (!pushTypeResolution(symbol, TypeSystemPropertyName.Type)) {
                    return unknownType;
                }
                var getter = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.GetAccessor);
                var setter = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.SetAccessor);
                var type;
                // First try to see if the user specified a return type on the get-accessor.
                var getterReturnType = getAnnotatedAccessorType(getter);
                if (getterReturnType) {
                    type = getterReturnType;
                }
                else {
                    // If the user didn't specify a return type, try to use the set-accessor's parameter type.
                    var setterParameterType = getAnnotatedAccessorType(setter);
                    if (setterParameterType) {
                        type = setterParameterType;
                    }
                    else {
                        // If there are no specified types, try to infer it from the body of the get accessor if it exists.
                        if (getter && getter.body) {
                            type = getReturnTypeFromBody(getter);
                        }
                        else {
                            if (compilerOptions.noImplicitAny) {
                                error(setter, ts.Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_type_annotation, symbolToString(symbol));
                            }
                            type = anyType;
                        }
                    }
                }
                if (!popTypeResolution()) {
                    type = anyType;
                    if (compilerOptions.noImplicitAny) {
                        var getter_1 = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.GetAccessor);
                        error(getter_1, ts.Diagnostics._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions, symbolToString(symbol));
                    }
                }
                links.type = type;
            }
            return links.type;
        }
        function getTypeOfFuncClassEnumModule(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                // A symbol has a concrete type if all of its declarations are cemented.
                links.type = createConcreteType(createObjectType(ts.TypeFlags.Anonymous, symbol), /* Not runtime checkable (weakly concrete): */ false);
            }
            return links.type;
        }
        function getTypeOfEnumMember(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                links.type = getDeclaredTypeOfEnum(getParentOfSymbol(symbol));
            }
            return links.type;
        }
        function getTypeOfAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                var targetSymbol = resolveAlias(symbol);
                // It only makes sense to get the type of a value symbol. If the result of resolving
                // the alias is not a value, then it has no type. To get the type associated with a
                // type symbol, call getDeclaredTypeOfSymbol.
                // This check is important because without it, a call to getTypeOfSymbol could end
                // up recursively calling getTypeOfAlias, causing a stack overflow.
                links.type = targetSymbol.flags & ts.SymbolFlags.Value
                    ? getTypeOfSymbol(targetSymbol)
                    : unknownType;
            }
            return links.type;
        }
        function getTypeOfInstantiatedSymbol(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                links.type = instantiateType(getTypeOfSymbol(links.target), links.mapper);
            }
            return links.type;
        }
        // [ConcreteTypeScript] This is peppered around to get better stack traces.
        function assertOk(t) {
            ts.Debug.assert(t != null);
            return t;
        }
        // [ConcreteTypeScript]
        function isCementedDeclaration(declaration) {
            if (declaration.parent && declaration.parent.kind === ts.SyntaxKind.SourceFile) {
                // Always cement global declarations:
                return true;
            }
            if (declaration.flags & ts.NodeFlags.Export) {
                // Always cement exported declarations:
                return true;
            }
            return false;
        }
        function getTypeOfSymbol(symbol) {
            // [/ConcreteTypeScript] 
            // [ConcreteTypeScript] Sprinkled assertOk
            if (symbol.flags & ts.SymbolFlags.Instantiated) {
                return assertOk(getTypeOfInstantiatedSymbol(symbol));
            }
            if (symbol.flags & (ts.SymbolFlags.Variable | ts.SymbolFlags.Property)) {
                return assertOk(getTypeOfVariableOrParameterOrProperty(symbol));
            }
            if (symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method | ts.SymbolFlags.Class | ts.SymbolFlags.Declare | ts.SymbolFlags.Enum | ts.SymbolFlags.ValueModule)) {
                return assertOk(getTypeOfFuncClassEnumModule(symbol));
            }
            if (symbol.flags & ts.SymbolFlags.EnumMember) {
                return assertOk(getTypeOfEnumMember(symbol));
            }
            if (symbol.flags & ts.SymbolFlags.Accessor) {
                return assertOk(getTypeOfAccessors(symbol));
            }
            if (symbol.flags & ts.SymbolFlags.Alias) {
                return assertOk(getTypeOfAlias(symbol));
            }
            // [ConcreteTypeScript]
            if (symbol.flags & ts.SymbolFlags.Declare) {
                // This seems suspect for now.
                throw new Error("ConcreteTypeScript bail: Cannot use Brand as value. Until this is handled gracefully, failing ungracefully...");
            }
            // [/ConcreteTypeScript]
            return assertOk(unknownType);
        }
        function getTargetType(type) {
            return type.flags & ts.TypeFlags.Reference ? type.target : type;
        }
        function hasBaseType(type, checkBase) {
            // [ConcreteTypeScript]
            if (isPrototypeType(checkBase) && type.symbol.parent === type.symbol) {
                return true;
            }
            return check(type);
            function check(type) {
                var target = getTargetType(type);
                target = unconcrete(target);
                // [ConcreteTypeScript]
                if (target === checkBase) {
                    return true;
                }
                if (!(target.flags & (ts.TypeFlags.Interface | ts.TypeFlags.Declare | ts.TypeFlags.Class))) {
                    return false;
                }
                // [/ConcreteTypeScript]
                for (var _i = 0, _a = getBaseTypes(target); _i < _a.length; _i++) {
                    var baseType = _a[_i];
                    if (check(baseType)) {
                        return true;
                    }
                }
                return false;
            }
        }
        // Appends the type parameters given by a list of declarations to a set of type parameters and returns the resulting set.
        // The function allocates a new array if the input type parameter set is undefined, but otherwise it modifies the set
        // in-place and returns the same array.
        function appendTypeParameters(typeParameters, declarations) {
            for (var _i = 0; _i < declarations.length; _i++) {
                var declaration = declarations[_i];
                var tp = getDeclaredTypeOfTypeParameter(getSymbolOfNode(declaration));
                if (!typeParameters) {
                    typeParameters = [tp];
                }
                else if (!ts.contains(typeParameters, tp)) {
                    typeParameters.push(tp);
                }
            }
            return typeParameters;
        }
        // Appends the outer type parameters of a node to a set of type parameters and returns the resulting set. The function
        // allocates a new array if the input type parameter set is undefined, but otherwise it modifies the set in-place and
        // returns the same array.
        function appendOuterTypeParameters(typeParameters, node) {
            while (true) {
                node = node.parent;
                if (!node) {
                    return typeParameters;
                }
                if (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.ClassExpression ||
                    node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.FunctionExpression ||
                    node.kind === ts.SyntaxKind.MethodDeclaration || node.kind === ts.SyntaxKind.ArrowFunction) {
                    var declarations = node.typeParameters;
                    if (declarations) {
                        return appendTypeParameters(appendOuterTypeParameters(typeParameters, node), declarations);
                    }
                }
            }
        }
        // The outer type parameters are those defined by enclosing generic classes, methods, or functions.
        function getOuterTypeParametersOfClassOrInterface(symbol) {
            var declaration = symbol.flags & ts.SymbolFlags.Class ? symbol.valueDeclaration : ts.getDeclarationOfKind(symbol, ts.SyntaxKind.InterfaceDeclaration);
            return appendOuterTypeParameters(undefined, declaration);
        }
        // The local type parameters are the combined set of type parameters from all declarations of the class,
        // interface, or type alias.
        function getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol) {
            var result;
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var node = _a[_i];
                if (node.kind === ts.SyntaxKind.InterfaceDeclaration || node.kind === ts.SyntaxKind.ClassDeclaration ||
                    node.kind === ts.SyntaxKind.ClassExpression || node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                    var declaration = node;
                    if (declaration.typeParameters) {
                        result = appendTypeParameters(result, declaration.typeParameters);
                    }
                }
            }
            return result;
        }
        // The full set of type parameters for a generic class or interface type consists of its outer type parameters plus
        // its locally declared type parameters.
        function getTypeParametersOfClassOrInterface(symbol) {
            return ts.concatenate(getOuterTypeParametersOfClassOrInterface(symbol), getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol));
        }
        function isConstructorType(type) {
            return type.flags & ts.TypeFlags.ObjectType && getSignaturesOfType(type, ts.SignatureKind.Construct).length > 0;
        }
        function getBaseTypeNodeOfClass(type) {
            return ts.getClassExtendsHeritageClauseElement(type.symbol.valueDeclaration);
        }
        function getConstructorsForTypeArguments(type, typeArgumentNodes) {
            var typeArgCount = typeArgumentNodes ? typeArgumentNodes.length : 0;
            return ts.filter(getSignaturesOfType(type, ts.SignatureKind.Construct), function (sig) { return (sig.typeParameters ? sig.typeParameters.length : 0) === typeArgCount; });
        }
        function getInstantiatedConstructorsForTypeArguments(type, typeArgumentNodes) {
            var signatures = getConstructorsForTypeArguments(type, typeArgumentNodes);
            if (typeArgumentNodes) {
                var typeArguments = ts.map(typeArgumentNodes, getTypeFromTypeNode);
                signatures = ts.map(signatures, function (sig) { return getSignatureInstantiation(sig, typeArguments); });
            }
            return signatures;
        }
        // The base constructor of a class can resolve to
        // undefinedType if the class has no extends clause,
        // unknownType if an error occurred during resolution of the extends expression,
        // nullType if the extends expression is the null value, or
        // an object type with at least one construct signature.
        function getBaseConstructorTypeOfClass(type) {
            if (!type.resolvedBaseConstructorType) {
                var baseTypeNode = getBaseTypeNodeOfClass(type);
                if (!baseTypeNode) {
                    return type.resolvedBaseConstructorType = undefinedType;
                }
                if (!pushTypeResolution(type, TypeSystemPropertyName.ResolvedBaseConstructorType)) {
                    return unknownType;
                }
                var baseConstructorType = checkExpression(baseTypeNode.expression);
                // [ConcreteTypeScript] Lose weak concreteness as it does not factor into type decisions.
                baseConstructorType = unconcrete(baseConstructorType);
                // [/ConcreteTypeScript]
                if (baseConstructorType.flags & ts.TypeFlags.ObjectType) {
                    // Resolving the members of a class requires us to resolve the base class of that class.
                    // We force resolution here such that we catch circularities now.
                    resolveStructuredTypeMembers(baseConstructorType);
                }
                if (!popTypeResolution()) {
                    error(type.symbol.valueDeclaration, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, symbolToString(type.symbol));
                    return type.resolvedBaseConstructorType = unknownType;
                }
                if (baseConstructorType !== unknownType && baseConstructorType !== nullType && !isConstructorType(baseConstructorType)) {
                    error(baseTypeNode.expression, ts.Diagnostics.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
                    return type.resolvedBaseConstructorType = unknownType;
                }
                type.resolvedBaseConstructorType = baseConstructorType;
            }
            return type.resolvedBaseConstructorType;
        }
        function getBaseTypes(type) {
            // [ConcreteTypeScript]
            type = unconcrete(type);
            if (markAsRecursiveFlowAnalysis(type)) {
                return emptyArray;
            }
            // [/ConcreteTypeScript]
            if (!type.resolvedBaseTypes) {
                // [ConcreteTypeScript]
                if (type.flags & ts.TypeFlags.Declare) {
                    resolveBaseTypesOfDeclare(type);
                }
                else if (!type.symbol) {
                    type.resolvedBaseTypes = [];
                }
                else if (type.symbol.flags & ts.SymbolFlags.Class) {
                    resolveBaseTypesOfClass(type);
                }
                else if (type.symbol.flags & ts.SymbolFlags.Interface) {
                    resolveBaseTypesOfInterface(type);
                }
                else {
                    ts.Debug.fail("type must be class or interface");
                }
            }
            return type.resolvedBaseTypes;
        }
        // [ConcreteTypeScript]
        function resolveBaseTypesOfDeclare(type) {
            type.resolvedBaseTypes = [];
            var brandInterfaceDeclaration = ts.getSymbolDecl(type.symbol, ts.SyntaxKind.DeclareTypeDeclaration);
            var declareTypeDeclaration = ts.getSymbolDecl(type.symbol, ts.SyntaxKind.DeclareType);
            var declaration = brandInterfaceDeclaration || declareTypeDeclaration;
            if (declareTypeDeclaration && declareTypeDeclaration.startingType) {
                var baseTypes = [declareTypeDeclaration.startingType];
            }
            else {
                var baseTypes = [];
            }
            baseTypes = baseTypes.concat(ts.getDeclareTypeBaseTypeNodes(declaration) || []);
            //let classType = <InterfaceType>getDeclaredTypeOfSymbol(type.symbol.parent);
            for (var _i = 0; _i < baseTypes.length; _i++) {
                var node = baseTypes[_i];
                var baseType = getTypeFromTypeNode(node);
                if (baseType !== unknownType) {
                    if (getTargetType(baseType).flags & (ts.TypeFlags.Class | ts.TypeFlags.Declare | ts.TypeFlags.Interface)) {
                        if (type !== baseType && !hasBaseType(baseType, type)) {
                            type.resolvedBaseTypes.push(createConcreteTypeIfCheckable(baseType));
                        }
                        else {
                            error(declaration, ts.Diagnostics.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.WriteArrayAsGenericType));
                        }
                    }
                    else {
                        // We allow anything as a base type, don't check if it has a base type in this case: 
                        type.resolvedBaseTypes.push(createConcreteTypeIfCheckable(baseType));
                    }
                }
            }
            var flowData = getFlowDataForType(type);
            if (flowData) {
                var flowTypes = flowData.flowTypes;
                var minimalFlowTypes = getMinimalTypeList(flowTypes.map(function (ft) { return ft.type; }));
                type.resolvedBaseTypes = type.resolvedBaseTypes.concat(minimalFlowTypes);
                type.resolvedBaseTypes = type.resolvedBaseTypes.filter(function (s) { return !isTypeIdenticalTo(unconcrete(s), type); });
            }
        }
        // [/ConcreteTypeScript]
        function resolveBaseTypesOfClass(type) {
            // TODO CONCRETETYPESCRIPT HOOK DECEMBER 10
            type.resolvedBaseTypes = emptyArray;
            var baseContructorType = getBaseConstructorTypeOfClass(type);
            if (!(baseContructorType.flags & ts.TypeFlags.ObjectType)) {
                return;
            }
            var baseTypeNode = getBaseTypeNodeOfClass(type);
            var baseType;
            if (baseContructorType.symbol && baseContructorType.symbol.flags & ts.SymbolFlags.Class) {
                // When base constructor type is a class we know that the constructors all have the same type parameters as the
                // class and all return the instance type of the class. There is no need for further checks and we can apply the
                // type arguments in the same manner as a type reference to get the same error reporting experience.
                baseType = getTypeFromClassOrInterfaceReference(baseTypeNode, baseContructorType.symbol);
            }
            else {
                // The class derives from a "class-like" constructor function, check that we have at least one construct signature
                // with a matching number of type parameters and use the return type of the first instantiated signature. Elsewhere
                // we check that all instantiated signatures return the same type.
                var constructors = getInstantiatedConstructorsForTypeArguments(baseContructorType, baseTypeNode.typeArguments);
                if (!constructors.length) {
                    error(baseTypeNode.expression, ts.Diagnostics.No_base_constructor_has_the_specified_number_of_type_arguments);
                    return;
                }
                baseType = getReturnTypeOfSignature(constructors[0]);
            }
            if (baseType === unknownType) {
                return;
            }
            if (!(getTargetType(baseType).flags & (ts.TypeFlags.Class | ts.TypeFlags.Interface))) {
                error(baseTypeNode.expression, ts.Diagnostics.Base_constructor_return_type_0_is_not_a_class_or_interface_type, typeToString(baseType));
                return;
            }
            if (type === baseType || hasBaseType(baseType, type)) {
                error(type.symbol.valueDeclaration, ts.Diagnostics.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.WriteArrayAsGenericType));
                return;
            }
            type.resolvedBaseTypes = [baseType];
        }
        function resolveBaseTypesOfInterface(type) {
            type.resolvedBaseTypes = [];
            for (var _i = 0, _a = type.symbol.declarations; _i < _a.length; _i++) {
                var declaration = _a[_i];
                if (declaration.kind === ts.SyntaxKind.InterfaceDeclaration && ts.getInterfaceBaseTypeNodes(declaration)) {
                    for (var _b = 0, _c = ts.getInterfaceBaseTypeNodes(declaration); _b < _c.length; _b++) {
                        var node = _c[_b];
                        var baseType = getTypeFromTypeNode(node);
                        if (baseType !== unknownType) {
                            if (getTargetType(baseType).flags & (ts.TypeFlags.Class | ts.TypeFlags.Declare | ts.TypeFlags.Interface)) {
                                if (type !== baseType && !hasBaseType(baseType, type)) {
                                    type.resolvedBaseTypes.push(baseType);
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.WriteArrayAsGenericType));
                                }
                            }
                            else {
                                error(node, ts.Diagnostics.An_interface_may_only_extend_a_class_or_another_interface);
                            }
                        }
                    }
                }
            }
        }
        function getDeclaredTypeOfClassOrInterface(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var kind = symbol.flags & ts.SymbolFlags.Class ? ts.TypeFlags.Class : ts.TypeFlags.Interface;
                var type = links.declaredType = createObjectType(kind, symbol);
                var outerTypeParameters = getOuterTypeParametersOfClassOrInterface(symbol);
                var localTypeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
                if (outerTypeParameters || localTypeParameters) {
                    type.flags |= ts.TypeFlags.Reference;
                    type.typeParameters = ts.concatenate(outerTypeParameters, localTypeParameters);
                    type.outerTypeParameters = outerTypeParameters;
                    type.localTypeParameters = localTypeParameters;
                    type.instantiations = {};
                    type.instantiations[getTypeListId(type.typeParameters)] = type;
                    type.target = type;
                    type.typeArguments = type.typeParameters;
                }
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfTypeAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                // Note that we use the links object as the target here because the symbol object is used as the unique
                // identity for resolution of the 'type' property in SymbolLinks.
                if (!pushTypeResolution(symbol, TypeSystemPropertyName.DeclaredType)) {
                    return unknownType;
                }
                var declaration = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.TypeAliasDeclaration);
                var type = getTypeFromTypeNode(declaration.type);
                if (popTypeResolution()) {
                    links.typeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
                    if (links.typeParameters) {
                        // Initialize the instantiation cache for generic type aliases. The declared type corresponds to
                        // an instantiation of the type alias with the type parameters supplied as type arguments.
                        links.instantiations = {};
                        links.instantiations[getTypeListId(links.typeParameters)] = type;
                    }
                }
                else {
                    type = unknownType;
                    error(declaration.name, ts.Diagnostics.Type_alias_0_circularly_references_itself, symbolToString(symbol));
                }
                links.declaredType = type;
            }
            return links.declaredType;
        }
        //[ConcreteTypeScript]
        function getDeclaredTypeOfDeclareTypeSymbol(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                // TODO set the declaredProperties somewhere else
                /* On first occurrence */
                var declareTypeDecl = ts.getSymbolDeclareTypeDecl(symbol);
                ts.Debug.assert(!!declareTypeDecl, "Not a BrandTypeDeclaration!");
                links.declaredType = createObjectType(ts.TypeFlags.Declare, symbol);
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfEnum(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var type = createType(ts.TypeFlags.Enum);
                type.symbol = symbol;
                links.declaredType = type;
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfTypeParameter(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var type = createType(ts.TypeFlags.TypeParameter);
                type.symbol = symbol;
                if (!ts.getDeclarationOfKind(symbol, ts.SyntaxKind.TypeParameter).constraint) {
                    type.constraint = noConstraintType;
                }
                links.declaredType = type;
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                links.declaredType = getDeclaredTypeOfSymbol(resolveAlias(symbol));
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfSymbol(symbol) {
            ts.Debug.assert((symbol.flags & ts.SymbolFlags.Instantiated) === 0);
            // [ConcreteTypeScript]
            // This is required to be first because symbols can be marked as 'Class'
            // but should resolve to brands when used as a type.
            if (symbol.flags & ts.SymbolFlags.Declare) {
                return getDeclaredTypeOfDeclareTypeSymbol(symbol);
            }
            if (symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) {
                return getDeclaredTypeOfClassOrInterface(symbol);
            }
            if (symbol.flags & ts.SymbolFlags.TypeAlias) {
                return getDeclaredTypeOfTypeAlias(symbol);
            }
            if (symbol.flags & ts.SymbolFlags.Enum) {
                return getDeclaredTypeOfEnum(symbol);
            }
            if (symbol.flags & ts.SymbolFlags.TypeParameter) {
                return getDeclaredTypeOfTypeParameter(symbol);
            }
            if (symbol.flags & ts.SymbolFlags.Alias) {
                return getDeclaredTypeOfAlias(symbol);
            }
            return unknownType;
        }
        function createSymbolTable(symbols) {
            var result = {};
            for (var _i = 0; _i < symbols.length; _i++) {
                var symbol = symbols[_i];
                result[symbol.name] = symbol;
            }
            return result;
        }
        function createInstantiatedSymbolTable(symbols, mapper) {
            var result = {};
            for (var _i = 0; _i < symbols.length; _i++) {
                var symbol = symbols[_i];
                result[symbol.name] = instantiateSymbol(symbol, mapper);
            }
            return result;
        }
        function addInheritedMembers(symbols, baseSymbols) {
            for (var _i = 0; _i < baseSymbols.length; _i++) {
                var s = baseSymbols[_i];
                if (!ts.hasProperty(symbols, s.name)) {
                    symbols[s.name] = s;
                }
            }
        }
        function addInheritedSignatures(signatures, baseSignatures) {
            if (baseSignatures) {
                for (var _i = 0; _i < baseSignatures.length; _i++) {
                    var signature = baseSignatures[_i];
                    signatures.push(signature);
                }
            }
        }
        function resolveDeclaredMembers(type) {
            if (!type.declaredProperties) {
                var symbol = type.symbol;
                type.declaredProperties = getNamedMembers(symbol.members);
                type.declaredCallSignatures = getSignaturesOfSymbol(symbol.members["__call"]);
                type.declaredConstructSignatures = getSignaturesOfSymbol(symbol.members["__new"]);
                type.declaredStringIndexType = getIndexTypeOfSymbol(symbol, ts.IndexKind.String);
                type.declaredNumberIndexType = getIndexTypeOfSymbol(symbol, ts.IndexKind.Number);
            }
            return type;
        }
        // [ConcreteTypeScript] 
        function flagPrint(v, o, d) {
            console.log('start', d);
            Object.keys(o).forEach(function (s) {
                if (v.flags & o[s]) {
                    console.log(s);
                }
            });
            console.log('end', d);
        }
        // [ConcreteTypeScript] 
        // We want the prototype object, not the prototype type.
        function getPrototypeSymbolOfType(type) {
            type = unconcrete(type);
            if (!type.symbol) {
                return null;
            }
            var funcDecl = getFunctionDeclarationForDeclareType(type);
            if (funcDecl && funcDecl.symbol && funcDecl.symbol.exports) {
                var symbol = getExportsOfSymbol(funcDecl.symbol)["prototype"];
                if (!symbol && funcDecl.symbol.valueDeclaration) {
                    var localSymbol = funcDecl.symbol.valueDeclaration.localSymbol;
                    if (localSymbol) {
                        symbol = getExportsOfSymbol(localSymbol)["prototype"];
                    }
                }
                ts.Debug.assert(ts.isFunctionLike(funcDecl));
                return symbol || funcDecl.prototypeSymbol;
            }
            return null;
        }
        function getPrototypeSymbolTypeOfType(type) {
            var stripped = unconcrete(type);
            if (stripped.symbol && stripped.symbol.exports) {
                var prototype = ts.getProperty(stripped.symbol.exports, "prototype");
                if (!prototype) {
                    return null;
                }
                ts.Debug.assert(!!(prototype.flags & ts.SymbolFlags.Prototype));
                return prototype;
            }
            return null;
        }
        // [ConcreteTypeScript] Handles TypeFlags.Declare too
        function resolveClassOrInterfaceMembers(type) {
            if (markAsRecursiveFlowAnalysis(type)) {
                return undefined;
            }
            var target = resolveDeclaredMembers(type);
            var members = target.symbol.members;
            var callSignatures = target.declaredCallSignatures;
            var constructSignatures = target.declaredConstructSignatures;
            var stringIndexType = target.declaredStringIndexType;
            var numberIndexType = target.declaredNumberIndexType;
            var baseTypes = getBaseTypes(target);
            if (baseTypes.length) {
                members = createSymbolTable(target.declaredProperties);
                for (var _i = 0; _i < baseTypes.length; _i++) {
                    var baseType = baseTypes[_i];
                    // [ConcreteTypeScript]
                    baseType = unconcrete(baseType);
                    // [/ConcreteTypeScript]
                    addInheritedMembers(members, getPropertiesOfObjectType(baseType));
                    callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(baseType, ts.SignatureKind.Call));
                    constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(baseType, ts.SignatureKind.Construct));
                    stringIndexType = stringIndexType || getIndexTypeOfType(baseType, ts.IndexKind.String);
                    numberIndexType = numberIndexType || getIndexTypeOfType(baseType, ts.IndexKind.Number);
                }
            }
            // [ConcreteTypeScript]
            if (type.symbol.flags & ts.SymbolFlags.Prototype) {
                var relatedType = type.symbol.classType;
                relatedType = unconcrete(relatedType);
                if (relatedType.flags & ts.TypeFlags.Class) {
                    addInheritedMembers(members, getPropertiesOfObjectType(relatedType).filter(function (s) { return !!(s.flags & ts.SymbolFlags.Method); }));
                }
            }
            // [/ConcreteTypeScript]
            // [ConcreteTypeScript]
            // TODO un-resolve classes that were 'resolved' during recursive computation
            var flowData = getFlowDataForType(type);
            if (type.flags & ts.TypeFlags.Declare) {
                ts.Debug.assert(!!flowData);
            }
            if (flowData) {
                if (baseTypes.length === 0) {
                    members = createSymbolTable([]);
                }
                for (var _a = 0, _b = Object.keys(flowData.memberSet); _a < _b.length; _a++) {
                    var key = _b[_a];
                    var flowTypes = ts.getProperty(flowData.memberSet, key).flowTypes;
                    var symbol = createSymbol(ts.SymbolFlags.Property, key);
                    symbol.declarations = [ts.createSynthesizedNode(ts.SyntaxKind.BrandPropertyDeclaration)];
                    var typesToUnion = flowTypes.map(function (_a) {
                        var type = _a.type;
                        return type;
                    });
                    getSymbolLinks(symbol).type = getUnionType(typesToUnion);
                    if (ts.getProperty(members, key)) {
                    }
                    members[key] = symbol;
                }
            }
            // [/ConcreteTypeScript]
            setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveIntermediateFlowType(type) {
            // The members and properties collections are empty for intermediate types. To get all properties of a union
            // type use getPropertiesOfType (only the language service uses this).
            var callSignatures = emptyArray;
            var constructSignatures = emptyArray;
            var stringIndexType = undefined;
            var numberIndexType = undefined;
            for (var _i = 0, _a = type.flowData.flowTypes.map(function (_a) {
                var type = _a.type;
                return type;
            }); _i < _a.length; _i++) {
                var t = _a[_i];
                callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(t, ts.SignatureKind.Call));
                constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(t, ts.SignatureKind.Construct));
                stringIndexType = intersectTypes(stringIndexType, getIndexTypeOfType(t, ts.IndexKind.String));
                numberIndexType = intersectTypes(numberIndexType, getIndexTypeOfType(t, ts.IndexKind.Number));
            }
            setObjectTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveTypeReferenceMembers(type) {
            var target = resolveDeclaredMembers(type.target);
            var mapper = createTypeMapper(target.typeParameters, type.typeArguments);
            var members = createInstantiatedSymbolTable(target.declaredProperties, mapper);
            var callSignatures = instantiateList(target.declaredCallSignatures, mapper, instantiateSignature);
            var constructSignatures = instantiateList(target.declaredConstructSignatures, mapper, instantiateSignature);
            var stringIndexType = target.declaredStringIndexType ? instantiateType(target.declaredStringIndexType, mapper) : undefined;
            var numberIndexType = target.declaredNumberIndexType ? instantiateType(target.declaredNumberIndexType, mapper) : undefined;
            ts.forEach(getBaseTypes(target), function (baseType) {
                // [ConcreteTypeScript] 
                var instantiatedBaseType = unconcrete(instantiateType(baseType, mapper));
                // [/ConcreteTypeScript] 
                addInheritedMembers(members, getPropertiesOfObjectType(instantiatedBaseType));
                callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(instantiatedBaseType, ts.SignatureKind.Call));
                constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(instantiatedBaseType, ts.SignatureKind.Construct));
                stringIndexType = stringIndexType || getIndexTypeOfType(instantiatedBaseType, ts.IndexKind.String);
                numberIndexType = numberIndexType || getIndexTypeOfType(instantiatedBaseType, ts.IndexKind.Number);
            });
            setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function createSignature(declaration, typeParameters, parameters, resolvedReturnType, typePredicate, minArgumentCount, hasRestParameter, hasStringLiterals) {
            var sig = new Signature(checker);
            sig.declaration = declaration;
            sig.typeParameters = typeParameters;
            sig.parameters = parameters;
            sig.resolvedReturnType = resolvedReturnType;
            sig.typePredicate = typePredicate;
            sig.minArgumentCount = minArgumentCount;
            sig.hasRestParameter = hasRestParameter;
            sig.hasStringLiterals = hasStringLiterals;
            return sig;
        }
        function cloneSignature(sig) {
            return createSignature(sig.declaration, sig.typeParameters, sig.parameters, sig.resolvedReturnType, sig.typePredicate, sig.minArgumentCount, sig.hasRestParameter, sig.hasStringLiterals);
        }
        function getDefaultConstructSignatures(classType) {
            if (!getBaseTypes(classType).length) {
                // TODO Regression in equality of template parameters. Investigate this:
                return [createSignature(undefined, classType.localTypeParameters, emptyArray, createConcreteType(classType) /* [ConcreteTypeScript] */, undefined, 0, false, false)];
            }
            var baseConstructorType = getBaseConstructorTypeOfClass(classType);
            var baseSignatures = getSignaturesOfType(baseConstructorType, ts.SignatureKind.Construct);
            var baseTypeNode = getBaseTypeNodeOfClass(classType);
            var typeArguments = ts.map(baseTypeNode.typeArguments, getTypeFromTypeNode);
            var typeArgCount = typeArguments ? typeArguments.length : 0;
            var result = [];
            for (var _i = 0; _i < baseSignatures.length; _i++) {
                var baseSig = baseSignatures[_i];
                var typeParamCount = baseSig.typeParameters ? baseSig.typeParameters.length : 0;
                if (typeParamCount === typeArgCount) {
                    var sig = typeParamCount ? getSignatureInstantiation(baseSig, typeArguments) : cloneSignature(baseSig);
                    sig.typeParameters = classType.localTypeParameters;
                    sig.resolvedReturnType = classType;
                    result.push(sig);
                }
            }
            return result;
        }
        function createTupleTypeMemberSymbols(memberTypes) {
            var members = {};
            for (var i = 0; i < memberTypes.length; i++) {
                var symbol = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient, "" + i);
                symbol.type = memberTypes[i];
                members[i] = symbol;
            }
            return members;
        }
        function resolveTupleTypeMembers(type) {
            var arrayType = resolveStructuredTypeMembers(createArrayType(getUnionType(type.elementTypes, /*noSubtypeReduction*/ true)));
            var members = createTupleTypeMemberSymbols(type.elementTypes);
            addInheritedMembers(members, arrayType.properties);
            setObjectTypeMembers(type, members, arrayType.callSignatures, arrayType.constructSignatures, arrayType.stringIndexType, arrayType.numberIndexType);
        }
        function findMatchingSignature(signatureList, signature, partialMatch, ignoreReturnTypes) {
            for (var _i = 0; _i < signatureList.length; _i++) {
                var s = signatureList[_i];
                if (compareSignatures(s, signature, partialMatch, ignoreReturnTypes, compareTypes)) {
                    return s;
                }
            }
        }
        function findMatchingSignatures(signatureLists, signature, listIndex) {
            if (signature.typeParameters) {
                // We require an exact match for generic signatures, so we only return signatures from the first
                // signature list and only if they have exact matches in the other signature lists.
                if (listIndex > 0) {
                    return undefined;
                }
                for (var i = 1; i < signatureLists.length; i++) {
                    if (!findMatchingSignature(signatureLists[i], signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ false)) {
                        return undefined;
                    }
                }
                return [signature];
            }
            var result = undefined;
            for (var i = 0; i < signatureLists.length; i++) {
                // Allow matching non-generic signatures to have excess parameters and different return types
                var match = i === listIndex ? signature : findMatchingSignature(signatureLists[i], signature, /*partialMatch*/ true, /*ignoreReturnTypes*/ true);
                if (!match) {
                    return undefined;
                }
                if (!ts.contains(result, match)) {
                    (result || (result = [])).push(match);
                }
            }
            return result;
        }
        // The signatures of a union type are those signatures that are present in each of the constituent types.
        // Generic signatures must match exactly, but non-generic signatures are allowed to have extra optional
        // parameters and may differ in return types. When signatures differ in return types, the resulting return
        // type is the union of the constituent return types.
        function getUnionSignatures(types, kind) {
            var signatureLists = ts.map(types, function (t) { return getSignaturesOfType(t, kind); });
            var result = undefined;
            for (var i = 0; i < signatureLists.length; i++) {
                for (var _i = 0, _a = signatureLists[i]; _i < _a.length; _i++) {
                    var signature = _a[_i];
                    // Only process signatures with parameter lists that aren't already in the result list
                    if (!result || !findMatchingSignature(result, signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ true)) {
                        var unionSignatures = findMatchingSignatures(signatureLists, signature, i);
                        if (unionSignatures) {
                            var s = signature;
                            // Union the result types when more than one signature matches
                            if (unionSignatures.length > 1) {
                                s = cloneSignature(signature);
                                // Clear resolved return type we possibly got from cloneSignature
                                s.resolvedReturnType = undefined;
                                s.unionSignatures = unionSignatures;
                            }
                            (result || (result = [])).push(s);
                        }
                    }
                }
            }
            return result || emptyArray;
        }
        function getUnionIndexType(types, kind) {
            var indexTypes = [];
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                var indexType = getIndexTypeOfType(type, kind);
                if (!indexType) {
                    return undefined;
                }
                indexTypes.push(indexType);
            }
            return getUnionType(indexTypes);
        }
        function resolveUnionTypeMembers(type) {
            // The members and properties collections are empty for union types. To get all properties of a union
            // type use getPropertiesOfType (only the language service uses this).
            var callSignatures = getUnionSignatures(type.types, ts.SignatureKind.Call);
            var constructSignatures = getUnionSignatures(type.types, ts.SignatureKind.Construct);
            var stringIndexType = getUnionIndexType(type.types, ts.IndexKind.String);
            var numberIndexType = getUnionIndexType(type.types, ts.IndexKind.Number);
            setObjectTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function intersectTypes(type1, type2) {
            return !type1 ? type2 : !type2 ? type1 : getIntersectionType([type1, type2]);
        }
        function resolveIntersectionTypeMembers(type) {
            // The members and properties collections are empty for intersection types. To get all properties of an
            // intersection type use getPropertiesOfType (only the language service uses this).
            var callSignatures = emptyArray;
            var constructSignatures = emptyArray;
            var stringIndexType = undefined;
            var numberIndexType = undefined;
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var t = _a[_i];
                callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(t, ts.SignatureKind.Call));
                constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(t, ts.SignatureKind.Construct));
                stringIndexType = intersectTypes(stringIndexType, getIndexTypeOfType(t, ts.IndexKind.String));
                numberIndexType = intersectTypes(numberIndexType, getIndexTypeOfType(t, ts.IndexKind.Number));
            }
            setObjectTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveAnonymousTypeMembers(type) {
            var symbol = type.symbol;
            var members;
            var callSignatures;
            var constructSignatures;
            var stringIndexType;
            var numberIndexType;
            // [ConcreteTypeScript] Ugly hack until fully understood
            if (!symbol) {
                setObjectTypeMembers(type, emptySymbols, emptyArray, emptyArray, undefined, undefined);
                return;
            }
            // [/ConcreteTypeScript] 
            if (symbol.flags & ts.SymbolFlags.TypeLiteral) {
                members = symbol.members;
                callSignatures = getSignaturesOfSymbol(members["__call"]);
                constructSignatures = getSignaturesOfSymbol(members["__new"]);
                stringIndexType = getIndexTypeOfSymbol(symbol, ts.IndexKind.String);
                numberIndexType = getIndexTypeOfSymbol(symbol, ts.IndexKind.Number);
            }
            else {
                // Combinations of function, class, enum and module
                members = emptySymbols;
                callSignatures = emptyArray;
                constructSignatures = emptyArray;
                if (symbol.flags & ts.SymbolFlags.HasExports) {
                    members = getExportsOfSymbol(symbol);
                }
                if (symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method)) {
                    callSignatures = getSignaturesOfSymbol(symbol);
                    // [ConcreteTypeScript]
                    if (symbol.flags & ts.SymbolFlags.Function) {
                        constructSignatures = getSignaturesOfSymbol(symbol).filter(function (_a) {
                            var resolvedThisType = _a.resolvedThisType;
                            return !!resolvedThisType;
                        });
                    }
                }
                if (symbol.flags & ts.SymbolFlags.Class) {
                    var classType = getDeclaredTypeOfClassOrInterface(symbol);
                    constructSignatures = getSignaturesOfSymbol(symbol.members["__constructor"]);
                    if (!constructSignatures.length) {
                        constructSignatures = getDefaultConstructSignatures(classType);
                    }
                    var baseConstructorType = getBaseConstructorTypeOfClass(classType);
                    if (baseConstructorType.flags & ts.TypeFlags.ObjectType) {
                        members = createSymbolTable(getNamedMembers(members));
                        addInheritedMembers(members, getPropertiesOfObjectType(baseConstructorType));
                    }
                }
                stringIndexType = undefined;
                numberIndexType = (symbol.flags & ts.SymbolFlags.Enum) ? stringType : undefined;
            }
            setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveStructuredTypeMembers(type) {
            if (!type.members) {
                // [ConcreteTypeScript]
                if (type.flags & (ts.TypeFlags.Class | ts.TypeFlags.Interface | ts.TypeFlags.Declare)) {
                    resolveClassOrInterfaceMembers(type);
                }
                else if (type.flags & (ts.TypeFlags.IntermediateFlow)) {
                    resolveIntermediateFlowType(type);
                }
                else if (type.flags & ts.TypeFlags.Anonymous) {
                    resolveAnonymousTypeMembers(type);
                }
                else if (type.flags & ts.TypeFlags.Tuple) {
                    resolveTupleTypeMembers(type);
                }
                else if (type.flags & ts.TypeFlags.Union) {
                    resolveUnionTypeMembers(type);
                }
                else if (type.flags & ts.TypeFlags.Intersection) {
                    resolveIntersectionTypeMembers(type);
                }
                else {
                    resolveTypeReferenceMembers(type);
                }
            }
            return type;
        }
        // Return properties of an object type or an empty array for other types
        function getPropertiesOfObjectType(type) {
            // [ConcreteTypeScript] In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            type = unconcrete(type);
            if (markAsRecursiveFlowAnalysis(type)) {
                return emptyArray;
            }
            // [/ConcreteTypeScript]
            if (type.flags & ts.TypeFlags.ObjectType) {
                return resolveStructuredTypeMembers(type).properties;
            }
            return emptyArray;
        }
        // If the given type is an object type and that type has a property by the given name,
        // return the symbol for that property.Otherwise return undefined.
        function getPropertyOfObjectType(type, name) {
            // [ConcreteTypeScript] In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            type = unconcrete(type);
            // Access prototype directly, in the case of TypeFlags.Declare. 
            // This is necessary so that we can access non-flow-dependent parts of the object.
            // TODO this causes redundant checking with below if the locus type is fully resolved.
            if (type.flags & ts.TypeFlags.Declare) {
                var prototypeType = getPrototypeSymbolTypeOfType(type);
                if (prototypeType) {
                    var protoProp = getPropertyOfType(getDeclaredTypeOfSymbol(prototypeType), name);
                    if (protoProp) {
                        return protoProp;
                    }
                }
            }
            // [/ConcreteTypeScript]
            if (type.flags & ts.TypeFlags.ObjectType) {
                var resolved = resolveStructuredTypeMembers(type);
                if (ts.hasProperty(resolved.members, name)) {
                    var symbol = resolved.members[name];
                    if (symbolIsValue(symbol)) {
                        return symbol;
                    }
                }
            }
        }
        function getPropertiesOfUnionOrIntersectionType(_type) {
            // [ConcreteTypeScript] In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            var type = unconcrete(_type);
            // [/ConcreteTypeScript]
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var current = _a[_i];
                for (var _b = 0, _c = getPropertiesOfType(current); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    getPropertyOfUnionOrIntersectionType(type, prop.name);
                }
                // The properties of a union type are those that are present in all constituent types, so
                // we only need to check the properties of the first type
                if (type.flags & ts.TypeFlags.Union) {
                    break;
                }
            }
            return type.resolvedProperties ? symbolsToArray(type.resolvedProperties) : emptyArray;
        }
        function getPropertiesOfIntermediateFlowType(type) {
            for (var _i = 0, _a = type.flowData.flowTypes.map(function (_a) {
                var type = _a.type;
                return type;
            }); _i < _a.length; _i++) {
                var current = _a[_i];
                for (var _b = 0, _c = getPropertiesOfType(current); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    getPropertyOfIntermediateFlowType(type, prop.name);
                }
            }
            for (var _d = 0, _e = Object.keys(type.flowData.memberSet); _d < _e.length; _d++) {
                var memberName = _e[_d];
                getPropertyOfIntermediateFlowType(type, memberName);
            }
            return type.resolvedProperties ? symbolsToArray(type.resolvedProperties) : emptyArray;
        }
        function getPropertiesOfType(type) {
            // [ConcreteTypeScript] In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            type = unconcrete(type);
            // [/ConcreteTypeScript]
            type = getApparentType(type);
            if (type.flags & ts.TypeFlags.IntermediateFlow) {
                return getPropertiesOfIntermediateFlowType(type);
            }
            return type.flags & ts.TypeFlags.UnionOrIntersection ? getPropertiesOfUnionOrIntersectionType(type) : getPropertiesOfObjectType(type);
        }
        /**
         * For a type parameter, return the base constraint of the type parameter. For the string, number,
         * boolean, and symbol primitive types, return the corresponding object types. Otherwise return the
         * type itself. Note that the apparent type of a union type is the union type itself.
         */
        function getApparentType(type, node) {
            if (type.flags & ts.TypeFlags.TypeParameter) {
                do {
                    type = getConstraintOfTypeParameter(type);
                } while (type && type.flags & ts.TypeFlags.TypeParameter);
                if (!type) {
                    type = emptyObjectType;
                }
            }
            else if (type.flags & ts.TypeFlags.StringLike) {
                type = globalStringType;
            }
            else if (type.flags & ts.TypeFlags.NumberLike) {
                type = globalNumberType;
            }
            else if (type.flags & ts.TypeFlags.Boolean) {
                type = globalBooleanType;
            }
            else if (type.flags & ts.TypeFlags.ESSymbol) {
                type = globalESSymbolType;
            }
            return type;
        }
        function createUnionOrIntersectionProperty(containingType, name) {
            var types = containingType.types;
            var props;
            for (var _i = 0; _i < types.length; _i++) {
                var current = types[_i];
                var type = getApparentType(current);
                if (type !== unknownType) {
                    var prop = getPropertyOfType(type, name);
                    if (prop && !(getDeclarationFlagsFromSymbol(prop) & (ts.NodeFlags.Private | ts.NodeFlags.Protected))) {
                        if (!props) {
                            props = [prop];
                        }
                        else if (!ts.contains(props, prop)) {
                            props.push(prop);
                        }
                    }
                    else if (containingType.flags & ts.TypeFlags.Union) {
                        // A union type requires the property to be present in all constituent types
                        return undefined;
                    }
                }
            }
            if (!props) {
                return undefined;
            }
            if (props.length === 1) {
                return props[0];
            }
            var propTypes = [];
            var declarations = [];
            for (var _a = 0; _a < props.length; _a++) {
                var prop = props[_a];
                if (prop.declarations) {
                    ts.addRange(declarations, prop.declarations);
                }
                propTypes.push(getTypeOfSymbol(prop));
            }
            var result = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient | ts.SymbolFlags.SyntheticProperty, name);
            result.containingType = containingType;
            result.declarations = declarations;
            result.type = containingType.flags & ts.TypeFlags.Union ? getUnionType(propTypes) : getIntersectionType(propTypes);
            return result;
        }
        function getPropertyOfIntermediateFlowType(type, name) {
            var properties = type.resolvedProperties || (type.resolvedProperties = {});
            if (ts.hasProperty(properties, name)) {
                return properties[name];
            }
            for (var _i = 0, _a = type.flowData.flowTypes; _i < _a.length; _i++) {
                var baseType = _a[_i].type;
                var property = getPropertyOfType(baseType, name);
                if (!property) {
                    continue;
                }
                var propType = getTypeOfSymbol(property);
                return createTransientProperty(propType);
            }
            if (ts.hasProperty(type.flowData.memberSet, name)) {
                var propType = flowTypeGet(ts.getProperty(type.flowData.memberSet, name));
                return createTransientProperty(propType);
            }
            return null;
            // Where:
            function createTransientProperty(type) {
                var result = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient | ts.SymbolFlags.SyntheticProperty, name);
                result.declarations = []; // TODO
                result.type = type;
                properties[name] = result;
                return result;
            }
        }
        function getPropertyOfUnionOrIntersectionType(type, name) {
            // [ConcreteTypeScript] In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            type = unconcrete(type);
            // [/ConcreteTypeScript]
            var properties = type.resolvedProperties || (type.resolvedProperties = {});
            if (ts.hasProperty(properties, name)) {
                return properties[name];
            }
            var property = createUnionOrIntersectionProperty(type, name);
            if (property) {
                properties[name] = property;
            }
            return property;
        }
        // Return the symbol for the property with the given name in the given type. Creates synthetic union properties when
        // necessary, maps primitive types and type parameters are to their apparent types, and augments with properties from
        // Object and Function as appropriate.
        function getPropertyOfType(type, name) {
            // [ConcreteTypeScript] 
            // In terms of member access, properties of
            // concrete types are the properties of their non-concrete
            // equivalent
            type = getApparentType(unconcrete(type));
            // If we are a type currently being resolved, don't attempt to get a property
            if (markAsRecursiveFlowAnalysis(type)) {
                return undefined;
            }
            // [/ConcreteTypeScript]
            if (type.flags & ts.TypeFlags.IntermediateFlow) {
                return getPropertyOfIntermediateFlowType(type, name);
            }
            // [/ConcreteTypeScript]
            if (type.flags & ts.TypeFlags.ObjectType) {
                var resolved = resolveStructuredTypeMembers(type);
                if (ts.hasProperty(resolved.members, name)) {
                    var symbol = resolved.members[name];
                    if (symbolIsValue(symbol)) {
                        return symbol;
                    }
                }
                if (resolved === anyFunctionType || resolved.callSignatures.length || resolved.constructSignatures.length) {
                    if (type.symbol && type.symbol.declarations) {
                        return type.symbol.declarations[0].prototypeSymbol;
                    }
                    var symbol = getPropertyOfObjectType(globalFunctionType, name);
                    if (symbol) {
                        return symbol;
                    }
                }
                return getPropertyOfObjectType(globalObjectType, name);
            }
            if (type.flags & ts.TypeFlags.UnionOrIntersection) {
                return getPropertyOfUnionOrIntersectionType(type, name);
            }
            return undefined;
        }
        function getSignaturesOfStructuredType(type, kind) {
            if (type.flags & ts.TypeFlags.StructuredType) {
                var resolved = resolveStructuredTypeMembers(type);
                return kind === ts.SignatureKind.Call ? resolved.callSignatures : resolved.constructSignatures;
            }
            return emptyArray;
        }
        /**
         * Return the signatures of the given kind in the given type. Creates synthetic union signatures when necessary and
         * maps primitive types and type parameters are to their apparent types.
         */
        function getSignaturesOfType(type, kind) {
            // [ConcreteTypeScript]
            // Signatures of a concrete type are that of the base type.
            // This applies most importantly to weakly concrete function declarations.
            type = unconcrete(type);
            // [ConcreteTypeScript] Handle recursive type resolution by having type appear to be empty during recursive inspection.
            if (markAsRecursiveFlowAnalysis(type)) {
                return emptyArray;
            }
            // [/ConcreteTypeScript]
            return getSignaturesOfStructuredType(getApparentType(type), kind);
        }
        function typeHasConstructSignatures(type) {
            var apparentType = getApparentType(type);
            if (apparentType.flags & (ts.TypeFlags.ObjectType | ts.TypeFlags.Union)) {
                var resolved = resolveStructuredTypeMembers(type);
                return resolved.constructSignatures.length > 0;
            }
            return false;
        }
        function typeHasCallOrConstructSignatures(type) {
            var apparentType = getApparentType(type);
            if (apparentType.flags & ts.TypeFlags.StructuredType) {
                var resolved = resolveStructuredTypeMembers(type);
                return resolved.callSignatures.length > 0 || resolved.constructSignatures.length > 0;
            }
            return false;
        }
        function getIndexTypeOfStructuredType(type, kind) {
            if (type.flags & ts.TypeFlags.StructuredType) {
                var resolved = resolveStructuredTypeMembers(type);
                return kind === ts.IndexKind.String ? resolved.stringIndexType : resolved.numberIndexType;
            }
        }
        // [ConcreteTypeScript]
        // The current analysis of T cannot be used if a circularly 
        // dependent type is being resolved higher on the stack.
        //
        // The presence of a circularly dependent type higher on the stack
        // causes our flow analysis to return nothing, to avoid problematic cases.
        // While we could analyze the types more precisely, this would have to be
        // evaluated for usefulness.
        function isCurrentFlowAnalysisUnusable(type) {
            if (type.flowRecursivePairs) {
                for (var _i = 0, _a = type.flowRecursivePairs; _i < _a.length; _i++) {
                    var pair = _a[_i];
                    if (pair === type) {
                        continue;
                    }
                    if (resolvingLocusTypeStack.indexOf(pair) >= 0) {
                        return true;
                    }
                }
            }
            return false;
        }
        // [ConcreteTypeScript]
        // Mark this type as circularly dependent on the first 
        function markAsRecursiveFlowAnalysis(type) {
            if (!(type.flags & ts.TypeFlags.Declare)) {
                return false;
            }
            if (resolvingLocusTypeStack.indexOf(type) >= 0) {
                // May be marked on self. Thats OK.
                markRecursiveTypeDependency(type, resolvingLocusTypeStack[0]);
                markRecursiveTypeDependency(resolvingLocusTypeStack[0], type);
                return true;
            }
            return false;
        }
        // [ConcreteTypeScript]
        // Ensure the analysis is marked as circularly dependent. 
        function markRecursiveTypeDependency(type1, type2) {
            if (!type1.flowRecursivePairs) {
                type1.flowRecursivePairs = [type2];
            }
            else if (type1.flowRecursivePairs.indexOf(type2) === -1) {
                type1.flowRecursivePairs.push(type2);
            }
        }
        // Return the index type of the given kind in the given type. Creates synthetic union index types when necessary and
        // maps primitive types and type parameters are to their apparent types.
        function getIndexTypeOfType(type, kind) {
            // [ConcreteTypeScript] Handle recursive type resolution by having type appear to be empty during recursive inspection.
            if (markAsRecursiveFlowAnalysis(type)) {
                return undefinedType;
            }
            // [/ConcreteTypeScript]
            return getIndexTypeOfStructuredType(getApparentType(type), kind);
        }
        // Return list of type parameters with duplicates removed (duplicate identifier errors are generated in the actual
        // type checking functions).
        function getTypeParametersFromDeclaration(typeParameterDeclarations) {
            var result = [];
            ts.forEach(typeParameterDeclarations, function (node) {
                var tp = getDeclaredTypeOfTypeParameter(node.symbol);
                if (!ts.contains(result, tp)) {
                    result.push(tp);
                }
            });
            return result;
        }
        function symbolsToArray(symbols) {
            var result = [];
            for (var id in symbols) {
                if (!isReservedMemberName(id)) {
                    result.push(symbols[id]);
                }
            }
            return result;
        }
        function isOptionalParameter(node) {
            if (ts.hasQuestionToken(node)) {
                return true;
            }
            if (node.initializer) {
                var signatureDeclaration = node.parent;
                var signature = getSignatureFromDeclaration(signatureDeclaration);
                var parameterIndex = signatureDeclaration.parameters.indexOf(node);
                ts.Debug.assert(parameterIndex >= 0);
                return parameterIndex >= signature.minArgumentCount;
            }
            return false;
        }
        function getSignatureFromDeclaration(declaration) {
            var links = getNodeLinks(declaration);
            if (!links.resolvedSignature) {
                var classType = declaration.kind === ts.SyntaxKind.Constructor ? getDeclaredTypeOfClassOrInterface(declaration.parent.symbol) : undefined;
                var typeParameters = classType ? classType.localTypeParameters :
                    declaration.typeParameters ? getTypeParametersFromDeclaration(declaration.typeParameters) : undefined;
                var parameters = [];
                var hasStringLiterals = false;
                var minArgumentCount = -1;
                for (var i = 0, n = declaration.parameters.length; i < n; i++) {
                    var param = declaration.parameters[i];
                    parameters.push(param.symbol);
                    if (param.type && param.type.kind === ts.SyntaxKind.StringLiteral) {
                        hasStringLiterals = true;
                    }
                    if (param.initializer || param.questionToken || param.dotDotDotToken) {
                        if (minArgumentCount < 0) {
                            minArgumentCount = i;
                        }
                    }
                    else {
                        // If we see any required parameters, it means the prior ones were not in fact optional.
                        minArgumentCount = -1;
                    }
                }
                if (minArgumentCount < 0) {
                    minArgumentCount = declaration.parameters.length;
                }
                var returnType;
                var typePredicate;
                if (classType) {
                    returnType = classType;
                    // [ConcreteTypeScript] Constructors return concrete types
                    returnType = createConcreteType(returnType);
                }
                else if (declaration.type) {
                    returnType = getTypeFromTypeNode(declaration.type);
                    if (declaration.type.kind === ts.SyntaxKind.TypePredicate) {
                        var typePredicateNode = declaration.type;
                        typePredicate = {
                            parameterName: typePredicateNode.parameterName ? typePredicateNode.parameterName.text : undefined,
                            parameterIndex: typePredicateNode.parameterName ? getTypePredicateParameterIndex(declaration.parameters, typePredicateNode.parameterName) : undefined,
                            type: getTypeFromTypeNode(typePredicateNode.type)
                        };
                    }
                }
                else {
                    // TypeScript 1.0 spec (April 2014):
                    // If only one accessor includes a type annotation, the other behaves as if it had the same type annotation.
                    if (declaration.kind === ts.SyntaxKind.GetAccessor && !ts.hasDynamicName(declaration)) {
                        var setter = ts.getDeclarationOfKind(declaration.symbol, ts.SyntaxKind.SetAccessor);
                        returnType = getAnnotatedAccessorType(setter);
                    }
                    if (!returnType && ts.nodeIsMissing(declaration.body)) {
                        returnType = anyType;
                    }
                }
                links.resolvedSignature = createSignature(declaration, typeParameters, parameters, returnType, typePredicate, minArgumentCount, ts.hasRestParameter(declaration), hasStringLiterals);
                // [ConcreteTypeScript]
                // If there is an explicit 'this' annotation, use it to determine the 'this' type.
                if (declaration.parameters.thisParam) {
                    links.resolvedSignature.resolvedThisType = getTypeFromTypeNode(declaration.parameters.thisParam.type);
                }
                else if (declaration.kind === ts.SyntaxKind.FunctionExpression && declaration.parent.kind === ts.SyntaxKind.BinaryExpression) {
                    links.resolvedSignature.resolvedThisType = getThisTypeFromAssignment(declaration, declaration.parent);
                }
                else if (declaration.kind === ts.SyntaxKind.MethodDeclaration && declaration.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                    // If we are a method in a class, we are cemented, and therefore have concrete 'this':
                    var symbol = getSymbolOfNode(declaration.parent);
                    links.resolvedSignature.resolvedThisType = createConcreteType(getDeclaredTypeOfSymbol(symbol));
                }
            }
            return links.resolvedSignature;
        }
        // [ConcreteTypeScript]
        // If an explicit this-type is not given then we may infer one if we are in a binding assignment. Returns 'undefined' if not applicable.
        // We see if we have a fresh declare type on the left. If it is a prototype declare type, we use the enclosing declare type.
        // Returns 'undefined' if not applicable.
        function getThisTypeFromAssignmentLeft(node, left) {
            var leftType = getTypeOfNode(left.expression);
            if (leftType.flags & ts.TypeFlags.IntermediateFlow) {
                leftType = leftType.targetType;
            }
            if (isPrototypeType(unconcrete(leftType))) {
                var symbol = unconcrete(leftType).symbol;
                return createConcreteType(getParentTypeOfPrototypeProperty(symbol));
            }
            else if (unconcrete(leftType).flags & ts.TypeFlags.Declare) {
                return leftType;
            }
        }
        // [ConcreteTypeScript]
        // If an explicit this-type is not given then we may infer one if we are in a binding assignment. 
        // Returns 'undefined' if not applicable.
        function getThisTypeFromAssignment(node, parent) {
            if (parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                parent.right === node &&
                parent.left.kind === ts.SyntaxKind.PropertyAccessExpression) {
                return getThisTypeFromAssignmentLeft(node, parent.left);
            }
        }
        function getSignaturesOfSymbol(symbol) {
            if (!symbol)
                return emptyArray;
            var result = [];
            for (var i = 0, len = symbol.declarations.length; i < len; i++) {
                var node = symbol.declarations[i];
                switch (node.kind) {
                    case ts.SyntaxKind.FunctionType:
                    case ts.SyntaxKind.ConstructorType:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.ConstructSignature:
                    case ts.SyntaxKind.IndexSignature:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.ArrowFunction:
                        // Don't include signature if node is the implementation of an overloaded function. A node is considered
                        // an implementation node if it has a body and the previous node is of the same kind and immediately
                        // precedes the implementation node (i.e. has the same parent and ends where the implementation starts).
                        if (i > 0 && node.body) {
                            var previous = symbol.declarations[i - 1];
                            if (node.parent === previous.parent && node.kind === previous.kind && node.pos === previous.end) {
                                break;
                            }
                        }
                        result.push(getSignatureFromDeclaration(node));
                }
            }
            return result;
        }
        function getReturnTypeOfSignature(signature) {
            if (!signature.resolvedReturnType) {
                if (!pushTypeResolution(signature, TypeSystemPropertyName.ResolvedReturnType)) {
                    return unknownType;
                }
                var type;
                if (signature.target) {
                    type = instantiateType(getReturnTypeOfSignature(signature.target), signature.mapper);
                }
                else if (signature.unionSignatures) {
                    type = getUnionType(ts.map(signature.unionSignatures, getReturnTypeOfSignature));
                }
                else {
                    type = getReturnTypeFromBody(signature.declaration);
                }
                if (!popTypeResolution()) {
                    type = anyType;
                    if (compilerOptions.noImplicitAny) {
                        var declaration = signature.declaration;
                        if (declaration.name) {
                            error(declaration.name, ts.Diagnostics._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions, ts.declarationNameToString(declaration.name));
                        }
                        else {
                            error(declaration, ts.Diagnostics.Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions);
                        }
                    }
                }
                signature.resolvedReturnType = type;
            }
            return signature.resolvedReturnType;
        }
        function getRestTypeOfSignature(signature) {
            if (signature.hasRestParameter) {
                var type = getTypeOfSymbol(ts.lastOrUndefined(signature.parameters));
                if (type.flags & ts.TypeFlags.Reference && type.target === globalArrayType) {
                    return type.typeArguments[0];
                }
            }
            return anyType;
        }
        function getSignatureInstantiation(signature, typeArguments) {
            return instantiateSignature(signature, createTypeMapper(signature.typeParameters, typeArguments), true);
        }
        function getErasedSignature(signature) {
            if (!signature.typeParameters)
                return signature;
            if (!signature.erasedSignatureCache) {
                if (signature.target) {
                    signature.erasedSignatureCache = instantiateSignature(getErasedSignature(signature.target), signature.mapper);
                }
                else {
                    signature.erasedSignatureCache = instantiateSignature(signature, createTypeEraser(signature.typeParameters), true);
                }
            }
            return signature.erasedSignatureCache;
        }
        function getOrCreateTypeFromSignature(signature) {
            // There are two ways to declare a construct signature, one is by declaring a class constructor
            // using the constructor keyword, and the other is declaring a bare construct signature in an
            // object type literal or interface (using the new keyword). Each way of declaring a constructor
            // will result in a different declaration kind.
            if (!signature.isolatedSignatureType) {
                var isConstructor = signature.declaration.kind === ts.SyntaxKind.Constructor || signature.declaration.kind === ts.SyntaxKind.ConstructSignature;
                var type = createObjectType(ts.TypeFlags.Anonymous | ts.TypeFlags.FromSignature);
                type.members = emptySymbols;
                type.properties = emptyArray;
                type.callSignatures = !isConstructor ? [signature] : emptyArray;
                type.constructSignatures = isConstructor ? [signature] : emptyArray;
                signature.isolatedSignatureType = type;
            }
            return signature.isolatedSignatureType;
        }
        function getIndexSymbol(symbol) {
            return symbol.members["__index"];
        }
        function getIndexDeclarationOfSymbol(symbol, kind) {
            var syntaxKind = kind === ts.IndexKind.Number ? ts.SyntaxKind.NumberKeyword : ts.SyntaxKind.StringKeyword;
            var indexSymbol = getIndexSymbol(symbol);
            if (indexSymbol) {
                for (var _i = 0, _a = indexSymbol.declarations; _i < _a.length; _i++) {
                    var decl = _a[_i];
                    var node = decl;
                    if (node.parameters.length === 1) {
                        var parameter = node.parameters[0];
                        if (parameter && parameter.type && parameter.type.kind === syntaxKind) {
                            return node;
                        }
                    }
                }
            }
            return undefined;
        }
        function getIndexTypeOfSymbol(symbol, kind) {
            var declaration = getIndexDeclarationOfSymbol(symbol, kind);
            return declaration
                ? declaration.type ? getTypeFromTypeNode(declaration.type) : anyType
                : undefined;
        }
        function getConstraintOfTypeParameter(type) {
            if (!type.constraint) {
                if (type.target) {
                    var targetConstraint = getConstraintOfTypeParameter(type.target);
                    type.constraint = targetConstraint ? instantiateType(targetConstraint, type.mapper) : noConstraintType;
                }
                else {
                    type.constraint = getTypeFromTypeNode(ts.getDeclarationOfKind(type.symbol, ts.SyntaxKind.TypeParameter).constraint);
                }
            }
            return type.constraint === noConstraintType ? undefined : type.constraint;
        }
        function getParentSymbolOfTypeParameter(typeParameter) {
            return getSymbolOfNode(ts.getDeclarationOfKind(typeParameter.symbol, ts.SyntaxKind.TypeParameter).parent);
        }
        function getTypeListId(types) {
            switch (types.length) {
                case 1:
                    return "" + types[0].id;
                case 2:
                    return types[0].id + "," + types[1].id;
                default:
                    var result = "";
                    for (var i = 0; i < types.length; i++) {
                        if (i > 0) {
                            result += ",";
                        }
                        result += types[i].id;
                    }
                    return result;
            }
        }
        // This function is used to propagate certain flags when creating new object type references and union types.
        // It is only necessary to do so if a constituent type might be the undefined type, the null type, the type
        // of an object literal or the anyFunctionType. This is because there are operations in the type checker
        // that care about the presence of such types at arbitrary depth in a containing type.
        function getPropagatingFlagsOfTypes(types) {
            var result = 0;
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                result |= type.flags;
            }
            return result & ts.TypeFlags.PropagatingFlags;
        }
        function createTypeReference(target, typeArguments) {
            var id = getTypeListId(typeArguments);
            var type = target.instantiations[id];
            if (!type) {
                var flags = ts.TypeFlags.Reference | getPropagatingFlagsOfTypes(typeArguments);
                type = target.instantiations[id] = createObjectType(flags, target.symbol);
                type.target = target;
                type.typeArguments = typeArguments;
            }
            return type;
        }
        function isTypeParameterReferenceIllegalInConstraint(typeReferenceNode, typeParameterSymbol) {
            var links = getNodeLinks(typeReferenceNode);
            if (links.isIllegalTypeReferenceInConstraint !== undefined) {
                return links.isIllegalTypeReferenceInConstraint;
            }
            // bubble up to the declaration
            var currentNode = typeReferenceNode;
            // forEach === exists
            while (!ts.forEach(typeParameterSymbol.declarations, function (d) { return d.parent === currentNode.parent; })) {
                currentNode = currentNode.parent;
            }
            // if last step was made from the type parameter this means that path has started somewhere in constraint which is illegal
            links.isIllegalTypeReferenceInConstraint = currentNode.kind === ts.SyntaxKind.TypeParameter;
            return links.isIllegalTypeReferenceInConstraint;
        }
        function checkTypeParameterHasIllegalReferencesInConstraint(typeParameter) {
            var typeParameterSymbol;
            function check(n) {
                if (n.kind === ts.SyntaxKind.TypeReference && n.typeName.kind === ts.SyntaxKind.Identifier) {
                    var links = getNodeLinks(n);
                    if (links.isIllegalTypeReferenceInConstraint === undefined) {
                        var symbol = resolveName(typeParameter, n.typeName.text, ts.SymbolFlags.Type, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined);
                        if (symbol && (symbol.flags & ts.SymbolFlags.TypeParameter)) {
                            // TypeScript 1.0 spec (April 2014): 3.4.1
                            // Type parameters declared in a particular type parameter list
                            // may not be referenced in constraints in that type parameter list
                            // symbol.declaration.parent === typeParameter.parent
                            // -> typeParameter and symbol.declaration originate from the same type parameter list
                            // -> illegal for all declarations in symbol
                            // forEach === exists
                            links.isIllegalTypeReferenceInConstraint = ts.forEach(symbol.declarations, function (d) { return d.parent === typeParameter.parent; });
                        }
                    }
                    if (links.isIllegalTypeReferenceInConstraint) {
                        error(typeParameter, ts.Diagnostics.Constraint_of_a_type_parameter_cannot_reference_any_type_parameter_from_the_same_type_parameter_list);
                    }
                }
                ts.forEachChild(n, check);
            }
            if (typeParameter.constraint) {
                typeParameterSymbol = getSymbolOfNode(typeParameter);
                check(typeParameter.constraint);
            }
        }
        // Get type from reference to class or interface
        function getTypeFromClassOrInterfaceReference(node, symbol) {
            var type = getDeclaredTypeOfSymbol(symbol);
            var typeParameters = type.localTypeParameters;
            if (typeParameters) {
                if (!node.typeArguments || node.typeArguments.length !== typeParameters.length) {
                    error(node, ts.Diagnostics.Generic_type_0_requires_1_type_argument_s, typeToString(type, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.WriteArrayAsGenericType), typeParameters.length);
                    return unknownType;
                }
                // In a type reference, the outer type parameters of the referenced class or interface are automatically
                // supplied as type arguments and the type reference only specifies arguments for the local type parameters
                // of the class or interface.
                return createTypeReference(type, ts.concatenate(type.outerTypeParameters, ts.map(node.typeArguments, getTypeFromTypeNode)));
            }
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, typeToString(type));
                return unknownType;
            }
            return type;
        }
        // Get type from reference to type alias. When a type alias is generic, the declared type of the type alias may include
        // references to the type parameters of the alias. We replace those with the actual type arguments by instantiating the
        // declared type. Instantiations are cached using the type identities of the type arguments as the key.
        function getTypeFromTypeAliasReference(node, symbol) {
            var type = getDeclaredTypeOfSymbol(symbol);
            var links = getSymbolLinks(symbol);
            var typeParameters = links.typeParameters;
            if (typeParameters) {
                if (!node.typeArguments || node.typeArguments.length !== typeParameters.length) {
                    error(node, ts.Diagnostics.Generic_type_0_requires_1_type_argument_s, symbolToString(symbol), typeParameters.length);
                    return unknownType;
                }
                var typeArguments = ts.map(node.typeArguments, getTypeFromTypeNode);
                var id = getTypeListId(typeArguments);
                return links.instantiations[id] || (links.instantiations[id] = instantiateType(type, createTypeMapper(typeParameters, typeArguments)));
            }
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, symbolToString(symbol));
                return unknownType;
            }
            return type;
        }
        // Get type from reference to named type that cannot be generic (enum or type parameter)
        function getTypeFromNonGenericTypeReference(node, symbol) {
            if (symbol.flags & ts.SymbolFlags.TypeParameter && isTypeParameterReferenceIllegalInConstraint(node, symbol)) {
                // TypeScript 1.0 spec (April 2014): 3.4.1
                // Type parameters declared in a particular type parameter list
                // may not be referenced in constraints in that type parameter list
                // Implementation: such type references are resolved to 'unknown' type that usually denotes error
                return unknownType;
            }
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, symbolToString(symbol));
                return unknownType;
            }
            return getDeclaredTypeOfSymbol(symbol);
        }
        function getTypeFromTypeReference(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // We only support expressions that are simple qualified names. For other expressions this produces undefined.
                var typeNameOrExpression = node.kind === ts.SyntaxKind.TypeReference ? node.typeName :
                    ts.isSupportedExpressionWithTypeArguments(node) ? node.expression :
                        undefined;
                var symbol = typeNameOrExpression && resolveEntityName(typeNameOrExpression, ts.SymbolFlags.Type) || unknownSymbol;
                var type = symbol === unknownSymbol ? unknownType :
                    symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface) ? getTypeFromClassOrInterfaceReference(node, symbol) :
                        symbol.flags & ts.SymbolFlags.TypeAlias ? getTypeFromTypeAliasReference(node, symbol) :
                            getTypeFromNonGenericTypeReference(node, symbol);
                // Cache both the resolved symbol and the resolved type. The resolved symbol is needed in when we check the
                // type reference in checkTypeReferenceOrExpressionWithTypeArguments.
                links.resolvedSymbol = symbol;
                links.resolvedType = type;
            }
            return links.resolvedType;
        }
        function getTypeFromTypeQueryNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // TypeScript 1.0 spec (April 2014): 3.6.3
                // The expression is processed as an identifier expression (section 4.3)
                // or property access expression(section 4.10),
                // the widened type(section 3.9) of which becomes the result.
                links.resolvedType = getWidenedType(checkExpression(node.exprName));
            }
            return links.resolvedType;
        }
        function getTypeOfGlobalSymbol(symbol, arity) {
            function getTypeDeclaration(symbol) {
                var declarations = symbol.declarations;
                for (var _i = 0; _i < declarations.length; _i++) {
                    var declaration = declarations[_i];
                    switch (declaration.kind) {
                        case ts.SyntaxKind.ClassDeclaration:
                        case ts.SyntaxKind.InterfaceDeclaration:
                        case ts.SyntaxKind.EnumDeclaration:
                        case ts.SyntaxKind.BrandTypeDeclaration:
                            return declaration;
                    }
                }
            }
            if (!symbol) {
                return arity ? emptyGenericType : emptyObjectType;
            }
            var type = getDeclaredTypeOfSymbol(symbol);
            if (!(type.flags & ts.TypeFlags.ObjectType)) {
                error(getTypeDeclaration(symbol), ts.Diagnostics.Global_type_0_must_be_a_class_or_interface_type, symbol.name);
                return arity ? emptyGenericType : emptyObjectType;
            }
            if ((type.typeParameters ? type.typeParameters.length : 0) !== arity) {
                error(getTypeDeclaration(symbol), ts.Diagnostics.Global_type_0_must_have_1_type_parameter_s, symbol.name, arity);
                return arity ? emptyGenericType : emptyObjectType;
            }
            return type;
        }
        function getGlobalValueSymbol(name) {
            return getGlobalSymbol(name, ts.SymbolFlags.Value, ts.Diagnostics.Cannot_find_global_value_0);
        }
        function getGlobalTypeSymbol(name) {
            return getGlobalSymbol(name, ts.SymbolFlags.Type, ts.Diagnostics.Cannot_find_global_type_0);
        }
        function getGlobalSymbol(name, meaning, diagnostic) {
            return resolveName(undefined, name, meaning, diagnostic, name);
        }
        function getGlobalType(name, arity) {
            if (arity === void 0) { arity = 0; }
            return getTypeOfGlobalSymbol(getGlobalTypeSymbol(name), arity);
        }
        function tryGetGlobalType(name, arity) {
            if (arity === void 0) { arity = 0; }
            return getTypeOfGlobalSymbol(getGlobalSymbol(name, ts.SymbolFlags.Type, /*diagnostic*/ undefined), arity);
        }
        /**
         * Returns a type that is inside a namespace at the global scope, e.g.
         * getExportedTypeFromNamespace('JSX', 'Element') returns the JSX.Element type
         */
        function getExportedTypeFromNamespace(namespace, name) {
            var namespaceSymbol = getGlobalSymbol(namespace, ts.SymbolFlags.Namespace, /*diagnosticMessage*/ undefined);
            var typeSymbol = namespaceSymbol && getSymbol(namespaceSymbol.exports, name, ts.SymbolFlags.Type);
            return typeSymbol && getDeclaredTypeOfSymbol(typeSymbol);
        }
        function getGlobalESSymbolConstructorSymbol() {
            return globalESSymbolConstructorSymbol || (globalESSymbolConstructorSymbol = getGlobalValueSymbol("Symbol"));
        }
        /**
         * Creates a TypeReference for a generic `TypedPropertyDescriptor<T>`.
         */
        function createTypedPropertyDescriptorType(propertyType) {
            var globalTypedPropertyDescriptorType = getGlobalTypedPropertyDescriptorType();
            return globalTypedPropertyDescriptorType !== emptyGenericType
                ? createTypeReference(globalTypedPropertyDescriptorType, [propertyType])
                : emptyObjectType;
        }
        /**
         * Instantiates a global type that is generic with some element type, and returns that instantiation.
         */
        function createTypeFromGenericGlobalType(genericGlobalType, elementType) {
            return genericGlobalType !== emptyGenericType ? createTypeReference(genericGlobalType, [elementType]) : emptyObjectType;
        }
        function createIterableType(elementType) {
            return createTypeFromGenericGlobalType(globalIterableType, elementType);
        }
        function createIterableIteratorType(elementType) {
            return createTypeFromGenericGlobalType(globalIterableIteratorType, elementType);
        }
        function createArrayType(elementType) {
            return createTypeFromGenericGlobalType(globalArrayType, elementType);
        }
        function getTypeFromArrayTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = createArrayType(getTypeFromTypeNode(node.elementType));
            }
            return links.resolvedType;
        }
        function getHeritageClauseOfType(node) {
            if (node && node.heritageClauses) {
                var heritageClause = ts.getHeritageClause(node.heritageClauses, ts.SyntaxKind.ExtendsKeyword);
                return heritageClause;
            }
            return null;
        }
        // [ConcreteTypeScript]
        function createIntermediateFlowType(firstBindingSite, startingType, targetType, declareTypeNode) {
            var type = createObjectType(ts.TypeFlags.IntermediateFlow);
            var flowTypes = [{ type: startingType, firstBindingSite: firstBindingSite }];
            var memberSet = {};
            // For this-param Declare with an associated prototype-type:
            var prototypeSymbol = targetType && unconcrete(targetType).flags & ts.TypeFlags.Declare ?
                getPrototypeSymbolOfType(targetType)
                : null;
            if (prototypeSymbol) {
                flowTypes.push({ type: getTypeOfSymbol(prototypeSymbol), firstBindingSite: firstBindingSite });
            }
            // For this-param Declare with an associated extends clause:
            var declTypeNode = getDeclareTypeNode(unconcrete(targetType));
            if (declTypeNode) {
                var clause = getHeritageClauseOfType(declareTypeNode);
                if (clause && clause.types) {
                    for (var _i = 0, _a = clause.types; _i < _a.length; _i++) {
                        var typeNode = _a[_i];
                        flowTypes.push({ type: getTypeFromTypeNode(typeNode), firstBindingSite: clause });
                    }
                }
            }
            type.flowData = { flowTypes: flowTypes, memberSet: memberSet };
            type.targetType = targetType;
            // Clearly marks this as a node computing members captured in some type:
            type.declareTypeNode = declareTypeNode;
            return type;
        }
        // [/ConcreteTypeScript]
        function createTupleType(elementTypes) {
            var id = getTypeListId(elementTypes);
            return tupleTypes[id] || (tupleTypes[id] = createNewTupleType(elementTypes));
        }
        function createNewTupleType(elementTypes) {
            var type = createObjectType(ts.TypeFlags.Tuple | getPropagatingFlagsOfTypes(elementTypes));
            type.elementTypes = elementTypes;
            return type;
        }
        // [ConcreteTypeScript]
        // The formal Type (non-contextual) of a BecomesTypeNode is the starting type.
        // This allows assignability checking to be done naturally, and getContextualType to handle the rest.
        function getTypeFromBecomesTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                var startingType = emptyObjectType;
                if (node.startingType) {
                    startingType = getTypeFromTypeNode(node.startingType);
                }
                var targetType = getTypeFromTypeNode(node.endingType);
                if (node.endingType.kind === ts.SyntaxKind.DeclareType) {
                    var extendedTypes = ts.getDeclareTypeBaseTypeNodes(node.endingType).map(getTypeFromTypeNode);
                    if (extendedTypes.length > 0) {
                        if (startingType === emptyObjectType) {
                            startingType = extendedTypes[0];
                        }
                        else {
                            startingType = getIntersectionType([startingType, extendedTypes[0]]);
                        }
                    }
                }
                links.resolvedType = createIntermediateFlowType(node, startingType, targetType);
            }
            return links.resolvedType;
        }
        // [ConcreteTypeScript]
        // May be the 'this' pseudo-variable.
        function getVariableNameFromDeclareTypeNode(node) {
            switch (node.parent.kind) {
                case ts.SyntaxKind.ThisParameter:
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.Parameter:
                    return node.parent.name;
            }
        }
        function getTypeFromDeclareTypeNode(node, declareType) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // Resolve like we resolve becomes-types:
                var startingType = node.startingType ? getTypeFromTypeNode(node.startingType) : emptyObjectType;
                var targetType = declareType || getDeclaredTypeOfSymbol(node.symbol);
                ts.Debug.assert(!isTypeAny(startingType));
                ts.Debug.assert(!isTypeAny(targetType));
                links.resolvedType = createIntermediateFlowType(node, startingType, createConcreteType(targetType), node);
            }
            return links.resolvedType;
        }
        // [/ConcreteTypeScript]
        function getTypeFromTupleTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = createTupleType(ts.map(node.elementTypes, getTypeFromTypeNode));
            }
            return links.resolvedType;
        }
        function addTypeToSet(typeSet, type, typeSetKind) {
            if (type.flags & typeSetKind) {
                addTypesToSet(typeSet, type.types, typeSetKind);
            }
            else if (!ts.contains(typeSet, type)) {
                typeSet.push(type);
            }
        }
        // Add the given types to the given type set. Order is preserved, duplicates are removed,
        // and nested types of the given kind are flattened into the set.
        function addTypesToSet(typeSet, types, typeSetKind) {
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                addTypeToSet(typeSet, type, typeSetKind);
            }
        }
        function isSubtypeOfAny(candidate, types) {
            for (var i = 0, len = types.length; i < len; i++) {
                if (candidate !== types[i] && isTypeSubtypeOf(candidate, types[i])) {
                    return true;
                }
            }
            return false;
        }
        // [ConcreteTypeScript] 
        function getConcreteTypeOfKind(types, flags) {
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                if (isConcreteType(type) && unconcrete(type).flags & flags) {
                    return type;
                }
            }
            return null;
        }
        function removeSubtypes(types) {
            // [ConcreteTypeScript] 
            // We never remove concrete undefined / null types as subtypes. 
            // They would not be a useful concept if we did.
            var concreteUndefinedType = getConcreteTypeOfKind(types, ts.TypeFlags.Undefined);
            var concreteNullType = getConcreteTypeOfKind(types, ts.TypeFlags.Null);
            // [/ConcreteTypeScript]
            var i = types.length;
            while (i > 0) {
                i--;
                if (isSubtypeOfAny(types[i], types)) {
                    types.splice(i, 1);
                }
            }
            // [ConcreteTypeScript] 
            if (concreteUndefinedType) {
                addTypeToSet(types, concreteUndefinedType, ts.TypeFlags.Union);
            }
            if (concreteNullType) {
                addTypeToSet(types, concreteNullType, ts.TypeFlags.Union);
            }
            // [/ConcreteTypeScript]
        }
        function containsTypeAny(types) {
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                if (isTypeAny(type)) {
                    return true;
                }
            }
            return false;
        }
        function removeAllButLast(types, typeToRemove) {
            var i = types.length;
            while (i > 0 && types.length > 1) {
                i--;
                if (types[i] === typeToRemove) {
                    types.splice(i, 1);
                }
            }
        }
        // [ConcreteTypeScript]
        function stripConcretesIfNotAllConcrete(types) {
            var allConcrete = true;
            for (var i = 0; i < types.length; i++) {
                if (!isConcreteType(types[i])) {
                    allConcrete = false;
                    break;
                }
            }
            if (!allConcrete) {
                for (var i = 0; i < types.length; i++) {
                    types[i] = unconcrete(types[i]);
                }
            }
            return allConcrete;
        }
        // We reduce the constituent type set to only include types that aren't subtypes of other types, unless
        // the noSubtypeReduction flag is specified, in which case we perform a simple deduplication based on
        // object identity. Subtype reduction is possible only when union types are known not to circularly
        // reference themselves (as is the case with union types created by expression constructs such as array
        // literals and the || and ?: operators). Named types can circularly reference themselves and therefore
        // cannot be deduplicated during their declaration. For example, "type Item = string | (() => Item" is
        // a named type that circularly references itself.
        function getUnionType(types, noSubtypeReduction) {
            if (types.length === 0) {
                return emptyObjectType;
            }
            var typesCopy = [].concat(types);
            var unionOfConcrete = stripConcretesIfNotAllConcrete(typesCopy); // [ConcreteTypeScript]
            var typeSet = [];
            addTypesToSet(typeSet, typesCopy, ts.TypeFlags.Union);
            if (containsTypeAny(typeSet)) {
                return anyType;
            }
            if (!noSubtypeReduction) {
                removeSubtypes(typeSet);
            }
            if (typeSet.length === 1) {
                return typeSet[0];
            }
            var id = getTypeListId(typeSet);
            var type = unionTypes[id];
            if (!type) {
                type = unionTypes[id] = createObjectType(ts.TypeFlags.Union | getPropagatingFlagsOfTypes(typeSet));
                type.types = typeSet;
                type.isRuntimeCheckable = unionOfConcrete || areAllRuntimeCheckable(type.types);
                // [ConcreteTypeScript]
                if (unionOfConcrete) {
                    type.flags |= ts.TypeFlags.Concrete;
                    // Make sure we have our baseType set
                    // so that we can access it in emit code:
                    var strippedTypes = ts.map(type.types, function (concreteType) { return unconcrete(concreteType); });
                    strippedTypes = strippedTypes.filter(function (t) { return !(t.flags & ts.TypeFlags.Undefined) && !(t.flags & ts.TypeFlags.Null); });
                    var baseType = type.baseType = getUnionType(strippedTypes, true);
                    // We cast our UnionType into a concrete type,
                    // since we have set 'baseType' on it above.
                    baseType.concreteType = type;
                }
            }
            return type;
        }
        function getTypeFromUnionTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getUnionType(ts.map(node.types, getTypeFromTypeNode), /*noSubtypeReduction*/ true);
            }
            return links.resolvedType;
        }
        // We do not perform structural deduplication on intersection types. Intersection types are created only by the &
        // type operator and we can't reduce those because we want to support recursive intersection types. For example,
        // a type alias of the form "type List<T> = T & { next: List<T> }" cannot be reduced during its declaration.
        // Also, unlike union types, the order of the constituent types is preserved in order that overload resolution
        // for intersections of types with signatures can be deterministic.
        function getIntersectionType(types) {
            // [ConcreteTypeScript] Filter redundant nonconcrete in presence of concrete
            types = types.filter(notRedundant);
            // [/ConcreteTypeScript] 
            if (types.length === 0) {
                return emptyObjectType;
            }
            var typeSet = [];
            addTypesToSet(typeSet, types, ts.TypeFlags.Intersection);
            if (containsTypeAny(typeSet)) {
                return anyType;
            }
            if (typeSet.length === 1) {
                return typeSet[0];
            }
            var id = getTypeListId(typeSet);
            var type = intersectionTypes[id];
            if (!type) {
                type = intersectionTypes[id] = createObjectType(ts.TypeFlags.Intersection | getPropagatingFlagsOfTypes(typeSet));
                type.types = typeSet;
            }
            return type;
            // [ConcreteTypeScript] 
            function notRedundant(type) {
                if (canBeConcrete(type) && !isConcreteType(type)) {
                    for (var _i = 0; _i < types.length; _i++) {
                        var other = types[_i];
                        if (isTypeIdenticalTo(other, createConcreteType(type, false))) {
                            return false;
                        }
                    }
                }
                return true;
            }
            // [/ConcreteTypeScript] 
        }
        function getTypeFromIntersectionTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getIntersectionType(ts.map(node.types, getTypeFromTypeNode));
            }
            return links.resolvedType;
        }
        function getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // Deferred resolution of members is handled by resolveObjectTypeMembers
                links.resolvedType = createObjectType(ts.TypeFlags.Anonymous, node.symbol);
            }
            return links.resolvedType;
        }
        function getStringLiteralType(node) {
            // [ConcreteTypeScript] Made concrete
            if (ts.hasProperty(stringLiteralTypes, node.text)) {
                return createConcreteType(stringLiteralTypes[node.text]);
            }
            var type = stringLiteralTypes[node.text] = createType(ts.TypeFlags.StringLiteral);
            type.text = ts.getTextOfNode(node);
            return createConcreteType(type);
        }
        function getTypeFromStringLiteral(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getStringLiteralType(node);
            }
            return links.resolvedType;
        }
        // [ConcreteTypeScript] Modified to support concrete
        function getTypeFromTypeNode(node) {
            var type = getTypeFromTypeNodeWorker(node);
            if (node.isConcrete) {
                if (canBeConcrete(type)) {
                    type = createConcreteType(type, false);
                }
                else {
                    if (node.specifiedConcrete) {
                        console.log("WARNING: Could not create concrete type from " + ts.getTextOfNode(node) + ".");
                    }
                    else {
                        // Forget about concreteness
                        node.isConcrete = false;
                    }
                }
            }
            if (!type)
                return unknownType;
            return type;
        }
        function getTypeFromTypeNodeWorker(node) {
            // [/ConcreteTypeScript]
            switch (node.kind) {
                case ts.SyntaxKind.AnyKeyword:
                    return anyType;
                case ts.SyntaxKind.StringKeyword:
                    return stringType;
                case ts.SyntaxKind.NumberKeyword:
                    return numberType;
                // [ConcreteTypeScript]
                case ts.SyntaxKind.FloatNumberKeyword:
                    return floatNumberType;
                case ts.SyntaxKind.IntNumberKeyword:
                    return intNumberType;
                case ts.SyntaxKind.NullKeyword:
                    return nullType;
                case ts.SyntaxKind.UndefinedKeyword:
                    return undefinedType;
                case ts.SyntaxKind.BecomesType:
                    return getTypeFromBecomesTypeNode(node);
                case ts.SyntaxKind.DeclareType:
                    return getTypeFromDeclareTypeNode(node);
                // [/ConcreteTypeScript]
                case ts.SyntaxKind.BooleanKeyword:
                    return booleanType;
                case ts.SyntaxKind.SymbolKeyword:
                    return esSymbolType;
                case ts.SyntaxKind.VoidKeyword:
                    return voidType;
                case ts.SyntaxKind.StringLiteral:
                    return getTypeFromStringLiteral(node);
                case ts.SyntaxKind.TypeReference:
                    return getTypeFromTypeReference(node);
                case ts.SyntaxKind.TypePredicate:
                    return booleanType;
                case ts.SyntaxKind.ExpressionWithTypeArguments:
                    return getTypeFromTypeReference(node);
                case ts.SyntaxKind.TypeQuery:
                    return getTypeFromTypeQueryNode(node);
                case ts.SyntaxKind.ArrayType:
                    return getTypeFromArrayTypeNode(node);
                case ts.SyntaxKind.TupleType:
                    return getTypeFromTupleTypeNode(node);
                case ts.SyntaxKind.UnionType:
                    return getTypeFromUnionTypeNode(node);
                case ts.SyntaxKind.IntersectionType:
                    return getTypeFromIntersectionTypeNode(node);
                case ts.SyntaxKind.ParenthesizedType:
                    return getTypeFromTypeNode(node.type);
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                case ts.SyntaxKind.TypeLiteral:
                    return getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
                // This function assumes that an identifier or qualified name is a type expression
                // Callers should first ensure this by calling isTypeNode
                case ts.SyntaxKind.Identifier:
                case ts.SyntaxKind.QualifiedName:
                    var symbol = getSymbolAtLocation(node);
                    return symbol && getDeclaredTypeOfSymbol(symbol);
                default:
                    return unknownType;
            }
        }
        function instantiateList(items, mapper, instantiator) {
            if (items && items.length) {
                var result = [];
                for (var _i = 0; _i < items.length; _i++) {
                    var v = items[_i];
                    result.push(instantiator(v, mapper));
                }
                return result;
            }
            return items;
        }
        function createUnaryTypeMapper(source, target) {
            return function (t) { return t === source ? target : t; };
        }
        function createBinaryTypeMapper(source1, target1, source2, target2) {
            return function (t) { return t === source1 ? target1 : t === source2 ? target2 : t; };
        }
        function createTypeMapper(sources, targets) {
            switch (sources.length) {
                case 1: return createUnaryTypeMapper(sources[0], targets[0]);
                case 2: return createBinaryTypeMapper(sources[0], targets[0], sources[1], targets[1]);
            }
            return function (t) {
                for (var i = 0; i < sources.length; i++) {
                    if (t === sources[i]) {
                        return targets[i];
                    }
                }
                return t;
            };
        }
        function createUnaryTypeEraser(source) {
            return function (t) { return t === source ? anyType : t; };
        }
        function createBinaryTypeEraser(source1, source2) {
            return function (t) { return t === source1 || t === source2 ? anyType : t; };
        }
        function createTypeEraser(sources) {
            switch (sources.length) {
                case 1: return createUnaryTypeEraser(sources[0]);
                case 2: return createBinaryTypeEraser(sources[0], sources[1]);
            }
            return function (t) {
                for (var _i = 0; _i < sources.length; _i++) {
                    var source = sources[_i];
                    if (t === source) {
                        return anyType;
                    }
                }
                return t;
            };
        }
        function createInferenceMapper(context) {
            var mapper = function (t) {
                for (var i = 0; i < context.typeParameters.length; i++) {
                    if (t === context.typeParameters[i]) {
                        context.inferences[i].isFixed = true;
                        return getInferredType(context, i);
                    }
                }
                return t;
            };
            mapper.context = context;
            return mapper;
        }
        function identityMapper(type) {
            return type;
        }
        function combineTypeMappers(mapper1, mapper2) {
            return function (t) { return instantiateType(mapper1(t), mapper2); };
        }
        function instantiateTypeParameter(typeParameter, mapper) {
            var result = createType(ts.TypeFlags.TypeParameter);
            result.symbol = typeParameter.symbol;
            if (typeParameter.constraint) {
                result.constraint = instantiateType(typeParameter.constraint, mapper);
            }
            else {
                result.target = typeParameter;
                result.mapper = mapper;
            }
            return result;
        }
        function instantiateSignature(signature, mapper, eraseTypeParameters) {
            var freshTypeParameters;
            var freshTypePredicate;
            if (signature.typeParameters && !eraseTypeParameters) {
                freshTypeParameters = instantiateList(signature.typeParameters, mapper, instantiateTypeParameter);
                mapper = combineTypeMappers(createTypeMapper(signature.typeParameters, freshTypeParameters), mapper);
            }
            if (signature.typePredicate) {
                freshTypePredicate = {
                    parameterName: signature.typePredicate.parameterName,
                    parameterIndex: signature.typePredicate.parameterIndex,
                    type: instantiateType(signature.typePredicate.type, mapper)
                };
            }
            var result = createSignature(signature.declaration, freshTypeParameters, instantiateList(signature.parameters, mapper, instantiateSymbol), signature.resolvedReturnType ? instantiateType(signature.resolvedReturnType, mapper) : undefined, freshTypePredicate, signature.minArgumentCount, signature.hasRestParameter, signature.hasStringLiterals);
            result.target = signature;
            result.mapper = mapper;
            return result;
        }
        function instantiateSymbol(symbol, mapper) {
            if (symbol.flags & ts.SymbolFlags.Instantiated) {
                var links = getSymbolLinks(symbol);
                // If symbol being instantiated is itself a instantiation, fetch the original target and combine the
                // type mappers. This ensures that original type identities are properly preserved and that aliases
                // always reference a non-aliases.
                symbol = links.target;
                mapper = combineTypeMappers(links.mapper, mapper);
            }
            // Keep the flags from the symbol we're instantiating.  Mark that is instantiated, and
            // also transient so that we can just store data on it directly.
            var result = createSymbol(ts.SymbolFlags.Instantiated | ts.SymbolFlags.Transient | symbol.flags, symbol.name);
            result.declarations = symbol.declarations;
            result.parent = symbol.parent;
            result.target = symbol;
            result.mapper = mapper;
            if (symbol.valueDeclaration) {
                result.valueDeclaration = symbol.valueDeclaration;
            }
            return result;
        }
        function instantiateAnonymousType(type, mapper) {
            if (mapper.instantiations) {
                var cachedType = mapper.instantiations[type.id];
                if (cachedType) {
                    return cachedType;
                }
            }
            else {
                mapper.instantiations = [];
            }
            // Mark the anonymous type as instantiated such that our infinite instantiation detection logic can recognize it
            var result = createObjectType(ts.TypeFlags.Anonymous | ts.TypeFlags.Instantiated, type.symbol);
            result.properties = instantiateList(getPropertiesOfObjectType(type), mapper, instantiateSymbol);
            result.members = createSymbolTable(result.properties);
            result.callSignatures = instantiateList(getSignaturesOfType(type, ts.SignatureKind.Call), mapper, instantiateSignature);
            result.constructSignatures = instantiateList(getSignaturesOfType(type, ts.SignatureKind.Construct), mapper, instantiateSignature);
            var stringIndexType = getIndexTypeOfType(type, ts.IndexKind.String);
            var numberIndexType = getIndexTypeOfType(type, ts.IndexKind.Number);
            if (stringIndexType)
                result.stringIndexType = instantiateType(stringIndexType, mapper);
            if (numberIndexType)
                result.numberIndexType = instantiateType(numberIndexType, mapper);
            mapper.instantiations[type.id] = result;
            return result;
        }
        function instantiateType(type, mapper) {
            if (mapper !== identityMapper) {
                if (type.flags & ts.TypeFlags.TypeParameter) {
                    return mapper(type);
                }
                if (type.flags & ts.TypeFlags.Anonymous) {
                    return type.symbol && type.symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method | ts.SymbolFlags.Class | ts.SymbolFlags.TypeLiteral | ts.SymbolFlags.ObjectLiteral) ?
                        instantiateAnonymousType(type, mapper) : type;
                }
                if (type.flags & ts.TypeFlags.Reference) {
                    return createTypeReference(type.target, instantiateList(type.typeArguments, mapper, instantiateType));
                }
                if (type.flags & ts.TypeFlags.Tuple) {
                    return createTupleType(instantiateList(type.elementTypes, mapper, instantiateType));
                }
                if (type.flags & ts.TypeFlags.Union) {
                    return getUnionType(instantiateList(type.types, mapper, instantiateType), /*noSubtypeReduction*/ true);
                }
                if (type.flags & ts.TypeFlags.Intersection) {
                    return getIntersectionType(instantiateList(type.types, mapper, instantiateType));
                }
            }
            return type;
        }
        // Returns true if the given expression contains (at any level of nesting) a function or arrow expression
        // that is subject to contextual typing.
        function isContextSensitive(node) {
            ts.Debug.assert(node.kind !== ts.SyntaxKind.MethodDeclaration || ts.isObjectLiteralMethod(node));
            switch (node.kind) {
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    return isContextSensitiveFunctionLikeDeclaration(node);
                case ts.SyntaxKind.ObjectLiteralExpression:
                    return ts.forEach(node.properties, isContextSensitive);
                case ts.SyntaxKind.ArrayLiteralExpression:
                    return ts.forEach(node.elements, isContextSensitive);
                case ts.SyntaxKind.ConditionalExpression:
                    return isContextSensitive(node.whenTrue) ||
                        isContextSensitive(node.whenFalse);
                case ts.SyntaxKind.BinaryExpression:
                    return node.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
                        (isContextSensitive(node.left) || isContextSensitive(node.right));
                case ts.SyntaxKind.PropertyAssignment:
                    return isContextSensitive(node.initializer);
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    return isContextSensitiveFunctionLikeDeclaration(node);
                case ts.SyntaxKind.ParenthesizedExpression:
                    return isContextSensitive(node.expression);
            }
            return false;
        }
        function isContextSensitiveFunctionLikeDeclaration(node) {
            return !node.typeParameters && node.parameters.length && !ts.forEach(node.parameters, function (p) { return p.type; });
        }
        function getTypeWithoutSignatures(type) {
            if (type.flags & ts.TypeFlags.ObjectType) {
                var resolved = resolveStructuredTypeMembers(type);
                if (resolved.constructSignatures.length) {
                    var result = createObjectType(ts.TypeFlags.Anonymous, type.symbol);
                    result.members = resolved.members;
                    result.properties = resolved.properties;
                    result.callSignatures = emptyArray;
                    result.constructSignatures = emptyArray;
                    type = result;
                }
            }
            return type;
        }
        // TYPE CHECKING
        function isTypeIdenticalTo(source, target) {
            return checkTypeRelatedTo(source, target, identityRelation, /*errorNode*/ undefined);
        }
        function compareTypes(source, target) {
            return checkTypeRelatedTo(source, target, identityRelation, /*errorNode*/ undefined) ? ts.Ternary.True : ts.Ternary.False;
        }
        function isTypeSubtypeOf(source, target) {
            return checkTypeSubtypeOf(source, target, /*errorNode*/ undefined);
        }
        function isTypeAssignableTo(source, target) {
            return checkTypeAssignableTo(source, target, /*errorNode*/ undefined);
        }
        function checkTypeSubtypeOf(source, target, errorNode, headMessage, containingMessageChain) {
            return checkTypeRelatedTo(source, target, subtypeRelation, errorNode, headMessage, containingMessageChain);
        }
        function checkTypeAssignableTo(source, target, errorNode, headMessage, containingMessageChain) {
            return checkTypeRelatedTo(source, target, assignableRelation, errorNode, headMessage, containingMessageChain);
        }
        function isSignatureAssignableTo(source, target) {
            var sourceType = getOrCreateTypeFromSignature(source);
            var targetType = getOrCreateTypeFromSignature(target);
            return checkTypeRelatedTo(sourceType, targetType, assignableRelation, /*errorNode*/ undefined);
        }
        /**
         * Checks if 'source' is related to 'target' (e.g.: is a assignable to).
         * @param source The left-hand-side of the relation.
         * @param target The right-hand-side of the relation.
         * @param relation The relation considered. One of 'identityRelation', 'assignableRelation', or 'subTypeRelation'.
         * Used as both to determine which checks are performed and as a cache of previously computed results.
         * @param errorNode The suggested node upon which all errors will be reported, if defined. This may or may not be the actual node used.
         * @param headMessage If the error chain should be prepended by a head message, then headMessage will be used.
         * @param containingMessageChain A chain of errors to prepend any new errors found.
         */
        function checkTypeRelatedTo(source, target, relation, errorNode, headMessage, containingMessageChain) {
            var errorInfo;
            var sourceStack;
            var targetStack;
            var maybeStack;
            var expandingFlags;
            var depth = 0;
            var overflow = false;
            var elaborateErrors = false;
            ts.Debug.assert(relation !== identityRelation || !errorNode, "no error reporting in identity checking");
            var result = isRelatedTo(source, target, errorNode !== undefined, headMessage);
            if (overflow) {
                error(errorNode, ts.Diagnostics.Excessive_stack_depth_comparing_types_0_and_1, typeToString(source), typeToString(target));
            }
            else if (errorInfo) {
                // If we already computed this relation, but in a context where we didn't want to report errors (e.g. overload resolution),
                // then we'll only have a top-level error (e.g. 'Class X does not implement interface Y') without any details. If this happened,
                // request a recompuation to get a complete error message. This will be skipped if we've already done this computation in a context
                // where errors were being reported.
                if (errorInfo.next === undefined) {
                    errorInfo = undefined;
                    elaborateErrors = true;
                    isRelatedTo(source, target, errorNode !== undefined, headMessage);
                }
                if (containingMessageChain) {
                    errorInfo = ts.concatenateDiagnosticMessageChains(containingMessageChain, errorInfo);
                }
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(errorNode, errorInfo));
            }
            return result !== ts.Ternary.False;
            function reportError(message, arg0, arg1, arg2) {
                errorInfo = ts.chainDiagnosticMessages(errorInfo, message, arg0, arg1, arg2);
            }
            function reportRelationError(message, source, target) {
                var sourceType = typeToString(source);
                var targetType = typeToString(target);
                if (sourceType === targetType) {
                    sourceType = typeToString(source, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.UseFullyQualifiedType);
                    targetType = typeToString(target, /*enclosingDeclaration*/ undefined, ts.TypeFormatFlags.UseFullyQualifiedType);
                }
                reportError(message || ts.Diagnostics.Type_0_is_not_assignable_to_type_1, sourceType, targetType);
            }
            // Compare two types and return
            // Ternary.True if they are related with no assumptions,
            // Ternary.Maybe if they are related with assumptions of other relationships, or
            // Ternary.False if they are not related.
            function isRelatedTo(source, target, reportErrors, headMessage) {
                // [ConcreteTypeScript] Hack
                if (isConcreteType(source) && isConcreteType(target)) {
                    source = unconcrete(source);
                    target = unconcrete(target);
                }
                // [/ConcreteTypeScript] 
                var result;
                // both types are the same - covers 'they are the same primitive type or both are Any' or the same type parameter cases
                // [ConcreteTypeScript] TODO hack
                if (source === target || source.id === target.id) {
                    return ts.Ternary.True;
                }
                // [/ConcreteTypeScript] 
                if (relation === identityRelation) {
                    return isIdenticalTo(source, target);
                }
                if (isTypeAny(target))
                    return ts.Ternary.True;
                if (source === undefinedType)
                    return ts.Ternary.True;
                if (source === nullType && target !== undefinedType)
                    return ts.Ternary.True;
                if (source.flags & ts.TypeFlags.Enum && target === numberType)
                    return ts.Ternary.True;
                // [ConcreteTypeScript]
                // Enum types are also related to !number
                // FIXME: I'm not convinced that this is safe
                if (source.flags & ts.TypeFlags.Enum &&
                    target === numberType.concreteType)
                    return ts.Ternary.True;
                // floatNumber and intNumber are subtypes of number
                if ((source === floatNumberType || source === intNumberType) && target === numberType)
                    return ts.Ternary.True;
                // [/ConcreteTypeScript]
                if (source.flags & ts.TypeFlags.StringLiteral && target === stringType)
                    return ts.Ternary.True;
                if (relation === assignableRelation) {
                    if (isTypeAny(source))
                        return ts.Ternary.True;
                    if (source === numberType && target.flags & ts.TypeFlags.Enum)
                        return ts.Ternary.True;
                    // [ConcreteTypeScript] numbers are assignable to floatNumbers and intNumbers
                    if (source === numberType && (target === floatNumberType || target === intNumberType))
                        return ts.Ternary.True;
                }
                if (source.flags & ts.TypeFlags.FreshObjectLiteral) {
                    if (hasExcessProperties(source, target, reportErrors)) {
                        if (reportErrors) {
                            reportRelationError(headMessage, source, target);
                        }
                        return ts.Ternary.False;
                    }
                    // Above we check for excess properties with respect to the entire target type. When union
                    // and intersection types are further deconstructed on the target side, we don't want to
                    // make the check again (as it might fail for a partial target type). Therefore we obtain
                    // the regular source type and proceed with that.
                    if (target.flags & ts.TypeFlags.UnionOrIntersection) {
                        source = getRegularTypeOfObjectLiteral(source);
                    }
                }
                var saveErrorInfo = errorInfo;
                // Note that the "each" checks must precede the "some" checks to produce the correct results
                if (source.flags & ts.TypeFlags.Union) {
                    if (result = eachTypeRelatedToType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else if (isConcreteType(source)) {
                    if (result = concreteTypeRelatedToType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else if (isConcreteType(target)) {
                    if (result = typeRelatedToConcreteType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else if (target.flags & ts.TypeFlags.Intersection) {
                    if (result = typeRelatedToEachType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else {
                    // It is necessary to try "some" checks on both sides because there may be nested "each" checks
                    // on either side that need to be prioritized. For example, A | B = (A | B) & (C | D) or
                    // A & B = (A & B) | (C & D).
                    if (source.flags & ts.TypeFlags.Intersection) {
                        // If target is a union type the following check will report errors so we suppress them here
                        if (result = someTypeRelatedToType(source, target, reportErrors && !(target.flags & ts.TypeFlags.Union))) {
                            return result;
                        }
                    }
                    if (target.flags & ts.TypeFlags.Union) {
                        if (result = typeRelatedToSomeType(source, target, reportErrors)) {
                            return result;
                        }
                    }
                }
                if (source.flags & ts.TypeFlags.TypeParameter) {
                    var constraint = getConstraintOfTypeParameter(source);
                    if (!constraint || constraint.flags & ts.TypeFlags.Any) {
                        constraint = emptyObjectType;
                    }
                    // Report constraint errors only if the constraint is not the empty object type
                    var reportConstraintErrors = reportErrors && constraint !== emptyObjectType;
                    if (result = isRelatedTo(constraint, target, reportConstraintErrors)) {
                        errorInfo = saveErrorInfo;
                        return result;
                    }
                }
                else {
                    if (source.flags & ts.TypeFlags.Reference && target.flags & ts.TypeFlags.Reference && source.target === target.target) {
                        // We have type references to same target type, see if relationship holds for all type arguments
                        if (result = typesRelatedTo(source.typeArguments, target.typeArguments, reportErrors)) {
                            return result;
                        }
                    }
                    // Even if relationship doesn't hold for unions, intersections, or generic type references,
                    // it may hold in a structural comparison.
                    var apparentType = getApparentType(source);
                    // In a check of the form X = A & B, we will have previously checked if A relates to X or B relates
                    // to X. Failing both of those we want to check if the aggregation of A and B's members structurally
                    // relates to X. Thus, we include intersection types on the source side here.
                    if (unconcrete(apparentType).flags & (ts.TypeFlags.ObjectType | ts.TypeFlags.Intersection) && unconcrete(target).flags & ts.TypeFlags.ObjectType) {
                        // Report structural errors only if we haven't reported any errors yet
                        var reportStructuralErrors = reportErrors && errorInfo === saveErrorInfo;
                        if (result = objectTypeRelatedTo(apparentType, target, reportStructuralErrors)) {
                            errorInfo = saveErrorInfo;
                            return result;
                        }
                    }
                }
                if (reportErrors) {
                    reportRelationError(headMessage, source, target);
                }
                return ts.Ternary.False;
            }
            function isIdenticalTo(source, target) {
                // [ConcreteTypeScript]
                if (isConcreteType(source) && isConcreteType(target)) {
                    var result_1 = isTypeIdenticalTo(unconcrete(source), unconcrete(target));
                    return result_1 ? ts.Ternary.True : ts.Ternary.False;
                }
                // [/ConcreteTypeScript]
                var result;
                if (source.flags & ts.TypeFlags.ObjectType && target.flags & ts.TypeFlags.ObjectType) {
                    if (source.flags & ts.TypeFlags.Reference && target.flags & ts.TypeFlags.Reference && source.target === target.target) {
                        // We have type references to same target type, see if all type arguments are identical
                        if (result = typesRelatedTo(source.typeArguments, target.typeArguments, /*reportErrors*/ false)) {
                            return result;
                        }
                    }
                    return objectTypeRelatedTo(source, target, /*reportErrors*/ false);
                }
                if (source.flags & ts.TypeFlags.TypeParameter && target.flags & ts.TypeFlags.TypeParameter) {
                    return typeParameterIdenticalTo(source, target);
                }
                if (source.flags & ts.TypeFlags.Union && target.flags & ts.TypeFlags.Union ||
                    source.flags & ts.TypeFlags.Intersection && target.flags & ts.TypeFlags.Intersection) {
                    if (result = eachTypeRelatedToSomeType(source, target)) {
                        if (result &= eachTypeRelatedToSomeType(target, source)) {
                            return result;
                        }
                    }
                }
                return ts.Ternary.False;
            }
            // Check if a property with the given name is known anywhere in the given type. In an object type, a property
            // is considered known if the object type is empty and the check is for assignability, if the object type has
            // index signatures, or if the property is actually declared in the object type. In a union or intersection
            // type, a property is considered known if it is known in any constituent type.
            function isKnownProperty(type, name) {
                if (type.flags & ts.TypeFlags.ObjectType) {
                    var resolved = resolveStructuredTypeMembers(type);
                    if (relation === assignableRelation && (type === globalObjectType || resolved.properties.length === 0) ||
                        resolved.stringIndexType || resolved.numberIndexType || getPropertyOfType(type, name)) {
                        return true;
                    }
                    return false;
                }
                if (type.flags & ts.TypeFlags.UnionOrIntersection) {
                    for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                        var t = _a[_i];
                        if (isKnownProperty(t, name)) {
                            return true;
                        }
                    }
                    return false;
                }
                return true;
            }
            function hasExcessProperties(source, target, reportErrors) {
                for (var _i = 0, _a = getPropertiesOfObjectType(source); _i < _a.length; _i++) {
                    var prop = _a[_i];
                    if (!isKnownProperty(target, prop.name)) {
                        if (reportErrors) {
                            // We know *exactly* where things went wrong when comparing the types.
                            // Use this property as the error node as this will be more helpful in
                            // reasoning about what went wrong.
                            errorNode = prop.valueDeclaration;
                            reportError(ts.Diagnostics.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, symbolToString(prop), typeToString(target));
                        }
                        return true;
                    }
                }
            }
            function eachTypeRelatedToSomeType(source, target) {
                var result = ts.Ternary.True;
                var sourceTypes = source.types;
                for (var _i = 0; _i < sourceTypes.length; _i++) {
                    var sourceType = sourceTypes[_i];
                    var related = typeRelatedToSomeType(sourceType, target, false);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            function typeRelatedToSomeType(source, target, reportErrors) {
                var targetTypes = target.types;
                for (var i = 0, len = targetTypes.length; i < len; i++) {
                    var related = isRelatedTo(source, targetTypes[i], reportErrors && i === len - 1);
                    if (related) {
                        return related;
                    }
                }
                return ts.Ternary.False;
            }
            function typeRelatedToEachType(source, target, reportErrors) {
                var result = ts.Ternary.True;
                var targetTypes = target.types;
                for (var _i = 0; _i < targetTypes.length; _i++) {
                    var targetType = targetTypes[_i];
                    var related = isRelatedTo(source, targetType, reportErrors);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            function someTypeRelatedToType(source, target, reportErrors) {
                var sourceTypes = source.types;
                for (var i = 0, len = sourceTypes.length; i < len; i++) {
                    var related = isRelatedTo(sourceTypes[i], target, reportErrors && i === len - 1);
                    if (related) {
                        return related;
                    }
                }
                return ts.Ternary.False;
            }
            function eachTypeRelatedToType(source, target, reportErrors) {
                var result = ts.Ternary.True;
                var sourceTypes = source.types;
                for (var _i = 0; _i < sourceTypes.length; _i++) {
                    var sourceType = sourceTypes[_i];
                    var related = isRelatedTo(sourceType, target, reportErrors);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            // [ConcreteTypeScript] Type relationships between concrete and unconcrete types
            function typeRelatedToConcreteType(source, target, reportErrors) {
                if (isConcreteType(source)) {
                    // !x <: !y iff x <: y
                    return isRelatedTo(source.baseType, target.baseType, reportErrors);
                }
                return ts.Ternary.False;
            }
            function concreteTypeRelatedToType(source, target, reportErrors) {
                if (isConcreteType(target)) {
                    // !x <: !y iff x <: y
                    return isRelatedTo(source.baseType, target.baseType, reportErrors);
                }
                else {
                    // !x <: y iff x <: y
                    return isRelatedTo(source.baseType, target, reportErrors);
                }
            }
            // [/ConcreteTypeScript]
            function typesRelatedTo(sources, targets, reportErrors) {
                var result = ts.Ternary.True;
                for (var i = 0, len = sources.length; i < len; i++) {
                    var related = isRelatedTo(sources[i], targets[i], reportErrors);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            function typeParameterIdenticalTo(source, target) {
                if (source.symbol.name !== target.symbol.name) {
                    return ts.Ternary.False;
                }
                // covers case when both type parameters does not have constraint (both equal to noConstraintType)
                if (source.constraint === target.constraint) {
                    return ts.Ternary.True;
                }
                if (source.constraint === noConstraintType || target.constraint === noConstraintType) {
                    return ts.Ternary.False;
                }
                return isIdenticalTo(source.constraint, target.constraint);
            }
            // Determine if two object types are related by structure. First, check if the result is already available in the global cache.
            // Second, check if we have already started a comparison of the given two types in which case we assume the result to be true.
            // Third, check if both types are part of deeply nested chains of generic type instantiations and if so assume the types are
            // equal and infinitely expanding. Fourth, if we have reached a depth of 100 nested comparisons, assume we have runaway recursion
            // and issue an error. Otherwise, actually compare the structure of the two types.
            function objectTypeRelatedTo(source, target, reportErrors) {
                if (overflow) {
                    return ts.Ternary.False;
                }
                var id = relation !== identityRelation || source.id < target.id ? source.id + "," + target.id : target.id + "," + source.id;
                var related = relation[id];
                if (related !== undefined) {
                    // If we computed this relation already and it was failed and reported, or if we're not being asked to elaborate
                    // errors, we can use the cached value. Otherwise, recompute the relation
                    if (!elaborateErrors || (related === ts.RelationComparisonResult.FailedAndReported)) {
                        return related === ts.RelationComparisonResult.Succeeded ? ts.Ternary.True : ts.Ternary.False;
                    }
                }
                if (depth > 0) {
                    for (var i = 0; i < depth; i++) {
                        // If source and target are already being compared, consider them related with assumptions
                        if (maybeStack[i][id]) {
                            return ts.Ternary.Maybe;
                        }
                    }
                    if (depth === 100) {
                        overflow = true;
                        return ts.Ternary.False;
                    }
                }
                else {
                    sourceStack = [];
                    targetStack = [];
                    maybeStack = [];
                    expandingFlags = 0;
                }
                sourceStack[depth] = source;
                targetStack[depth] = target;
                maybeStack[depth] = {};
                maybeStack[depth][id] = ts.RelationComparisonResult.Succeeded;
                depth++;
                var saveExpandingFlags = expandingFlags;
                if (!(expandingFlags & 1) && isDeeplyNestedGeneric(source, sourceStack, depth))
                    expandingFlags |= 1;
                if (!(expandingFlags & 2) && isDeeplyNestedGeneric(target, targetStack, depth))
                    expandingFlags |= 2;
                var result;
                if (expandingFlags === 3) {
                    result = ts.Ternary.Maybe;
                }
                else {
                    result = propertiesRelatedTo(source, target, reportErrors);
                    if (result) {
                        result &= signaturesRelatedTo(source, target, ts.SignatureKind.Call, reportErrors);
                        if (result) {
                            result &= signaturesRelatedTo(source, target, ts.SignatureKind.Construct, reportErrors);
                            if (result) {
                                result &= stringIndexTypesRelatedTo(source, target, reportErrors);
                                if (result) {
                                    result &= numberIndexTypesRelatedTo(source, target, reportErrors);
                                }
                            }
                        }
                    }
                }
                expandingFlags = saveExpandingFlags;
                depth--;
                // [ConcreteTypeScript]
                // TODO Make a test case for this and reevaluate if its needed
                // We enforce that classes are only related if specified as such
                if (result && target.flags & (ts.TypeFlags.Class | ts.TypeFlags.Declare) && source.flags & (ts.TypeFlags.Class | ts.TypeFlags.Declare)) {
                    if (hasBaseType(source, target)) {
                        result = ts.Ternary.True;
                    }
                    else {
                        result = ts.Ternary.False;
                    }
                }
                // [/ConcreteTypeScript]
                if (result) {
                    var maybeCache = maybeStack[depth];
                    // If result is definitely true, copy assumptions to global cache, else copy to next level up
                    var destinationCache = (result === ts.Ternary.True || depth === 0) ? relation : maybeStack[depth - 1];
                    ts.copyMap(maybeCache, destinationCache);
                }
                else {
                    // A false result goes straight into global cache (when something is false under assumptions it
                    // will also be false without assumptions)
                    relation[id] = reportErrors ? ts.RelationComparisonResult.FailedAndReported : ts.RelationComparisonResult.Failed;
                }
                return result;
            }
            function propertiesRelatedTo(source, target, reportErrors) {
                if (relation === identityRelation) {
                    return propertiesIdenticalTo(source, target);
                }
                var result = ts.Ternary.True;
                var properties = getPropertiesOfObjectType(target);
                var requireOptionalProperties = relation === subtypeRelation && !(source.flags & ts.TypeFlags.ObjectLiteral);
                for (var _i = 0; _i < properties.length; _i++) {
                    var targetProp = properties[_i];
                    var sourceProp = getPropertyOfType(source, targetProp.name);
                    if (sourceProp !== targetProp) {
                        if (!sourceProp) {
                            if (!(targetProp.flags & ts.SymbolFlags.Optional) || requireOptionalProperties) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_missing_in_type_1, symbolToString(targetProp), typeToString(source));
                                }
                                return ts.Ternary.False;
                            }
                        }
                        else if (!(targetProp.flags & ts.SymbolFlags.Prototype)) {
                            var sourcePropFlags = getDeclarationFlagsFromSymbol(sourceProp);
                            var targetPropFlags = getDeclarationFlagsFromSymbol(targetProp);
                            if (sourcePropFlags & ts.NodeFlags.Private || targetPropFlags & ts.NodeFlags.Private) {
                                if (sourceProp.valueDeclaration !== targetProp.valueDeclaration) {
                                    if (reportErrors) {
                                        if (sourcePropFlags & ts.NodeFlags.Private && targetPropFlags & ts.NodeFlags.Private) {
                                            reportError(ts.Diagnostics.Types_have_separate_declarations_of_a_private_property_0, symbolToString(targetProp));
                                        }
                                        else {
                                            reportError(ts.Diagnostics.Property_0_is_private_in_type_1_but_not_in_type_2, symbolToString(targetProp), typeToString(sourcePropFlags & ts.NodeFlags.Private ? source : target), typeToString(sourcePropFlags & ts.NodeFlags.Private ? target : source));
                                        }
                                    }
                                    return ts.Ternary.False;
                                }
                            }
                            else if (targetPropFlags & ts.NodeFlags.Protected) {
                                var sourceDeclaredInClass = sourceProp.parent && sourceProp.parent.flags & ts.SymbolFlags.Class;
                                var sourceClass = sourceDeclaredInClass ? getDeclaredTypeOfSymbol(sourceProp.parent) : undefined;
                                var targetClass = getDeclaredTypeOfSymbol(targetProp.parent);
                                if (!sourceClass || !hasBaseType(sourceClass, targetClass)) {
                                    if (reportErrors) {
                                        reportError(ts.Diagnostics.Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2, symbolToString(targetProp), typeToString(sourceClass || source), typeToString(targetClass));
                                    }
                                    return ts.Ternary.False;
                                }
                            }
                            else if (sourcePropFlags & ts.NodeFlags.Protected) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_protected_in_type_1_but_public_in_type_2, symbolToString(targetProp), typeToString(source), typeToString(target));
                                }
                                return ts.Ternary.False;
                            }
                            var related = isRelatedTo(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp), reportErrors);
                            if (!related) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Types_of_property_0_are_incompatible, symbolToString(targetProp));
                                }
                                return ts.Ternary.False;
                            }
                            result &= related;
                            if (sourceProp.flags & ts.SymbolFlags.Optional && !(targetProp.flags & ts.SymbolFlags.Optional)) {
                                // TypeScript 1.0 spec (April 2014): 3.8.3
                                // S is a subtype of a type T, and T is a supertype of S if ...
                                // S' and T are object types and, for each member M in T..
                                // M is a property and S' contains a property N where
                                // if M is a required property, N is also a required property
                                // (M - property in T)
                                // (N - property in S)
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_optional_in_type_1_but_required_in_type_2, symbolToString(targetProp), typeToString(source), typeToString(target));
                                }
                                return ts.Ternary.False;
                            }
                        }
                    }
                }
                return result;
            }
            function propertiesIdenticalTo(source, target) {
                if (!(source.flags & ts.TypeFlags.ObjectType && target.flags & ts.TypeFlags.ObjectType)) {
                    return ts.Ternary.False;
                }
                var sourceProperties = getPropertiesOfObjectType(source);
                var targetProperties = getPropertiesOfObjectType(target);
                if (sourceProperties.length !== targetProperties.length) {
                    return ts.Ternary.False;
                }
                var result = ts.Ternary.True;
                for (var _i = 0; _i < sourceProperties.length; _i++) {
                    var sourceProp = sourceProperties[_i];
                    var targetProp = getPropertyOfObjectType(target, sourceProp.name);
                    if (!targetProp) {
                        return ts.Ternary.False;
                    }
                    var related = compareProperties(sourceProp, targetProp, isRelatedTo);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            function signaturesRelatedTo(source, target, kind, reportErrors) {
                if (relation === identityRelation) {
                    return signaturesIdenticalTo(source, target, kind);
                }
                if (target === anyFunctionType || source === anyFunctionType) {
                    return ts.Ternary.True;
                }
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                var result = ts.Ternary.True;
                var saveErrorInfo = errorInfo;
                if (kind === ts.SignatureKind.Construct) {
                    // Only want to compare the construct signatures for abstractness guarantees.
                    // Because the "abstractness" of a class is the same across all construct signatures
                    // (internally we are checking the corresponding declaration), it is enough to perform
                    // the check and report an error once over all pairs of source and target construct signatures.
                    //
                    // sourceSig and targetSig are (possibly) undefined.
                    //
                    // Note that in an extends-clause, targetSignatures is stripped, so the check never proceeds.
                    var sourceSig = sourceSignatures[0];
                    var targetSig = targetSignatures[0];
                    result &= abstractSignatureRelatedTo(source, sourceSig, target, targetSig);
                    if (result !== ts.Ternary.True) {
                        return result;
                    }
                }
                outer: for (var _i = 0; _i < targetSignatures.length; _i++) {
                    var t = targetSignatures[_i];
                    if (!t.hasStringLiterals || target.flags & ts.TypeFlags.FromSignature) {
                        var localErrors = reportErrors;
                        var checkedAbstractAssignability = false;
                        for (var _a = 0; _a < sourceSignatures.length; _a++) {
                            var s = sourceSignatures[_a];
                            if (!s.hasStringLiterals || source.flags & ts.TypeFlags.FromSignature) {
                                var related = signatureRelatedTo(s, t, localErrors);
                                if (related) {
                                    result &= related;
                                    errorInfo = saveErrorInfo;
                                    continue outer;
                                }
                                // Only report errors from the first failure
                                localErrors = false;
                            }
                        }
                        return ts.Ternary.False;
                    }
                }
                return result;
                function abstractSignatureRelatedTo(source, sourceSig, target, targetSig) {
                    if (sourceSig && targetSig) {
                        var sourceDecl = source.symbol && getClassLikeDeclarationOfSymbol(source.symbol);
                        var targetDecl = target.symbol && getClassLikeDeclarationOfSymbol(target.symbol);
                        if (!sourceDecl) {
                            // If the source object isn't itself a class declaration, it can be freely assigned, regardless
                            // of whether the constructed object is abstract or not.
                            return ts.Ternary.True;
                        }
                        var sourceErasedSignature = getErasedSignature(sourceSig);
                        var targetErasedSignature = getErasedSignature(targetSig);
                        var sourceReturnType = sourceErasedSignature && getReturnTypeOfSignature(sourceErasedSignature);
                        var targetReturnType = targetErasedSignature && getReturnTypeOfSignature(targetErasedSignature);
                        var sourceReturnDecl = sourceReturnType && sourceReturnType.symbol && getClassLikeDeclarationOfSymbol(sourceReturnType.symbol);
                        var targetReturnDecl = targetReturnType && targetReturnType.symbol && getClassLikeDeclarationOfSymbol(targetReturnType.symbol);
                        var sourceIsAbstract = sourceReturnDecl && sourceReturnDecl.flags & ts.NodeFlags.Abstract;
                        var targetIsAbstract = targetReturnDecl && targetReturnDecl.flags & ts.NodeFlags.Abstract;
                        if (sourceIsAbstract && !(targetIsAbstract && targetDecl)) {
                            // if target isn't a class-declaration type, then it can be new'd, so we forbid the assignment.
                            if (reportErrors) {
                                reportError(ts.Diagnostics.Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type);
                            }
                            return ts.Ternary.False;
                        }
                    }
                    return ts.Ternary.True;
                }
            }
            function signatureRelatedTo(source, target, reportErrors) {
                if (source === target) {
                    return ts.Ternary.True;
                }
                if (!target.hasRestParameter && source.minArgumentCount > target.parameters.length) {
                    return ts.Ternary.False;
                }
                // [ConcreteTypeScript]
                // Do we both have 'this' types, but they aren't related?
                if (source.resolvedThisType && target.resolvedThisType && !isRelatedTo(source.resolvedThisType, target.resolvedThisType, reportErrors)) {
                }
                // [/ConcreteTypeScript]
                var sourceMax = source.parameters.length;
                var targetMax = target.parameters.length;
                var checkCount;
                if (source.hasRestParameter && target.hasRestParameter) {
                    checkCount = sourceMax > targetMax ? sourceMax : targetMax;
                    sourceMax--;
                    targetMax--;
                }
                else if (source.hasRestParameter) {
                    sourceMax--;
                    checkCount = targetMax;
                }
                else if (target.hasRestParameter) {
                    targetMax--;
                    checkCount = sourceMax;
                }
                else {
                    checkCount = sourceMax < targetMax ? sourceMax : targetMax;
                }
                // Spec 1.0 Section 3.8.3 & 3.8.4:
                // M and N (the signatures) are instantiated using type Any as the type argument for all type parameters declared by M and N
                source = getErasedSignature(source);
                target = getErasedSignature(target);
                var result = ts.Ternary.True;
                for (var i = 0; i < checkCount; i++) {
                    var s = i < sourceMax ? getTypeOfSymbol(source.parameters[i]) : getRestTypeOfSignature(source);
                    var t = i < targetMax ? getTypeOfSymbol(target.parameters[i]) : getRestTypeOfSignature(target);
                    var saveErrorInfo = errorInfo;
                    var related = isRelatedTo(s, t, reportErrors);
                    if (!related) {
                        related = isRelatedTo(t, s, false);
                        if (!related) {
                            if (reportErrors) {
                                reportError(ts.Diagnostics.Types_of_parameters_0_and_1_are_incompatible, source.parameters[i < sourceMax ? i : sourceMax].name, target.parameters[i < targetMax ? i : targetMax].name);
                            }
                            return ts.Ternary.False;
                        }
                        errorInfo = saveErrorInfo;
                    }
                    result &= related;
                }
                if (source.typePredicate && target.typePredicate) {
                    var hasDifferentParameterIndex = source.typePredicate.parameterIndex !== target.typePredicate.parameterIndex;
                    var hasDifferentTypes;
                    if (hasDifferentParameterIndex ||
                        (hasDifferentTypes = !isTypeIdenticalTo(source.typePredicate.type, target.typePredicate.type))) {
                        if (reportErrors) {
                            var sourceParamText = source.typePredicate.parameterName;
                            var targetParamText = target.typePredicate.parameterName;
                            var sourceTypeText = typeToString(source.typePredicate.type);
                            var targetTypeText = typeToString(target.typePredicate.type);
                            if (hasDifferentParameterIndex) {
                                reportError(ts.Diagnostics.Parameter_0_is_not_in_the_same_position_as_parameter_1, sourceParamText, targetParamText);
                            }
                            else if (hasDifferentTypes) {
                                reportError(ts.Diagnostics.Type_0_is_not_assignable_to_type_1, sourceTypeText, targetTypeText);
                            }
                            reportError(ts.Diagnostics.Type_predicate_0_is_not_assignable_to_1, sourceParamText + " is " + sourceTypeText, targetParamText + " is " + targetTypeText);
                        }
                        return ts.Ternary.False;
                    }
                }
                else if (!source.typePredicate && target.typePredicate) {
                    if (reportErrors) {
                        reportError(ts.Diagnostics.Signature_0_must_have_a_type_predicate, signatureToString(source));
                    }
                    return ts.Ternary.False;
                }
                var targetReturnType = getReturnTypeOfSignature(target);
                if (targetReturnType === voidType)
                    return result;
                var sourceReturnType = getReturnTypeOfSignature(source);
                return result & isRelatedTo(sourceReturnType, targetReturnType, reportErrors);
            }
            function signaturesIdenticalTo(source, target, kind) {
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                if (sourceSignatures.length !== targetSignatures.length) {
                    return ts.Ternary.False;
                }
                var result = ts.Ternary.True;
                for (var i = 0, len = sourceSignatures.length; i < len; ++i) {
                    var related = compareSignatures(sourceSignatures[i], targetSignatures[i], /*partialMatch*/ false, /*ignoreReturnTypes*/ false, isRelatedTo);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
                return result;
            }
            function stringIndexTypesRelatedTo(source, target, reportErrors) {
                if (relation === identityRelation) {
                    return indexTypesIdenticalTo(ts.IndexKind.String, source, target);
                }
                var targetType = getIndexTypeOfType(target, ts.IndexKind.String);
                if (targetType && !(targetType.flags & ts.TypeFlags.Any)) {
                    var sourceType = getIndexTypeOfType(source, ts.IndexKind.String);
                    if (!sourceType) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signature_is_missing_in_type_0, typeToString(source));
                        }
                        return ts.Ternary.False;
                    }
                    var related = isRelatedTo(sourceType, targetType, reportErrors);
                    if (!related) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signatures_are_incompatible);
                        }
                        return ts.Ternary.False;
                    }
                    return related;
                }
                return ts.Ternary.True;
            }
            function numberIndexTypesRelatedTo(source, target, reportErrors) {
                if (relation === identityRelation) {
                    return indexTypesIdenticalTo(ts.IndexKind.Number, source, target);
                }
                var targetType = getIndexTypeOfType(target, ts.IndexKind.Number);
                if (targetType && !(targetType.flags & ts.TypeFlags.Any)) {
                    var sourceStringType = getIndexTypeOfType(source, ts.IndexKind.String);
                    var sourceNumberType = getIndexTypeOfType(source, ts.IndexKind.Number);
                    if (!(sourceStringType || sourceNumberType)) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signature_is_missing_in_type_0, typeToString(source));
                        }
                        return ts.Ternary.False;
                    }
                    var related;
                    if (sourceStringType && sourceNumberType) {
                        // If we know for sure we're testing both string and numeric index types then only report errors from the second one
                        related = isRelatedTo(sourceStringType, targetType, false) || isRelatedTo(sourceNumberType, targetType, reportErrors);
                    }
                    else {
                        related = isRelatedTo(sourceStringType || sourceNumberType, targetType, reportErrors);
                    }
                    if (!related) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signatures_are_incompatible);
                        }
                        return ts.Ternary.False;
                    }
                    return related;
                }
                return ts.Ternary.True;
            }
            function indexTypesIdenticalTo(indexKind, source, target) {
                var targetType = getIndexTypeOfType(target, indexKind);
                var sourceType = getIndexTypeOfType(source, indexKind);
                if (!sourceType && !targetType) {
                    return ts.Ternary.True;
                }
                if (sourceType && targetType) {
                    return isRelatedTo(sourceType, targetType);
                }
                return ts.Ternary.False;
            }
        }
        // Return true if the given type is part of a deeply nested chain of generic instantiations. We consider this to be the case
        // when structural type comparisons have been started for 10 or more instantiations of the same generic type. It is possible,
        // though highly unlikely, for this test to be true in a situation where a chain of instantiations is not infinitely expanding.
        // Effectively, we will generate a false positive when two types are structurally equal to at least 10 levels, but unequal at
        // some level beyond that.
        function isDeeplyNestedGeneric(type, stack, depth) {
            // We track type references (created by createTypeReference) and instantiated types (created by instantiateType)
            if (type.flags & (ts.TypeFlags.Reference | ts.TypeFlags.Instantiated) && depth >= 5) {
                var symbol = type.symbol;
                var count = 0;
                for (var i = 0; i < depth; i++) {
                    var t = stack[i];
                    if (t.flags & (ts.TypeFlags.Reference | ts.TypeFlags.Instantiated) && t.symbol === symbol) {
                        count++;
                        if (count >= 5)
                            return true;
                    }
                }
            }
            return false;
        }
        function isPropertyIdenticalTo(sourceProp, targetProp) {
            return compareProperties(sourceProp, targetProp, compareTypes) !== ts.Ternary.False;
        }
        function compareProperties(sourceProp, targetProp, compareTypes) {
            // Two members are considered identical when
            // - they are public properties with identical names, optionality, and types,
            // - they are private or protected properties originating in the same declaration and having identical types
            if (sourceProp === targetProp) {
                return ts.Ternary.True;
            }
            var sourcePropAccessibility = getDeclarationFlagsFromSymbol(sourceProp) & (ts.NodeFlags.Private | ts.NodeFlags.Protected);
            var targetPropAccessibility = getDeclarationFlagsFromSymbol(targetProp) & (ts.NodeFlags.Private | ts.NodeFlags.Protected);
            if (sourcePropAccessibility !== targetPropAccessibility) {
                return ts.Ternary.False;
            }
            if (sourcePropAccessibility) {
                if (getTargetSymbol(sourceProp) !== getTargetSymbol(targetProp)) {
                    return ts.Ternary.False;
                }
            }
            else {
                if ((sourceProp.flags & ts.SymbolFlags.Optional) !== (targetProp.flags & ts.SymbolFlags.Optional)) {
                    return ts.Ternary.False;
                }
            }
            return compareTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
        }
        function compareSignatures(source, target, partialMatch, ignoreReturnTypes, compareTypes) {
            if (source === target) {
                return ts.Ternary.True;
            }
            if (source.parameters.length !== target.parameters.length ||
                source.minArgumentCount !== target.minArgumentCount ||
                source.hasRestParameter !== target.hasRestParameter) {
                if (!partialMatch ||
                    source.parameters.length < target.parameters.length && !source.hasRestParameter ||
                    source.minArgumentCount > target.minArgumentCount) {
                    return ts.Ternary.False;
                }
            }
            var result = ts.Ternary.True;
            if (source.typeParameters && target.typeParameters) {
                if (source.typeParameters.length !== target.typeParameters.length) {
                    return ts.Ternary.False;
                }
                for (var i = 0, len = source.typeParameters.length; i < len; ++i) {
                    var related = compareTypes(source.typeParameters[i], target.typeParameters[i]);
                    if (!related) {
                        return ts.Ternary.False;
                    }
                    result &= related;
                }
            }
            else if (source.typeParameters || target.typeParameters) {
                return ts.Ternary.False;
            }
            // Spec 1.0 Section 3.8.3 & 3.8.4:
            // M and N (the signatures) are instantiated using type Any as the type argument for all type parameters declared by M and N
            source = getErasedSignature(source);
            target = getErasedSignature(target);
            var sourceLen = source.parameters.length;
            var targetLen = target.parameters.length;
            for (var i = 0; i < targetLen; i++) {
                var s = source.hasRestParameter && i === sourceLen - 1 ? getRestTypeOfSignature(source) : getTypeOfSymbol(source.parameters[i]);
                var t = target.hasRestParameter && i === targetLen - 1 ? getRestTypeOfSignature(target) : getTypeOfSymbol(target.parameters[i]);
                var related = compareTypes(s, t);
                if (!related) {
                    return ts.Ternary.False;
                }
                result &= related;
            }
            if (!ignoreReturnTypes) {
                result &= compareTypes(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
            }
            return result;
        }
        function isSupertypeOfEach(candidate, types) {
            for (var _i = 0; _i < types.length; _i++) {
                var type = types[_i];
                if (candidate !== type && !isTypeSubtypeOf(type, candidate))
                    return false;
            }
            return true;
        }
        function getCommonSupertype(types) {
            return ts.forEach(types, function (t) { return isSupertypeOfEach(t, types) ? t : undefined; });
        }
        function reportNoCommonSupertypeError(types, errorLocation, errorMessageChainHead) {
            // The downfallType/bestSupertypeDownfallType is the first type that caused a particular candidate
            // to not be the common supertype. So if it weren't for this one downfallType (and possibly others),
            // the type in question could have been the common supertype.
            var bestSupertype;
            var bestSupertypeDownfallType;
            var bestSupertypeScore = 0;
            for (var i = 0; i < types.length; i++) {
                var score = 0;
                var downfallType = undefined;
                for (var j = 0; j < types.length; j++) {
                    if (isTypeSubtypeOf(types[j], types[i])) {
                        score++;
                    }
                    else if (!downfallType) {
                        downfallType = types[j];
                    }
                }
                ts.Debug.assert(!!downfallType, "If there is no common supertype, each type should have a downfallType");
                if (score > bestSupertypeScore) {
                    bestSupertype = types[i];
                    bestSupertypeDownfallType = downfallType;
                    bestSupertypeScore = score;
                }
                // types.length - 1 is the maximum score, given that getCommonSupertype returned false
                if (bestSupertypeScore === types.length - 1) {
                    break;
                }
            }
            // In the following errors, the {1} slot is before the {0} slot because checkTypeSubtypeOf supplies the
            // subtype as the first argument to the error
            checkTypeSubtypeOf(bestSupertypeDownfallType, bestSupertype, errorLocation, ts.Diagnostics.Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0, errorMessageChainHead);
        }
        function isArrayType(type) {
            return type.flags & ts.TypeFlags.Reference && type.target === globalArrayType;
        }
        function isArrayLikeType(type) {
            // A type is array-like if it is not the undefined or null type and if it is assignable to any[]
            return !(type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) && isTypeAssignableTo(type, anyArrayType);
        }
        function isTupleLikeType(type) {
            return !!getPropertyOfType(type, "0");
        }
        /**
         * Check if a Type was written as a tuple type literal.
         * Prefer using isTupleLikeType() unless the use of `elementTypes` is required.
         */
        function isTupleType(type) {
            return !!(type.flags & ts.TypeFlags.Tuple);
        }
        function getRegularTypeOfObjectLiteral(type) {
            if (type.flags & ts.TypeFlags.FreshObjectLiteral) {
                var regularType = type.regularType;
                if (!regularType) {
                    regularType = createType(type.flags & ~ts.TypeFlags.FreshObjectLiteral);
                    regularType.symbol = type.symbol;
                    regularType.members = type.members;
                    regularType.properties = type.properties;
                    regularType.callSignatures = type.callSignatures;
                    regularType.constructSignatures = type.constructSignatures;
                    regularType.stringIndexType = type.stringIndexType;
                    regularType.numberIndexType = type.numberIndexType;
                    type.regularType = regularType;
                }
                return regularType;
            }
            return type;
        }
        function getWidenedTypeOfObjectLiteral(type) {
            var properties = getPropertiesOfObjectType(type);
            var members = {};
            ts.forEach(properties, function (p) {
                var propType = getTypeOfSymbol(p);
                var widenedType = getWidenedType(propType);
                if (propType !== widenedType) {
                    var symbol = createSymbol(p.flags | ts.SymbolFlags.Transient, p.name);
                    symbol.declarations = p.declarations;
                    symbol.parent = p.parent;
                    symbol.type = widenedType;
                    symbol.target = p;
                    if (p.valueDeclaration)
                        symbol.valueDeclaration = p.valueDeclaration;
                    p = symbol;
                }
                members[p.name] = p;
            });
            var stringIndexType = getIndexTypeOfType(type, ts.IndexKind.String);
            var numberIndexType = getIndexTypeOfType(type, ts.IndexKind.Number);
            if (stringIndexType)
                stringIndexType = getWidenedType(stringIndexType);
            if (numberIndexType)
                numberIndexType = getWidenedType(numberIndexType);
            return createAnonymousType(type.symbol, members, emptyArray, emptyArray, stringIndexType, numberIndexType);
        }
        function getWidenedType(type) {
            if (type.flags & ts.TypeFlags.RequiresWidening) {
                if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) {
                    return anyType;
                }
                if (type.flags & ts.TypeFlags.ObjectLiteral) {
                    return getWidenedTypeOfObjectLiteral(type);
                }
                if (type.flags & ts.TypeFlags.Union) {
                    return getUnionType(ts.map(type.types, getWidenedType), /*noSubtypeReduction*/ true);
                }
                if (isArrayType(type)) {
                    return createArrayType(getWidenedType(type.typeArguments[0]));
                }
                if (isTupleType(type)) {
                    return createTupleType(ts.map(type.elementTypes, getWidenedType));
                }
            }
            return type;
        }
        /**
         * Reports implicit any errors that occur as a result of widening 'null' and 'undefined'
         * to 'any'. A call to reportWideningErrorsInType is normally accompanied by a call to
         * getWidenedType. But in some cases getWidenedType is called without reporting errors
         * (type argument inference is an example).
         *
         * The return value indicates whether an error was in fact reported. The particular circumstances
         * are on a best effort basis. Currently, if the null or undefined that causes widening is inside
         * an object literal property (arbitrarily deeply), this function reports an error. If no error is
         * reported, reportImplicitAnyError is a suitable fallback to report a general error.
         */
        function reportWideningErrorsInType(type) {
            var errorReported = false;
            if (type.flags & ts.TypeFlags.Union) {
                for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                    var t = _a[_i];
                    if (reportWideningErrorsInType(t)) {
                        errorReported = true;
                    }
                }
            }
            if (isArrayType(type)) {
                return reportWideningErrorsInType(type.typeArguments[0]);
            }
            if (isTupleType(type)) {
                for (var _b = 0, _c = type.elementTypes; _b < _c.length; _b++) {
                    var t = _c[_b];
                    if (reportWideningErrorsInType(t)) {
                        errorReported = true;
                    }
                }
            }
            if (type.flags & ts.TypeFlags.ObjectLiteral) {
                for (var _d = 0, _e = getPropertiesOfObjectType(type); _d < _e.length; _d++) {
                    var p = _e[_d];
                    var t = getTypeOfSymbol(p);
                    if (t.flags & ts.TypeFlags.ContainsUndefinedOrNull) {
                        if (!reportWideningErrorsInType(t)) {
                            error(p.valueDeclaration, ts.Diagnostics.Object_literal_s_property_0_implicitly_has_an_1_type, p.name, typeToString(getWidenedType(t)));
                        }
                        errorReported = true;
                    }
                }
            }
            return errorReported;
        }
        function reportImplicitAnyError(declaration, type) {
            var typeAsString = typeToString(getWidenedType(type));
            var diagnostic;
            switch (declaration.kind) {
                case ts.SyntaxKind.BrandPropertyDeclaration: // [ConcreteTypeScript]
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    diagnostic = ts.Diagnostics.Member_0_implicitly_has_an_1_type;
                    break;
                case ts.SyntaxKind.Parameter:
                    diagnostic = declaration.dotDotDotToken ?
                        ts.Diagnostics.Rest_parameter_0_implicitly_has_an_any_type :
                        ts.Diagnostics.Parameter_0_implicitly_has_an_1_type;
                    break;
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    if (!declaration.name) {
                        error(declaration, ts.Diagnostics.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type, typeAsString);
                        return;
                    }
                    diagnostic = ts.Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type;
                    break;
                default:
                    diagnostic = ts.Diagnostics.Variable_0_implicitly_has_an_1_type;
            }
            error(declaration, diagnostic, ts.declarationNameToString(declaration.name), typeAsString);
        }
        function reportErrorsFromWidening(declaration, type) {
            if (produceDiagnostics && compilerOptions.noImplicitAny && type.flags & ts.TypeFlags.ContainsUndefinedOrNull) {
                // Report implicit any error within type if possible, otherwise report error on declaration
                if (!reportWideningErrorsInType(type)) {
                    reportImplicitAnyError(declaration, type);
                }
            }
        }
        function forEachMatchingParameterType(source, target, callback) {
            var sourceMax = source.parameters.length;
            var targetMax = target.parameters.length;
            var count;
            if (source.hasRestParameter && target.hasRestParameter) {
                count = sourceMax > targetMax ? sourceMax : targetMax;
                sourceMax--;
                targetMax--;
            }
            else if (source.hasRestParameter) {
                sourceMax--;
                count = targetMax;
            }
            else if (target.hasRestParameter) {
                targetMax--;
                count = sourceMax;
            }
            else {
                count = sourceMax < targetMax ? sourceMax : targetMax;
            }
            for (var i = 0; i < count; i++) {
                var s = i < sourceMax ? getTypeOfSymbol(source.parameters[i]) : getRestTypeOfSignature(source);
                var t = i < targetMax ? getTypeOfSymbol(target.parameters[i]) : getRestTypeOfSignature(target);
                callback(s, t);
            }
        }
        function createInferenceContext(typeParameters, inferUnionTypes) {
            var inferences = [];
            for (var _i = 0; _i < typeParameters.length; _i++) {
                var unused = typeParameters[_i];
                inferences.push({
                    primary: undefined, secondary: undefined, isFixed: false
                });
            }
            return {
                typeParameters: typeParameters,
                inferUnionTypes: inferUnionTypes,
                inferences: inferences,
                inferredTypes: new Array(typeParameters.length)
            };
        }
        function inferTypes(context, source, target) {
            var sourceStack;
            var targetStack;
            var depth = 0;
            var inferiority = 0;
            inferFromTypes(source, target);
            function isInProcess(source, target) {
                for (var i = 0; i < depth; i++) {
                    if (source === sourceStack[i] && target === targetStack[i]) {
                        return true;
                    }
                }
                return false;
            }
            function inferFromTypes(source, target) {
                if (target.flags & ts.TypeFlags.TypeParameter) {
                    // If target is a type parameter, make an inference, unless the source type contains
                    // the anyFunctionType (the wildcard type that's used to avoid contextually typing functions).
                    // Because the anyFunctionType is internal, it should not be exposed to the user by adding
                    // it as an inference candidate. Hopefully, a better candidate will come along that does
                    // not contain anyFunctionType when we come back to this argument for its second round
                    // of inference.
                    if (source.flags & ts.TypeFlags.ContainsAnyFunctionType) {
                        return;
                    }
                    var typeParameters = context.typeParameters;
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (target === typeParameters[i]) {
                            var inferences = context.inferences[i];
                            if (!inferences.isFixed) {
                                // Any inferences that are made to a type parameter in a union type are inferior
                                // to inferences made to a flat (non-union) type. This is because if we infer to
                                // T | string[], we really don't know if we should be inferring to T or not (because
                                // the correct constituent on the target side could be string[]). Therefore, we put
                                // such inferior inferences into a secondary bucket, and only use them if the primary
                                // bucket is empty.
                                var candidates = inferiority ?
                                    inferences.secondary || (inferences.secondary = []) :
                                    inferences.primary || (inferences.primary = []);
                                if (!ts.contains(candidates, source)) {
                                    candidates.push(source);
                                }
                            }
                            return;
                        }
                    }
                }
                else if (source.flags & ts.TypeFlags.Reference && target.flags & ts.TypeFlags.Reference && source.target === target.target) {
                    // If source and target are references to the same generic type, infer from type arguments
                    var sourceTypes = source.typeArguments;
                    var targetTypes = target.typeArguments;
                    for (var i = 0; i < sourceTypes.length; i++) {
                        inferFromTypes(sourceTypes[i], targetTypes[i]);
                    }
                }
                else if (source.flags & ts.TypeFlags.Tuple && target.flags & ts.TypeFlags.Tuple && source.elementTypes.length === target.elementTypes.length) {
                    // If source and target are tuples of the same size, infer from element types
                    var sourceTypes = source.elementTypes;
                    var targetTypes = target.elementTypes;
                    for (var i = 0; i < sourceTypes.length; i++) {
                        inferFromTypes(sourceTypes[i], targetTypes[i]);
                    }
                }
                else if (target.flags & ts.TypeFlags.UnionOrIntersection) {
                    var targetTypes = target.types;
                    var typeParameterCount = 0;
                    var typeParameter;
                    // First infer to each type in union or intersection that isn't a type parameter
                    for (var _i = 0; _i < targetTypes.length; _i++) {
                        var t = targetTypes[_i];
                        if (t.flags & ts.TypeFlags.TypeParameter && ts.contains(context.typeParameters, t)) {
                            typeParameter = t;
                            typeParameterCount++;
                        }
                        else {
                            inferFromTypes(source, t);
                        }
                    }
                    // Next, if target is a union type containing a single naked type parameter, make a
                    // secondary inference to that type parameter. We don't do this for intersection types
                    // because in a target type like Foo & T we don't know how which parts of the source type
                    // should be matched by Foo and which should be inferred to T.
                    if (target.flags & ts.TypeFlags.Union && typeParameterCount === 1) {
                        inferiority++;
                        inferFromTypes(source, typeParameter);
                        inferiority--;
                    }
                }
                else if (source.flags & ts.TypeFlags.UnionOrIntersection) {
                    // Source is a union or intersection type, infer from each consituent type
                    var sourceTypes = source.types;
                    for (var _a = 0; _a < sourceTypes.length; _a++) {
                        var sourceType = sourceTypes[_a];
                        inferFromTypes(sourceType, target);
                    }
                }
                else {
                    source = getApparentType(source);
                    if (source.flags & ts.TypeFlags.ObjectType && (target.flags & (ts.TypeFlags.Reference | ts.TypeFlags.Tuple) ||
                        (target.flags & ts.TypeFlags.Anonymous) && target.symbol && target.symbol.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.TypeLiteral | ts.SymbolFlags.Class))) {
                        // If source is an object type, and target is a type reference, a tuple type, the type of a method, or a type literal, infer from members
                        if (isInProcess(source, target)) {
                            return;
                        }
                        if (isDeeplyNestedGeneric(source, sourceStack, depth) && isDeeplyNestedGeneric(target, targetStack, depth)) {
                            return;
                        }
                        if (depth === 0) {
                            sourceStack = [];
                            targetStack = [];
                        }
                        sourceStack[depth] = source;
                        targetStack[depth] = target;
                        depth++;
                        inferFromProperties(source, target);
                        inferFromSignatures(source, target, ts.SignatureKind.Call);
                        inferFromSignatures(source, target, ts.SignatureKind.Construct);
                        inferFromIndexTypes(source, target, ts.IndexKind.String, ts.IndexKind.String);
                        inferFromIndexTypes(source, target, ts.IndexKind.Number, ts.IndexKind.Number);
                        inferFromIndexTypes(source, target, ts.IndexKind.String, ts.IndexKind.Number);
                        depth--;
                    }
                }
            }
            function inferFromProperties(source, target) {
                var properties = getPropertiesOfObjectType(target);
                for (var _i = 0; _i < properties.length; _i++) {
                    var targetProp = properties[_i];
                    var sourceProp = getPropertyOfObjectType(source, targetProp.name);
                    if (sourceProp) {
                        inferFromTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
                    }
                }
            }
            function inferFromSignatures(source, target, kind) {
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                var sourceLen = sourceSignatures.length;
                var targetLen = targetSignatures.length;
                var len = sourceLen < targetLen ? sourceLen : targetLen;
                for (var i = 0; i < len; i++) {
                    inferFromSignature(getErasedSignature(sourceSignatures[sourceLen - len + i]), getErasedSignature(targetSignatures[targetLen - len + i]));
                }
            }
            function inferFromSignature(source, target) {
                forEachMatchingParameterType(source, target, inferFromTypes);
                if (source.typePredicate && target.typePredicate) {
                    if (target.typePredicate.parameterIndex === source.typePredicate.parameterIndex) {
                        // Return types from type predicates are treated as booleans. In order to infer types
                        // from type predicates we would need to infer using the type within the type predicate
                        // (i.e. 'Foo' from 'x is Foo').
                        inferFromTypes(source.typePredicate.type, target.typePredicate.type);
                    }
                }
                else {
                    inferFromTypes(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
                }
            }
            function inferFromIndexTypes(source, target, sourceKind, targetKind) {
                var targetIndexType = getIndexTypeOfType(target, targetKind);
                if (targetIndexType) {
                    var sourceIndexType = getIndexTypeOfType(source, sourceKind);
                    if (sourceIndexType) {
                        inferFromTypes(sourceIndexType, targetIndexType);
                    }
                }
            }
        }
        function getInferenceCandidates(context, index) {
            var inferences = context.inferences[index];
            return inferences.primary || inferences.secondary || emptyArray;
        }
        function getInferredType(context, index) {
            var inferredType = context.inferredTypes[index];
            var inferenceSucceeded;
            if (!inferredType) {
                var inferences = getInferenceCandidates(context, index);
                if (inferences.length) {
                    // Infer widened union or supertype, or the unknown type for no common supertype
                    var unionOrSuperType = context.inferUnionTypes ? getUnionType(inferences) : getCommonSupertype(inferences);
                    inferredType = unionOrSuperType ? getWidenedType(unionOrSuperType) : unknownType;
                    inferenceSucceeded = !!unionOrSuperType;
                }
                else {
                    // Infer the empty object type when no inferences were made. It is important to remember that
                    // in this case, inference still succeeds, meaning there is no error for not having inference
                    // candidates. An inference error only occurs when there are *conflicting* candidates, i.e.
                    // candidates with no common supertype.
                    inferredType = emptyObjectType;
                    inferenceSucceeded = true;
                }
                // Only do the constraint check if inference succeeded (to prevent cascading errors)
                if (inferenceSucceeded) {
                    var constraint = getConstraintOfTypeParameter(context.typeParameters[index]);
                    inferredType = constraint && !isTypeAssignableTo(inferredType, constraint) ? constraint : inferredType;
                }
                else if (context.failedTypeParameterIndex === undefined || context.failedTypeParameterIndex > index) {
                    // If inference failed, it is necessary to record the index of the failed type parameter (the one we are on).
                    // It might be that inference has already failed on a later type parameter on a previous call to inferTypeArguments.
                    // So if this failure is on preceding type parameter, this type parameter is the new failure index.
                    context.failedTypeParameterIndex = index;
                }
                context.inferredTypes[index] = inferredType;
            }
            return inferredType;
        }
        function getInferredTypes(context) {
            for (var i = 0; i < context.inferredTypes.length; i++) {
                getInferredType(context, i);
            }
            return context.inferredTypes;
        }
        function hasAncestor(node, kind) {
            return ts.getAncestor(node, kind) !== undefined;
        }
        // EXPRESSION TYPE CHECKING
        function getResolvedSymbol(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedSymbol) {
                links.resolvedSymbol = (!ts.nodeIsMissing(node) && resolveName(node, node.text, ts.SymbolFlags.Value | ts.SymbolFlags.ExportValue, ts.Diagnostics.Cannot_find_name_0, node)) || unknownSymbol;
            }
            return links.resolvedSymbol;
        }
        function isInTypeQuery(node) {
            // TypeScript 1.0 spec (April 2014): 3.6.3
            // A type query consists of the keyword typeof followed by an expression.
            // The expression is restricted to a single identifier or a sequence of identifiers separated by periods
            while (node) {
                switch (node.kind) {
                    case ts.SyntaxKind.TypeQuery:
                        return true;
                    case ts.SyntaxKind.Identifier:
                    case ts.SyntaxKind.QualifiedName:
                        node = node.parent;
                        continue;
                    default:
                        return false;
                }
            }
            ts.Debug.fail("should not get here");
        }
        // For a union type, remove all constituent types that are of the given type kind (when isOfTypeKind is true)
        // or not of the given type kind (when isOfTypeKind is false)
        function removeTypesFromUnionType(type, typeKind, isOfTypeKind, allowEmptyUnionResult) {
            if (type.flags & ts.TypeFlags.Union) {
                var types = type.types;
                // [ConcreteTypeScript]
                // Also remove concrete equivalents
                if (ts.forEach(types, function (t) { return ((t.flags & typeKind) || (isConcreteType(t) && t.baseType.flags & typeKind)); })) {
                    var narrowedType = getUnionType(ts.filter(types, function (t) { return !((t.flags & typeKind) || (isConcreteType(t) && t.baseType.flags & typeKind)); }));
                    // [/ConcreteTypeScript]
                    if (allowEmptyUnionResult || narrowedType !== emptyObjectType) {
                        return narrowedType;
                    }
                }
            }
            else if (allowEmptyUnionResult && !!(type.flags & typeKind) === isOfTypeKind) {
                // Use getUnionType(emptyArray) instead of emptyObjectType in case the way empty union types
                // are represented ever changes.
                return getUnionType(emptyArray);
            }
            return type;
        }
        function hasInitializer(node) {
            return !!(node.initializer || ts.isBindingPattern(node.parent) && hasInitializer(node.parent.parent));
        }
        // Check if a given variable is assigned within a given syntax node
        function isVariableAssignedWithin(symbol, node) {
            var links = getNodeLinks(node);
            if (links.assignmentChecks) {
                var cachedResult = links.assignmentChecks[symbol.id];
                if (cachedResult !== undefined) {
                    return cachedResult;
                }
            }
            else {
                links.assignmentChecks = {};
            }
            return links.assignmentChecks[symbol.id] = isAssignedIn(node);
            function isAssignedInBinaryExpression(node) {
                if (node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
                    var n = node.left;
                    while (n.kind === ts.SyntaxKind.ParenthesizedExpression) {
                        n = n.expression;
                    }
                    if (n.kind === ts.SyntaxKind.Identifier && getResolvedSymbol(n) === symbol) {
                        return true;
                    }
                }
                return ts.forEachChild(node, isAssignedIn);
            }
            function isAssignedInVariableDeclaration(node) {
                if (!ts.isBindingPattern(node.name) && getSymbolOfNode(node) === symbol && hasInitializer(node)) {
                    return true;
                }
                return ts.forEachChild(node, isAssignedIn);
            }
            function isAssignedIn(node) {
                switch (node.kind) {
                    case ts.SyntaxKind.BinaryExpression:
                        return isAssignedInBinaryExpression(node);
                    case ts.SyntaxKind.VariableDeclaration:
                    case ts.SyntaxKind.BindingElement:
                        return isAssignedInVariableDeclaration(node);
                    case ts.SyntaxKind.ObjectBindingPattern:
                    case ts.SyntaxKind.ArrayBindingPattern:
                    case ts.SyntaxKind.ArrayLiteralExpression:
                    case ts.SyntaxKind.ObjectLiteralExpression:
                    case ts.SyntaxKind.PropertyAccessExpression:
                    case ts.SyntaxKind.ElementAccessExpression:
                    case ts.SyntaxKind.CallExpression:
                    case ts.SyntaxKind.NewExpression:
                    case ts.SyntaxKind.TypeAssertionExpression:
                    case ts.SyntaxKind.AsExpression:
                    case ts.SyntaxKind.ParenthesizedExpression:
                    case ts.SyntaxKind.PrefixUnaryExpression:
                    case ts.SyntaxKind.DeleteExpression:
                    case ts.SyntaxKind.AwaitExpression:
                    case ts.SyntaxKind.TypeOfExpression:
                    case ts.SyntaxKind.VoidExpression:
                    case ts.SyntaxKind.PostfixUnaryExpression:
                    case ts.SyntaxKind.YieldExpression:
                    case ts.SyntaxKind.ConditionalExpression:
                    case ts.SyntaxKind.SpreadElementExpression:
                    case ts.SyntaxKind.Block:
                    case ts.SyntaxKind.VariableStatement:
                    case ts.SyntaxKind.ExpressionStatement:
                    case ts.SyntaxKind.IfStatement:
                    case ts.SyntaxKind.DoStatement:
                    case ts.SyntaxKind.WhileStatement:
                    case ts.SyntaxKind.ForStatement:
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForOfStatement:
                    case ts.SyntaxKind.ReturnStatement:
                    case ts.SyntaxKind.WithStatement:
                    case ts.SyntaxKind.SwitchStatement:
                    case ts.SyntaxKind.CaseClause:
                    case ts.SyntaxKind.DefaultClause:
                    case ts.SyntaxKind.LabeledStatement:
                    case ts.SyntaxKind.ThrowStatement:
                    case ts.SyntaxKind.TryStatement:
                    case ts.SyntaxKind.CatchClause:
                    case ts.SyntaxKind.JsxElement:
                    case ts.SyntaxKind.JsxSelfClosingElement:
                    case ts.SyntaxKind.JsxAttribute:
                    case ts.SyntaxKind.JsxSpreadAttribute:
                    case ts.SyntaxKind.JsxOpeningElement:
                    case ts.SyntaxKind.JsxExpression:
                        return ts.forEachChild(node, isAssignedIn);
                }
                return false;
            }
        }
        // [ConcreteTypeScript]
        function getNarrowedTypeOfSymbol(symbol, node) {
            var type = getNarrowedTypeOfSymbolWorker(symbol, node);
            return getFlowTypeAtLocation(node, type);
        }
        // Get the narrowed type of a given symbol at a given location
        function getNarrowedTypeOfSymbolWorker(symbol, node) {
            var type = getTypeOfSymbol(symbol);
            // Only narrow when symbol is variable of type any or an object, union, or type parameter type
            if (node && symbol.flags & ts.SymbolFlags.Variable) {
                if (isTypeAny(type) || type.flags & (ts.TypeFlags.ObjectType | ts.TypeFlags.Union | ts.TypeFlags.TypeParameter)) {
                    loop: while (node.parent) {
                        var child = node;
                        node = node.parent;
                        var narrowedType = type;
                        switch (node.kind) {
                            case ts.SyntaxKind.IfStatement:
                                // In a branch of an if statement, narrow based on controlling expression
                                if (child !== node.expression) {
                                    narrowedType = narrowType(type, node.expression, /*assumeTrue*/ child === node.thenStatement);
                                }
                                break;
                            case ts.SyntaxKind.ConditionalExpression:
                                // In a branch of a conditional expression, narrow based on controlling condition
                                if (child !== node.condition) {
                                    narrowedType = narrowType(type, node.condition, /*assumeTrue*/ child === node.whenTrue);
                                }
                                break;
                            case ts.SyntaxKind.BinaryExpression:
                                // In the right operand of an && or ||, narrow based on left operand
                                if (child === node.right) {
                                    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
                                        narrowedType = narrowType(type, node.left, /*assumeTrue*/ true);
                                    }
                                    else if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                                        narrowedType = narrowType(type, node.left, /*assumeTrue*/ false);
                                    }
                                }
                                break;
                            case ts.SyntaxKind.SourceFile:
                            case ts.SyntaxKind.ModuleDeclaration:
                            case ts.SyntaxKind.FunctionDeclaration:
                            case ts.SyntaxKind.MethodDeclaration:
                            case ts.SyntaxKind.MethodSignature:
                            case ts.SyntaxKind.GetAccessor:
                            case ts.SyntaxKind.SetAccessor:
                            case ts.SyntaxKind.Constructor:
                                // Stop at the first containing function or module declaration
                                break loop;
                        }
                        // Use narrowed type if construct contains no assignments to variable
                        if (narrowedType !== type) {
                            if (isVariableAssignedWithin(symbol, node)) {
                                break;
                            }
                            type = narrowedType;
                        }
                    }
                }
            }
            return type;
            function narrowTypeByEquality(type, expr, assumeTrue) {
                // Check that we have 'typeof <symbol>' on the left and string literal on the right
                if (expr.left.kind !== ts.SyntaxKind.TypeOfExpression || expr.right.kind !== ts.SyntaxKind.StringLiteral) {
                    return type;
                }
                var left = expr.left;
                var right = expr.right;
                // [ConcreteTypeScript] TODO look into expanding logic here
                if (left.expression.kind !== ts.SyntaxKind.Identifier || getResolvedSymbol(left.expression) !== symbol) {
                    return type;
                }
                var typeInfo = primitiveTypeInfo[right.text];
                if (expr.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                    assumeTrue = !assumeTrue;
                }
                if (assumeTrue) {
                    // Assumed result is true. If check was not for a primitive type, remove all primitive types
                    if (!typeInfo) {
                        return removeTypesFromUnionType(type, /*typeKind*/ ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.Boolean | ts.TypeFlags.ESSymbol, 
                        /*isOfTypeKind*/ true, /*allowEmptyUnionResult*/ false);
                    }
                    var checkType = typeInfo.type;
                    // [ConcreteTypeScript]
                    // We can safely assume that the type is concrete here
                    if (checkType !== emptyObjectType)
                        checkType = createConcreteType(checkType);
                    // [/ConcreteTypeScript]
                    // Check was for a primitive type, return that primitive type if it is a subtype
                    if (isTypeSubtypeOf(checkType, type)) {
                        return checkType;
                    }
                    // Otherwise, remove all types that aren't of the primitive type kind. This can happen when the type is
                    // union of enum types and other types.
                    return removeTypesFromUnionType(type, /*typeKind*/ typeInfo.flags, /*isOfTypeKind*/ false, /*allowEmptyUnionResult*/ false);
                }
                else {
                    // Assumed result is false. If check was for a primitive type, remove that primitive type
                    if (typeInfo) {
                        return removeTypesFromUnionType(type, /*typeKind*/ typeInfo.flags, /*isOfTypeKind*/ true, /*allowEmptyUnionResult*/ false);
                    }
                    // Otherwise we don't have enough information to do anything.
                    return type;
                }
            }
            function narrowTypeByAnd(type, expr, assumeTrue) {
                if (assumeTrue) {
                    // The assumed result is true, therefore we narrow assuming each operand to be true.
                    return narrowType(narrowType(type, expr.left, /*assumeTrue*/ true), expr.right, /*assumeTrue*/ true);
                }
                else {
                    // The assumed result is false. This means either the first operand was false, or the first operand was true
                    // and the second operand was false. We narrow with those assumptions and union the two resulting types.
                    return getUnionType([
                        narrowType(type, expr.left, /*assumeTrue*/ false),
                        narrowType(narrowType(type, expr.left, /*assumeTrue*/ true), expr.right, /*assumeTrue*/ false)
                    ]);
                }
            }
            function narrowTypeByOr(type, expr, assumeTrue) {
                if (assumeTrue) {
                    // The assumed result is true. This means either the first operand was true, or the first operand was false
                    // and the second operand was true. We narrow with those assumptions and union the two resulting types.
                    return getUnionType([
                        narrowType(type, expr.left, /*assumeTrue*/ true),
                        narrowType(narrowType(type, expr.left, /*assumeTrue*/ false), expr.right, /*assumeTrue*/ true)
                    ]);
                }
                else {
                    // The assumed result is false, therefore we narrow assuming each operand to be false.
                    return narrowType(narrowType(type, expr.left, /*assumeTrue*/ false), expr.right, /*assumeTrue*/ false);
                }
            }
            // [ConcreteTypeScript] If 'assumeTrue', narrow to a brand-type
            // TODO implement.
            function narrowTypeByDeclaredAs(type, expr, assumeTrue) {
                // Check that type is not any, assumed result is true, and we have variable symbol on the left
                if (isTypeAny(type) || !assumeTrue || expr.left.kind !== ts.SyntaxKind.Identifier) {
                    return type;
                }
                var brandType = expectBrandIdentifierGetType(expr.right);
                if (!brandType) {
                    return type;
                }
                return intersectTypes(type, brandType);
            }
            function narrowTypeByInstanceof(type, expr, assumeTrue) {
                // Check that type is not any, assumed result is true, and we have variable symbol on the left
                if (isTypeAny(type) || !assumeTrue || expr.left.kind !== ts.SyntaxKind.Identifier || getResolvedSymbol(expr.left) !== symbol) {
                    return type;
                }
                // Check that right operand is a function type with a prototype property
                var rightType = checkExpression(expr.right);
                if (!isTypeSubtypeOf(rightType, globalFunctionType)) {
                    return type;
                }
                var targetType;
                var prototypeProperty = getPropertyOfType(rightType, "prototype");
                if (prototypeProperty) {
                    // Target type is type of the prototype property
                    var prototypePropertyType = getTypeOfSymbol(prototypeProperty);
                    if (!isTypeAny(prototypePropertyType)) {
                        targetType = prototypePropertyType;
                    }
                }
                if (!targetType) {
                    // Target type is type of construct signature
                    var constructSignatures;
                    if (rightType.flags & ts.TypeFlags.Interface) {
                        constructSignatures = resolveDeclaredMembers(rightType).declaredConstructSignatures;
                    }
                    else if (rightType.flags & ts.TypeFlags.Anonymous) {
                        constructSignatures = getSignaturesOfType(rightType, ts.SignatureKind.Construct);
                    }
                    if (constructSignatures && constructSignatures.length) {
                        targetType = getUnionType(ts.map(constructSignatures, function (signature) { return getReturnTypeOfSignature(getErasedSignature(signature)); }));
                    }
                }
                if (targetType) {
                    return getNarrowedType(type, targetType);
                }
                return type;
            }
            function getNarrowedType(originalType, narrowedTypeCandidate) {
                // If the current type is a union type, remove all constituents that aren't assignable to target. If that produces
                // 0 candidates, fall back to the assignability check
                if (originalType.flags & ts.TypeFlags.Union) {
                    var assignableConstituents = ts.filter(originalType.types, function (t) { return isTypeAssignableTo(t, narrowedTypeCandidate); });
                    if (assignableConstituents.length) {
                        return getUnionType(assignableConstituents);
                    }
                }
                if (isTypeAssignableTo(narrowedTypeCandidate, originalType)) {
                    // Narrow to the target type if it's assignable to the current type
                    return narrowedTypeCandidate;
                }
                return originalType;
            }
            function narrowTypeByTypePredicate(type, expr, assumeTrue) {
                if (type.flags & ts.TypeFlags.Any) {
                    return type;
                }
                var signature = getResolvedSignature(expr);
                if (signature.typePredicate &&
                    expr.arguments[signature.typePredicate.parameterIndex] &&
                    getSymbolAtLocation(expr.arguments[signature.typePredicate.parameterIndex]) === symbol) {
                    if (!assumeTrue) {
                        if (type.flags & ts.TypeFlags.Union) {
                            return getUnionType(ts.filter(type.types, function (t) { return !isTypeSubtypeOf(t, signature.typePredicate.type); }));
                        }
                        return type;
                    }
                    return getNarrowedType(type, signature.typePredicate.type);
                }
                return type;
            }
            // Narrow the given type based on the given expression having the assumed boolean value. The returned type
            // will be a subtype or the same type as the argument.
            function narrowType(type, expr, assumeTrue) {
                switch (expr.kind) {
                    case ts.SyntaxKind.CallExpression:
                        return narrowTypeByTypePredicate(type, expr, assumeTrue);
                    case ts.SyntaxKind.ParenthesizedExpression:
                        return narrowType(type, expr.expression, assumeTrue);
                    case ts.SyntaxKind.BinaryExpression:
                        var operator = expr.operatorToken.kind;
                        if (operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                            return narrowTypeByEquality(type, expr, assumeTrue);
                        }
                        else if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
                            return narrowTypeByAnd(type, expr, assumeTrue);
                        }
                        else if (operator === ts.SyntaxKind.BarBarToken) {
                            return narrowTypeByOr(type, expr, assumeTrue);
                        }
                        else if (operator === ts.SyntaxKind.DeclaredAsKeyword) {
                            // TODO Narrow to a declared type
                            return narrowTypeByDeclaredAs(type, expr, assumeTrue);
                        }
                        else if (operator === ts.SyntaxKind.InstanceOfKeyword) {
                            return narrowTypeByInstanceof(type, expr, assumeTrue);
                        }
                        break;
                    case ts.SyntaxKind.PrefixUnaryExpression:
                        if (expr.operator === ts.SyntaxKind.ExclamationToken) {
                            return narrowType(type, expr.operand, !assumeTrue);
                        }
                        break;
                }
                return type;
            }
        }
        function checkIdentifier(node) {
            node.checker = checker;
            var symbol = getResolvedSymbol(node);
            // As noted in ECMAScript 6 language spec, arrow functions never have an arguments objects.
            // Although in down-level emit of arrow function, we emit it using function expression which means that
            // arguments objects will be bound to the inner object; emitting arrow function natively in ES6, arguments objects
            // will be bound to non-arrow function that contain this arrow function. This results in inconsistent behavior.
            // To avoid that we will give an error to users if they use arguments objects in arrow function so that they
            // can explicitly bound arguments objects
            if (symbol === argumentsSymbol) {
                var container = ts.getContainingFunction(node);
                if (container.kind === ts.SyntaxKind.ArrowFunction) {
                    if (languageVersion < ts.ScriptTarget.ES6) {
                        error(node, ts.Diagnostics.The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_standard_function_expression);
                    }
                }
                if (node.parserContextFlags & ts.ParserContextFlags.Await) {
                    getNodeLinks(container).flags |= ts.NodeCheckFlags.CaptureArguments;
                    getNodeLinks(node).flags |= ts.NodeCheckFlags.LexicalArguments;
                }
            }
            if (symbol.flags & ts.SymbolFlags.Alias && !isInTypeQuery(node) && !isConstEnumOrConstEnumOnlyModule(resolveAlias(symbol))) {
                markAliasSymbolAsReferenced(symbol);
            }
            checkCollisionWithCapturedSuperVariable(node, node);
            checkCollisionWithCapturedThisVariable(node, node);
            checkBlockScopedBindingCapturedInLoop(node, symbol);
            return getNarrowedTypeOfSymbol(getExportSymbolOfValueSymbolIfExported(symbol), node);
        }
        function isInsideFunction(node, threshold) {
            var current = node;
            while (current && current !== threshold) {
                if (ts.isFunctionLike(current)) {
                    return true;
                }
                current = current.parent;
            }
            return false;
        }
        function checkBlockScopedBindingCapturedInLoop(node, symbol) {
            if (languageVersion >= ts.ScriptTarget.ES6 ||
                (symbol.flags & ts.SymbolFlags.BlockScopedVariable) === 0 ||
                symbol.valueDeclaration.parent.kind === ts.SyntaxKind.CatchClause) {
                return;
            }
            // - check if binding is used in some function
            // (stop the walk when reaching container of binding declaration)
            // - if first check succeeded - check if variable is declared inside the loop
            // nesting structure:
            // (variable declaration or binding element) -> variable declaration list -> container
            var container = symbol.valueDeclaration;
            while (container.kind !== ts.SyntaxKind.VariableDeclarationList) {
                container = container.parent;
            }
            // get the parent of variable declaration list
            container = container.parent;
            if (container.kind === ts.SyntaxKind.VariableStatement) {
                // if parent is variable statement - get its parent
                container = container.parent;
            }
            var inFunction = isInsideFunction(node.parent, container);
            var current = container;
            while (current && !ts.nodeStartsNewLexicalEnvironment(current)) {
                if (isIterationStatement(current, /*lookInLabeledStatements*/ false)) {
                    if (inFunction) {
                        grammarErrorOnFirstToken(current, ts.Diagnostics.Loop_contains_block_scoped_variable_0_referenced_by_a_function_in_the_loop_This_is_only_supported_in_ECMAScript_6_or_higher, ts.declarationNameToString(node));
                    }
                    // mark value declaration so during emit they can have a special handling
                    getNodeLinks(symbol.valueDeclaration).flags |= ts.NodeCheckFlags.BlockScopedBindingInLoop;
                    break;
                }
                current = current.parent;
            }
        }
        function captureLexicalThis(node, container) {
            getNodeLinks(node).flags |= ts.NodeCheckFlags.LexicalThis;
            if (container.kind === ts.SyntaxKind.PropertyDeclaration || container.kind === ts.SyntaxKind.Constructor) {
                var classNode = container.parent;
                getNodeLinks(classNode).flags |= ts.NodeCheckFlags.CaptureThis;
            }
            else {
                getNodeLinks(container).flags |= ts.NodeCheckFlags.CaptureThis;
            }
        }
        function checkThisExpression(node) {
            // Stop at the first arrow function so that we can
            // tell whether 'this' needs to be captured.
            var container = ts.getThisContainer(node, /* includeArrowFunctions */ true);
            var needToCaptureLexicalThis = false;
            // Now skip arrow functions to get the "real" owner of 'this'.
            if (container.kind === ts.SyntaxKind.ArrowFunction) {
                container = ts.getThisContainer(container, /* includeArrowFunctions */ false);
                // When targeting es6, arrow function lexically bind "this" so we do not need to do the work of binding "this" in emitted code
                needToCaptureLexicalThis = (languageVersion < ts.ScriptTarget.ES6);
            }
            switch (container.kind) {
                case ts.SyntaxKind.ModuleDeclaration:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_module_or_namespace_body);
                    // do not return here so in case if lexical this is captured - it will be reflected in flags on NodeLinks
                    break;
                case ts.SyntaxKind.EnumDeclaration:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_current_location);
                    // do not return here so in case if lexical this is captured - it will be reflected in flags on NodeLinks
                    break;
                case ts.SyntaxKind.Constructor:
                    if (isInConstructorArgumentInitializer(node, container)) {
                        error(node, ts.Diagnostics.this_cannot_be_referenced_in_constructor_arguments);
                    }
                    break;
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    if (container.flags & ts.NodeFlags.Static) {
                        error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_static_property_initializer);
                    }
                    break;
                case ts.SyntaxKind.ComputedPropertyName:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_computed_property_name);
                    break;
            }
            if (needToCaptureLexicalThis) {
                captureLexicalThis(node, container);
            }
            // [ConcreteTypeScript]
            if (ts.isFunctionLike(container)) {
                var thisType = getSignatureFromDeclaration(container).resolvedThisType;
                if (thisType) {
                    return getFlowTypeAtLocation(node, thisType);
                }
            }
            // [/ConcreteTypeScript]
            if (ts.isClassLike(container.parent)) {
                var symbol = getSymbolOfNode(container.parent);
                // [ConcreteTypeScript] Need to assure 'this' is concrete
                if (container.flags & ts.NodeFlags.Static) {
                    return getTypeOfSymbol(symbol);
                }
                else {
                    return createConcreteType(getDeclaredTypeOfSymbol(symbol));
                }
            }
            return anyType;
        }
        /* Will allow for access to all closure variables: */
        function evalInCheckerContext(s) {
            return eval(s);
        }
        function isInConstructorArgumentInitializer(node, constructorDecl) {
            for (var n = node; n && n !== constructorDecl; n = n.parent) {
                if (n.kind === ts.SyntaxKind.Parameter) {
                    return true;
                }
            }
            return false;
        }
        function checkSuperExpression(node) {
            var isCallExpression = node.parent.kind === ts.SyntaxKind.CallExpression && node.parent.expression === node;
            var classDeclaration = ts.getContainingClass(node);
            var classType = classDeclaration && getDeclaredTypeOfSymbol(getSymbolOfNode(classDeclaration));
            var baseClassType = classType && getBaseTypes(classType)[0];
            var container = ts.getSuperContainer(node, /*includeFunctions*/ true);
            var needToCaptureLexicalThis = false;
            if (!isCallExpression) {
                // adjust the container reference in case if super is used inside arrow functions with arbitrary deep nesting
                while (container && container.kind === ts.SyntaxKind.ArrowFunction) {
                    container = ts.getSuperContainer(container, /*includeFunctions*/ true);
                    needToCaptureLexicalThis = languageVersion < ts.ScriptTarget.ES6;
                }
            }
            var canUseSuperExpression = isLegalUsageOfSuperExpression(container);
            var nodeCheckFlag = 0;
            // always set NodeCheckFlags for 'super' expression node
            if (canUseSuperExpression) {
                if ((container.flags & ts.NodeFlags.Static) || isCallExpression) {
                    nodeCheckFlag = ts.NodeCheckFlags.SuperStatic;
                }
                else {
                    nodeCheckFlag = ts.NodeCheckFlags.SuperInstance;
                }
                getNodeLinks(node).flags |= nodeCheckFlag;
                if (needToCaptureLexicalThis) {
                    // call expressions are allowed only in constructors so they should always capture correct 'this'
                    // super property access expressions can also appear in arrow functions -
                    // in this case they should also use correct lexical this
                    captureLexicalThis(node.parent, container);
                }
            }
            if (!baseClassType) {
                if (!classDeclaration || !ts.getClassExtendsHeritageClauseElement(classDeclaration)) {
                    error(node, ts.Diagnostics.super_can_only_be_referenced_in_a_derived_class);
                }
                return unknownType;
            }
            if (!canUseSuperExpression) {
                if (container && container.kind === ts.SyntaxKind.ComputedPropertyName) {
                    error(node, ts.Diagnostics.super_cannot_be_referenced_in_a_computed_property_name);
                }
                else if (isCallExpression) {
                    error(node, ts.Diagnostics.Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors);
                }
                else {
                    error(node, ts.Diagnostics.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class);
                }
                return unknownType;
            }
            if (container.kind === ts.SyntaxKind.Constructor && isInConstructorArgumentInitializer(node, container)) {
                // issue custom error message for super property access in constructor arguments (to be aligned with old compiler)
                error(node, ts.Diagnostics.super_cannot_be_referenced_in_constructor_arguments);
                return unknownType;
            }
            return nodeCheckFlag === ts.NodeCheckFlags.SuperStatic
                ? getBaseConstructorTypeOfClass(classType)
                : baseClassType;
            function isLegalUsageOfSuperExpression(container) {
                if (!container) {
                    return false;
                }
                if (isCallExpression) {
                    // TS 1.0 SPEC (April 2014): 4.8.1
                    // Super calls are only permitted in constructors of derived classes
                    return container.kind === ts.SyntaxKind.Constructor;
                }
                else {
                    // TS 1.0 SPEC (April 2014)
                    // 'super' property access is allowed
                    // - In a constructor, instance member function, instance member accessor, or instance member variable initializer where this references a derived class instance
                    // - In a static member function or static member accessor
                    // topmost container must be something that is directly nested in the class declaration
                    if (container && ts.isClassLike(container.parent)) {
                        if (container.flags & ts.NodeFlags.Static) {
                            return container.kind === ts.SyntaxKind.MethodDeclaration ||
                                container.kind === ts.SyntaxKind.MethodSignature ||
                                container.kind === ts.SyntaxKind.GetAccessor ||
                                container.kind === ts.SyntaxKind.SetAccessor;
                        }
                        else {
                            return container.kind === ts.SyntaxKind.MethodDeclaration ||
                                container.kind === ts.SyntaxKind.MethodSignature ||
                                container.kind === ts.SyntaxKind.GetAccessor ||
                                container.kind === ts.SyntaxKind.SetAccessor ||
                                container.kind === ts.SyntaxKind.PropertyDeclaration ||
                                container.kind === ts.SyntaxKind.PropertySignature ||
                                container.kind === ts.SyntaxKind.Constructor;
                        }
                    }
                }
                return false;
            }
        }
        // Return contextual type of parameter or undefined if no contextual type is available
        function getContextuallyTypedParameterType(parameter) {
            if (isFunctionExpressionOrArrowFunction(parameter.parent)) {
                var func = parameter.parent;
                if (isContextSensitive(func)) {
                    var contextualSignature = getContextualSignature(func);
                    if (contextualSignature) {
                        var funcHasRestParameters = ts.hasRestParameter(func);
                        var len = func.parameters.length - (funcHasRestParameters ? 1 : 0);
                        var indexOfParameter = ts.indexOf(func.parameters, parameter);
                        if (indexOfParameter < len) {
                            return getTypeAtPosition(contextualSignature, indexOfParameter);
                        }
                        // If last parameter is contextually rest parameter get its type
                        if (indexOfParameter === (func.parameters.length - 1) &&
                            funcHasRestParameters && contextualSignature.hasRestParameter && func.parameters.length >= contextualSignature.parameters.length) {
                            return getTypeOfSymbol(ts.lastOrUndefined(contextualSignature.parameters));
                        }
                    }
                }
            }
            return undefined;
        }
        // In a variable, parameter or property declaration with a type annotation, the contextual type of an initializer
        // expression is the type of the variable, parameter or property. Otherwise, in a parameter declaration of a
        // contextually typed function expression, the contextual type of an initializer expression is the contextual type
        // of the parameter. Otherwise, in a variable or parameter declaration with a binding pattern name, the contextual
        // type of an initializer expression is the type implied by the binding pattern.
        function getContextualTypeForInitializerExpression(node) {
            var declaration = node.parent;
            if (node === declaration.initializer) {
                if (declaration.type) {
                    return getTypeFromTypeNode(declaration.type);
                }
                if (declaration.kind === ts.SyntaxKind.Parameter) {
                    var type = getContextuallyTypedParameterType(declaration);
                    if (type) {
                        return type;
                    }
                }
                if (ts.isBindingPattern(declaration.name)) {
                    return getTypeFromBindingPattern(declaration.name, /*includePatternInType*/ true);
                }
            }
            return undefined;
        }
        function getContextualTypeForReturnExpression(node) {
            var func = ts.getContainingFunction(node);
            if (func && !func.asteriskToken) {
                return getContextualReturnType(func);
            }
            return undefined;
        }
        function getContextualTypeForYieldOperand(node) {
            var func = ts.getContainingFunction(node);
            if (func) {
                var contextualReturnType = getContextualReturnType(func);
                if (contextualReturnType) {
                    return node.asteriskToken
                        ? contextualReturnType
                        : getElementTypeOfIterableIterator(contextualReturnType);
                }
            }
            return undefined;
        }
        function isInParameterInitializerBeforeContainingFunction(node) {
            while (node.parent && !ts.isFunctionLike(node.parent)) {
                if (node.parent.kind === ts.SyntaxKind.Parameter && node.parent.initializer === node) {
                    return true;
                }
                node = node.parent;
            }
            return false;
        }
        function getContextualReturnType(functionDecl) {
            // If the containing function has a return type annotation, is a constructor, or is a get accessor whose
            // corresponding set accessor has a type annotation, return statements in the function are contextually typed
            if (functionDecl.type ||
                functionDecl.kind === ts.SyntaxKind.Constructor ||
                functionDecl.kind === ts.SyntaxKind.GetAccessor && ts.getSetAccessorTypeAnnotationNode(ts.getDeclarationOfKind(functionDecl.symbol, ts.SyntaxKind.SetAccessor))) {
                return getReturnTypeOfSignature(getSignatureFromDeclaration(functionDecl));
            }
            // Otherwise, if the containing function is contextually typed by a function type with exactly one call signature
            // and that call signature is non-generic, return statements are contextually typed by the return type of the signature
            var signature = getContextualSignatureForFunctionLikeDeclaration(functionDecl);
            if (signature) {
                return getReturnTypeOfSignature(signature);
            }
            return undefined;
        }
        // In a typed function call, an argument or substitution expression is contextually typed by the type of the corresponding parameter.
        function getContextualTypeForArgument(callTarget, arg) {
            var args = getEffectiveCallArguments(callTarget);
            var argIndex = ts.indexOf(args, arg);
            if (argIndex >= 0) {
                var signature = getResolvedSignature(callTarget);
                return getTypeAtPosition(signature, argIndex);
            }
            return undefined;
        }
        function getContextualTypeForSubstitutionExpression(template, substitutionExpression) {
            if (template.parent.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                return getContextualTypeForArgument(template.parent, substitutionExpression);
            }
            return undefined;
        }
        function getContextualTypeForBinaryOperand(node) {
            var binaryExpression = node.parent;
            var operator = binaryExpression.operatorToken.kind;
            if (operator >= ts.SyntaxKind.FirstAssignment && operator <= ts.SyntaxKind.LastAssignment) {
                // In an assignment expression, the right operand is contextually typed by the type of the left operand.
                if (node === binaryExpression.right) {
                    return checkExpression(binaryExpression.left);
                }
            }
            else if (operator === ts.SyntaxKind.BarBarToken) {
                // When an || expression has a contextual type, the operands are contextually typed by that type. When an ||
                // expression has no contextual type, the right operand is contextually typed by the type of the left operand.
                var type = getContextualType(binaryExpression);
                if (!type && node === binaryExpression.right) {
                    type = checkExpression(binaryExpression.left);
                }
                return type;
            }
            return undefined;
        }
        // Apply a mapping function to a contextual type and return the resulting type. If the contextual type
        // is a union type, the mapping function is applied to each constituent type and a union of the resulting
        // types is returned.
        function applyToContextualType(type, mapper) {
            if (!(type.flags & ts.TypeFlags.Union)) {
                return mapper(type);
            }
            var types = type.types;
            var mappedType;
            var mappedTypes;
            for (var _i = 0; _i < types.length; _i++) {
                var current = types[_i];
                var t = mapper(current);
                if (t) {
                    if (!mappedType) {
                        mappedType = t;
                    }
                    else if (!mappedTypes) {
                        mappedTypes = [mappedType, t];
                    }
                    else {
                        mappedTypes.push(t);
                    }
                }
            }
            return mappedTypes ? getUnionType(mappedTypes) : mappedType;
        }
        function getTypeOfPropertyOfContextualType(type, name) {
            return applyToContextualType(type, function (t) {
                var prop = t.flags & ts.TypeFlags.StructuredType ? getPropertyOfType(t, name) : undefined;
                return prop ? getTypeOfSymbol(prop) : undefined;
            });
        }
        function getIndexTypeOfContextualType(type, kind) {
            return applyToContextualType(type, function (t) { return getIndexTypeOfStructuredType(t, kind); });
        }
        // Return true if the given contextual type is a tuple-like type
        function contextualTypeIsTupleLikeType(type) {
            return !!(type.flags & ts.TypeFlags.Union ? ts.forEach(type.types, isTupleLikeType) : isTupleLikeType(type));
        }
        // Return true if the given contextual type provides an index signature of the given kind
        function contextualTypeHasIndexSignature(type, kind) {
            return !!(type.flags & ts.TypeFlags.Union ? ts.forEach(type.types, function (t) { return getIndexTypeOfStructuredType(t, kind); }) : getIndexTypeOfStructuredType(type, kind));
        }
        // In an object literal contextually typed by a type T, the contextual type of a property assignment is the type of
        // the matching property in T, if one exists. Otherwise, it is the type of the numeric index signature in T, if one
        // exists. Otherwise, it is the type of the string index signature in T, if one exists.
        function getContextualTypeForObjectLiteralMethod(node) {
            ts.Debug.assert(ts.isObjectLiteralMethod(node));
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            return getContextualTypeForObjectLiteralElement(node);
        }
        function getContextualTypeForObjectLiteralElement(element) {
            var objectLiteral = element.parent;
            var type = getContextualType(objectLiteral);
            if (type) {
                if (!ts.hasDynamicName(element)) {
                    // For a (non-symbol) computed property, there is no reason to look up the name
                    // in the type. It will just be "__computed", which does not appear in any
                    // SymbolTable.
                    var symbolName = getSymbolOfNode(element).name;
                    var propertyType = getTypeOfPropertyOfContextualType(type, symbolName);
                    if (propertyType) {
                        return propertyType;
                    }
                }
                return isNumericName(element.name) && getIndexTypeOfContextualType(type, ts.IndexKind.Number) ||
                    getIndexTypeOfContextualType(type, ts.IndexKind.String);
            }
            return undefined;
        }
        // In an array literal contextually typed by a type T, the contextual type of an element expression at index N is
        // the type of the property with the numeric name N in T, if one exists. Otherwise, if T has a numeric index signature,
        // it is the type of the numeric index signature in T. Otherwise, in ES6 and higher, the contextual type is the iterated
        // type of T.
        function getContextualTypeForElementExpression(node) {
            var arrayLiteral = node.parent;
            var type = getContextualType(arrayLiteral);
            if (type) {
                var index = ts.indexOf(arrayLiteral.elements, node);
                return getTypeOfPropertyOfContextualType(type, "" + index)
                    || getIndexTypeOfContextualType(type, ts.IndexKind.Number)
                    || (languageVersion >= ts.ScriptTarget.ES6 ? getElementTypeOfIterable(type, /*errorNode*/ undefined) : undefined);
            }
            return undefined;
        }
        // In a contextually typed conditional expression, the true/false expressions are contextually typed by the same type.
        function getContextualTypeForConditionalOperand(node) {
            var conditional = node.parent;
            return node === conditional.whenTrue || node === conditional.whenFalse ? getContextualType(conditional) : undefined;
        }
        function getContextualTypeForJsxExpression(expr) {
            // Contextual type only applies to JSX expressions that are in attribute assignments (not in 'Children' positions)
            if (expr.parent.kind === ts.SyntaxKind.JsxAttribute) {
                var attrib = expr.parent;
                var attrsType = getJsxElementAttributesType(attrib.parent);
                if (!attrsType || isTypeAny(attrsType)) {
                    return undefined;
                }
                else {
                    return getTypeOfPropertyOfType(attrsType, attrib.name.text);
                }
            }
            if (expr.kind === ts.SyntaxKind.JsxSpreadAttribute) {
                return getJsxElementAttributesType(expr.parent);
            }
            return undefined;
        }
        // Return the contextual type for a given expression node. During overload resolution, a contextual type may temporarily
        // be "pushed" onto a node using the contextualType property.
        function getContextualType(node) {
            var type = getContextualTypeWorker(node);
            return type && getApparentType(type, node);
        }
        function getContextualTypeWorker(node) {
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            if (node.contextualType) {
                return node.contextualType;
            }
            var parent = node.parent;
            switch (parent.kind) {
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.Parameter:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.BindingElement:
                    return getContextualTypeForInitializerExpression(node);
                case ts.SyntaxKind.ArrowFunction:
                case ts.SyntaxKind.ReturnStatement:
                    return getContextualTypeForReturnExpression(node);
                case ts.SyntaxKind.YieldExpression:
                    return getContextualTypeForYieldOperand(parent);
                case ts.SyntaxKind.CallExpression:
                case ts.SyntaxKind.NewExpression:
                    return getContextualTypeForArgument(parent, node);
                case ts.SyntaxKind.TypeAssertionExpression:
                case ts.SyntaxKind.AsExpression:
                    return getTypeFromTypeNode(parent.type);
                case ts.SyntaxKind.BinaryExpression:
                    return getContextualTypeForBinaryOperand(node);
                case ts.SyntaxKind.PropertyAssignment:
                    return getContextualTypeForObjectLiteralElement(parent);
                case ts.SyntaxKind.ArrayLiteralExpression:
                    return getContextualTypeForElementExpression(node);
                case ts.SyntaxKind.ConditionalExpression:
                    return getContextualTypeForConditionalOperand(node);
                case ts.SyntaxKind.TemplateSpan:
                    ts.Debug.assert(parent.parent.kind === ts.SyntaxKind.TemplateExpression);
                    return getContextualTypeForSubstitutionExpression(parent.parent, node);
                case ts.SyntaxKind.ParenthesizedExpression:
                    return getContextualType(parent);
                case ts.SyntaxKind.JsxExpression:
                case ts.SyntaxKind.JsxSpreadAttribute:
                    return getContextualTypeForJsxExpression(parent);
            }
            return undefined;
        }
        // If the given type is an object or union type, if that type has a single signature, and if
        // that signature is non-generic, return the signature. Otherwise return undefined.
        function getNonGenericSignature(type) {
            var signatures = getSignaturesOfStructuredType(type, ts.SignatureKind.Call);
            if (signatures.length === 1) {
                var signature = signatures[0];
                if (!signature.typeParameters) {
                    return signature;
                }
            }
        }
        function isFunctionExpressionOrArrowFunction(node) {
            return node.kind === ts.SyntaxKind.FunctionExpression || node.kind === ts.SyntaxKind.ArrowFunction;
        }
        function getContextualSignatureForFunctionLikeDeclaration(node) {
            // Only function expressions, arrow functions, and object literal methods are contextually typed.
            return isFunctionExpressionOrArrowFunction(node) || ts.isObjectLiteralMethod(node)
                ? getContextualSignature(node)
                : undefined;
        }
        // Return the contextual signature for a given expression node. A contextual type provides a
        // contextual signature if it has a single call signature and if that call signature is non-generic.
        // If the contextual type is a union type, get the signature from each type possible and if they are
        // all identical ignoring their return type, the result is same signature but with return type as
        // union type of return types from these signatures
        function getContextualSignature(node) {
            ts.Debug.assert(node.kind !== ts.SyntaxKind.MethodDeclaration || ts.isObjectLiteralMethod(node));
            var type = ts.isObjectLiteralMethod(node)
                ? getContextualTypeForObjectLiteralMethod(node)
                : getContextualType(node);
            if (!type) {
                return undefined;
            }
            // [ConcreteType] Concreteness does not play into signature
            type = unconcrete(type);
            // [/ConcreteType]
            if (!(type.flags & ts.TypeFlags.Union)) {
                return getNonGenericSignature(type);
            }
            var signatureList;
            var types = type.types;
            // [ConcreteTypeScript]
            var resolvedThisType = undefined;
            // [/ConcreteTypeScript] 
            for (var _i = 0; _i < types.length; _i++) {
                var current = types[_i];
                var signature = getNonGenericSignature(current);
                if (signature) {
                    // [ConcreteTypeScript] Support for contextual this type
                    resolvedThisType = (resolvedThisType || signature.resolvedThisType);
                    // [/ConcreteTypeScript] 
                    if (!signatureList) {
                        // This signature will contribute to contextual union signature
                        signatureList = [signature];
                    }
                    else if (!compareSignatures(signatureList[0], signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ true, compareTypes)) {
                        // Signatures aren't identical, do not use
                        return undefined;
                    }
                    else {
                        // Use this signature for contextual union signature
                        signatureList.push(signature);
                    }
                }
            }
            // Result is union of signatures collected (return type is union of return types of this signature set)
            var result;
            if (signatureList) {
                result = cloneSignature(signatureList[0]);
                // Clear resolved return type we possibly got from cloneSignature
                result.resolvedReturnType = undefined;
                // [ConcreteTypeScript] Support for contextual this type
                result.resolvedThisType = resolvedThisType;
                // [/ConcreteTypeScript]
                result.unionSignatures = signatureList;
            }
            return result;
        }
        /**
         * Detect if the mapper implies an inference context. Specifically, there are 4 possible values
         * for a mapper. Let's go through each one of them:
         *
         *    1. undefined - this means we are not doing inferential typing, but we may do contextual typing,
         *       which could cause us to assign a parameter a type
         *    2. identityMapper - means we want to avoid assigning a parameter a type, whether or not we are in
         *       inferential typing (context is undefined for the identityMapper)
         *    3. a mapper created by createInferenceMapper - we are doing inferential typing, we want to assign
         *       types to parameters and fix type parameters (context is defined)
         *    4. an instantiation mapper created by createTypeMapper or createTypeEraser - this should never be
         *       passed as the contextual mapper when checking an expression (context is undefined for these)
         *
         * isInferentialContext is detecting if we are in case 3
         */
        function isInferentialContext(mapper) {
            return mapper && mapper.context;
        }
        // A node is an assignment target if it is on the left hand side of an '=' token, if it is parented by a property
        // assignment in an object literal that is an assignment target, or if it is parented by an array literal that is
        // an assignment target. Examples include 'a = xxx', '{ p: a } = xxx', '[{ p: a}] = xxx'.
        function isAssignmentTarget(node) {
            var parent = node.parent;
            if (parent.kind === ts.SyntaxKind.BinaryExpression && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && parent.left === node) {
                return true;
            }
            if (parent.kind === ts.SyntaxKind.PropertyAssignment) {
                return isAssignmentTarget(parent.parent);
            }
            if (parent.kind === ts.SyntaxKind.ArrayLiteralExpression) {
                return isAssignmentTarget(parent);
            }
            return false;
        }
        function checkSpreadElementExpression(node, contextualMapper) {
            // It is usually not safe to call checkExpressionCached if we can be contextually typing.
            // You can tell that we are contextually typing because of the contextualMapper parameter.
            // While it is true that a spread element can have a contextual type, it does not do anything
            // with this type. It is neither affected by it, nor does it propagate it to its operand.
            // So the fact that contextualMapper is passed is not important, because the operand of a spread
            // element is not contextually typed.
            var arrayOrIterableType = checkExpressionCached(node.expression, contextualMapper);
            return checkIteratedTypeOrElementType(arrayOrIterableType, node.expression, /*allowStringInput*/ false);
        }
        function hasDefaultValue(node) {
            return (node.kind === ts.SyntaxKind.BindingElement && !!node.initializer) ||
                (node.kind === ts.SyntaxKind.BinaryExpression && node.operatorToken.kind === ts.SyntaxKind.EqualsToken);
        }
        function checkArrayLiteral(node, contextualMapper) {
            var elements = node.elements;
            var hasSpreadElement = false;
            var elementTypes = [];
            var inDestructuringPattern = isAssignmentTarget(node);
            for (var _i = 0; _i < elements.length; _i++) {
                var e = elements[_i];
                if (inDestructuringPattern && e.kind === ts.SyntaxKind.SpreadElementExpression) {
                    // Given the following situation:
                    //    var c: {};
                    //    [...c] = ["", 0];
                    //
                    // c is represented in the tree as a spread element in an array literal.
                    // But c really functions as a rest element, and its purpose is to provide
                    // a contextual type for the right hand side of the assignment. Therefore,
                    // instead of calling checkExpression on "...c", which will give an error
                    // if c is not iterable/array-like, we need to act as if we are trying to
                    // get the contextual element type from it. So we do something similar to
                    // getContextualTypeForElementExpression, which will crucially not error
                    // if there is no index type / iterated type.
                    var restArrayType = checkExpression(e.expression, contextualMapper);
                    var restElementType = getIndexTypeOfType(restArrayType, ts.IndexKind.Number) ||
                        (languageVersion >= ts.ScriptTarget.ES6 ? getElementTypeOfIterable(restArrayType, /*errorNode*/ undefined) : undefined);
                    if (restElementType) {
                        elementTypes.push(restElementType);
                    }
                }
                else {
                    var type = checkExpression(e, contextualMapper);
                    elementTypes.push(type);
                }
                hasSpreadElement = hasSpreadElement || e.kind === ts.SyntaxKind.SpreadElementExpression;
            }
            if (!hasSpreadElement) {
                // If array literal is actually a destructuring pattern, mark it as an implied type. We do this such
                // that we get the same behavior for "var [x, y] = []" and "[x, y] = []".
                if (inDestructuringPattern && elementTypes.length) {
                    var type = createNewTupleType(elementTypes);
                    type.pattern = node;
                    return type;
                }
                var contextualType = getContextualType(node);
                if (contextualType && contextualTypeIsTupleLikeType(contextualType)) {
                    var pattern = contextualType.pattern;
                    // If array literal is contextually typed by a binding pattern or an assignment pattern, pad the resulting
                    // tuple type with the corresponding binding or assignment element types to make the lengths equal.
                    if (pattern && (pattern.kind === ts.SyntaxKind.ArrayBindingPattern || pattern.kind === ts.SyntaxKind.ArrayLiteralExpression)) {
                        var patternElements = pattern.elements;
                        for (var i = elementTypes.length; i < patternElements.length; i++) {
                            var patternElement = patternElements[i];
                            if (hasDefaultValue(patternElement)) {
                                elementTypes.push(contextualType.elementTypes[i]);
                            }
                            else {
                                if (patternElement.kind !== ts.SyntaxKind.OmittedExpression) {
                                    error(patternElement, ts.Diagnostics.Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
                                }
                                elementTypes.push(unknownType);
                            }
                        }
                    }
                    if (elementTypes.length) {
                        return createTupleType(elementTypes);
                    }
                }
            }
            return createArrayType(elementTypes.length ? getUnionType(elementTypes) : undefinedType);
        }
        function isNumericName(name) {
            return name.kind === ts.SyntaxKind.ComputedPropertyName ? isNumericComputedName(name) : isNumericLiteralName(name.text);
        }
        function isNumericComputedName(name) {
            // It seems odd to consider an expression of type Any to result in a numeric name,
            // but this behavior is consistent with checkIndexedAccess
            return isTypeAnyOrAllConstituentTypesHaveKind(checkComputedPropertyName(name), ts.TypeFlags.NumberLike);
        }
        function isTypeAnyOrAllConstituentTypesHaveKind(type, kind) {
            return isTypeAny(type) || allConstituentTypesHaveKind(type, kind);
        }
        function isNumericLiteralName(name) {
            // The intent of numeric names is that
            //     - they are names with text in a numeric form, and that
            //     - setting properties/indexing with them is always equivalent to doing so with the numeric literal 'numLit',
            //         acquired by applying the abstract 'ToNumber' operation on the name's text.
            //
            // The subtlety is in the latter portion, as we cannot reliably say that anything that looks like a numeric literal is a numeric name.
            // In fact, it is the case that the text of the name must be equal to 'ToString(numLit)' for this to hold.
            //
            // Consider the property name '"0xF00D"'. When one indexes with '0xF00D', they are actually indexing with the value of 'ToString(0xF00D)'
            // according to the ECMAScript specification, so it is actually as if the user indexed with the string '"61453"'.
            // Thus, the text of all numeric literals equivalent to '61543' such as '0xF00D', '0xf00D', '0170015', etc. are not valid numeric names
            // because their 'ToString' representation is not equal to their original text.
            // This is motivated by ECMA-262 sections 9.3.1, 9.8.1, 11.1.5, and 11.2.1.
            //
            // Here, we test whether 'ToString(ToNumber(name))' is exactly equal to 'name'.
            // The '+' prefix operator is equivalent here to applying the abstract ToNumber operation.
            // Applying the 'toString()' method on a number gives us the abstract ToString operation on a number.
            //
            // Note that this accepts the values 'Infinity', '-Infinity', and 'NaN', and that this is intentional.
            // This is desired behavior, because when indexing with them as numeric entities, you are indexing
            // with the strings '"Infinity"', '"-Infinity"', and '"NaN"' respectively.
            return (+name).toString() === name;
        }
        function checkComputedPropertyName(node) {
            var links = getNodeLinks(node.expression);
            if (!links.resolvedType) {
                links.resolvedType = checkExpression(node.expression);
                // This will allow types number, string, symbol or any. It will also allow enums, the unknown
                // type, and any union of these types (like string | number).
                if (!isTypeAnyOrAllConstituentTypesHaveKind(links.resolvedType, ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.ESSymbol)) {
                    error(node, ts.Diagnostics.A_computed_property_name_must_be_of_type_string_number_symbol_or_any);
                }
                else {
                    checkThatExpressionIsProperSymbolReference(node.expression, links.resolvedType, /*reportError*/ true);
                }
            }
            return links.resolvedType;
        }
        function checkObjectLiteral(node, contextualMapper) {
            // Grammar checking
            checkGrammarObjectLiteralExpression(node);
            var propertiesTable = {};
            var propertiesArray = [];
            var contextualType = getContextualType(node);
            var contextualTypeHasPattern = contextualType && contextualType.pattern &&
                (contextualType.pattern.kind === ts.SyntaxKind.ObjectBindingPattern || contextualType.pattern.kind === ts.SyntaxKind.ObjectLiteralExpression);
            var inDestructuringPattern = isAssignmentTarget(node);
            var typeFlags = 0;
            for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                var memberDecl = _a[_i];
                var member = memberDecl.symbol;
                if (memberDecl.kind === ts.SyntaxKind.PropertyAssignment ||
                    memberDecl.kind === ts.SyntaxKind.ShorthandPropertyAssignment ||
                    ts.isObjectLiteralMethod(memberDecl)) {
                    var type = void 0;
                    if (memberDecl.kind === ts.SyntaxKind.PropertyAssignment) {
                        type = checkPropertyAssignment(memberDecl, contextualMapper);
                    }
                    else if (memberDecl.kind === ts.SyntaxKind.MethodDeclaration) {
                        type = checkObjectLiteralMethod(memberDecl, contextualMapper);
                    }
                    else {
                        ts.Debug.assert(memberDecl.kind === ts.SyntaxKind.ShorthandPropertyAssignment);
                        type = checkExpression(memberDecl.name, contextualMapper);
                    }
                    // [ConcreteTypeScript] Should not keep weak concreteness in object literal type.
                    type = getBindingType(type);
                    // [/ConcreteTypeScript]
                    typeFlags |= type.flags;
                    var prop = createSymbol(ts.SymbolFlags.Property | ts.SymbolFlags.Transient | member.flags, member.name);
                    if (inDestructuringPattern) {
                        // If object literal is an assignment pattern and if the assignment pattern specifies a default value
                        // for the property, make the property optional.
                        if (memberDecl.kind === ts.SyntaxKind.PropertyAssignment && hasDefaultValue(memberDecl.initializer)) {
                            prop.flags |= ts.SymbolFlags.Optional;
                        }
                    }
                    else if (contextualTypeHasPattern) {
                        // If object literal is contextually typed by the implied type of a binding pattern, and if the
                        // binding pattern specifies a default value for the property, make the property optional.
                        var impliedProp = getPropertyOfType(contextualType, member.name);
                        if (impliedProp) {
                            prop.flags |= impliedProp.flags & ts.SymbolFlags.Optional;
                        }
                        else if (!compilerOptions.suppressExcessPropertyErrors) {
                            error(memberDecl.name, ts.Diagnostics.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, symbolToString(member), typeToString(contextualType));
                        }
                    }
                    prop.declarations = member.declarations;
                    prop.parent = member.parent;
                    if (member.valueDeclaration) {
                        prop.valueDeclaration = member.valueDeclaration;
                    }
                    prop.type = type;
                    prop.target = member;
                    member = prop;
                }
                else {
                    // TypeScript 1.0 spec (April 2014)
                    // A get accessor declaration is processed in the same manner as
                    // an ordinary function declaration(section 6.1) with no parameters.
                    // A set accessor declaration is processed in the same manner
                    // as an ordinary function declaration with a single parameter and a Void return type.
                    ts.Debug.assert(memberDecl.kind === ts.SyntaxKind.GetAccessor || memberDecl.kind === ts.SyntaxKind.SetAccessor);
                    checkAccessorDeclaration(memberDecl);
                }
                if (!ts.hasDynamicName(memberDecl)) {
                    propertiesTable[member.name] = member;
                }
                propertiesArray.push(member);
            }
            // If object literal is contextually typed by the implied type of a binding pattern, augment the result
            // type with those properties for which the binding pattern specifies a default value.
            if (contextualTypeHasPattern) {
                for (var _b = 0, _c = getPropertiesOfType(contextualType); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    if (!ts.hasProperty(propertiesTable, prop.name)) {
                        if (!(prop.flags & ts.SymbolFlags.Optional)) {
                            error(prop.valueDeclaration || prop.bindingElement, ts.Diagnostics.Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
                        }
                        propertiesTable[prop.name] = prop;
                        propertiesArray.push(prop);
                    }
                }
            }
            var stringIndexType = getIndexType(ts.IndexKind.String);
            var numberIndexType = getIndexType(ts.IndexKind.Number);
            var result = createAnonymousType(node.symbol, propertiesTable, emptyArray, emptyArray, stringIndexType, numberIndexType);
            var freshObjectLiteralFlag = compilerOptions.suppressExcessPropertyErrors ? 0 : ts.TypeFlags.FreshObjectLiteral;
            result.flags |= ts.TypeFlags.ObjectLiteral | ts.TypeFlags.ContainsObjectLiteral | freshObjectLiteralFlag | (typeFlags & ts.TypeFlags.PropagatingFlags);
            if (inDestructuringPattern) {
                result.pattern = node;
            }
            return result;
            function getIndexType(kind) {
                if (contextualType && contextualTypeHasIndexSignature(contextualType, kind)) {
                    var propTypes = [];
                    for (var i = 0; i < propertiesArray.length; i++) {
                        var propertyDecl = node.properties[i];
                        if (kind === ts.IndexKind.String || isNumericName(propertyDecl.name)) {
                            // Do not call getSymbolOfNode(propertyDecl), as that will get the
                            // original symbol for the node. We actually want to get the symbol
                            // created by checkObjectLiteral, since that will be appropriately
                            // contextually typed and resolved.
                            var type = getTypeOfSymbol(propertiesArray[i]);
                            if (!ts.contains(propTypes, type)) {
                                propTypes.push(type);
                            }
                        }
                    }
                    var result_2 = propTypes.length ? getUnionType(propTypes) : undefinedType;
                    typeFlags |= result_2.flags;
                    return result_2;
                }
                return undefined;
            }
        }
        function checkJsxSelfClosingElement(node) {
            checkJsxOpeningLikeElement(node);
            return jsxElementType || anyType;
        }
        function tagNamesAreEquivalent(lhs, rhs) {
            if (lhs.kind !== rhs.kind) {
                return false;
            }
            if (lhs.kind === ts.SyntaxKind.Identifier) {
                return lhs.text === rhs.text;
            }
            return lhs.right.text === rhs.right.text &&
                tagNamesAreEquivalent(lhs.left, rhs.left);
        }
        function checkJsxElement(node) {
            // Check attributes
            checkJsxOpeningLikeElement(node.openingElement);
            // Check that the closing tag matches
            if (!tagNamesAreEquivalent(node.openingElement.tagName, node.closingElement.tagName)) {
                error(node.closingElement, ts.Diagnostics.Expected_corresponding_JSX_closing_tag_for_0, ts.getTextOfNode(node.openingElement.tagName));
            }
            else {
                // Perform resolution on the closing tag so that rename/go to definition/etc work
                getJsxElementTagSymbol(node.closingElement);
            }
            // Check children
            for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                var child = _a[_i];
                switch (child.kind) {
                    case ts.SyntaxKind.JsxExpression:
                        checkJsxExpression(child);
                        break;
                    case ts.SyntaxKind.JsxElement:
                        checkJsxElement(child);
                        break;
                    case ts.SyntaxKind.JsxSelfClosingElement:
                        checkJsxSelfClosingElement(child);
                        break;
                    default:
                        // No checks for JSX Text
                        ts.Debug.assert(child.kind === ts.SyntaxKind.JsxText);
                }
            }
            return jsxElementType || anyType;
        }
        /**
         * Returns true iff the JSX element name would be a valid JS identifier, ignoring restrictions about keywords not being identifiers
         */
        function isUnhyphenatedJsxName(name) {
            // - is the only character supported in JSX attribute names that isn't valid in JavaScript identifiers
            return name.indexOf("-") < 0;
        }
        /**
         * Returns true iff React would emit this tag name as a string rather than an identifier or qualified name
         */
        function isJsxIntrinsicIdentifier(tagName) {
            if (tagName.kind === ts.SyntaxKind.QualifiedName) {
                return false;
            }
            else {
                return ts.isIntrinsicJsxName(tagName.text);
            }
        }
        function checkJsxAttribute(node, elementAttributesType, nameTable) {
            var correspondingPropType = undefined;
            // Look up the corresponding property for this attribute
            if (elementAttributesType === emptyObjectType && isUnhyphenatedJsxName(node.name.text)) {
                // If there is no 'props' property, you may not have non-"data-" attributes
                error(node.parent, ts.Diagnostics.JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property, getJsxElementPropertiesName());
            }
            else if (elementAttributesType && !isTypeAny(elementAttributesType)) {
                var correspondingPropSymbol = getPropertyOfType(elementAttributesType, node.name.text);
                correspondingPropType = correspondingPropSymbol && getTypeOfSymbol(correspondingPropSymbol);
                if (isUnhyphenatedJsxName(node.name.text)) {
                    // Maybe there's a string indexer?
                    var indexerType = getIndexTypeOfType(elementAttributesType, ts.IndexKind.String);
                    if (indexerType) {
                        correspondingPropType = indexerType;
                    }
                    else {
                        // If there's no corresponding property with this name, error
                        if (!correspondingPropType) {
                            error(node.name, ts.Diagnostics.Property_0_does_not_exist_on_type_1, node.name.text, typeToString(elementAttributesType));
                            return unknownType;
                        }
                    }
                }
            }
            var exprType;
            if (node.initializer) {
                exprType = checkExpression(node.initializer);
            }
            else {
                // <Elem attr /> is sugar for <Elem attr={true} />
                exprType = booleanType;
            }
            if (correspondingPropType) {
                checkTypeAssignableTo(exprType, correspondingPropType, node);
            }
            nameTable[node.name.text] = true;
            return exprType;
        }
        function checkJsxSpreadAttribute(node, elementAttributesType, nameTable) {
            var type = checkExpression(node.expression);
            var props = getPropertiesOfType(type);
            for (var _i = 0; _i < props.length; _i++) {
                var prop = props[_i];
                // Is there a corresponding property in the element attributes type? Skip checking of properties
                // that have already been assigned to, as these are not actually pushed into the resulting type
                if (!nameTable[prop.name]) {
                    var targetPropSym = getPropertyOfType(elementAttributesType, prop.name);
                    if (targetPropSym) {
                        var msg = ts.chainDiagnosticMessages(undefined, ts.Diagnostics.Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property, prop.name);
                        checkTypeAssignableTo(getTypeOfSymbol(prop), getTypeOfSymbol(targetPropSym), node, undefined, msg);
                    }
                    nameTable[prop.name] = true;
                }
            }
            return type;
        }
        /// Returns the type JSX.IntrinsicElements. May return `unknownType` if that type is not present.
        function getJsxIntrinsicElementsType() {
            if (!jsxIntrinsicElementsType) {
                jsxIntrinsicElementsType = getExportedTypeFromNamespace(JsxNames.JSX, JsxNames.IntrinsicElements) || unknownType;
            }
            return jsxIntrinsicElementsType;
        }
        /// Given a JSX opening element or self-closing element, return the symbol of the property that the tag name points to if
        /// this is an intrinsic tag. This might be a named
        /// property of the IntrinsicElements interface, or its string indexer.
        /// If this is a class-based tag (otherwise returns undefined), returns the symbol of the class
        /// type or factory function.
        /// Otherwise, returns unknownSymbol.
        function getJsxElementTagSymbol(node) {
            var flags = ts.JsxFlags.UnknownElement;
            var links = getNodeLinks(node);
            if (!links.resolvedSymbol) {
                if (isJsxIntrinsicIdentifier(node.tagName)) {
                    links.resolvedSymbol = lookupIntrinsicTag(node);
                }
                else {
                    links.resolvedSymbol = lookupClassTag(node);
                }
            }
            return links.resolvedSymbol;
            function lookupIntrinsicTag(node) {
                var intrinsicElementsType = getJsxIntrinsicElementsType();
                if (intrinsicElementsType !== unknownType) {
                    // Property case
                    var intrinsicProp = getPropertyOfType(intrinsicElementsType, node.tagName.text);
                    if (intrinsicProp) {
                        links.jsxFlags |= ts.JsxFlags.IntrinsicNamedElement;
                        return intrinsicProp;
                    }
                    // Intrinsic string indexer case
                    var indexSignatureType = getIndexTypeOfType(intrinsicElementsType, ts.IndexKind.String);
                    if (indexSignatureType) {
                        links.jsxFlags |= ts.JsxFlags.IntrinsicIndexedElement;
                        return intrinsicElementsType.symbol;
                    }
                    // Wasn't found
                    error(node, ts.Diagnostics.Property_0_does_not_exist_on_type_1, node.tagName.text, "JSX." + JsxNames.IntrinsicElements);
                    return unknownSymbol;
                }
                else {
                    if (compilerOptions.noImplicitAny) {
                        error(node, ts.Diagnostics.JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists, JsxNames.IntrinsicElements);
                    }
                }
            }
            function lookupClassTag(node) {
                var valueSymbol = resolveJsxTagName(node);
                // Look up the value in the current scope
                if (valueSymbol && valueSymbol !== unknownSymbol) {
                    links.jsxFlags |= ts.JsxFlags.ClassElement;
                    getSymbolLinks(valueSymbol).referenced = true;
                }
                return valueSymbol || unknownSymbol;
            }
            function resolveJsxTagName(node) {
                if (node.tagName.kind === ts.SyntaxKind.Identifier) {
                    var tag = node.tagName;
                    var sym = getResolvedSymbol(tag);
                    return sym.exportSymbol || sym;
                }
                else {
                    return checkQualifiedName(node.tagName).symbol;
                }
            }
        }
        /**
         * Given a JSX element that is a class element, finds the Element Instance Type. If the
         * element is not a class element, or the class element type cannot be determined, returns 'undefined'.
         * For example, in the element <MyClass>, the element instance type is `MyClass` (not `typeof MyClass`).
         */
        function getJsxElementInstanceType(node) {
            // There is no such thing as an instance type for a non-class element. This
            // line shouldn't be hit.
            ts.Debug.assert(!!(getNodeLinks(node).jsxFlags & ts.JsxFlags.ClassElement), "Should not call getJsxElementInstanceType on non-class Element");
            var classSymbol = getJsxElementTagSymbol(node);
            if (classSymbol === unknownSymbol) {
                // Couldn't find the class instance type. Error has already been issued
                return anyType;
            }
            var valueType = getTypeOfSymbol(classSymbol);
            if (isTypeAny(valueType)) {
                // Short-circuit if the class tag is using an element type 'any'
                return anyType;
            }
            // Resolve the signatures, preferring constructors
            var signatures = getSignaturesOfType(valueType, ts.SignatureKind.Construct);
            if (signatures.length === 0) {
                // No construct signatures, try call signatures
                signatures = getSignaturesOfType(valueType, ts.SignatureKind.Call);
                if (signatures.length === 0) {
                    // We found no signatures at all, which is an error
                    error(node.tagName, ts.Diagnostics.JSX_element_type_0_does_not_have_any_construct_or_call_signatures, ts.getTextOfNode(node.tagName));
                    return unknownType;
                }
            }
            var returnType = getUnionType(signatures.map(getReturnTypeOfSignature));
            // Issue an error if this return type isn't assignable to JSX.ElementClass
            var elemClassType = getJsxGlobalElementClassType();
            if (elemClassType) {
                checkTypeRelatedTo(returnType, elemClassType, assignableRelation, node, ts.Diagnostics.JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements);
            }
            return returnType;
        }
        /// e.g. "props" for React.d.ts,
        /// or 'undefined' if ElementAttributesPropery doesn't exist (which means all
        ///     non-intrinsic elements' attributes type is 'any'),
        /// or '' if it has 0 properties (which means every
        ///     non-instrinsic elements' attributes type is the element instance type)
        function getJsxElementPropertiesName() {
            // JSX
            var jsxNamespace = getGlobalSymbol(JsxNames.JSX, ts.SymbolFlags.Namespace, /*diagnosticMessage*/ undefined);
            // JSX.ElementAttributesProperty [symbol]
            var attribsPropTypeSym = jsxNamespace && getSymbol(jsxNamespace.exports, JsxNames.ElementAttributesPropertyNameContainer, ts.SymbolFlags.Type);
            // JSX.ElementAttributesProperty [type]
            var attribPropType = attribsPropTypeSym && getDeclaredTypeOfSymbol(attribsPropTypeSym);
            // The properites of JSX.ElementAttributesProperty
            var attribProperties = attribPropType && getPropertiesOfType(attribPropType);
            if (attribProperties) {
                // Element Attributes has zero properties, so the element attributes type will be the class instance type
                if (attribProperties.length === 0) {
                    return "";
                }
                else if (attribProperties.length === 1) {
                    return attribProperties[0].name;
                }
                else {
                    error(attribsPropTypeSym.declarations[0], ts.Diagnostics.The_global_type_JSX_0_may_not_have_more_than_one_property, JsxNames.ElementAttributesPropertyNameContainer);
                    return undefined;
                }
            }
            else {
                // No interface exists, so the element attributes type will be an implicit any
                return undefined;
            }
        }
        /**
         * Given an opening/self-closing element, get the 'element attributes type', i.e. the type that tells
         * us which attributes are valid on a given element.
         */
        function getJsxElementAttributesType(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedJsxType) {
                var sym = getJsxElementTagSymbol(node);
                if (links.jsxFlags & ts.JsxFlags.ClassElement) {
                    var elemInstanceType = getJsxElementInstanceType(node);
                    if (isTypeAny(elemInstanceType)) {
                        return links.resolvedJsxType = elemInstanceType;
                    }
                    var propsName = getJsxElementPropertiesName();
                    if (propsName === undefined) {
                        // There is no type ElementAttributesProperty, return 'any'
                        return links.resolvedJsxType = anyType;
                    }
                    else if (propsName === "") {
                        // If there is no e.g. 'props' member in ElementAttributesProperty, use the element class type instead
                        return links.resolvedJsxType = elemInstanceType;
                    }
                    else {
                        var attributesType = getTypeOfPropertyOfType(elemInstanceType, propsName);
                        if (!attributesType) {
                            // There is no property named 'props' on this instance type
                            return links.resolvedJsxType = emptyObjectType;
                        }
                        else if (isTypeAny(attributesType) || (attributesType === unknownType)) {
                            return links.resolvedJsxType = attributesType;
                        }
                        else if (!(attributesType.flags & ts.TypeFlags.ObjectType)) {
                            error(node.tagName, ts.Diagnostics.JSX_element_attributes_type_0_must_be_an_object_type, typeToString(attributesType));
                            return links.resolvedJsxType = anyType;
                        }
                        else {
                            return links.resolvedJsxType = attributesType;
                        }
                    }
                }
                else if (links.jsxFlags & ts.JsxFlags.IntrinsicNamedElement) {
                    return links.resolvedJsxType = getTypeOfSymbol(sym);
                }
                else if (links.jsxFlags & ts.JsxFlags.IntrinsicIndexedElement) {
                    return links.resolvedJsxType = getIndexTypeOfSymbol(sym, ts.IndexKind.String);
                }
                else {
                    // Resolution failed, so we don't know
                    return links.resolvedJsxType = anyType;
                }
            }
            return links.resolvedJsxType;
        }
        /**
         * Given a JSX attribute, returns the symbol for the corresponds property
         * of the element attributes type. Will return unknownSymbol for attributes
         * that have no matching element attributes type property.
         */
        function getJsxAttributePropertySymbol(attrib) {
            var attributesType = getJsxElementAttributesType(attrib.parent);
            var prop = getPropertyOfType(attributesType, attrib.name.text);
            return prop || unknownSymbol;
        }
        function getJsxGlobalElementClassType() {
            if (!jsxElementClassType) {
                jsxElementClassType = getExportedTypeFromNamespace(JsxNames.JSX, JsxNames.ElementClass);
            }
            return jsxElementClassType;
        }
        /// Returns all the properties of the Jsx.IntrinsicElements interface
        function getJsxIntrinsicTagNames() {
            var intrinsics = getJsxIntrinsicElementsType();
            return intrinsics ? getPropertiesOfType(intrinsics) : emptyArray;
        }
        function checkJsxPreconditions(errorNode) {
            // Preconditions for using JSX
            if ((compilerOptions.jsx || ts.JsxEmit.None) === ts.JsxEmit.None) {
                error(errorNode, ts.Diagnostics.Cannot_use_JSX_unless_the_jsx_flag_is_provided);
            }
            if (jsxElementType === undefined) {
                if (compilerOptions.noImplicitAny) {
                    error(errorNode, ts.Diagnostics.JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist);
                }
            }
        }
        function checkJsxOpeningLikeElement(node) {
            checkGrammarJsxElement(node);
            checkJsxPreconditions(node);
            // If we're compiling under --jsx react, the symbol 'React' should
            // be marked as 'used' so we don't incorrectly elide its import. And if there
            // is no 'React' symbol in scope, we should issue an error.
            if (compilerOptions.jsx === ts.JsxEmit.React) {
                var reactSym = resolveName(node.tagName, "React", ts.SymbolFlags.Value, ts.Diagnostics.Cannot_find_name_0, "React");
                if (reactSym) {
                    getSymbolLinks(reactSym).referenced = true;
                }
            }
            var targetAttributesType = getJsxElementAttributesType(node);
            var nameTable = {};
            // Process this array in right-to-left order so we know which
            // attributes (mostly from spreads) are being overwritten and
            // thus should have their types ignored
            var sawSpreadedAny = false;
            for (var i = node.attributes.length - 1; i >= 0; i--) {
                if (node.attributes[i].kind === ts.SyntaxKind.JsxAttribute) {
                    checkJsxAttribute((node.attributes[i]), targetAttributesType, nameTable);
                }
                else {
                    ts.Debug.assert(node.attributes[i].kind === ts.SyntaxKind.JsxSpreadAttribute);
                    var spreadType = checkJsxSpreadAttribute((node.attributes[i]), targetAttributesType, nameTable);
                    if (isTypeAny(spreadType)) {
                        sawSpreadedAny = true;
                    }
                }
            }
            // Check that all required properties have been provided. If an 'any'
            // was spreaded in, though, assume that it provided all required properties
            if (targetAttributesType && !sawSpreadedAny) {
                var targetProperties = getPropertiesOfType(targetAttributesType);
                for (var i = 0; i < targetProperties.length; i++) {
                    if (!(targetProperties[i].flags & ts.SymbolFlags.Optional) &&
                        nameTable[targetProperties[i].name] === undefined) {
                        error(node, ts.Diagnostics.Property_0_is_missing_in_type_1, targetProperties[i].name, typeToString(targetAttributesType));
                    }
                }
            }
        }
        function checkJsxExpression(node) {
            if (node.expression) {
                return checkExpression(node.expression);
            }
            else {
                return unknownType;
            }
        }
        // If a symbol is a synthesized symbol with no value declaration, we assume it is a property. Example of this are the synthesized
        // '.prototype' property as well as synthesized tuple index properties.
        function getDeclarationKindFromSymbol(s) {
            return s.valueDeclaration ? s.valueDeclaration.kind : ts.SyntaxKind.PropertyDeclaration;
        }
        function getDeclarationFlagsFromSymbol(s) {
            return s.valueDeclaration ? ts.getCombinedNodeFlags(s.valueDeclaration) : s.flags & ts.SymbolFlags.Prototype ? ts.NodeFlags.Public | ts.NodeFlags.Static : 0;
        }
        /**
         * Check whether the requested property access is valid.
         * Returns true if node is a valid property access, and false otherwise.
         * @param node The node to be checked.
         * @param left The left hand side of the property access (e.g.: the super in `super.foo`).
         * @param type The type of left.
         * @param prop The symbol for the right hand side of the property access.
         */
        function checkClassPropertyAccess(node, left, type, prop) {
            var flags = getDeclarationFlagsFromSymbol(prop);
            var declaringClass = getDeclaredTypeOfSymbol(prop.parent);
            if (left.kind === ts.SyntaxKind.SuperKeyword) {
                var errorNode = node.kind === ts.SyntaxKind.PropertyAccessExpression ?
                    node.name :
                    node.right;
                // TS 1.0 spec (April 2014): 4.8.2
                // - In a constructor, instance member function, instance member accessor, or
                //   instance member variable initializer where this references a derived class instance,
                //   a super property access is permitted and must specify a public instance member function of the base class.
                // - In a static member function or static member accessor
                //   where this references the constructor function object of a derived class,
                //   a super property access is permitted and must specify a public static member function of the base class.
                if (getDeclarationKindFromSymbol(prop) !== ts.SyntaxKind.MethodDeclaration) {
                    // `prop` refers to a *property* declared in the super class
                    // rather than a *method*, so it does not satisfy the above criteria.
                    error(errorNode, ts.Diagnostics.Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword);
                    return false;
                }
                if (flags & ts.NodeFlags.Abstract) {
                    // A method cannot be accessed in a super property access if the method is abstract.
                    // This error could mask a private property access error. But, a member
                    // cannot simultaneously be private and abstract, so this will trigger an
                    // additional error elsewhere.
                    error(errorNode, ts.Diagnostics.Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression, symbolToString(prop), typeToString(declaringClass));
                    return false;
                }
            }
            // Public properties are otherwise accessible.
            if (!(flags & (ts.NodeFlags.Private | ts.NodeFlags.Protected))) {
                return true;
            }
            // Property is known to be private or protected at this point
            // Get the declaring and enclosing class instance types
            var enclosingClassDeclaration = ts.getContainingClass(node);
            var enclosingClass = enclosingClassDeclaration ? getDeclaredTypeOfSymbol(getSymbolOfNode(enclosingClassDeclaration)) : undefined;
            // Private property is accessible if declaring and enclosing class are the same
            if (flags & ts.NodeFlags.Private) {
                if (declaringClass !== enclosingClass) {
                    error(node, ts.Diagnostics.Property_0_is_private_and_only_accessible_within_class_1, symbolToString(prop), typeToString(declaringClass));
                    return false;
                }
                return true;
            }
            // Property is known to be protected at this point
            // All protected properties of a supertype are accessible in a super access
            if (left.kind === ts.SyntaxKind.SuperKeyword) {
                return true;
            }
            // A protected property is accessible in the declaring class and classes derived from it
            if (!enclosingClass || !hasBaseType(enclosingClass, declaringClass)) {
                error(node, ts.Diagnostics.Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses, symbolToString(prop), typeToString(declaringClass));
                return false;
            }
            // No further restrictions for static properties
            if (flags & ts.NodeFlags.Static) {
                return true;
            }
            // An instance property must be accessed through an instance of the enclosing class
            // TODO: why is the first part of this check here?
            if (!(getTargetType(type).flags & (ts.TypeFlags.Class | ts.TypeFlags.Interface | ts.TypeFlags.Declare) && hasBaseType(type, enclosingClass))) {
                error(node, ts.Diagnostics.Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1, symbolToString(prop), typeToString(enclosingClass));
                return false;
            }
            return true;
        }
        function checkPropertyAccessExpression(node) {
            return checkPropertyAccessExpressionOrQualifiedName(node, node.expression, node.name);
        }
        function checkQualifiedName(node) {
            return checkPropertyAccessExpressionOrQualifiedName(node, node.left, node.right);
        }
        /*
                // [ConcreteTypeScript]
                function isCementedPropertyFromBaseTypes(type: InterfaceType, member: string): boolean {
                    let baseTypes = getBaseTypes(type);
                    for (let baseType of baseTypes) {
                        if (isCementedPropertyWorker(baseType, member)) {
                            return true;
                        }
                    }
                    return false;
                }
                // Should we cement or protect this property?
                // Cementing happens for weak concrete inference.
                function getProtectionForType(propType: Type): ProtectionFlags {
                    Debug.assert(isConcreteType(propType));
                    return isWeakConcreteType(propType) ? ProtectionFlags.Cemented : ProtectionFlags.Protected;
                }
        
                function getPropertyProtection(type: Type, member: string): ProtectionFlags {
                    if (type.flags & TypeFlags.IntermediateFlow || isConcreteType(type)) {
                        return getPropertyProtectionWorker(type, member);
                    }
                    return ProtectionFlags.None;
                }
        */
        // [ConcreteTypeScript]
        // Analyze the concrete portions of an object type to find out the following about a member:
        //  - Is it cemented?
        //  - Is it protected?
        //  - Is it stable for the type, in the property assignment order sense? (Only for classes)
        //  - Does it require a runtime validation check?
        //  - Should we demote the concreteness?
        function getPropertyProtection(type, propType, member) {
            // If the property type is not concrete, no action must be taken.
            if (!isConcreteType(propType)) {
                return ts.ProtectionFlags.None;
            }
            var flags = getPropertyProtectionWorker(type, member);
            // By default, if we do not have this type from a verified component, we must check or demote.
            if (flags === ts.ProtectionFlags.None) {
                flags = isWeakConcreteType(propType) ? ts.ProtectionFlags.MustDemote : ts.ProtectionFlags.MustCheck;
            }
            return flags;
        }
        // [ConcreteTypeScript]
        function isConcreteSymbol(symbol) {
            if (!symbol)
                return false;
            var type = getTypeOfSymbol(symbol);
            return isConcreteType(type);
        }
        // [ConcreteTypeScript]
        function isStronglyConcreteSymbol(symbol) {
            if (!symbol)
                return false;
            var type = getTypeOfSymbol(symbol);
            return isConcreteType(type) && !isWeakConcreteType(type);
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionIntersection(type, member) {
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var subtype = _a[_i];
                var flags = getPropertyProtectionWorker(subtype, member);
                if (flags) {
                    return flags;
                }
            }
            return ts.ProtectionFlags.None;
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionIntermediateFlow(type, member) {
            var targetType = type.targetType;
            if (type.declareTypeNode) {
                var flowData = getFlowDataForType(type);
                var memberData = ts.getProperty(flowData.memberSet, member);
                if (memberData) {
                    var propType = flowTypeGet(memberData);
                    if (isConcreteType(propType)) {
                        return isWeakConcreteType(propType) ? ts.ProtectionFlags.Cemented : ts.ProtectionFlags.Protected;
                    }
                }
            }
            // Otherwise, analyze the starting type:
            return getPropertyProtectionWorker(flowDataFormalType(type.flowData), member);
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionAnonymous(type, member) {
            var symbol = type.symbol;
            if (symbol && symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Enum | ts.SymbolFlags.Function | ts.SymbolFlags.ValueModule)) {
                var propSymbol = getPropertyOfType(type, member);
                if (propSymbol.flags & ts.SymbolFlags.Prototype) {
                    return ts.ProtectionFlags.Cemented | ts.ProtectionFlags.Stable;
                }
                else if (isStronglyConcreteSymbol(propSymbol)) {
                    return ts.ProtectionFlags.Protected;
                }
                else if (isConcreteSymbol(propSymbol)) {
                    return ts.ProtectionFlags.Cemented;
                }
            }
            return ts.ProtectionFlags.None;
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionClass(type, member) {
            var propSymbol = getPropertyOfType(type, member);
            if (isStronglyConcreteSymbol(propSymbol)) {
                return ts.ProtectionFlags.Protected | ts.ProtectionFlags.Stable;
            }
            else if (isConcreteSymbol(propSymbol)) {
                return ts.ProtectionFlags.Cemented | ts.ProtectionFlags.Stable;
            }
            return ts.ProtectionFlags.None;
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionDeclare(type, member) {
            var flowData = getFlowDataForType(type);
            var propType;
            if (flowData) {
                propType = ts.hasProperty(flowData.memberSet, member) ? flowTypeGet(flowData.memberSet[member]) : null;
            }
            if (!propType) {
                resolveStructuredTypeMembers(type);
                var propSymbol = ts.getProperty(type.symbol.members, member);
                if (propSymbol) {
                    propType = getTypeOfSymbol(propSymbol);
                }
            }
            if (propType && isConcreteType(propType)) {
                return isWeakConcreteType(propType) ? ts.ProtectionFlags.Cemented : ts.ProtectionFlags.Protected;
            }
            for (var _i = 0, _a = getBaseTypes(type); _i < _a.length; _i++) {
                var subtype = _a[_i];
                var flags = getPropertyProtectionWorker(subtype, member);
                if (flags) {
                    return flags;
                }
            }
            return ts.ProtectionFlags.None;
        }
        // [ConcreteTypeScript]
        function getPropertyProtectionConcrete(type, member) {
            type = unconcrete(type);
            if (type.flags & ts.TypeFlags.Class) {
                return getPropertyProtectionClass(type, member);
            }
            else if (type.flags & ts.TypeFlags.Anonymous) {
                return getPropertyProtectionAnonymous(type, member);
            }
            else if (type.flags & ts.TypeFlags.Declare) {
                return getPropertyProtectionDeclare(type, member);
            }
            return ts.ProtectionFlags.None;
        }
        // [ConcreteTypeScript]
        // Handle everything except MustDemote and MustCheck, implied from None in getPropertyProtection
        function getPropertyProtectionWorker(type, member) {
            if (type.flags & ts.TypeFlags.Intersection) {
                return getPropertyProtectionIntersection(type, member);
            }
            else if (type.flags & ts.TypeFlags.IntermediateFlow) {
                return getPropertyProtectionIntermediateFlow(type, member);
            }
            else if (isConcreteType(type)) {
                return getPropertyProtectionConcrete(type, member);
            }
            return ts.ProtectionFlags.None;
        }
        function checkPropertyAccessExpressionOrQualifiedName(node, left, right) {
            node.checker = checker;
            var type = checkExpression(left);
            if (isTypeAny(type)) {
                return type;
            }
            var apparentType = getApparentType(getWidenedType(type), /* [ConcreteTypeScript] */ left);
            if (apparentType === unknownType) {
                // handle cases when type is Type parameter with invalid constraint
                return unknownType;
            }
            var prop = getPropertyOfType(apparentType, right.text);
            if (!prop) {
                if (right.text) {
                    error(right, ts.Diagnostics.Property_0_does_not_exist_on_type_1, ts.declarationNameToString(right), typeToString(type));
                }
                return unknownType;
            }
            getNodeLinks(node).resolvedSymbol = prop;
            if (prop.parent && prop.parent.flags & ts.SymbolFlags.Class) {
                checkClassPropertyAccess(node, left, type, prop);
            }
            var propType = getTypeOfSymbol(prop);
            if (prop.flags & ts.SymbolFlags.Prototype) {
                // TODO starting type
                propType = createIntermediateFlowType(node, emptyObjectType, propType, prop.valueDeclaration);
                propType = getFlowTypeAtLocation(node, propType);
            }
            // [ConcreteTypeScript] From here on, emit-relevant logic:
            var flags = getPropertyProtection(type, propType, right.text);
            if (flags & ts.ProtectionFlags.MustCheck) {
                // If we are not a concrete member that stemmed from a Class or Declare declaration site, we must check.
                // The alternative would be to demote the concrete type, which was decided against as making
                // the annotations have less impact.
                nodeMustCheck(node, propType);
            }
            if (flags & ts.ProtectionFlags.MustDemote) {
                propType = unconcrete(propType);
            }
            if (flags & ts.ProtectionFlags.Stable) {
                getNodeLinks(node).direct = true; // Can use v8 accessors
            }
            if (flags & ts.ProtectionFlags.ProtectedOrCemented) {
                // And float/intness
                if (unconcrete(propType).flags & ts.TypeFlags.FloatHint) {
                    getNodeLinks(node).assertFloat = true;
                }
                else if (unconcrete(propType).flags & ts.TypeFlags.IntHint) {
                    getNodeLinks(node).assertInt = true;
                }
            }
            // We may use protection-eliding name-mangled access if the target value is protected.
            if (flags & ts.ProtectionFlags.Protected) {
                getNodeLinks(node).mangled = true;
            }
            if (flags & ts.ProtectionFlags.Cemented) {
                // As well, cemented method's of classes are concrete and can be accessed in this way, but only during method calls.
                if (node.parent.kind === ts.SyntaxKind.CallExpression) {
                    // TODO fix direct calls for prototypes
                    getNodeLinks(node).mangled = true;
                }
            }
            return propType;
            // [/ConcreteTypeScript]
        }
        function isValidPropertyAccess(node, propertyName) {
            var left = node.kind === ts.SyntaxKind.PropertyAccessExpression
                ? node.expression
                : node.left;
            var type = checkExpression(left);
            if (type !== unknownType && !isTypeAny(type)) {
                var prop = getPropertyOfType(getWidenedType(type), propertyName);
                if (prop && prop.parent && prop.parent.flags & ts.SymbolFlags.Class) {
                    return checkClassPropertyAccess(node, left, type, prop);
                }
            }
            return true;
        }
        // [ConcreteTypeScript] Must check index access if it returns a concrete type
        function checkIndexedAccess(node) {
            var type = checkIndexedAccessWorker(node);
            if (isConcreteType(type)) {
                nodeMustCheck(node, type);
            }
            return type;
        }
        function checkIndexedAccessWorker(node) {
            // [/ConcreteTypeScript]
            // Grammar checking
            if (!node.argumentExpression) {
                var sourceFile = getSourceFile(node);
                if (node.parent.kind === ts.SyntaxKind.NewExpression && node.parent.expression === node) {
                    var start = ts.skipTrivia(sourceFile.text, node.expression.end);
                    var end = node.end;
                    grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.new_T_cannot_be_used_to_create_an_array_Use_new_Array_T_instead);
                }
                else {
                    var start = node.end - "]".length;
                    var end = node.end;
                    grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Expression_expected);
                }
            }
            // Obtain base constraint such that we can bail out if the constraint is an unknown type
            var objectType = getApparentType(checkExpression(node.expression), /* [ConcreteTypeScript]: */ node.expression);
            var indexType = node.argumentExpression ? checkExpression(node.argumentExpression) : unknownType;
            // [ConcreteTypeScript] Allow concrete indexes
            objectType = unconcrete(objectType);
            indexType = unconcrete(indexType);
            // [/ConcreteTypeScript]
            if (objectType === unknownType) {
                return unknownType;
            }
            var isConstEnum = isConstEnumObjectType(objectType);
            if (isConstEnum &&
                (!node.argumentExpression || node.argumentExpression.kind !== ts.SyntaxKind.StringLiteral)) {
                error(node.argumentExpression, ts.Diagnostics.A_const_enum_member_can_only_be_accessed_using_a_string_literal);
                return unknownType;
            }
            // TypeScript 1.0 spec (April 2014): 4.10 Property Access
            // - If IndexExpr is a string literal or a numeric literal and ObjExpr's apparent type has a property with the name
            //    given by that literal(converted to its string representation in the case of a numeric literal), the property access is of the type of that property.
            // - Otherwise, if ObjExpr's apparent type has a numeric index signature and IndexExpr is of type Any, the Number primitive type, or an enum type,
            //    the property access is of the type of that index signature.
            // - Otherwise, if ObjExpr's apparent type has a string index signature and IndexExpr is of type Any, the String or Number primitive type, or an enum type,
            //    the property access is of the type of that index signature.
            // - Otherwise, if IndexExpr is of type Any, the String or Number primitive type, or an enum type, the property access is of type Any.
            // See if we can index as a property.
            if (node.argumentExpression) {
                var name_3 = getPropertyNameForIndexedAccess(node.argumentExpression, indexType);
                if (name_3 !== undefined) {
                    var prop = getPropertyOfType(objectType, name_3);
                    if (prop) {
                        getNodeLinks(node).resolvedSymbol = prop;
                        return getTypeOfSymbol(prop);
                    }
                    else if (isConstEnum) {
                        error(node.argumentExpression, ts.Diagnostics.Property_0_does_not_exist_on_const_enum_1, name_3, symbolToString(objectType.symbol));
                        return unknownType;
                    }
                }
            }
            // Check for compatible indexer types.
            if (isTypeAnyOrAllConstituentTypesHaveKind(indexType, ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.ESSymbol)) {
                // Try to use a number indexer.
                if (isTypeAnyOrAllConstituentTypesHaveKind(indexType, ts.TypeFlags.NumberLike)) {
                    var numberIndexType = getIndexTypeOfType(objectType, ts.IndexKind.Number);
                    if (numberIndexType) {
                        return numberIndexType;
                    }
                }
                // Try to use string indexing.
                var stringIndexType = getIndexTypeOfType(objectType, ts.IndexKind.String);
                if (stringIndexType) {
                    return stringIndexType;
                }
                // Fall back to any.
                if (compilerOptions.noImplicitAny && !compilerOptions.suppressImplicitAnyIndexErrors && !isTypeAny(objectType)) {
                    error(node, ts.Diagnostics.Index_signature_of_object_type_implicitly_has_an_any_type);
                }
                return anyType;
            }
            // REVIEW: Users should know the type that was actually used.
            error(node, ts.Diagnostics.An_index_expression_argument_must_be_of_type_string_number_symbol_or_any);
            return unknownType;
        }
        /**
         * If indexArgumentExpression is a string literal or number literal, returns its text.
         * If indexArgumentExpression is a well known symbol, returns the property name corresponding
         *    to this symbol, as long as it is a proper symbol reference.
         * Otherwise, returns undefined.
         */
        function getPropertyNameForIndexedAccess(indexArgumentExpression, indexArgumentType) {
            if (indexArgumentExpression.kind === ts.SyntaxKind.StringLiteral || indexArgumentExpression.kind === ts.SyntaxKind.NumericLiteral) {
                return indexArgumentExpression.text;
            }
            if (checkThatExpressionIsProperSymbolReference(indexArgumentExpression, indexArgumentType, /*reportError*/ false)) {
                var rightHandSideName = indexArgumentExpression.name.text;
                return ts.getPropertyNameForKnownSymbolName(rightHandSideName);
            }
            return undefined;
        }
        /**
         * A proper symbol reference requires the following:
         *   1. The property access denotes a property that exists
         *   2. The expression is of the form Symbol.<identifier>
         *   3. The property access is of the primitive type symbol.
         *   4. Symbol in this context resolves to the global Symbol object
         */
        function checkThatExpressionIsProperSymbolReference(expression, expressionType, reportError) {
            if (expressionType === unknownType) {
                // There is already an error, so no need to report one.
                return false;
            }
            if (!ts.isWellKnownSymbolSyntactically(expression)) {
                return false;
            }
            // Make sure the property type is the primitive symbol type
            if ((expressionType.flags & ts.TypeFlags.ESSymbol) === 0) {
                if (reportError) {
                    error(expression, ts.Diagnostics.A_computed_property_name_of_the_form_0_must_be_of_type_symbol, ts.getTextOfNode(expression));
                }
                return false;
            }
            // The name is Symbol.<someName>, so make sure Symbol actually resolves to the
            // global Symbol object
            var leftHandSide = expression.expression;
            var leftHandSideSymbol = getResolvedSymbol(leftHandSide);
            if (!leftHandSideSymbol) {
                return false;
            }
            var globalESSymbol = getGlobalESSymbolConstructorSymbol();
            if (!globalESSymbol) {
                // Already errored when we tried to look up the symbol
                return false;
            }
            if (leftHandSideSymbol !== globalESSymbol) {
                if (reportError) {
                    error(leftHandSide, ts.Diagnostics.Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object);
                }
                return false;
            }
            return true;
        }
        function resolveUntypedCall(node) {
            if (node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                checkExpression(node.template);
            }
            else if (node.kind !== ts.SyntaxKind.Decorator) {
                ts.forEach(node.arguments, function (argument) {
                    checkExpression(argument);
                });
            }
            return anySignature;
        }
        function resolveErrorCall(node) {
            resolveUntypedCall(node);
            return unknownSignature;
        }
        // Re-order candidate signatures into the result array. Assumes the result array to be empty.
        // The candidate list orders groups in reverse, but within a group signatures are kept in declaration order
        // A nit here is that we reorder only signatures that belong to the same symbol,
        // so order how inherited signatures are processed is still preserved.
        // interface A { (x: string): void }
        // interface B extends A { (x: 'foo'): string }
        // let b: B;
        // b('foo') // <- here overloads should be processed as [(x:'foo'): string, (x: string): void]
        function reorderCandidates(signatures, result) {
            var lastParent;
            var lastSymbol;
            var cutoffIndex = 0;
            var index;
            var specializedIndex = -1;
            var spliceIndex;
            ts.Debug.assert(!result.length);
            for (var _i = 0; _i < signatures.length; _i++) {
                var signature = signatures[_i];
                var symbol = signature.declaration && getSymbolOfNode(signature.declaration);
                var parent_3 = signature.declaration && signature.declaration.parent;
                if (!lastSymbol || symbol === lastSymbol) {
                    if (lastParent && parent_3 === lastParent) {
                        index++;
                    }
                    else {
                        lastParent = parent_3;
                        index = cutoffIndex;
                    }
                }
                else {
                    // current declaration belongs to a different symbol
                    // set cutoffIndex so re-orderings in the future won't change result set from 0 to cutoffIndex
                    index = cutoffIndex = result.length;
                    lastParent = parent_3;
                }
                lastSymbol = symbol;
                // specialized signatures always need to be placed before non-specialized signatures regardless
                // of the cutoff position; see GH#1133
                if (signature.hasStringLiterals) {
                    specializedIndex++;
                    spliceIndex = specializedIndex;
                    // The cutoff index always needs to be greater than or equal to the specialized signature index
                    // in order to prevent non-specialized signatures from being added before a specialized
                    // signature.
                    cutoffIndex++;
                }
                else {
                    spliceIndex = index;
                }
                result.splice(spliceIndex, 0, signature);
            }
        }
        function getSpreadArgumentIndex(args) {
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg && arg.kind === ts.SyntaxKind.SpreadElementExpression) {
                    return i;
                }
            }
            return -1;
        }
        function hasCorrectArity(node, args, signature) {
            var adjustedArgCount; // Apparent number of arguments we will have in this call
            var typeArguments; // Type arguments (undefined if none)
            var callIsIncomplete; // In incomplete call we want to be lenient when we have too few arguments
            var isDecorator;
            var spreadArgIndex = -1;
            if (node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                var tagExpression = node;
                // Even if the call is incomplete, we'll have a missing expression as our last argument,
                // so we can say the count is just the arg list length
                adjustedArgCount = args.length;
                typeArguments = undefined;
                if (tagExpression.template.kind === ts.SyntaxKind.TemplateExpression) {
                    // If a tagged template expression lacks a tail literal, the call is incomplete.
                    // Specifically, a template only can end in a TemplateTail or a Missing literal.
                    var templateExpression = tagExpression.template;
                    var lastSpan = ts.lastOrUndefined(templateExpression.templateSpans);
                    ts.Debug.assert(lastSpan !== undefined); // we should always have at least one span.
                    callIsIncomplete = ts.nodeIsMissing(lastSpan.literal) || !!lastSpan.literal.isUnterminated;
                }
                else {
                    // If the template didn't end in a backtick, or its beginning occurred right prior to EOF,
                    // then this might actually turn out to be a TemplateHead in the future;
                    // so we consider the call to be incomplete.
                    var templateLiteral = tagExpression.template;
                    ts.Debug.assert(templateLiteral.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral);
                    callIsIncomplete = !!templateLiteral.isUnterminated;
                }
            }
            else if (node.kind === ts.SyntaxKind.Decorator) {
                isDecorator = true;
                typeArguments = undefined;
                adjustedArgCount = getEffectiveArgumentCount(node, /*args*/ undefined, signature);
            }
            else {
                var callExpression = node;
                if (!callExpression.arguments) {
                    // This only happens when we have something of the form: 'new C'
                    ts.Debug.assert(callExpression.kind === ts.SyntaxKind.NewExpression);
                    return signature.minArgumentCount === 0;
                }
                // For IDE scenarios we may have an incomplete call, so a trailing comma is tantamount to adding another argument.
                adjustedArgCount = callExpression.arguments.hasTrailingComma ? args.length + 1 : args.length;
                // If we are missing the close paren, the call is incomplete.
                callIsIncomplete = callExpression.arguments.end === callExpression.end;
                typeArguments = callExpression.typeArguments;
                spreadArgIndex = getSpreadArgumentIndex(args);
            }
            // If the user supplied type arguments, but the number of type arguments does not match
            // the declared number of type parameters, the call has an incorrect arity.
            var hasRightNumberOfTypeArgs = !typeArguments ||
                (signature.typeParameters && typeArguments.length === signature.typeParameters.length);
            if (!hasRightNumberOfTypeArgs) {
                return false;
            }
            // If spread arguments are present, check that they correspond to a rest parameter. If so, no
            // further checking is necessary.
            if (spreadArgIndex >= 0) {
                return signature.hasRestParameter && spreadArgIndex >= signature.parameters.length - 1;
            }
            // Too many arguments implies incorrect arity.
            if (!signature.hasRestParameter && adjustedArgCount > signature.parameters.length) {
                return false;
            }
            // If the call is incomplete, we should skip the lower bound check.
            var hasEnoughArguments = adjustedArgCount >= signature.minArgumentCount;
            return callIsIncomplete || hasEnoughArguments;
        }
        // If type has a single call signature and no other members, return that signature. Otherwise, return undefined.
        function getSingleCallSignature(type) {
            if (type.flags & ts.TypeFlags.ObjectType) {
                var resolved = resolveStructuredTypeMembers(type);
                if (resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0 &&
                    resolved.properties.length === 0 && !resolved.stringIndexType && !resolved.numberIndexType) {
                    return resolved.callSignatures[0];
                }
            }
            return undefined;
        }
        // Instantiate a generic signature in the context of a non-generic signature (section 3.8.5 in TypeScript spec)
        function instantiateSignatureInContextOf(signature, contextualSignature, contextualMapper) {
            var context = createInferenceContext(signature.typeParameters, /*inferUnionTypes*/ true);
            forEachMatchingParameterType(contextualSignature, signature, function (source, target) {
                // Type parameters from outer context referenced by source type are fixed by instantiation of the source type
                inferTypes(context, instantiateType(source, contextualMapper), target);
            });
            return getSignatureInstantiation(signature, getInferredTypes(context));
        }
        function inferTypeArguments(node, signature, args, excludeArgument, context) {
            var typeParameters = signature.typeParameters;
            var inferenceMapper = createInferenceMapper(context);
            // Clear out all the inference results from the last time inferTypeArguments was called on this context
            for (var i = 0; i < typeParameters.length; i++) {
                // As an optimization, we don't have to clear (and later recompute) inferred types
                // for type parameters that have already been fixed on the previous call to inferTypeArguments.
                // It would be just as correct to reset all of them. But then we'd be repeating the same work
                // for the type parameters that were fixed, namely the work done by getInferredType.
                if (!context.inferences[i].isFixed) {
                    context.inferredTypes[i] = undefined;
                }
            }
            // On this call to inferTypeArguments, we may get more inferences for certain type parameters that were not
            // fixed last time. This means that a type parameter that failed inference last time may succeed this time,
            // or vice versa. Therefore, the failedTypeParameterIndex is useless if it points to an unfixed type parameter,
            // because it may change. So here we reset it. However, getInferredType will not revisit any type parameters
            // that were previously fixed. So if a fixed type parameter failed previously, it will fail again because
            // it will contain the exact same set of inferences. So if we reset the index from a fixed type parameter,
            // we will lose information that we won't recover this time around.
            if (context.failedTypeParameterIndex !== undefined && !context.inferences[context.failedTypeParameterIndex].isFixed) {
                context.failedTypeParameterIndex = undefined;
            }
            // We perform two passes over the arguments. In the first pass we infer from all arguments, but use
            // wildcards for all context sensitive function expressions.
            var argCount = getEffectiveArgumentCount(node, args, signature);
            for (var i = 0; i < argCount; i++) {
                var arg = getEffectiveArgument(node, args, i);
                // If the effective argument is 'undefined', then it is an argument that is present but is synthetic.
                if (arg === undefined || arg.kind !== ts.SyntaxKind.OmittedExpression) {
                    var paramType = getTypeAtPosition(signature, i);
                    var argType = getEffectiveArgumentType(node, i, arg);
                    // If the effective argument type is 'undefined', there is no synthetic type
                    // for the argument. In that case, we should check the argument.
                    if (argType === undefined) {
                        // For context sensitive arguments we pass the identityMapper, which is a signal to treat all
                        // context sensitive function expressions as wildcards
                        var mapper = excludeArgument && excludeArgument[i] !== undefined ? identityMapper : inferenceMapper;
                        argType = checkExpressionWithContextualType(arg, paramType, mapper);
                    }
                    inferTypes(context, argType, paramType);
                }
            }
            // In the second pass we visit only context sensitive arguments, and only those that aren't excluded, this
            // time treating function expressions normally (which may cause previously inferred type arguments to be fixed
            // as we construct types for contextually typed parameters)
            // Decorators will not have `excludeArgument`, as their arguments cannot be contextually typed.
            // Tagged template expressions will always have `undefined` for `excludeArgument[0]`.
            if (excludeArgument) {
                for (var i = 0; i < argCount; i++) {
                    // No need to check for omitted args and template expressions, their exlusion value is always undefined
                    if (excludeArgument[i] === false) {
                        var arg = args[i];
                        var paramType = getTypeAtPosition(signature, i);
                        inferTypes(context, checkExpressionWithContextualType(arg, paramType, inferenceMapper), paramType);
                    }
                }
            }
            getInferredTypes(context);
        }
        function checkTypeArguments(signature, typeArguments, typeArgumentResultTypes, reportErrors, headMessage) {
            var typeParameters = signature.typeParameters;
            var typeArgumentsAreAssignable = true;
            for (var i = 0; i < typeParameters.length; i++) {
                var typeArgNode = typeArguments[i];
                var typeArgument = getTypeFromTypeNode(typeArgNode);
                // Do not push on this array! It has a preallocated length
                typeArgumentResultTypes[i] = typeArgument;
                if (typeArgumentsAreAssignable /* so far */) {
                    var constraint = getConstraintOfTypeParameter(typeParameters[i]);
                    if (constraint) {
                        var errorInfo = void 0;
                        var typeArgumentHeadMessage = ts.Diagnostics.Type_0_does_not_satisfy_the_constraint_1;
                        if (reportErrors && headMessage) {
                            errorInfo = ts.chainDiagnosticMessages(errorInfo, typeArgumentHeadMessage);
                            typeArgumentHeadMessage = headMessage;
                        }
                        typeArgumentsAreAssignable = checkTypeAssignableTo(typeArgument, constraint, reportErrors ? typeArgNode : undefined, typeArgumentHeadMessage, errorInfo);
                    }
                }
            }
            return typeArgumentsAreAssignable;
        }
        function checkApplicableSignature(node, args, signature, relation, excludeArgument, reportErrors) {
            var argCount = getEffectiveArgumentCount(node, args, signature);
            for (var i = 0; i < argCount; i++) {
                var arg = getEffectiveArgument(node, args, i);
                // If the effective argument is 'undefined', then it is an argument that is present but is synthetic.
                if (arg === undefined || arg.kind !== ts.SyntaxKind.OmittedExpression) {
                    // Check spread elements against rest type (from arity check we know spread argument corresponds to a rest parameter)
                    var paramType = getTypeAtPosition(signature, i);
                    var argType = getEffectiveArgumentType(node, i, arg);
                    // If the effective argument type is 'undefined', there is no synthetic type
                    // for the argument. In that case, we should check the argument.
                    if (argType === undefined) {
                        argType = arg.kind === ts.SyntaxKind.StringLiteral && !reportErrors
                            ? getStringLiteralType(arg)
                            : checkExpressionWithContextualType(arg, paramType, excludeArgument && excludeArgument[i] ? identityMapper : undefined);
                    }
                    // Use argument expression as error location when reporting errors
                    var errorNode = reportErrors ? getEffectiveArgumentErrorNode(node, i, arg) : undefined;
                    var headMessage = ts.Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1;
                    if (!checkTypeRelatedTo(argType, paramType, relation, errorNode, headMessage)) {
                        return false;
                    }
                }
            }
            return true;
        }
        /**
         * Returns the effective arguments for an expression that works like a function invocation.
         *
         * If 'node' is a CallExpression or a NewExpression, then its argument list is returned.
         * If 'node' is a TaggedTemplateExpression, a new argument list is constructed from the substitution
         *    expressions, where the first element of the list is `undefined`.
         * If 'node' is a Decorator, the argument list will be `undefined`, and its arguments and types
         *    will be supplied from calls to `getEffectiveArgumentCount` and `getEffectiveArgumentType`.
         */
        function getEffectiveCallArguments(node) {
            var args;
            if (node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                var template = node.template;
                args = [undefined];
                if (template.kind === ts.SyntaxKind.TemplateExpression) {
                    ts.forEach(template.templateSpans, function (span) {
                        args.push(span.expression);
                    });
                }
            }
            else if (node.kind === ts.SyntaxKind.Decorator) {
                // For a decorator, we return undefined as we will determine
                // the number and types of arguments for a decorator using
                // `getEffectiveArgumentCount` and `getEffectiveArgumentType` below.
                return undefined;
            }
            else {
                args = node.arguments || emptyArray;
            }
            return args;
        }
        /**
          * Returns the effective argument count for a node that works like a function invocation.
          * If 'node' is a Decorator, the number of arguments is derived from the decoration
          *    target and the signature:
          *    If 'node.target' is a class declaration or class expression, the effective argument
          *       count is 1.
          *    If 'node.target' is a parameter declaration, the effective argument count is 3.
          *    If 'node.target' is a property declaration, the effective argument count is 2.
          *    If 'node.target' is a method or accessor declaration, the effective argument count
          *       is 3, although it can be 2 if the signature only accepts two arguments, allowing
          *       us to match a property decorator.
          * Otherwise, the argument count is the length of the 'args' array.
          */
        function getEffectiveArgumentCount(node, args, signature) {
            if (node.kind === ts.SyntaxKind.Decorator) {
                switch (node.parent.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ClassExpression:
                        // A class decorator will have one argument (see `ClassDecorator` in core.d.ts)
                        return 1;
                    case ts.SyntaxKind.PropertyDeclaration:
                        // A property declaration decorator will have two arguments (see
                        // `PropertyDecorator` in core.d.ts)
                        return 2;
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                        // A method or accessor declaration decorator will have two or three arguments (see
                        // `PropertyDecorator` and `MethodDecorator` in core.d.ts)
                        // If the method decorator signature only accepts a target and a key, we will only
                        // type check those arguments.
                        return signature.parameters.length >= 3 ? 3 : 2;
                    case ts.SyntaxKind.Parameter:
                        // A parameter declaration decorator will have three arguments (see
                        // `ParameterDecorator` in core.d.ts)
                        return 3;
                }
            }
            else {
                return args.length;
            }
        }
        /**
          * Returns the effective type of the first argument to a decorator.
          * If 'node' is a class declaration or class expression, the effective argument type
          *    is the type of the static side of the class.
          * If 'node' is a parameter declaration, the effective argument type is either the type
          *    of the static or instance side of the class for the parameter's parent method,
          *    depending on whether the method is declared static.
          *    For a constructor, the type is always the type of the static side of the class.
          * If 'node' is a property, method, or accessor declaration, the effective argument
          *    type is the type of the static or instance side of the parent class for class
          *    element, depending on whether the element is declared static.
          */
        function getEffectiveDecoratorFirstArgumentType(node) {
            // The first argument to a decorator is its `target`.
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.ClassExpression:
                    // For a class decorator, the `target` is the type of the class (e.g. the
                    // "static" or "constructor" side of the class)
                    var classSymbol = getSymbolOfNode(node);
                    return getTypeOfSymbol(classSymbol);
                case ts.SyntaxKind.Parameter:
                    // For a parameter decorator, the `target` is the parent type of the
                    // parameter's containing method.
                    node = node.parent;
                    if (node.kind === ts.SyntaxKind.Constructor) {
                        var classSymbol_1 = getSymbolOfNode(node);
                        return getTypeOfSymbol(classSymbol_1);
                    }
                // fall-through
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    // For a property or method decorator, the `target` is the
                    // "static"-side type of the parent of the member if the member is
                    // declared "static"; otherwise, it is the "instance"-side type of the
                    // parent of the member.
                    return getParentTypeOfClassElement(node);
                default:
                    ts.Debug.fail("Unsupported decorator target.");
                    return unknownType;
            }
        }
        /**
          * Returns the effective type for the second argument to a decorator.
          * If 'node' is a parameter, its effective argument type is one of the following:
          *    If 'node.parent' is a constructor, the effective argument type is 'any', as we
          *       will emit `undefined`.
          *    If 'node.parent' is a member with an identifier, numeric, or string literal name,
          *       the effective argument type will be a string literal type for the member name.
          *    If 'node.parent' is a computed property name, the effective argument type will
          *       either be a symbol type or the string type.
          * If 'node' is a member with an identifier, numeric, or string literal name, the
          *    effective argument type will be a string literal type for the member name.
          * If 'node' is a computed property name, the effective argument type will either
          *    be a symbol type or the string type.
          * A class decorator does not have a second argument type.
          */
        function getEffectiveDecoratorSecondArgumentType(node) {
            // The second argument to a decorator is its `propertyKey`
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    ts.Debug.fail("Class decorators should not have a second synthetic argument.");
                    return unknownType;
                case ts.SyntaxKind.Parameter:
                    node = node.parent;
                    if (node.kind === ts.SyntaxKind.Constructor) {
                        // For a constructor parameter decorator, the `propertyKey` will be `undefined`.
                        return anyType;
                    }
                // For a non-constructor parameter decorator, the `propertyKey` will be either
                // a string or a symbol, based on the name of the parameter's containing method.
                // fall-through
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    // The `propertyKey` for a property or method decorator will be a
                    // string literal type if the member name is an identifier, number, or string;
                    // otherwise, if the member name is a computed property name it will
                    // be either string or symbol.
                    var element = node;
                    switch (element.name.kind) {
                        case ts.SyntaxKind.Identifier:
                        case ts.SyntaxKind.NumericLiteral:
                        case ts.SyntaxKind.StringLiteral:
                            return getStringLiteralType(element.name);
                        case ts.SyntaxKind.ComputedPropertyName:
                            var nameType = checkComputedPropertyName(element.name);
                            if (allConstituentTypesHaveKind(nameType, ts.TypeFlags.ESSymbol)) {
                                return nameType;
                            }
                            else {
                                return stringType;
                            }
                        default:
                            ts.Debug.fail("Unsupported property name.");
                            return unknownType;
                    }
                default:
                    ts.Debug.fail("Unsupported decorator target.");
                    return unknownType;
            }
        }
        /**
          * Returns the effective argument type for the third argument to a decorator.
          * If 'node' is a parameter, the effective argument type is the number type.
          * If 'node' is a method or accessor, the effective argument type is a
          *    `TypedPropertyDescriptor<T>` instantiated with the type of the member.
          * Class and property decorators do not have a third effective argument.
          */
        function getEffectiveDecoratorThirdArgumentType(node) {
            // The third argument to a decorator is either its `descriptor` for a method decorator
            // or its `parameterIndex` for a paramter decorator
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    ts.Debug.fail("Class decorators should not have a third synthetic argument.");
                    return unknownType;
                case ts.SyntaxKind.Parameter:
                    // The `parameterIndex` for a parameter decorator is always a number
                    return numberType;
                case ts.SyntaxKind.PropertyDeclaration:
                    ts.Debug.fail("Property decorators should not have a third synthetic argument.");
                    return unknownType;
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    // The `descriptor` for a method decorator will be a `TypedPropertyDescriptor<T>`
                    // for the type of the member.
                    var propertyType = getTypeOfNode(node);
                    return createTypedPropertyDescriptorType(propertyType);
                default:
                    ts.Debug.fail("Unsupported decorator target.");
                    return unknownType;
            }
        }
        /**
          * Returns the effective argument type for the provided argument to a decorator.
          */
        function getEffectiveDecoratorArgumentType(node, argIndex) {
            if (argIndex === 0) {
                return getEffectiveDecoratorFirstArgumentType(node.parent);
            }
            else if (argIndex === 1) {
                return getEffectiveDecoratorSecondArgumentType(node.parent);
            }
            else if (argIndex === 2) {
                return getEffectiveDecoratorThirdArgumentType(node.parent);
            }
            ts.Debug.fail("Decorators should not have a fourth synthetic argument.");
            return unknownType;
        }
        /**
          * Gets the effective argument type for an argument in a call expression.
          */
        function getEffectiveArgumentType(node, argIndex, arg) {
            // Decorators provide special arguments, a tagged template expression provides
            // a special first argument, and string literals get string literal types
            // unless we're reporting errors
            if (node.kind === ts.SyntaxKind.Decorator) {
                return getEffectiveDecoratorArgumentType(node, argIndex);
            }
            else if (argIndex === 0 && node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                return globalTemplateStringsArrayType;
            }
            // This is not a synthetic argument, so we return 'undefined'
            // to signal that the caller needs to check the argument.
            return undefined;
        }
        /**
          * Gets the effective argument expression for an argument in a call expression.
          */
        function getEffectiveArgument(node, args, argIndex) {
            // For a decorator or the first argument of a tagged template expression we return undefined.
            if (node.kind === ts.SyntaxKind.Decorator ||
                (argIndex === 0 && node.kind === ts.SyntaxKind.TaggedTemplateExpression)) {
                return undefined;
            }
            return args[argIndex];
        }
        /**
          * Gets the error node to use when reporting errors for an effective argument.
          */
        function getEffectiveArgumentErrorNode(node, argIndex, arg) {
            if (node.kind === ts.SyntaxKind.Decorator) {
                // For a decorator, we use the expression of the decorator for error reporting.
                return node.expression;
            }
            else if (argIndex === 0 && node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                // For a the first argument of a tagged template expression, we use the template of the tag for error reporting.
                return node.template;
            }
            else {
                return arg;
            }
        }
        function resolveCall(node, signatures, candidatesOutArray, headMessage) {
            var isTaggedTemplate = node.kind === ts.SyntaxKind.TaggedTemplateExpression;
            var isDecorator = node.kind === ts.SyntaxKind.Decorator;
            var typeArguments;
            if (!isTaggedTemplate && !isDecorator) {
                typeArguments = node.typeArguments;
                // We already perform checking on the type arguments on the class declaration itself.
                if (node.expression.kind !== ts.SyntaxKind.SuperKeyword) {
                    ts.forEach(typeArguments, checkSourceElement);
                }
            }
            var candidates = candidatesOutArray || [];
            // reorderCandidates fills up the candidates array directly
            reorderCandidates(signatures, candidates);
            if (!candidates.length) {
                reportError(ts.Diagnostics.Supplied_parameters_do_not_match_any_signature_of_call_target);
                return resolveErrorCall(node);
            }
            var args = getEffectiveCallArguments(node);
            // The following applies to any value of 'excludeArgument[i]':
            //    - true:      the argument at 'i' is susceptible to a one-time permanent contextual typing.
            //    - undefined: the argument at 'i' is *not* susceptible to permanent contextual typing.
            //    - false:     the argument at 'i' *was* and *has been* permanently contextually typed.
            //
            // The idea is that we will perform type argument inference & assignability checking once
            // without using the susceptible parameters that are functions, and once more for each of those
            // parameters, contextually typing each as we go along.
            //
            // For a tagged template, then the first argument be 'undefined' if necessary
            // because it represents a TemplateStringsArray.
            //
            // For a decorator, no arguments are susceptible to contextual typing due to the fact
            // decorators are applied to a declaration by the emitter, and not to an expression.
            var excludeArgument;
            if (!isDecorator) {
                // We do not need to call `getEffectiveArgumentCount` here as it only
                // applies when calculating the number of arguments for a decorator.
                for (var i = isTaggedTemplate ? 1 : 0; i < args.length; i++) {
                    if (isContextSensitive(args[i])) {
                        if (!excludeArgument) {
                            excludeArgument = new Array(args.length);
                        }
                        excludeArgument[i] = true;
                    }
                }
            }
            // The following variables are captured and modified by calls to chooseOverload.
            // If overload resolution or type argument inference fails, we want to report the
            // best error possible. The best error is one which says that an argument was not
            // assignable to a parameter. This implies that everything else about the overload
            // was fine. So if there is any overload that is only incorrect because of an
            // argument, we will report an error on that one.
            //
            //     function foo(s: string) {}
            //     function foo(n: number) {} // Report argument error on this overload
            //     function foo() {}
            //     foo(true);
            //
            // If none of the overloads even made it that far, there are two possibilities.
            // There was a problem with type arguments for some overload, in which case
            // report an error on that. Or none of the overloads even had correct arity,
            // in which case give an arity error.
            //
            //     function foo<T>(x: T, y: T) {} // Report type argument inference error
            //     function foo() {}
            //     foo(0, true);
            //
            var candidateForArgumentError;
            var candidateForTypeArgumentError;
            var resultOfFailedInference;
            var result;
            // Section 4.12.1:
            // if the candidate list contains one or more signatures for which the type of each argument
            // expression is a subtype of each corresponding parameter type, the return type of the first
            // of those signatures becomes the return type of the function call.
            // Otherwise, the return type of the first signature in the candidate list becomes the return
            // type of the function call.
            //
            // Whether the call is an error is determined by assignability of the arguments. The subtype pass
            // is just important for choosing the best signature. So in the case where there is only one
            // signature, the subtype pass is useless. So skipping it is an optimization.
            if (candidates.length > 1) {
                result = chooseOverload(candidates, subtypeRelation);
            }
            if (!result) {
                // Reinitialize these pointers for round two
                candidateForArgumentError = undefined;
                candidateForTypeArgumentError = undefined;
                resultOfFailedInference = undefined;
                result = chooseOverload(candidates, assignableRelation);
            }
            // [ConcreteTypeScript]
            // If any of the arguments were casted from a non-concrete to a
            // concrete type (any->!something), we need to make that cast
            // explicit
            if (result && result.declaration) {
                var params = result.declaration.parameters;
                var cargs = node.arguments;
                if (params && cargs && cargs.length <= params.length) {
                    for (var i = 0; i < cargs.length; i++) {
                        var param = params[i];
                        var arg = cargs[i];
                        var paramType = param.type ? getTypeFromTypeNode(param.type) : anyType;
                        var argType = checkExpression(arg); // FIXME: rechecking
                        checkCtsCoercion(arg, argType, paramType);
                    }
                }
            }
            // [/ConcreteTypeScript]
            if (result) {
                return result;
            }
            // No signatures were applicable. Now report errors based on the last applicable signature with
            // no arguments excluded from assignability checks.
            // If candidate is undefined, it means that no candidates had a suitable arity. In that case,
            // skip the checkApplicableSignature check.
            if (candidateForArgumentError) {
                // excludeArgument is undefined, in this case also equivalent to [undefined, undefined, ...]
                // The importance of excludeArgument is to prevent us from typing function expression parameters
                // in arguments too early. If possible, we'd like to only type them once we know the correct
                // overload. However, this matters for the case where the call is correct. When the call is
                // an error, we don't need to exclude any arguments, although it would cause no harm to do so.
                checkApplicableSignature(node, args, candidateForArgumentError, assignableRelation, /*excludeArgument*/ undefined, /*reportErrors*/ true);
            }
            else if (candidateForTypeArgumentError) {
                if (!isTaggedTemplate && !isDecorator && typeArguments) {
                    checkTypeArguments(candidateForTypeArgumentError, node.typeArguments, [], /*reportErrors*/ true, headMessage);
                }
                else {
                    ts.Debug.assert(resultOfFailedInference.failedTypeParameterIndex >= 0);
                    var failedTypeParameter = candidateForTypeArgumentError.typeParameters[resultOfFailedInference.failedTypeParameterIndex];
                    var inferenceCandidates = getInferenceCandidates(resultOfFailedInference, resultOfFailedInference.failedTypeParameterIndex);
                    var diagnosticChainHead = ts.chainDiagnosticMessages(/*details*/ undefined, // details will be provided by call to reportNoCommonSupertypeError
                    ts.Diagnostics.The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_type_arguments_explicitly, typeToString(failedTypeParameter));
                    if (headMessage) {
                        diagnosticChainHead = ts.chainDiagnosticMessages(diagnosticChainHead, headMessage);
                    }
                    reportNoCommonSupertypeError(inferenceCandidates, node.expression || node.tag, diagnosticChainHead);
                }
            }
            else {
                reportError(ts.Diagnostics.Supplied_parameters_do_not_match_any_signature_of_call_target);
            }
            // No signature was applicable. We have already reported the errors for the invalid signature.
            // If this is a type resolution session, e.g. Language Service, try to get better information that anySignature.
            // Pick the first candidate that matches the arity. This way we can get a contextual type for cases like:
            //  declare function f(a: { xa: number; xb: number; });
            //  f({ |
            if (!produceDiagnostics) {
                for (var _i = 0; _i < candidates.length; _i++) {
                    var candidate = candidates[_i];
                    if (hasCorrectArity(node, args, candidate)) {
                        if (candidate.typeParameters && typeArguments) {
                            candidate = getSignatureInstantiation(candidate, ts.map(typeArguments, getTypeFromTypeNode));
                        }
                        return candidate;
                    }
                }
            }
            return resolveErrorCall(node);
            function reportError(message, arg0, arg1, arg2) {
                var errorInfo;
                errorInfo = ts.chainDiagnosticMessages(errorInfo, message, arg0, arg1, arg2);
                if (headMessage) {
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, headMessage);
                }
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(node, errorInfo));
            }
            function chooseOverload(candidates, relation) {
                for (var _i = 0; _i < candidates.length; _i++) {
                    var originalCandidate = candidates[_i];
                    if (!hasCorrectArity(node, args, originalCandidate)) {
                        continue;
                    }
                    var candidate = void 0;
                    var typeArgumentsAreValid = void 0;
                    var inferenceContext = originalCandidate.typeParameters
                        ? createInferenceContext(originalCandidate.typeParameters, /*inferUnionTypes*/ false)
                        : undefined;
                    while (true) {
                        candidate = originalCandidate;
                        if (candidate.typeParameters) {
                            var typeArgumentTypes = void 0;
                            if (typeArguments) {
                                typeArgumentTypes = new Array(candidate.typeParameters.length);
                                typeArgumentsAreValid = checkTypeArguments(candidate, typeArguments, typeArgumentTypes, /*reportErrors*/ false);
                            }
                            else {
                                inferTypeArguments(node, candidate, args, excludeArgument, inferenceContext);
                                typeArgumentsAreValid = inferenceContext.failedTypeParameterIndex === undefined;
                                typeArgumentTypes = inferenceContext.inferredTypes;
                            }
                            if (!typeArgumentsAreValid) {
                                break;
                            }
                            candidate = getSignatureInstantiation(candidate, typeArgumentTypes);
                        }
                        if (!checkApplicableSignature(node, args, candidate, relation, excludeArgument, /*reportErrors*/ false)) {
                            break;
                        }
                        var index = excludeArgument ? ts.indexOf(excludeArgument, true) : -1;
                        if (index < 0) {
                            return candidate;
                        }
                        excludeArgument[index] = false;
                    }
                    // A post-mortem of this iteration of the loop. The signature was not applicable,
                    // so we want to track it as a candidate for reporting an error. If the candidate
                    // had no type parameters, or had no issues related to type arguments, we can
                    // report an error based on the arguments. If there was an issue with type
                    // arguments, then we can only report an error based on the type arguments.
                    if (originalCandidate.typeParameters) {
                        var instantiatedCandidate = candidate;
                        if (typeArgumentsAreValid) {
                            candidateForArgumentError = instantiatedCandidate;
                        }
                        else {
                            candidateForTypeArgumentError = originalCandidate;
                            if (!typeArguments) {
                                resultOfFailedInference = inferenceContext;
                            }
                        }
                    }
                    else {
                        ts.Debug.assert(originalCandidate === candidate);
                        candidateForArgumentError = originalCandidate;
                    }
                }
                return undefined;
            }
        }
        function resolveCallExpression(node, candidatesOutArray) {
            if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
                var superType = checkSuperExpression(node.expression);
                if (superType !== unknownType) {
                    // In super call, the candidate signatures are the matching arity signatures of the base constructor function instantiated
                    // with the type arguments specified in the extends clause.
                    var baseTypeNode = ts.getClassExtendsHeritageClauseElement(ts.getContainingClass(node));
                    var baseConstructors = getInstantiatedConstructorsForTypeArguments(superType, baseTypeNode.typeArguments);
                    return resolveCall(node, baseConstructors, candidatesOutArray);
                }
                return resolveUntypedCall(node);
            }
            var funcType = checkExpression(node.expression);
            var apparentType = getApparentType(funcType, /* [ConcreteTypeScript]: */ node.expression);
            if (apparentType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            // Technically, this signatures list may be incomplete. We are taking the apparent type,
            // but we are not including call signatures that may have been added to the Object or
            // Function interface, since they have none by default. This is a bit of a leap of faith
            // that the user will not add any.
            var callSignatures = getSignaturesOfType(apparentType, ts.SignatureKind.Call);
            var constructSignatures = getSignaturesOfType(apparentType, ts.SignatureKind.Construct);
            // TS 1.0 spec: 4.12
            // If FuncExpr is of type Any, or of an object type that has no call or construct signatures
            // but is a subtype of the Function interface, the call is an untyped function call. In an
            // untyped function call no TypeArgs are permitted, Args can be any argument list, no contextual
            // types are provided for the argument expressions, and the result is always of type Any.
            // We exclude union types because we may have a union of function types that happen to have
            // no common signatures.
            if (isTypeAny(funcType) || (!callSignatures.length && !constructSignatures.length && !(funcType.flags & ts.TypeFlags.Union) && isTypeAssignableTo(funcType, globalFunctionType))) {
                // The unknownType indicates that an error already occured (and was reported).  No
                // need to report another error in this case.
                if (funcType !== unknownType && node.typeArguments) {
                    error(node, ts.Diagnostics.Untyped_function_calls_may_not_accept_type_arguments);
                }
                return resolveUntypedCall(node);
            }
            // If FuncExpr's apparent type(section 3.8.1) is a function type, the call is a typed function call.
            // TypeScript employs overload resolution in typed function calls in order to support functions
            // with multiple call signatures.
            if (!callSignatures.length) {
                if (constructSignatures.length) {
                    error(node, ts.Diagnostics.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
                }
                else {
                    error(node, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                }
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray);
        }
        function resolveNewExpression(node, candidatesOutArray) {
            if (node.arguments && languageVersion < ts.ScriptTarget.ES5) {
                var spreadIndex = getSpreadArgumentIndex(node.arguments);
                if (spreadIndex >= 0) {
                    error(node.arguments[spreadIndex], ts.Diagnostics.Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher);
                }
            }
            var expressionType = checkExpression(node.expression);
            // If expressionType's apparent type(section 3.8.1) is an object type with one or
            // more construct signatures, the expression is processed in the same manner as a
            // function call, but using the construct signatures as the initial set of candidate
            // signatures for overload resolution. The result type of the function call becomes
            // the result type of the operation.
            expressionType = getApparentType(expressionType, /* [ConcreteTypeScript]: */ node.expression);
            if (expressionType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            // If the expression is a class of abstract type, then it cannot be instantiated.
            // Note, only class declarations can be declared abstract.
            // In the case of a merged class-module or class-interface declaration,
            // only the class declaration node will have the Abstract flag set.
            var valueDecl = expressionType.symbol && getClassLikeDeclarationOfSymbol(expressionType.symbol);
            if (valueDecl && valueDecl.flags & ts.NodeFlags.Abstract) {
                error(node, ts.Diagnostics.Cannot_create_an_instance_of_the_abstract_class_0, ts.declarationNameToString(valueDecl.name));
                return resolveErrorCall(node);
            }
            // TS 1.0 spec: 4.11
            // If expressionType is of type Any, Args can be any argument
            // list and the result of the operation is of type Any.
            if (isTypeAny(expressionType)) {
                if (node.typeArguments) {
                    error(node, ts.Diagnostics.Untyped_function_calls_may_not_accept_type_arguments);
                }
                return resolveUntypedCall(node);
            }
            // Technically, this signatures list may be incomplete. We are taking the apparent type,
            // but we are not including construct signatures that may have been added to the Object or
            // Function interface, since they have none by default. This is a bit of a leap of faith
            // that the user will not add any.
            var constructSignatures = getSignaturesOfType(expressionType, ts.SignatureKind.Construct);
            if (constructSignatures.length) {
                return resolveCall(node, constructSignatures, candidatesOutArray);
            }
            // If expressionType's apparent type is an object type with no construct signatures but
            // one or more call signatures, the expression is processed as a function call. A compile-time
            // error occurs if the result of the function call is not Void. The type of the result of the
            // operation is Any.
            var callSignatures = getSignaturesOfType(expressionType, ts.SignatureKind.Call);
            if (callSignatures.length) {
                var signature = resolveCall(node, callSignatures, candidatesOutArray);
                if (getReturnTypeOfSignature(signature) !== voidType) {
                    error(node, ts.Diagnostics.Only_a_void_function_can_be_called_with_the_new_keyword);
                }
                return signature;
            }
            error(node, ts.Diagnostics.Cannot_use_new_with_an_expression_whose_type_lacks_a_call_or_construct_signature);
            return resolveErrorCall(node);
        }
        function resolveTaggedTemplateExpression(node, candidatesOutArray) {
            var tagType = checkExpression(node.tag);
            var apparentType = getApparentType(tagType);
            if (apparentType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            var callSignatures = getSignaturesOfType(apparentType, ts.SignatureKind.Call);
            if (isTypeAny(tagType) || (!callSignatures.length && !(tagType.flags & ts.TypeFlags.Union) && isTypeAssignableTo(tagType, globalFunctionType))) {
                return resolveUntypedCall(node);
            }
            if (!callSignatures.length) {
                error(node, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray);
        }
        /**
          * Gets the localized diagnostic head message to use for errors when resolving a decorator as a call expression.
          */
        function getDiagnosticHeadMessageForDecoratorResolution(node) {
            switch (node.parent.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.ClassExpression:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression;
                case ts.SyntaxKind.Parameter:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression;
                case ts.SyntaxKind.PropertyDeclaration:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression;
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression;
            }
        }
        /**
          * Resolves a decorator as if it were a call expression.
          */
        function resolveDecorator(node, candidatesOutArray) {
            var funcType = checkExpression(node.expression);
            var apparentType = getApparentType(funcType);
            if (apparentType === unknownType) {
                return resolveErrorCall(node);
            }
            var callSignatures = getSignaturesOfType(apparentType, ts.SignatureKind.Call);
            if (funcType === anyType || (!callSignatures.length && !(funcType.flags & ts.TypeFlags.Union) && isTypeAssignableTo(funcType, globalFunctionType))) {
                return resolveUntypedCall(node);
            }
            var headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
            if (!callSignatures.length) {
                var errorInfo;
                errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                errorInfo = ts.chainDiagnosticMessages(errorInfo, headMessage);
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(node, errorInfo));
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray, headMessage);
        }
        // candidatesOutArray is passed by signature help in the language service, and collectCandidates
        // must fill it up with the appropriate candidate signatures
        function getResolvedSignature(node, candidatesOutArray) {
            var links = getNodeLinks(node);
            // If getResolvedSignature has already been called, we will have cached the resolvedSignature.
            // However, it is possible that either candidatesOutArray was not passed in the first time,
            // or that a different candidatesOutArray was passed in. Therefore, we need to redo the work
            // to correctly fill the candidatesOutArray.
            if (!links.resolvedSignature || candidatesOutArray) {
                links.resolvedSignature = anySignature;
                if (node.kind === ts.SyntaxKind.CallExpression) {
                    links.resolvedSignature = resolveCallExpression(node, candidatesOutArray);
                }
                else if (node.kind === ts.SyntaxKind.NewExpression) {
                    links.resolvedSignature = resolveNewExpression(node, candidatesOutArray);
                }
                else if (node.kind === ts.SyntaxKind.TaggedTemplateExpression) {
                    links.resolvedSignature = resolveTaggedTemplateExpression(node, candidatesOutArray);
                }
                else if (node.kind === ts.SyntaxKind.Decorator) {
                    links.resolvedSignature = resolveDecorator(node, candidatesOutArray);
                }
                else {
                    ts.Debug.fail("Branch in 'getResolvedSignature' should be unreachable.");
                }
                for (var _i = 0, _a = links.resolvedSignature.parameters; _i < _a.length; _i++) {
                    var symbol = _a[_i];
                    var type = getTypeOfSymbol(symbol);
                    symbol.checkVar = getTempTypeVar(ts.getSourceFileOfNode(node), type);
                }
            }
            return links.resolvedSignature;
        }
        /**
         * Syntactically and semantically checks a call or new expression.
         * @param node The call/new expression to be checked.
         * @returns On success, the expression's signature's return type. On failure, anyType.
         */
        function checkCallExpression(node) {
            // Grammar checking; stop grammar-checking if checkGrammarTypeArguments return true
            checkGrammarTypeArguments(node, node.typeArguments) || checkGrammarArguments(node, node.arguments);
            var signature = getResolvedSignature(node);
            if (node.expression.kind === ts.SyntaxKind.SuperKeyword) {
                return voidType;
            }
            if (node.kind === ts.SyntaxKind.NewExpression) {
                var declaration = signature.declaration;
                if (declaration &&
                    declaration.kind !== ts.SyntaxKind.Constructor &&
                    declaration.kind !== ts.SyntaxKind.ConstructSignature &&
                    declaration.kind !== ts.SyntaxKind.ConstructorType) {
                    // When resolved signature is a call signature (and not a construct signature) the result type is any
                    if (compilerOptions.noImplicitAny) {
                        error(node, ts.Diagnostics.new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type);
                    }
                    // [ConcreteTypeScript] Except, if the type has a 'this' type stemming from a declare type node / becomes type node use that type.
                    if (signature.resolvedThisType && signature.resolvedThisType.flags & ts.TypeFlags.IntermediateFlow) {
                        return signature.resolvedThisType.targetType;
                    }
                    // [/ConcreteTypeScript]
                    return anyType;
                }
            }
            // [ConcreteTypeScript]
            // We check against the resolvedThisType if present:
            if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression && signature.resolvedThisType) {
                checkTypeAssignableTo(getTypeOfNode(node.expression.expression), signature.resolvedThisType, node, ts.Diagnostics.ConcreteTypeScript_Object_of_type_0_cannot_call_methods_expecting_1_as_their_receiver);
            }
            // If this:
            // 1. Is a method call,
            // 2. returns a concrete type, and
            // 3. is over a non-concrete object,
            // then its return must be checked.
            var rtype = getReturnTypeOfSignature(signature);
            if (isConcreteType(rtype)) {
                var fnode = node.expression;
                if (fnode.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    var target = fnode.expression;
                    var ttype = checkExpression(target);
                    if (!(isConcreteType(ttype) || (ttype.symbol && ttype.symbol.flags & ts.SymbolFlags.Class))) {
                        // Must check!
                        nodeMustCheck(node, rtype);
                    }
                    else if (isConcreteType(ttype) &&
                        rtype.baseType.flags & ts.TypeFlags.FloatHint) {
                        // Can assert that it's a float
                        getNodeLinks(node).assertFloat = true;
                    }
                    else if (isConcreteType(ttype) &&
                        rtype.baseType.flags & ts.TypeFlags.IntHint) {
                        // Can assert that it's an int
                        getNodeLinks(node).assertInt = true;
                    }
                }
                else if (node.kind === ts.SyntaxKind.CallExpression) {
                    // non-concrete functions must be checked too
                    var funcType = getTypeOfNode(node.expression);
                    if (!isConcreteType(funcType)) {
                        nodeMustCheck(node, rtype);
                    }
                }
            }
            // If the call target used direct access, that actually belongs on the call (because of how methods work in JS)
            if (getNodeLinks(node.expression).direct) {
                getNodeLinks(node.expression).direct = void 0;
                getNodeLinks(node).direct = true;
            }
            return rtype;
            // [/ConcreteTypeScript]
        }
        function checkTaggedTemplateExpression(node) {
            return getReturnTypeOfSignature(getResolvedSignature(node));
        }
        function checkAssertion(node) {
            var exprType = getRegularTypeOfObjectLiteral(checkExpression(node.expression));
            var targetType = getTypeFromTypeNode(node.type);
            if (produceDiagnostics && targetType !== unknownType) {
                var widenedType = getWidenedType(exprType);
                var brandExemption = (exprType.flags & ts.TypeFlags.Declare) || (targetType.flags & ts.TypeFlags.Declare);
                if (!brandExemption && !isTypeAssignableTo(targetType, widenedType)) {
                    checkTypeAssignableTo(exprType, targetType, node, ts.Diagnostics.Neither_type_0_nor_type_1_is_assignable_to_the_other);
                }
                // [ConcreteTypeScript]
                checkCtsCoercion(node, exprType, targetType);
            }
            return targetType;
        }
        function getTypeAtPosition(signature, pos) {
            return signature.hasRestParameter ?
                pos < signature.parameters.length - 1 ? getTypeOfSymbol(signature.parameters[pos]) : getRestTypeOfSignature(signature) :
                pos < signature.parameters.length ? getTypeOfSymbol(signature.parameters[pos]) : anyType;
        }
        function assignContextualParameterTypes(signature, context, mapper) {
            var len = signature.parameters.length - (signature.hasRestParameter ? 1 : 0);
            for (var i = 0; i < len; i++) {
                var parameter = signature.parameters[i];
                var contextualParameterType = getTypeAtPosition(context, i);
                assignTypeToParameterAndFixTypeParameters(parameter, contextualParameterType, mapper);
            }
            if (signature.hasRestParameter && context.hasRestParameter && signature.parameters.length >= context.parameters.length) {
                var parameter = ts.lastOrUndefined(signature.parameters);
                var contextualParameterType = getTypeOfSymbol(ts.lastOrUndefined(context.parameters));
                assignTypeToParameterAndFixTypeParameters(parameter, contextualParameterType, mapper);
            }
        }
        function assignTypeToParameterAndFixTypeParameters(parameter, contextualType, mapper) {
            var links = getSymbolLinks(parameter);
            if (!links.type) {
                links.type = instantiateType(contextualType, mapper);
            }
            else if (isInferentialContext(mapper)) {
                // Even if the parameter already has a type, it might be because it was given a type while
                // processing the function as an argument to a prior signature during overload resolution.
                // If this was the case, it may have caused some type parameters to be fixed. So here,
                // we need to ensure that type parameters at the same positions get fixed again. This is
                // done by calling instantiateType to attach the mapper to the contextualType, and then
                // calling inferTypes to force a walk of contextualType so that all the correct fixing
                // happens. The choice to pass in links.type may seem kind of arbitrary, but it serves
                // to make sure that all the correct positions in contextualType are reached by the walk.
                // Here is an example:
                //
                //      interface Base {
                //          baseProp;
                //      }
                //      interface Derived extends Base {
                //          toBase(): Base;
                //      }
                //
                //      var derived: Derived;
                //
                //      declare function foo<T>(x: T, func: (p: T) => T): T;
                //      declare function foo<T>(x: T, func: (p: T) => T): T;
                //
                //      var result = foo(derived, d => d.toBase());
                //
                // We are typing d while checking the second overload. But we've already given d
                // a type (Derived) from the first overload. However, we still want to fix the
                // T in the second overload so that we do not infer Base as a candidate for T
                // (inferring Base would make type argument inference inconsistent between the two
                // overloads).
                inferTypes(mapper.context, links.type, instantiateType(contextualType, mapper));
            }
        }
        function createPromiseType(promisedType) {
            // creates a `Promise<T>` type where `T` is the promisedType argument
            var globalPromiseType = getGlobalPromiseType();
            if (globalPromiseType !== emptyGenericType) {
                // if the promised type is itself a promise, get the underlying type; otherwise, fallback to the promised type
                promisedType = getAwaitedType(promisedType);
                return createTypeReference(globalPromiseType, [promisedType]);
            }
            return emptyObjectType;
        }
        // [ConcreteTypeScript]
        // Call getBindingType to not allow IntermediateFlowType's or weak concrete types to propagate.
        function getReturnTypeFromBody(func, contextualMapper) {
            var type = getReturnTypeFromBodyWorker(func, contextualMapper);
            return getBindingType(type);
        }
        function getReturnTypeFromBodyWorker(func, contextualMapper) {
            // [/ConcreteTypeScript]
            var contextualSignature = getContextualSignatureForFunctionLikeDeclaration(func);
            if (!func.body) {
                return unknownType;
            }
            var isAsync = ts.isAsyncFunctionLike(func);
            var type;
            if (func.body.kind !== ts.SyntaxKind.Block) {
                type = checkExpressionCached(func.body, contextualMapper);
                if (isAsync) {
                    // From within an async function you can return either a non-promise value or a promise. Any
                    // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                    // return type of the body should be unwrapped to its awaited type, which we will wrap in
                    // the native Promise<T> type later in this function.
                    type = checkAwaitedType(type, func, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                }
            }
            else {
                var types;
                var funcIsGenerator = !!func.asteriskToken;
                if (funcIsGenerator) {
                    types = checkAndAggregateYieldOperandTypes(func.body, contextualMapper);
                    if (types.length === 0) {
                        var iterableIteratorAny = createIterableIteratorType(anyType);
                        if (compilerOptions.noImplicitAny) {
                            error(func.asteriskToken, ts.Diagnostics.Generator_implicitly_has_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_return_type, typeToString(iterableIteratorAny));
                        }
                        return iterableIteratorAny;
                    }
                }
                else {
                    types = checkAndAggregateReturnExpressionTypes(func.body, contextualMapper, isAsync);
                    if (types.length === 0) {
                        if (isAsync) {
                            // For an async function, the return type will not be void, but rather a Promise for void.
                            var promiseType = createPromiseType(voidType);
                            if (promiseType === emptyObjectType) {
                                error(func, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
                                return unknownType;
                            }
                            return promiseType;
                        }
                        else {
                            return voidType;
                        }
                    }
                }
                // When yield/return statements are contextually typed we allow the return type to be a union type.
                // Otherwise we require the yield/return expressions to have a best common supertype.
                type = contextualSignature ? getUnionType(types) : getCommonSupertype(types);
                if (!type) {
                    if (funcIsGenerator) {
                        error(func, ts.Diagnostics.No_best_common_type_exists_among_yield_expressions);
                        return createIterableIteratorType(unknownType);
                    }
                    else {
                        error(func, ts.Diagnostics.No_best_common_type_exists_among_return_expressions);
                        return unknownType;
                    }
                }
                if (funcIsGenerator) {
                    type = createIterableIteratorType(type);
                }
            }
            if (!contextualSignature) {
                reportErrorsFromWidening(func, type);
            }
            var widenedType = getWidenedType(type);
            if (isAsync) {
                // From within an async function you can return either a non-promise value or a promise. Any
                // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                // return type of the body is awaited type of the body, wrapped in a native Promise<T> type.
                var promiseType = createPromiseType(widenedType);
                if (promiseType === emptyObjectType) {
                    error(func, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
                    return unknownType;
                }
                return promiseType;
            }
            else {
                return widenedType;
            }
        }
        function checkAndAggregateYieldOperandTypes(body, contextualMapper) {
            var aggregatedTypes = [];
            ts.forEachYieldExpression(body, function (yieldExpression) {
                var expr = yieldExpression.expression;
                if (expr) {
                    var type = checkExpressionCached(expr, contextualMapper);
                    if (yieldExpression.asteriskToken) {
                        // A yield* expression effectively yields everything that its operand yields
                        type = checkElementTypeOfIterable(type, yieldExpression.expression);
                    }
                    if (!ts.contains(aggregatedTypes, type)) {
                        aggregatedTypes.push(type);
                    }
                }
            });
            return aggregatedTypes;
        }
        function checkAndAggregateReturnExpressionTypes(body, contextualMapper, isAsync) {
            var aggregatedTypes = [];
            ts.forEachReturnStatement(body, function (returnStatement) {
                var expr = returnStatement.expression;
                if (expr) {
                    var type = checkExpressionCached(expr, contextualMapper);
                    if (isAsync) {
                        // From within an async function you can return either a non-promise value or a promise. Any
                        // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                        // return type of the body should be unwrapped to its awaited type, which should be wrapped in
                        // the native Promise<T> type by the caller.
                        type = checkAwaitedType(type, body.parent, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                    }
                    if (!ts.contains(aggregatedTypes, type)) {
                        aggregatedTypes.push(type);
                    }
                }
            });
            return aggregatedTypes;
        }
        function bodyContainsAReturnStatement(funcBody) {
            return ts.forEachReturnStatement(funcBody, function (returnStatement) {
                return true;
            });
        }
        function bodyContainsSingleThrowStatement(body) {
            return (body.statements.length === 1) && (body.statements[0].kind === ts.SyntaxKind.ThrowStatement);
        }
        // TypeScript Specification 1.0 (6.3) - July 2014
        // An explicitly typed function whose return type isn't the Void or the Any type
        // must have at least one return statement somewhere in its body.
        // An exception to this rule is if the function implementation consists of a single 'throw' statement.
        function checkIfNonVoidFunctionHasReturnExpressionsOrSingleThrowStatment(func, returnType) {
            if (!produceDiagnostics) {
                return;
            }
            // Functions that return 'void' or 'any' don't need any return expressions.
            if (returnType === voidType || isTypeAny(returnType)) {
                return;
            }
            // If all we have is a function signature, or an arrow function with an expression body, then there is nothing to check.
            if (ts.nodeIsMissing(func.body) || func.body.kind !== ts.SyntaxKind.Block) {
                return;
            }
            var bodyBlock = func.body;
            // Ensure the body has at least one return expression.
            if (bodyContainsAReturnStatement(bodyBlock)) {
                return;
            }
            // If there are no return expressions, then we need to check if
            // the function body consists solely of a throw statement;
            // this is to make an exception for unimplemented functions.
            if (bodyContainsSingleThrowStatement(bodyBlock)) {
                return;
            }
            // This function does not conform to the specification.
            error(func.type, ts.Diagnostics.A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value_or_consist_of_a_single_throw_statement);
        }
        function checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper) {
            ts.Debug.assert(node.kind !== ts.SyntaxKind.MethodDeclaration || ts.isObjectLiteralMethod(node));
            // Grammar checking
            var hasGrammarError = checkGrammarFunctionLikeDeclaration(node);
            if (!hasGrammarError && node.kind === ts.SyntaxKind.FunctionExpression) {
                checkGrammarForGenerator(node);
            }
            // The identityMapper object is used to indicate that function expressions are wildcards
            if (contextualMapper === identityMapper && isContextSensitive(node)) {
                return anyFunctionType;
            }
            var isAsync = ts.isAsyncFunctionLike(node);
            if (isAsync) {
                emitAwaiter = true;
            }
            var links = getNodeLinks(node);
            var type = getTypeOfSymbol(node.symbol);
            var contextSensitive = isContextSensitive(node);
            var mightFixTypeParameters = contextSensitive && isInferentialContext(contextualMapper);
            // Check if function expression is contextually typed and assign parameter types if so.
            // See the comment in assignTypeToParameterAndFixTypeParameters to understand why we need to
            // check mightFixTypeParameters.
            if (mightFixTypeParameters || !(links.flags & ts.NodeCheckFlags.ContextChecked)) {
                var contextualSignature = getContextualSignature(node);
                // If a type check is started at a function expression that is an argument of a function call, obtaining the
                // contextual type may recursively get back to here during overload resolution of the call. If so, we will have
                // already assigned contextual types.
                var contextChecked = !!(links.flags & ts.NodeCheckFlags.ContextChecked);
                if (mightFixTypeParameters || !contextChecked) {
                    links.flags |= ts.NodeCheckFlags.ContextChecked;
                    if (contextualSignature) {
                        var signature = getSignaturesOfType(type, ts.SignatureKind.Call)[0];
                        if (contextSensitive) {
                            assignContextualParameterTypes(signature, contextualSignature, contextualMapper || identityMapper);
                        }
                        if (mightFixTypeParameters || !node.type && !signature.resolvedReturnType) {
                            var returnType = getReturnTypeFromBody(node, contextualMapper);
                            if (!signature.resolvedReturnType) {
                                signature.resolvedReturnType = returnType;
                            }
                        }
                    }
                    if (!contextChecked) {
                        checkSignatureDeclaration(node);
                    }
                }
            }
            if (produceDiagnostics && node.kind !== ts.SyntaxKind.MethodDeclaration && node.kind !== ts.SyntaxKind.MethodSignature) {
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
            }
            return type;
        }
        function checkFunctionExpressionOrObjectLiteralMethodBody(node) {
            ts.Debug.assert(node.kind !== ts.SyntaxKind.MethodDeclaration || ts.isObjectLiteralMethod(node));
            var isAsync = ts.isAsyncFunctionLike(node);
            if (isAsync) {
                emitAwaiter = true;
            }
            var returnType = node.type && getTypeFromTypeNode(node.type);
            var promisedType;
            if (returnType && isAsync) {
                promisedType = checkAsyncFunctionReturnType(node);
            }
            if (returnType && !node.asteriskToken) {
                checkIfNonVoidFunctionHasReturnExpressionsOrSingleThrowStatment(node, isAsync ? promisedType : returnType);
            }
            if (node.body) {
                if (!node.type) {
                    // There are some checks that are only performed in getReturnTypeFromBody, that may produce errors
                    // we need. An example is the noImplicitAny errors resulting from widening the return expression
                    // of a function. Because checking of function expression bodies is deferred, there was never an
                    // appropriate time to do this during the main walk of the file (see the comment at the top of
                    // checkFunctionExpressionBodies). So it must be done now.
                    getReturnTypeOfSignature(getSignatureFromDeclaration(node));
                }
                if (node.body.kind === ts.SyntaxKind.Block) {
                    checkSourceElement(node.body);
                }
                else {
                    // From within an async function you can return either a non-promise value or a promise. Any
                    // Promise/A+ compatible implementation will always assimilate any foreign promise, so we
                    // should not be checking assignability of a promise to the return type. Instead, we need to
                    // check assignability of the awaited type of the expression body against the promised type of
                    // its return type annotation.
                    var exprType = checkExpression(node.body);
                    if (returnType) {
                        if (isAsync) {
                            var awaitedType = checkAwaitedType(exprType, node.body, ts.Diagnostics.Expression_body_for_async_arrow_function_does_not_have_a_valid_callable_then_member);
                            checkTypeAssignableTo(awaitedType, promisedType, node.body);
                        }
                        else {
                            checkTypeAssignableTo(exprType, returnType, node.body);
                        }
                    }
                    checkFunctionAndClassExpressionBodies(node.body);
                }
            }
        }
        function checkArithmeticOperandType(operand, type, diagnostic) {
            if (!isTypeAnyOrAllConstituentTypesHaveKind(type, ts.TypeFlags.NumberLike)) {
                error(operand, diagnostic);
                return false;
            }
            return true;
        }
        function checkReferenceExpression(n, invalidReferenceMessage, constantVariableMessage) {
            function findSymbol(n) {
                var symbol = getNodeLinks(n).resolvedSymbol;
                // Because we got the symbol from the resolvedSymbol property, it might be of kind
                // SymbolFlags.ExportValue. In this case it is necessary to get the actual export
                // symbol, which will have the correct flags set on it.
                return symbol && getExportSymbolOfValueSymbolIfExported(symbol);
            }
            function isReferenceOrErrorExpression(n) {
                // TypeScript 1.0 spec (April 2014):
                // Expressions are classified as values or references.
                // References are the subset of expressions that are permitted as the target of an assignment.
                // Specifically, references are combinations of identifiers(section 4.3), parentheses(section 4.7),
                // and property accesses(section 4.10).
                // All other expression constructs described in this chapter are classified as values.
                switch (n.kind) {
                    case ts.SyntaxKind.Identifier: {
                        var symbol = findSymbol(n);
                        // TypeScript 1.0 spec (April 2014): 4.3
                        // An identifier expression that references a variable or parameter is classified as a reference.
                        // An identifier expression that references any other kind of entity is classified as a value(and therefore cannot be the target of an assignment).
                        return !symbol || symbol === unknownSymbol || symbol === argumentsSymbol || (symbol.flags & ts.SymbolFlags.Variable) !== 0;
                    }
                    case ts.SyntaxKind.PropertyAccessExpression: {
                        var symbol = findSymbol(n);
                        // TypeScript 1.0 spec (April 2014): 4.10
                        // A property access expression is always classified as a reference.
                        // NOTE (not in spec): assignment to enum members should not be allowed
                        return !symbol || symbol === unknownSymbol || (symbol.flags & ~ts.SymbolFlags.EnumMember) !== 0;
                    }
                    case ts.SyntaxKind.ElementAccessExpression:
                        //  old compiler doesn't check indexed assess
                        return true;
                    case ts.SyntaxKind.ParenthesizedExpression:
                        return isReferenceOrErrorExpression(n.expression);
                    default:
                        return false;
                }
            }
            function isConstVariableReference(n) {
                switch (n.kind) {
                    case ts.SyntaxKind.Identifier:
                    case ts.SyntaxKind.PropertyAccessExpression: {
                        var symbol = findSymbol(n);
                        return symbol && (symbol.flags & ts.SymbolFlags.Variable) !== 0 && (getDeclarationFlagsFromSymbol(symbol) & ts.NodeFlags.Const) !== 0;
                    }
                    case ts.SyntaxKind.ElementAccessExpression: {
                        var index = n.argumentExpression;
                        var symbol = findSymbol(n.expression);
                        if (symbol && index && index.kind === ts.SyntaxKind.StringLiteral) {
                            var name_4 = index.text;
                            var prop = getPropertyOfType(getTypeOfSymbol(symbol), name_4);
                            return prop && (prop.flags & ts.SymbolFlags.Variable) !== 0 && (getDeclarationFlagsFromSymbol(prop) & ts.NodeFlags.Const) !== 0;
                        }
                        return false;
                    }
                    case ts.SyntaxKind.ParenthesizedExpression:
                        return isConstVariableReference(n.expression);
                    default:
                        return false;
                }
            }
            if (!isReferenceOrErrorExpression(n)) {
                error(n, invalidReferenceMessage);
                return false;
            }
            if (isConstVariableReference(n)) {
                error(n, constantVariableMessage);
                return false;
            }
            return true;
        }
        function checkDeleteExpression(node) {
            checkExpression(node.expression);
            return createConcreteType(booleanType); // [ConcreteTypeScript] Always concrete
        }
        function checkTypeOfExpression(node) {
            checkExpression(node.expression);
            return createConcreteType(stringType); // [ConcreteTypeScript] Always concrete
        }
        function checkVoidExpression(node) {
            checkExpression(node.expression);
            return createConcreteType(undefinedType); // [ConcreteTypeScript] Always concrete
        }
        function checkAwaitExpression(node) {
            // Grammar checking
            if (produceDiagnostics) {
                if (!(node.parserContextFlags & ts.ParserContextFlags.Await)) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.await_expression_is_only_allowed_within_an_async_function);
                }
                if (isInParameterInitializerBeforeContainingFunction(node)) {
                    error(node, ts.Diagnostics.await_expressions_cannot_be_used_in_a_parameter_initializer);
                }
            }
            var operandType = checkExpression(node.expression);
            return checkAwaitedType(operandType, node);
        }
        function checkPrefixUnaryExpression(node) {
            var operandType = checkExpression(node.operand);
            switch (node.operator) {
                case ts.SyntaxKind.PlusToken:
                case ts.SyntaxKind.MinusToken:
                case ts.SyntaxKind.TildeToken:
                    if (someConstituentTypeHasKind(operandType, ts.TypeFlags.ESSymbol)) {
                        error(node.operand, ts.Diagnostics.The_0_operator_cannot_be_applied_to_type_symbol, ts.tokenToString(node.operator));
                    }
                    return concreteNumberType; // [ConcreteTypeScript] Always concrete
                case ts.SyntaxKind.ExclamationToken:
                    return createConcreteType(booleanType); // [ConcreteTypeScript] Always concrete
                case ts.SyntaxKind.PlusPlusToken:
                case ts.SyntaxKind.MinusMinusToken:
                    operandType = unconcrete(operandType); // [ConcreteTypeScript] Concreteness irrelevant for us
                    var ok = checkArithmeticOperandType(node.operand, operandType, ts.Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_or_an_enum_type);
                    if (ok) {
                        // run check only if former checks succeeded to avoid reporting cascading errors
                        checkReferenceExpression(node.operand, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_cannot_be_a_constant);
                    }
                    // [ConcreteTypeScript]
                    // If we determined that we had to check the operand, we can't, as it's a reference
                    getNodeLinks(node.operand).mustCheck = getNodeLinks(node.operand).checkVar = void 0;
                    getNodeLinks(node.operand).mustFloat = getNodeLinks(node.operand).mustInt = void 0;
                    getNodeLinks(node.operand).assertFloat = getNodeLinks(node.operand).assertInt = void 0;
                    getNodeLinks(node.operand).direct = void 0;
                    // [/ConcreteTypeScript]
                    return concreteNumberType; // [ConcreteTypeScript] Always concrete
            }
            return unknownType;
        }
        function checkPostfixUnaryExpression(node) {
            var operandType = checkExpression(node.operand);
            operandType = unconcrete(operandType); // [ConcreteTypeScript] Concreteness irrelevant for us
            var ok = checkArithmeticOperandType(node.operand, operandType, ts.Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_or_an_enum_type);
            if (ok) {
                // run check only if former checks succeeded to avoid reporting cascading errors
                checkReferenceExpression(node.operand, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_cannot_be_a_constant);
            }
            // [ConcreteTypeScript]
            // If we determined that we had to check the operand, we can't, as it's a reference
            getNodeLinks(node.operand).mustCheck = getNodeLinks(node.operand).checkVar = void 0;
            getNodeLinks(node.operand).mustFloat = getNodeLinks(node.operand).mustInt = void 0;
            getNodeLinks(node.operand).assertFloat = getNodeLinks(node.operand).assertInt = void 0;
            getNodeLinks(node.operand).direct = void 0;
            // [/ConcreteTypeScript]
            return concreteNumberType; // [ConcreteTypeScript] Result always concrete
        }
        // Just like isTypeOfKind below, except that it returns true if *any* constituent
        // has this kind.
        function someConstituentTypeHasKind(type, kind) {
            if (type.flags & kind) {
                return true;
            }
            if (type.flags & ts.TypeFlags.UnionOrIntersection) {
                var types = type.types;
                for (var _i = 0; _i < types.length; _i++) {
                    var current = types[_i];
                    if (current.flags & kind) {
                        return true;
                    }
                }
                return false;
            }
            return false;
        }
        // Return true if type has the given flags, or is a union or intersection type composed of types that all have those flags.
        function allConstituentTypesHaveKind(type, kind) {
            if (type.flags & kind) {
                return true;
            }
            if (type.flags & ts.TypeFlags.UnionOrIntersection) {
                var types = type.types;
                for (var _i = 0; _i < types.length; _i++) {
                    var current = types[_i];
                    if (!(current.flags & kind)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        function isConstEnumObjectType(type) {
            return type.flags & (ts.TypeFlags.ObjectType | ts.TypeFlags.Anonymous) && type.symbol && isConstEnumSymbol(type.symbol);
        }
        function isConstEnumSymbol(symbol) {
            return (symbol.flags & ts.SymbolFlags.ConstEnum) !== 0;
        }
        // [ConcreteTypeScript]
        function checkDeclaredAsExpression(node, leftType, rightType) {
            // Concreteness of LHS does not matter for most checks:
            leftType = unconcrete(leftType);
            // Like the instanceof operator, the declared as operator requires the left operand to be of type Any, an object type, or a type parameter type,
            // and the right operand to be of type Any or a subtype of the 'Function' interface type.
            // The result is always of the Boolean primitive type.
            if (allConstituentTypesHaveKind(leftType, ts.TypeFlags.Primitive)) {
                error(node.left, ts.Diagnostics.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            // Unlike instanceof, theoretically any (object) type can be branded/declared as a type. We therefore do not do
            // any subtype checks.
            return createConcreteType(booleanType); // [ConcreteTypeScript] Always concrete
        }
        function checkInstanceOfExpression(node, leftType, rightType) {
            // [ConcreteTypeScript] Either side may of course be concrete
            leftType = unconcrete(leftType);
            rightType = unconcrete(rightType);
            // TODO make sure floatNum and intNum are Primitive
            // [/ConcreteTypeScript]
            // TypeScript 1.0 spec (April 2014): 4.15.4
            // The instanceof operator requires the left operand to be of type Any, an object type, or a type parameter type,
            // and the right operand to be of type Any or a subtype of the 'Function' interface type.
            // The result is always of the Boolean primitive type.
            // NOTE: do not raise error if leftType is unknown as related error was already reported
            if (allConstituentTypesHaveKind(leftType, ts.TypeFlags.Primitive)) {
                error(node.left, ts.Diagnostics.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            // NOTE: do not raise error if right is unknown as related error was already reported
            if (!(isTypeAny(rightType) || isTypeSubtypeOf(rightType, globalFunctionType))) {
                error(node.right, ts.Diagnostics.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type);
            }
            return createConcreteType(booleanType); // [ConcreteTypeScript] Always concrete
        }
        function checkInExpression(node, leftType, rightType) {
            // TypeScript 1.0 spec (April 2014): 4.15.5
            // The in operator requires the left operand to be of type Any, the String primitive type, or the Number primitive type,
            // and the right operand to be of type Any, an object type, or a type parameter type.
            // The result is always of the Boolean primitive type.
            if (!isTypeAnyOrAllConstituentTypesHaveKind(/*ConcreteTypeScript*/ unconcrete(leftType), ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.ESSymbol)) {
                error(node.left, ts.Diagnostics.The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol);
            }
            if (!isTypeAnyOrAllConstituentTypesHaveKind(/*ConcreteTypeScript*/ unconcrete(rightType), ts.TypeFlags.ObjectType | ts.TypeFlags.TypeParameter)) {
                error(node.right, ts.Diagnostics.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            return booleanType;
        }
        function checkObjectLiteralAssignment(node, sourceType, contextualMapper) {
            var properties = node.properties;
            for (var _i = 0; _i < properties.length; _i++) {
                var p = properties[_i];
                if (p.kind === ts.SyntaxKind.PropertyAssignment || p.kind === ts.SyntaxKind.ShorthandPropertyAssignment) {
                    // TODO(andersh): Computed property support
                    var name_5 = p.name;
                    var type = isTypeAny(sourceType)
                        ? sourceType
                        : getTypeOfPropertyOfType(sourceType, name_5.text) ||
                            isNumericLiteralName(name_5.text) && getIndexTypeOfType(sourceType, ts.IndexKind.Number) ||
                            getIndexTypeOfType(sourceType, ts.IndexKind.String);
                    if (type) {
                        checkDestructuringAssignment(p.initializer || name_5, type);
                    }
                    else {
                        error(name_5, ts.Diagnostics.Type_0_has_no_property_1_and_no_string_index_signature, typeToString(sourceType), ts.declarationNameToString(name_5));
                    }
                }
                else {
                    error(p, ts.Diagnostics.Property_assignment_expected);
                }
            }
            return sourceType;
        }
        function checkArrayLiteralAssignment(node, sourceType, contextualMapper) {
            // This elementType will be used if the specific property corresponding to this index is not
            // present (aka the tuple element property). This call also checks that the parentType is in
            // fact an iterable or array (depending on target language).
            var elementType = checkIteratedTypeOrElementType(sourceType, node, /*allowStringInput*/ false) || unknownType;
            var elements = node.elements;
            for (var i = 0; i < elements.length; i++) {
                var e = elements[i];
                if (e.kind !== ts.SyntaxKind.OmittedExpression) {
                    if (e.kind !== ts.SyntaxKind.SpreadElementExpression) {
                        var propName = "" + i;
                        var type = isTypeAny(sourceType)
                            ? sourceType
                            : isTupleLikeType(sourceType)
                                ? getTypeOfPropertyOfType(sourceType, propName)
                                : elementType;
                        if (type) {
                            checkDestructuringAssignment(e, type, contextualMapper);
                        }
                        else {
                            if (isTupleType(sourceType)) {
                                error(e, ts.Diagnostics.Tuple_type_0_with_length_1_cannot_be_assigned_to_tuple_with_length_2, typeToString(sourceType), sourceType.elementTypes.length, elements.length);
                            }
                            else {
                                error(e, ts.Diagnostics.Type_0_has_no_property_1, typeToString(sourceType), propName);
                            }
                        }
                    }
                    else {
                        if (i < elements.length - 1) {
                            error(e, ts.Diagnostics.A_rest_element_must_be_last_in_an_array_destructuring_pattern);
                        }
                        else {
                            var restExpression = e.expression;
                            if (restExpression.kind === ts.SyntaxKind.BinaryExpression && restExpression.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                                error(restExpression.operatorToken, ts.Diagnostics.A_rest_element_cannot_have_an_initializer);
                            }
                            else {
                                checkDestructuringAssignment(restExpression, createArrayType(elementType), contextualMapper);
                            }
                        }
                    }
                }
            }
            return sourceType;
        }
        function checkDestructuringAssignment(target, sourceType, contextualMapper) {
            if (target.kind === ts.SyntaxKind.BinaryExpression && target.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                checkBinaryExpression(target, contextualMapper);
                target = target.left;
            }
            if (target.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                return checkObjectLiteralAssignment(target, sourceType, contextualMapper);
            }
            if (target.kind === ts.SyntaxKind.ArrayLiteralExpression) {
                return checkArrayLiteralAssignment(target, sourceType, contextualMapper);
            }
            return checkReferenceAssignment(target, sourceType, contextualMapper);
        }
        function checkReferenceAssignment(target, sourceType, contextualMapper) {
            var targetType = checkExpression(target, contextualMapper);
            if (checkReferenceExpression(target, ts.Diagnostics.Invalid_left_hand_side_of_assignment_expression, ts.Diagnostics.Left_hand_side_of_assignment_expression_cannot_be_a_constant)) {
                checkTypeAssignableTo(sourceType, targetType, target, /*headMessage*/ undefined);
            }
            return sourceType;
        }
        // [ConcreteTypeScript]
        function expectBrandIdentifierGetType(node) {
            if (node.kind !== ts.SyntaxKind.Identifier) {
                error(node, ts.Diagnostics.ConcreteTypeScript_Expected_identifier_which_resolves_to_type_created_with_declare);
                return undefinedType;
            }
            var ident = node;
            var brandSymbol = resolveName(ident.parent, ident.text, ts.SymbolFlags.Type, ts.Diagnostics.ConcreteTypeScript_Expected_identifier_which_resolves_to_type_created_with_declare, ident);
            return getDeclaredTypeOfSymbol(brandSymbol);
        }
        function checkBinaryExpression(node, contextualMapper) {
            var operator = node.operatorToken.kind;
            if (operator === ts.SyntaxKind.EqualsToken && (node.left.kind === ts.SyntaxKind.ObjectLiteralExpression || node.left.kind === ts.SyntaxKind.ArrayLiteralExpression)) {
                return checkDestructuringAssignment(node.left, checkExpression(node.right, contextualMapper), contextualMapper);
            }
            var leftType = checkExpression(node.left, contextualMapper);
            // [ConcreteTypeScript]
            var rightType = (node.operatorToken.kind === ts.SyntaxKind.DeclaredAsKeyword)
                ? expectBrandIdentifierGetType(node.right)
                : checkExpression(node.right, contextualMapper);
            // [/ConcreteTypeScript]
            switch (operator) {
                case ts.SyntaxKind.AsteriskToken:
                case ts.SyntaxKind.AsteriskEqualsToken:
                case ts.SyntaxKind.SlashToken:
                case ts.SyntaxKind.SlashEqualsToken:
                case ts.SyntaxKind.PercentToken:
                case ts.SyntaxKind.PercentEqualsToken:
                case ts.SyntaxKind.MinusToken:
                case ts.SyntaxKind.MinusEqualsToken:
                case ts.SyntaxKind.LessThanLessThanToken:
                case ts.SyntaxKind.LessThanLessThanEqualsToken:
                case ts.SyntaxKind.GreaterThanGreaterThanToken:
                case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
                case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                case ts.SyntaxKind.BarToken:
                case ts.SyntaxKind.BarEqualsToken:
                case ts.SyntaxKind.CaretToken:
                case ts.SyntaxKind.CaretEqualsToken:
                case ts.SyntaxKind.AmpersandToken:
                case ts.SyntaxKind.AmpersandEqualsToken:
                    // [ConcreteTypeScript]
                    // Since the result type is always concrete, input concreteness doesn't matter
                    leftType = unconcrete(leftType);
                    rightType = unconcrete(rightType);
                    // [/ConcreteTypeScript]
                    // TypeScript 1.0 spec (April 2014): 4.15.1
                    // These operators require their operands to be of type Any, the Number primitive type,
                    // or an enum type. Operands of an enum type are treated
                    // as having the primitive type Number. If one operand is the null or undefined value,
                    // it is treated as having the type of the other operand.
                    // The result is always of the Number primitive type.
                    if (leftType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
                        leftType = rightType;
                    if (rightType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
                        rightType = leftType;
                    var suggestedOperator;
                    // if a user tries to apply a bitwise operator to 2 boolean operands
                    // try and return them a helpful suggestion
                    if ((leftType.flags & ts.TypeFlags.Boolean) &&
                        (rightType.flags & ts.TypeFlags.Boolean) &&
                        (suggestedOperator = getSuggestedBooleanOperator(node.operatorToken.kind)) !== undefined) {
                        error(node, ts.Diagnostics.The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead, ts.tokenToString(node.operatorToken.kind), ts.tokenToString(suggestedOperator));
                    }
                    else {
                        // otherwise just check each operand separately and report errors as normal
                        var leftOk = checkArithmeticOperandType(node.left, leftType, ts.Diagnostics.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type);
                        var rightOk = checkArithmeticOperandType(node.right, rightType, ts.Diagnostics.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type);
                        if (leftOk && rightOk) {
                            checkAssignmentOperator(concreteNumberType); // [ConcreteTypeScript] Result is concrete
                        }
                    }
                    return concreteNumberType; // [ConcreteTypeScript] Result is concrete
                case ts.SyntaxKind.PlusToken:
                case ts.SyntaxKind.PlusEqualsToken:
                    // TypeScript 1.0 spec (April 2014): 4.15.2
                    // The binary + operator requires both operands to be of the Number primitive type or an enum type,
                    // or at least one of the operands to be of type Any or the String primitive type.
                    // If one operand is the null or undefined value, it is treated as having the type of the other operand.
                    // [ConcreteTypeScript] But don't trust concreteness here!
                    if (leftType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
                        leftType = unconcrete(rightType);
                    if (rightType.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))
                        rightType = unconcrete(leftType);
                    // [/ConcreteTypeScript]
                    // [ConcreteTypeScript]
                    // We must support passing through concreteness
                    var leftConcrete = false, rightConcrete = false, resultConcrete = false;
                    if (isConcreteType(leftType))
                        leftConcrete = true;
                    if (isConcreteType(rightType))
                        rightConcrete = true;
                    if (leftConcrete && rightConcrete)
                        resultConcrete = true;
                    leftType = unconcrete(leftType);
                    rightType = unconcrete(rightType);
                    // [/ConcreteTypeScript]
                    var resultType;
                    if (allConstituentTypesHaveKind(leftType, ts.TypeFlags.NumberLike) && allConstituentTypesHaveKind(rightType, ts.TypeFlags.NumberLike)) {
                        // Operands of an enum type are treated as having the primitive type Number.
                        // If both operands are of the Number primitive type, the result is of the Number primitive type.
                        resultType = numberType;
                    }
                    else {
                        if (allConstituentTypesHaveKind(leftType, ts.TypeFlags.StringLike) || allConstituentTypesHaveKind(rightType, ts.TypeFlags.StringLike)) {
                            // If one or both operands are of the String primitive type, the result is of the String primitive type.
                            resultType = stringType;
                        }
                        else if (isTypeAny(leftType) || isTypeAny(rightType)) {
                            // Otherwise, the result is of type Any.
                            // NOTE: unknown type here denotes error type. Old compiler treated this case as any type so do we.
                            resultType = leftType === unknownType || rightType === unknownType ? unknownType : anyType;
                        }
                        // Symbols are not allowed at all in arithmetic expressions
                        if (resultType && !checkForDisallowedESSymbolOperand(operator)) {
                            return resultType;
                        }
                    }
                    if (!resultType) {
                        reportOperatorError();
                        return anyType;
                    }
                    // [ConcreteTypeScript] Apply concreteness to result
                    if (resultConcrete) {
                        resultType = createConcreteType(resultType);
                    }
                    else if (allConstituentTypesHaveKind(leftType, ts.TypeFlags.StringLike) && leftConcrete) {
                        resultType = concreteStringType;
                    }
                    else if (allConstituentTypesHaveKind(rightType, ts.TypeFlags.StringLike) && rightConcrete) {
                        resultType = concreteStringType;
                    }
                    // [/ConcreteTypeScript]
                    if (operator === ts.SyntaxKind.PlusEqualsToken) {
                        checkAssignmentOperator(resultType);
                    }
                    return resultType;
                case ts.SyntaxKind.LessThanToken:
                case ts.SyntaxKind.GreaterThanToken:
                case ts.SyntaxKind.LessThanEqualsToken:
                case ts.SyntaxKind.GreaterThanEqualsToken:
                    if (!checkForDisallowedESSymbolOperand(operator)) {
                        return booleanType;
                    }
                // Fall through
                case ts.SyntaxKind.EqualsEqualsToken:
                case ts.SyntaxKind.ExclamationEqualsToken:
                case ts.SyntaxKind.EqualsEqualsEqualsToken:
                case ts.SyntaxKind.ExclamationEqualsEqualsToken:
                    if (!isTypeAssignableTo(leftType, rightType) && !isTypeAssignableTo(rightType, leftType)) {
                        reportOperatorError();
                    }
                    return createConcreteType(booleanType); // [ConcreteTypeScript] Result is concrete
                case ts.SyntaxKind.InstanceOfKeyword:
                    return checkInstanceOfExpression(node, leftType, rightType);
                case ts.SyntaxKind.DeclaredAsKeyword:
                    return checkDeclaredAsExpression(node, leftType, rightType);
                case ts.SyntaxKind.InKeyword:
                    return checkInExpression(node, leftType, rightType);
                case ts.SyntaxKind.AmpersandAmpersandToken:
                    // [ConcreteTypeScript]
                    // This type is completely wrong, but the pattern is too
                    // common to outright ignore. So instead, we coerce the
                    // left to the right brand of falsey if concreteness was
                    // asked for.
                    // FIXME: This could break trace-preservation, if the
                    // falseyness behaves differently
                    if (isConcreteType(rightType)) {
                        if (isTypeAssignableTo(leftType, rightType)) {
                            // it's fine, but may need an optimizing-hint coercion
                            checkCtsCoercion(node.left, leftType, rightType);
                        }
                        else {
                            // need a hardcore coercion!
                            getNodeLinks(node.left).forceFalseyCoercion = rightType;
                        }
                    }
                    // [/ConcreteTypeScript]
                    return rightType;
                case ts.SyntaxKind.BarBarToken:
                    return getUnionType([leftType, rightType]);
                case ts.SyntaxKind.EqualsToken:
                    checkAssignmentOperator(rightType);
                    return getRegularTypeOfObjectLiteral(rightType);
                case ts.SyntaxKind.CommaToken:
                    return rightType;
            }
            // Return true if there was no error, false if there was an error.
            function checkForDisallowedESSymbolOperand(operator) {
                var offendingSymbolOperand = someConstituentTypeHasKind(leftType, ts.TypeFlags.ESSymbol) ? node.left :
                    someConstituentTypeHasKind(rightType, ts.TypeFlags.ESSymbol) ? node.right :
                        undefined;
                if (offendingSymbolOperand) {
                    error(offendingSymbolOperand, ts.Diagnostics.The_0_operator_cannot_be_applied_to_type_symbol, ts.tokenToString(operator));
                    return false;
                }
                return true;
            }
            function getSuggestedBooleanOperator(operator) {
                switch (operator) {
                    case ts.SyntaxKind.BarToken:
                    case ts.SyntaxKind.BarEqualsToken:
                        return ts.SyntaxKind.BarBarToken;
                    case ts.SyntaxKind.CaretToken:
                    case ts.SyntaxKind.CaretEqualsToken:
                        return ts.SyntaxKind.ExclamationEqualsEqualsToken;
                    case ts.SyntaxKind.AmpersandToken:
                    case ts.SyntaxKind.AmpersandEqualsToken:
                        return ts.SyntaxKind.AmpersandAmpersandToken;
                    default:
                        return undefined;
                }
            }
            function checkAssignmentOperator(valueType) {
                if (produceDiagnostics && operator >= ts.SyntaxKind.FirstAssignment && operator <= ts.SyntaxKind.LastAssignment) {
                    // TypeScript 1.0 spec (April 2014): 4.17
                    // An assignment of the form
                    //    VarExpr = ValueExpr
                    // requires VarExpr to be classified as a reference
                    // A compound assignment furthermore requires VarExpr to be classified as a reference (section 4.1)
                    // and the type of the non - compound operation to be assignable to the type of VarExpr.
                    var ok = checkReferenceExpression(node.left, ts.Diagnostics.Invalid_left_hand_side_of_assignment_expression, ts.Diagnostics.Left_hand_side_of_assignment_expression_cannot_be_a_constant);
                    // Use default messages
                    if (ok) {
                        // to avoid cascading errors check assignability only if 'isReference' check succeeded and no errors were reported
                        checkTypeAssignableTo(valueType, leftType, node.left, /*headMessage*/ undefined);
                    }
                    // [ConcreteTypeScript]
                    // If we determined that we had to check the LHS... well, we don't, we're just assigning
                    var leftLinks = getNodeLinks(node.left);
                    if (leftLinks.mustCheck)
                        leftLinks.mustCheck = void 0;
                    if (leftLinks.checkVar)
                        leftLinks.checkVar = void 0;
                    if (leftLinks.mustFloat)
                        leftLinks.mustFloat = void 0;
                    if (leftLinks.mustInt)
                        leftLinks.mustInt = void 0;
                    if (leftLinks.assertFloat)
                        leftLinks.assertFloat = void 0;
                    if (leftLinks.assertInt)
                        leftLinks.assertInt = void 0;
                    // And if the LHS could be direct, it's actually the assignment
                    if (leftLinks.direct) {
                        leftLinks.direct = void 0;
                        getNodeLinks(node).direct = true;
                    }
                    // We may have to check the RHS
                    checkCtsCoercion(node.right, valueType, leftType);
                }
            }
            function reportOperatorError() {
                error(node, ts.Diagnostics.Operator_0_cannot_be_applied_to_types_1_and_2, ts.tokenToString(node.operatorToken.kind), typeToString(leftType), typeToString(rightType));
            }
        }
        function isYieldExpressionInClass(node) {
            var current = node;
            var parent = node.parent;
            while (parent) {
                if (ts.isFunctionLike(parent) && current === parent.body) {
                    return false;
                }
                else if (ts.isClassLike(current)) {
                    return true;
                }
                current = parent;
                parent = parent.parent;
            }
            return false;
        }
        function checkYieldExpression(node) {
            // Grammar checking
            if (produceDiagnostics) {
                if (!(node.parserContextFlags & ts.ParserContextFlags.Yield) || isYieldExpressionInClass(node)) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.A_yield_expression_is_only_allowed_in_a_generator_body);
                }
                if (isInParameterInitializerBeforeContainingFunction(node)) {
                    error(node, ts.Diagnostics.yield_expressions_cannot_be_used_in_a_parameter_initializer);
                }
            }
            if (node.expression) {
                var func = ts.getContainingFunction(node);
                // If the user's code is syntactically correct, the func should always have a star. After all,
                // we are in a yield context.
                if (func && func.asteriskToken) {
                    var expressionType = checkExpressionCached(node.expression, /*contextualMapper*/ undefined);
                    var expressionElementType;
                    var nodeIsYieldStar = !!node.asteriskToken;
                    if (nodeIsYieldStar) {
                        expressionElementType = checkElementTypeOfIterable(expressionType, node.expression);
                    }
                    // There is no point in doing an assignability check if the function
                    // has no explicit return type because the return type is directly computed
                    // from the yield expressions.
                    if (func.type) {
                        var signatureElementType = getElementTypeOfIterableIterator(getTypeFromTypeNode(func.type)) || anyType;
                        if (nodeIsYieldStar) {
                            checkTypeAssignableTo(expressionElementType, signatureElementType, node.expression, /*headMessage*/ undefined);
                        }
                        else {
                            checkTypeAssignableTo(expressionType, signatureElementType, node.expression, /*headMessage*/ undefined);
                        }
                    }
                }
            }
            // Both yield and yield* expressions have type 'any'
            return anyType;
        }
        function checkConditionalExpression(node, contextualMapper) {
            checkExpression(node.condition);
            var type1 = checkExpression(node.whenTrue, contextualMapper);
            var type2 = checkExpression(node.whenFalse, contextualMapper);
            return getUnionType([type1, type2]);
        }
        function checkTemplateExpression(node) {
            // We just want to check each expressions, but we are unconcerned with
            // the type of each expression, as any value may be coerced into a string.
            // It is worth asking whether this is what we really want though.
            // A place where we actually *are* concerned with the expressions' types are
            // in tagged templates.
            ts.forEach(node.templateSpans, function (templateSpan) {
                checkExpression(templateSpan.expression);
            });
            return stringType;
        }
        function checkExpressionWithContextualType(node, contextualType, contextualMapper) {
            var saveContextualType = node.contextualType;
            node.contextualType = contextualType;
            var result = checkExpression(node, contextualMapper);
            node.contextualType = saveContextualType;
            return result;
        }
        function checkExpressionCached(node, contextualMapper) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = checkExpression(node, contextualMapper);
            }
            return links.resolvedType;
        }
        function checkPropertyAssignment(node, contextualMapper) {
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                checkComputedPropertyName(node.name);
            }
            return checkExpression(node.initializer, contextualMapper);
        }
        function checkObjectLiteralMethod(node, contextualMapper) {
            // Grammar checking
            checkGrammarMethod(node);
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                checkComputedPropertyName(node.name);
            }
            var uninstantiatedType = checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper);
            return instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, contextualMapper);
        }
        function instantiateTypeWithSingleGenericCallSignature(node, type, contextualMapper) {
            if (isInferentialContext(contextualMapper)) {
                var signature = getSingleCallSignature(type);
                if (signature && signature.typeParameters) {
                    var contextualType = getContextualType(node);
                    if (contextualType) {
                        var contextualSignature = getSingleCallSignature(contextualType);
                        if (contextualSignature && !contextualSignature.typeParameters) {
                            return getOrCreateTypeFromSignature(instantiateSignatureInContextOf(signature, contextualSignature, contextualMapper));
                        }
                    }
                }
            }
            return type;
        }
        // Checks an expression and returns its type. The contextualMapper parameter serves two purposes: When
        // contextualMapper is not undefined and not equal to the identityMapper function object it indicates that the
        // expression is being inferentially typed (section 4.12.2 in spec) and provides the type mapper to use in
        // conjunction with the generic contextual type. When contextualMapper is equal to the identityMapper function
        // object, it serves as an indicator that all contained function and arrow expressions should be considered to
        // have the wildcard function type; this form of type check is used during overload resolution to exclude
        // contextually typed function and arrow expressions in the initial phase.
        function checkExpression(node, contextualMapper) {
            var type;
            if (node.kind === ts.SyntaxKind.QualifiedName) {
                type = checkQualifiedName(node);
            }
            else {
                var uninstantiatedType = checkExpressionWorker(node, contextualMapper);
                type = instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, contextualMapper);
            }
            if (isConstEnumObjectType(type) /*ConcreteTypeScript*/ && !(type.symbol.flags & ts.SymbolFlags.Declare)) {
                // enum object type for const enums are only permitted in:
                // - 'left' in property access
                // - 'object' in indexed access
                // - target in rhs of import statement
                var ok = (node.parent.kind === ts.SyntaxKind.PropertyAccessExpression && node.parent.expression === node) ||
                    (node.parent.kind === ts.SyntaxKind.ElementAccessExpression && node.parent.expression === node) ||
                    ((node.kind === ts.SyntaxKind.Identifier || node.kind === ts.SyntaxKind.QualifiedName) && isInRightSideOfImportOrExportAssignment(node));
                if (!ok) {
                    error(node, ts.Diagnostics.const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment);
                }
            }
            return type;
        }
        function checkNumericLiteral(node) {
            // Grammar checking
            checkGrammarNumericLiteral(node);
            return concreteNumberType; // [ConcreteTypeScript]
        }
        function checkExpressionWorker(node, contextualMapper) {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier:
                    return checkIdentifier(node);
                case ts.SyntaxKind.ThisKeyword:
                    return checkThisExpression(node);
                case ts.SyntaxKind.SuperKeyword:
                    return checkSuperExpression(node);
                case ts.SyntaxKind.NullKeyword:
                    return nullType;
                case ts.SyntaxKind.TrueKeyword:
                case ts.SyntaxKind.FalseKeyword:
                    return createConcreteType(booleanType); // [ConcreteTypeScript]
                case ts.SyntaxKind.NumericLiteral:
                    return checkNumericLiteral(node);
                case ts.SyntaxKind.TemplateExpression:
                    return checkTemplateExpression(node);
                case ts.SyntaxKind.StringLiteral:
                case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                    return createConcreteType(stringType); // [ConcreteTypeScript]
                case ts.SyntaxKind.RegularExpressionLiteral:
                    return globalRegExpType;
                case ts.SyntaxKind.ArrayLiteralExpression:
                    return checkArrayLiteral(node, contextualMapper);
                case ts.SyntaxKind.ObjectLiteralExpression:
                    return checkObjectLiteral(node, contextualMapper);
                case ts.SyntaxKind.PropertyAccessExpression:
                    return checkPropertyAccessExpression(node);
                case ts.SyntaxKind.ElementAccessExpression:
                    return checkIndexedAccess(node);
                case ts.SyntaxKind.CallExpression:
                case ts.SyntaxKind.NewExpression:
                    return checkCallExpression(node);
                case ts.SyntaxKind.TaggedTemplateExpression:
                    return checkTaggedTemplateExpression(node);
                case ts.SyntaxKind.ParenthesizedExpression:
                    return checkExpression(node.expression, contextualMapper);
                case ts.SyntaxKind.ClassExpression:
                    return checkClassExpression(node);
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    return checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper);
                case ts.SyntaxKind.TypeOfExpression:
                    return checkTypeOfExpression(node);
                case ts.SyntaxKind.TypeAssertionExpression:
                case ts.SyntaxKind.AsExpression:
                    return checkAssertion(node);
                case ts.SyntaxKind.DeleteExpression:
                    return checkDeleteExpression(node);
                case ts.SyntaxKind.VoidExpression:
                    return checkVoidExpression(node);
                case ts.SyntaxKind.AwaitExpression:
                    return checkAwaitExpression(node);
                case ts.SyntaxKind.PrefixUnaryExpression:
                    return checkPrefixUnaryExpression(node);
                case ts.SyntaxKind.PostfixUnaryExpression:
                    return checkPostfixUnaryExpression(node);
                case ts.SyntaxKind.BinaryExpression:
                    return checkBinaryExpression(node, contextualMapper);
                case ts.SyntaxKind.ConditionalExpression:
                    return checkConditionalExpression(node, contextualMapper);
                case ts.SyntaxKind.SpreadElementExpression:
                    return checkSpreadElementExpression(node, contextualMapper);
                case ts.SyntaxKind.OmittedExpression:
                    return undefinedType;
                case ts.SyntaxKind.YieldExpression:
                    return checkYieldExpression(node);
                case ts.SyntaxKind.JsxExpression:
                    return checkJsxExpression(node);
                case ts.SyntaxKind.JsxElement:
                    return checkJsxElement(node);
                case ts.SyntaxKind.JsxSelfClosingElement:
                    return checkJsxSelfClosingElement(node);
                case ts.SyntaxKind.JsxOpeningElement:
                    ts.Debug.fail("Shouldn't ever directly check a JsxOpeningElement");
            }
            return unknownType;
        }
        // DECLARATION AND STATEMENT TYPE CHECKING
        function checkTypeParameter(node) {
            // Grammar Checking
            if (node.expression) {
                grammarErrorOnFirstToken(node.expression, ts.Diagnostics.Type_expected);
            }
            checkSourceElement(node.constraint);
            if (produceDiagnostics) {
                checkTypeParameterHasIllegalReferencesInConstraint(node);
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Type_parameter_name_cannot_be_0);
            }
            // TODO: Check multiple declarations are identical
        }
        function checkParameter(node) {
            // Grammar checking
            // It is a SyntaxError if the Identifier "eval" or the Identifier "arguments" occurs as the
            // Identifier in a PropertySetParameterList of a PropertyAssignment that is contained in strict code
            // or if its FunctionBody is strict code(11.1.5).
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            checkVariableLikeDeclaration(node);
            var func = ts.getContainingFunction(node);
            if (node.flags & ts.NodeFlags.AccessibilityModifier) {
                func = ts.getContainingFunction(node);
                if (!(func.kind === ts.SyntaxKind.Constructor && ts.nodeIsPresent(func.body))) {
                    error(node, ts.Diagnostics.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
                }
            }
            if (node.questionToken && ts.isBindingPattern(node.name) && func.body) {
                error(node, ts.Diagnostics.A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature);
            }
            // Only check rest parameter type if it's not a binding pattern. Since binding patterns are
            // not allowed in a rest parameter, we already have an error from checkGrammarParameterList.
            if (node.dotDotDotToken && !ts.isBindingPattern(node.name) && !isArrayType(getTypeOfSymbol(node.symbol))) {
                error(node, ts.Diagnostics.A_rest_parameter_must_be_of_an_array_type);
            }
        }
        function isSyntacticallyValidGenerator(node) {
            if (!node.asteriskToken || !node.body) {
                return false;
            }
            return node.kind === ts.SyntaxKind.MethodDeclaration ||
                node.kind === ts.SyntaxKind.FunctionDeclaration ||
                node.kind === ts.SyntaxKind.FunctionExpression;
        }
        function getTypePredicateParameterIndex(parameterList, parameter) {
            if (parameterList) {
                for (var i = 0; i < parameterList.length; i++) {
                    var param = parameterList[i];
                    if (param.name.kind === ts.SyntaxKind.Identifier &&
                        param.name.text === parameter.text) {
                        return i;
                    }
                }
            }
            return -1;
        }
        function isInLegalTypePredicatePosition(node) {
            switch (node.parent.kind) {
                case ts.SyntaxKind.ArrowFunction:
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    return node === node.parent.type;
            }
            return false;
        }
        function checkSignatureDeclaration(node) {
            // Grammar checking
            if (node.kind === ts.SyntaxKind.IndexSignature) {
                checkGrammarIndexSignature(node);
            }
            else if (node.kind === ts.SyntaxKind.FunctionType || node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.ConstructorType ||
                node.kind === ts.SyntaxKind.CallSignature || node.kind === ts.SyntaxKind.Constructor ||
                node.kind === ts.SyntaxKind.ConstructSignature) {
                checkGrammarFunctionLikeDeclaration(node);
            }
            checkTypeParameters(node.typeParameters);
            ts.forEach(node.parameters, checkParameter);
            if (node.type) {
                if (node.type.kind === ts.SyntaxKind.TypePredicate) {
                    var typePredicate = getSignatureFromDeclaration(node).typePredicate;
                    var typePredicateNode = node.type;
                    if (isInLegalTypePredicatePosition(typePredicateNode)) {
                        if (typePredicate.parameterIndex >= 0) {
                            if (node.parameters[typePredicate.parameterIndex].dotDotDotToken) {
                                error(typePredicateNode.parameterName, ts.Diagnostics.A_type_predicate_cannot_reference_a_rest_parameter);
                            }
                            else {
                                checkTypeAssignableTo(typePredicate.type, getTypeOfNode(node.parameters[typePredicate.parameterIndex]), typePredicateNode.type);
                            }
                        }
                        else if (typePredicateNode.parameterName) {
                            var hasReportedError = false;
                            for (var _i = 0, _a = node.parameters; _i < _a.length; _i++) {
                                var param = _a[_i];
                                if (hasReportedError) {
                                    break;
                                }
                                if (param.name.kind === ts.SyntaxKind.ObjectBindingPattern ||
                                    param.name.kind === ts.SyntaxKind.ArrayBindingPattern) {
                                    (function checkBindingPattern(pattern) {
                                        for (var _i = 0, _a = pattern.elements; _i < _a.length; _i++) {
                                            var element = _a[_i];
                                            if (element.name.kind === ts.SyntaxKind.Identifier &&
                                                element.name.text === typePredicate.parameterName) {
                                                error(typePredicateNode.parameterName, ts.Diagnostics.A_type_predicate_cannot_reference_element_0_in_a_binding_pattern, typePredicate.parameterName);
                                                hasReportedError = true;
                                                break;
                                            }
                                            else if (element.name.kind === ts.SyntaxKind.ArrayBindingPattern ||
                                                element.name.kind === ts.SyntaxKind.ObjectBindingPattern) {
                                                checkBindingPattern(element.name);
                                            }
                                        }
                                    })(param.name);
                                }
                            }
                            if (!hasReportedError) {
                                error(typePredicateNode.parameterName, ts.Diagnostics.Cannot_find_parameter_0, typePredicate.parameterName);
                            }
                        }
                    }
                    else {
                        error(typePredicateNode, ts.Diagnostics.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
                    }
                }
                else {
                    checkSourceElement(node.type);
                }
            }
            if (produceDiagnostics) {
                checkCollisionWithArgumentsInGeneratedCode(node);
                if (compilerOptions.noImplicitAny && !node.type) {
                    switch (node.kind) {
                        case ts.SyntaxKind.ConstructSignature:
                            error(node, ts.Diagnostics.Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
                            break;
                        case ts.SyntaxKind.CallSignature:
                            error(node, ts.Diagnostics.Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
                            break;
                    }
                }
                if (node.type) {
                    if (languageVersion >= ts.ScriptTarget.ES6 && isSyntacticallyValidGenerator(node)) {
                        var returnType = getTypeFromTypeNode(node.type);
                        if (returnType === voidType) {
                            error(node.type, ts.Diagnostics.A_generator_cannot_have_a_void_type_annotation);
                        }
                        else {
                            var generatorElementType = getElementTypeOfIterableIterator(returnType) || anyType;
                            var iterableIteratorInstantiation = createIterableIteratorType(generatorElementType);
                            // Naively, one could check that IterableIterator<any> is assignable to the return type annotation.
                            // However, that would not catch the error in the following case.
                            //
                            //    interface BadGenerator extends Iterable<number>, Iterator<string> { }
                            //    function* g(): BadGenerator { } // Iterable and Iterator have different types!
                            //
                            checkTypeAssignableTo(iterableIteratorInstantiation, returnType, node.type);
                        }
                    }
                }
            }
            checkSpecializedSignatureDeclaration(node);
        }
        function checkTypeForDuplicateIndexSignatures(node) {
            if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
                var nodeSymbol = getSymbolOfNode(node);
                // in case of merging interface declaration it is possible that we'll enter this check procedure several times for every declaration
                // to prevent this run check only for the first declaration of a given kind
                if (nodeSymbol.declarations.length > 0 && nodeSymbol.declarations[0] !== node) {
                    return;
                }
            }
            // TypeScript 1.0 spec (April 2014)
            // 3.7.4: An object type can contain at most one string index signature and one numeric index signature.
            // 8.5: A class declaration can have at most one string index member declaration and one numeric index member declaration
            var indexSymbol = getIndexSymbol(getSymbolOfNode(node));
            if (indexSymbol) {
                var seenNumericIndexer = false;
                var seenStringIndexer = false;
                for (var _i = 0, _a = indexSymbol.declarations; _i < _a.length; _i++) {
                    var decl = _a[_i];
                    var declaration = decl;
                    if (declaration.parameters.length === 1 && declaration.parameters[0].type) {
                        switch (declaration.parameters[0].type.kind) {
                            case ts.SyntaxKind.StringKeyword:
                                if (!seenStringIndexer) {
                                    seenStringIndexer = true;
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Duplicate_string_index_signature);
                                }
                                break;
                            case ts.SyntaxKind.NumberKeyword:
                                if (!seenNumericIndexer) {
                                    seenNumericIndexer = true;
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Duplicate_number_index_signature);
                                }
                                break;
                        }
                    }
                }
            }
        }
        function checkPropertyDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarProperty(node) || checkGrammarComputedPropertyName(node.name);
            checkVariableLikeDeclaration(node);
        }
        function checkMethodDeclaration(node) {
            // Grammar checking
            checkGrammarMethod(node) || checkGrammarComputedPropertyName(node.name);
            // Grammar checking for modifiers is done inside the function checkGrammarFunctionLikeDeclaration
            checkFunctionLikeDeclaration(node);
            // Abstract methods cannot have an implementation.
            // Extra checks are to avoid reporting multiple errors relating to the "abstractness" of the node.
            if (node.flags & ts.NodeFlags.Abstract && node.body) {
                error(node, ts.Diagnostics.Method_0_cannot_have_an_implementation_because_it_is_marked_abstract, ts.declarationNameToString(node.name));
            }
        }
        function checkConstructorDeclaration(node) {
            // Grammar check on signature of constructor and modifier of the constructor is done in checkSignatureDeclaration function.
            checkSignatureDeclaration(node);
            // Grammar check for checking only related to constructoDeclaration
            checkGrammarConstructorTypeParameters(node) || checkGrammarConstructorTypeAnnotation(node);
            checkSourceElement(node.body);
            var symbol = getSymbolOfNode(node);
            var firstDeclaration = ts.getDeclarationOfKind(symbol, node.kind);
            // Only type check the symbol once
            if (node === firstDeclaration) {
                checkFunctionOrConstructorSymbol(symbol);
            }
            // exit early in the case of signature - super checks are not relevant to them
            if (ts.nodeIsMissing(node.body)) {
                return;
            }
            if (!produceDiagnostics) {
                return;
            }
            function isSuperCallExpression(n) {
                return n.kind === ts.SyntaxKind.CallExpression && n.expression.kind === ts.SyntaxKind.SuperKeyword;
            }
            function containsSuperCallAsComputedPropertyName(n) {
                return n.name && containsSuperCall(n.name);
            }
            function containsSuperCall(n) {
                if (isSuperCallExpression(n)) {
                    return true;
                }
                else if (ts.isFunctionLike(n)) {
                    return false;
                }
                else if (ts.isClassLike(n)) {
                    return ts.forEach(n.members, containsSuperCallAsComputedPropertyName);
                }
                return ts.forEachChild(n, containsSuperCall);
            }
            function markThisReferencesAsErrors(n) {
                if (n.kind === ts.SyntaxKind.ThisKeyword) {
                    error(n, ts.Diagnostics.this_cannot_be_referenced_in_current_location);
                }
                else if (n.kind !== ts.SyntaxKind.FunctionExpression && n.kind !== ts.SyntaxKind.FunctionDeclaration) {
                    ts.forEachChild(n, markThisReferencesAsErrors);
                }
            }
            function isInstancePropertyWithInitializer(n) {
                return n.kind === ts.SyntaxKind.PropertyDeclaration &&
                    !(n.flags & ts.NodeFlags.Static) &&
                    !!n.initializer;
            }
            // TS 1.0 spec (April 2014): 8.3.2
            // Constructors of classes with no extends clause may not contain super calls, whereas
            // constructors of derived classes must contain at least one super call somewhere in their function body.
            var containingClassDecl = node.parent;
            if (ts.getClassExtendsHeritageClauseElement(containingClassDecl)) {
                var containingClassSymbol = getSymbolOfNode(containingClassDecl);
                var containingClassInstanceType = getDeclaredTypeOfSymbol(containingClassSymbol);
                var baseConstructorType = getBaseConstructorTypeOfClass(containingClassInstanceType);
                if (containsSuperCall(node.body)) {
                    if (baseConstructorType === nullType) {
                        error(node, ts.Diagnostics.A_constructor_cannot_contain_a_super_call_when_its_class_extends_null);
                    }
                    // The first statement in the body of a constructor (excluding prologue directives) must be a super call
                    // if both of the following are true:
                    // - The containing class is a derived class.
                    // - The constructor declares parameter properties
                    //   or the containing class declares instance member variables with initializers.
                    var superCallShouldBeFirst = ts.forEach(node.parent.members, isInstancePropertyWithInitializer) ||
                        ts.forEach(node.parameters, function (p) { return p.flags & (ts.NodeFlags.Public | ts.NodeFlags.Private | ts.NodeFlags.Protected); });
                    // Skip past any prologue directives to find the first statement
                    // to ensure that it was a super call.
                    if (superCallShouldBeFirst) {
                        var statements = node.body.statements;
                        var superCallStatement;
                        for (var _i = 0; _i < statements.length; _i++) {
                            var statement = statements[_i];
                            if (statement.kind === ts.SyntaxKind.ExpressionStatement && isSuperCallExpression(statement.expression)) {
                                superCallStatement = statement;
                                break;
                            }
                            if (!ts.isPrologueDirective(statement)) {
                                break;
                            }
                        }
                        if (!superCallStatement) {
                            error(node, ts.Diagnostics.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_or_has_parameter_properties);
                        }
                        else {
                            // In such a required super call, it is a compile-time error for argument expressions to reference this.
                            markThisReferencesAsErrors(superCallStatement.expression);
                        }
                    }
                }
                else if (baseConstructorType !== nullType) {
                    error(node, ts.Diagnostics.Constructors_for_derived_classes_must_contain_a_super_call);
                }
            }
        }
        function checkAccessorDeclaration(node) {
            if (produceDiagnostics) {
                // Grammar checking accessors
                checkGrammarFunctionLikeDeclaration(node) || checkGrammarAccessor(node) || checkGrammarComputedPropertyName(node.name);
                if (node.kind === ts.SyntaxKind.GetAccessor) {
                    if (!ts.isInAmbientContext(node) && ts.nodeIsPresent(node.body) && !(bodyContainsAReturnStatement(node.body) || bodyContainsSingleThrowStatement(node.body))) {
                        error(node.name, ts.Diagnostics.A_get_accessor_must_return_a_value_or_consist_of_a_single_throw_statement);
                    }
                }
                if (!ts.hasDynamicName(node)) {
                    // TypeScript 1.0 spec (April 2014): 8.4.3
                    // Accessors for the same member name must specify the same accessibility.
                    var otherKind = node.kind === ts.SyntaxKind.GetAccessor ? ts.SyntaxKind.SetAccessor : ts.SyntaxKind.GetAccessor;
                    var otherAccessor = ts.getDeclarationOfKind(node.symbol, otherKind);
                    if (otherAccessor) {
                        if (((node.flags & ts.NodeFlags.AccessibilityModifier) !== (otherAccessor.flags & ts.NodeFlags.AccessibilityModifier))) {
                            error(node.name, ts.Diagnostics.Getter_and_setter_accessors_do_not_agree_in_visibility);
                        }
                        var currentAccessorType = getAnnotatedAccessorType(node);
                        var otherAccessorType = getAnnotatedAccessorType(otherAccessor);
                        // TypeScript 1.0 spec (April 2014): 4.5
                        // If both accessors include type annotations, the specified types must be identical.
                        if (currentAccessorType && otherAccessorType) {
                            if (!isTypeIdenticalTo(currentAccessorType, otherAccessorType)) {
                                error(node, ts.Diagnostics.get_and_set_accessor_must_have_the_same_type);
                            }
                        }
                    }
                }
                getTypeOfAccessors(getSymbolOfNode(node));
            }
            checkFunctionLikeDeclaration(node);
        }
        function checkMissingDeclaration(node) {
            checkDecorators(node);
        }
        function checkTypeArgumentConstraints(typeParameters, typeArguments) {
            var result = true;
            for (var i = 0; i < typeParameters.length; i++) {
                var constraint = getConstraintOfTypeParameter(typeParameters[i]);
                if (constraint) {
                    var typeArgument = typeArguments[i];
                    result = result && checkTypeAssignableTo(getTypeFromTypeNode(typeArgument), constraint, typeArgument, ts.Diagnostics.Type_0_does_not_satisfy_the_constraint_1);
                }
            }
            return result;
        }
        function checkTypeReferenceNode(node) {
            checkGrammarTypeArguments(node, node.typeArguments);
            var type = getTypeFromTypeReference(node);
            if (type !== unknownType && node.typeArguments) {
                // Do type argument local checks only if referenced type is successfully resolved
                ts.forEach(node.typeArguments, checkSourceElement);
                if (produceDiagnostics) {
                    var symbol = getNodeLinks(node).resolvedSymbol;
                    var typeParameters = symbol.flags & ts.SymbolFlags.TypeAlias ? getSymbolLinks(symbol).typeParameters : type.target.localTypeParameters;
                    checkTypeArgumentConstraints(typeParameters, node.typeArguments);
                }
            }
        }
        function checkTypeQuery(node) {
            getTypeFromTypeQueryNode(node);
        }
        function checkTypeLiteral(node) {
            ts.forEach(node.members, checkSourceElement);
            if (produceDiagnostics) {
                var type = getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
                checkIndexConstraints(type);
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        function checkArrayType(node) {
            checkSourceElement(node.elementType);
        }
        function checkTupleType(node) {
            // Grammar checking
            var hasErrorFromDisallowedTrailingComma = checkGrammarForDisallowedTrailingComma(node.elementTypes);
            if (!hasErrorFromDisallowedTrailingComma && node.elementTypes.length === 0) {
                grammarErrorOnNode(node, ts.Diagnostics.A_tuple_type_element_list_cannot_be_empty);
            }
            ts.forEach(node.elementTypes, checkSourceElement);
        }
        function checkUnionOrIntersectionType(node) {
            ts.forEach(node.types, checkSourceElement);
        }
        function isPrivateWithinAmbient(node) {
            return (node.flags & ts.NodeFlags.Private) && ts.isInAmbientContext(node);
        }
        function checkSpecializedSignatureDeclaration(signatureDeclarationNode) {
            if (!produceDiagnostics) {
                return;
            }
            var signature = getSignatureFromDeclaration(signatureDeclarationNode);
            if (!signature.hasStringLiterals) {
                return;
            }
            // TypeScript 1.0 spec (April 2014): 3.7.2.2
            // Specialized signatures are not permitted in conjunction with a function body
            if (ts.nodeIsPresent(signatureDeclarationNode.body)) {
                error(signatureDeclarationNode, ts.Diagnostics.A_signature_with_an_implementation_cannot_use_a_string_literal_type);
                return;
            }
            // TypeScript 1.0 spec (April 2014): 3.7.2.4
            // Every specialized call or construct signature in an object type must be assignable
            // to at least one non-specialized call or construct signature in the same object type
            var signaturesToCheck;
            // Unnamed (call\construct) signatures in interfaces are inherited and not shadowed so examining just node symbol won't give complete answer.
            // Use declaring type to obtain full list of signatures.
            if (!signatureDeclarationNode.name && signatureDeclarationNode.parent && signatureDeclarationNode.parent.kind === ts.SyntaxKind.InterfaceDeclaration) {
                ts.Debug.assert(signatureDeclarationNode.kind === ts.SyntaxKind.CallSignature || signatureDeclarationNode.kind === ts.SyntaxKind.ConstructSignature);
                var signatureKind = signatureDeclarationNode.kind === ts.SyntaxKind.CallSignature ? ts.SignatureKind.Call : ts.SignatureKind.Construct;
                var containingSymbol = getSymbolOfNode(signatureDeclarationNode.parent);
                var containingType = getDeclaredTypeOfSymbol(containingSymbol);
                signaturesToCheck = getSignaturesOfType(containingType, signatureKind);
            }
            else {
                signaturesToCheck = getSignaturesOfSymbol(getSymbolOfNode(signatureDeclarationNode));
            }
            for (var _i = 0; _i < signaturesToCheck.length; _i++) {
                var otherSignature = signaturesToCheck[_i];
                if (!otherSignature.hasStringLiterals && isSignatureAssignableTo(signature, otherSignature)) {
                    return;
                }
            }
            error(signatureDeclarationNode, ts.Diagnostics.Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature);
        }
        function getEffectiveDeclarationFlags(n, flagsToCheck) {
            var flags = ts.getCombinedNodeFlags(n);
            if (n.parent.kind !== ts.SyntaxKind.InterfaceDeclaration && ts.isInAmbientContext(n)) {
                if (!(flags & ts.NodeFlags.Ambient)) {
                    // It is nested in an ambient context, which means it is automatically exported
                    flags |= ts.NodeFlags.Export;
                }
                flags |= ts.NodeFlags.Ambient;
            }
            return flags & flagsToCheck;
        }
        function checkFunctionOrConstructorSymbol(symbol) {
            if (!produceDiagnostics) {
                return;
            }
            function getCanonicalOverload(overloads, implementation) {
                // Consider the canonical set of flags to be the flags of the bodyDeclaration or the first declaration
                // Error on all deviations from this canonical set of flags
                // The caveat is that if some overloads are defined in lib.d.ts, we don't want to
                // report the errors on those. To achieve this, we will say that the implementation is
                // the canonical signature only if it is in the same container as the first overload
                var implementationSharesContainerWithFirstOverload = implementation !== undefined && implementation.parent === overloads[0].parent;
                return implementationSharesContainerWithFirstOverload ? implementation : overloads[0];
            }
            function checkFlagAgreementBetweenOverloads(overloads, implementation, flagsToCheck, someOverloadFlags, allOverloadFlags) {
                // Error if some overloads have a flag that is not shared by all overloads. To find the
                // deviations, we XOR someOverloadFlags with allOverloadFlags
                var someButNotAllOverloadFlags = someOverloadFlags ^ allOverloadFlags;
                if (someButNotAllOverloadFlags !== 0) {
                    var canonicalFlags = getEffectiveDeclarationFlags(getCanonicalOverload(overloads, implementation), flagsToCheck);
                    ts.forEach(overloads, function (o) {
                        var deviation = getEffectiveDeclarationFlags(o, flagsToCheck) ^ canonicalFlags;
                        if (deviation & ts.NodeFlags.Export) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_exported_or_not_exported);
                        }
                        else if (deviation & ts.NodeFlags.Ambient) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_ambient_or_non_ambient);
                        }
                        else if (deviation & (ts.NodeFlags.Private | ts.NodeFlags.Protected)) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_public_private_or_protected);
                        }
                        else if (deviation & ts.NodeFlags.Abstract) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_abstract_or_not_abstract);
                        }
                    });
                }
            }
            function checkQuestionTokenAgreementBetweenOverloads(overloads, implementation, someHaveQuestionToken, allHaveQuestionToken) {
                if (someHaveQuestionToken !== allHaveQuestionToken) {
                    var canonicalHasQuestionToken = ts.hasQuestionToken(getCanonicalOverload(overloads, implementation));
                    ts.forEach(overloads, function (o) {
                        var deviation = ts.hasQuestionToken(o) !== canonicalHasQuestionToken;
                        if (deviation) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_optional_or_required);
                        }
                    });
                }
            }
            var flagsToCheck = ts.NodeFlags.Export | ts.NodeFlags.Ambient | ts.NodeFlags.Private | ts.NodeFlags.Protected | ts.NodeFlags.Abstract;
            var someNodeFlags = 0;
            var allNodeFlags = flagsToCheck;
            var someHaveQuestionToken = false;
            var allHaveQuestionToken = true;
            var hasOverloads = false;
            var bodyDeclaration;
            var lastSeenNonAmbientDeclaration;
            var previousDeclaration;
            var declarations = symbol.declarations;
            var isConstructor = (symbol.flags & ts.SymbolFlags.Constructor) !== 0;
            function reportImplementationExpectedError(node) {
                if (node.name && ts.nodeIsMissing(node.name)) {
                    return;
                }
                var seen = false;
                var subsequentNode = ts.forEachChild(node.parent, function (c) {
                    if (seen) {
                        return c;
                    }
                    else {
                        seen = c === node;
                    }
                });
                if (subsequentNode) {
                    if (subsequentNode.kind === node.kind) {
                        var errorNode_1 = subsequentNode.name || subsequentNode;
                        // TODO(jfreeman): These are methods, so handle computed name case
                        if (node.name && subsequentNode.name && node.name.text === subsequentNode.name.text) {
                            // the only situation when this is possible (same kind\same name but different symbol) - mixed static and instance class members
                            ts.Debug.assert(node.kind === ts.SyntaxKind.MethodDeclaration || node.kind === ts.SyntaxKind.MethodSignature);
                            ts.Debug.assert((node.flags & ts.NodeFlags.Static) !== (subsequentNode.flags & ts.NodeFlags.Static));
                            var diagnostic = node.flags & ts.NodeFlags.Static ? ts.Diagnostics.Function_overload_must_be_static : ts.Diagnostics.Function_overload_must_not_be_static;
                            error(errorNode_1, diagnostic);
                            return;
                        }
                        else if (ts.nodeIsPresent(subsequentNode.body)) {
                            error(errorNode_1, ts.Diagnostics.Function_implementation_name_must_be_0, ts.declarationNameToString(node.name));
                            return;
                        }
                    }
                }
                var errorNode = node.name || node;
                if (isConstructor) {
                    error(errorNode, ts.Diagnostics.Constructor_implementation_is_missing);
                }
                else {
                    // Report different errors regarding non-consecutive blocks of declarations depending on whether
                    // the node in question is abstract.
                    if (node.flags & ts.NodeFlags.Abstract) {
                        error(errorNode, ts.Diagnostics.All_declarations_of_an_abstract_method_must_be_consecutive);
                    }
                    else {
                        error(errorNode, ts.Diagnostics.Function_implementation_is_missing_or_not_immediately_following_the_declaration);
                    }
                }
            }
            // when checking exported function declarations across modules check only duplicate implementations
            // names and consistency of modifiers are verified when we check local symbol
            var isExportSymbolInsideModule = symbol.parent && symbol.parent.flags & ts.SymbolFlags.Module;
            var duplicateFunctionDeclaration = false;
            var multipleConstructorImplementation = false;
            for (var _i = 0; _i < declarations.length; _i++) {
                var current = declarations[_i];
                var node = current;
                var inAmbientContext = ts.isInAmbientContext(node);
                var inAmbientContextOrInterface = node.parent.kind === ts.SyntaxKind.InterfaceDeclaration || node.parent.kind === ts.SyntaxKind.TypeLiteral || inAmbientContext;
                if (inAmbientContextOrInterface) {
                    // check if declarations are consecutive only if they are non-ambient
                    // 1. ambient declarations can be interleaved
                    // i.e. this is legal
                    //     declare function foo();
                    //     declare function bar();
                    //     declare function foo();
                    // 2. mixing ambient and non-ambient declarations is a separate error that will be reported - do not want to report an extra one
                    previousDeclaration = undefined;
                }
                if (node.kind === ts.SyntaxKind.FunctionDeclaration || node.kind === ts.SyntaxKind.MethodDeclaration || node.kind === ts.SyntaxKind.MethodSignature || node.kind === ts.SyntaxKind.Constructor) {
                    var currentNodeFlags = getEffectiveDeclarationFlags(node, flagsToCheck);
                    someNodeFlags |= currentNodeFlags;
                    allNodeFlags &= currentNodeFlags;
                    someHaveQuestionToken = someHaveQuestionToken || ts.hasQuestionToken(node);
                    allHaveQuestionToken = allHaveQuestionToken && ts.hasQuestionToken(node);
                    if (ts.nodeIsPresent(node.body) && bodyDeclaration) {
                        if (isConstructor) {
                            multipleConstructorImplementation = true;
                        }
                        else {
                            duplicateFunctionDeclaration = true;
                        }
                    }
                    else if (!isExportSymbolInsideModule && previousDeclaration && previousDeclaration.parent === node.parent && previousDeclaration.end !== node.pos) {
                        reportImplementationExpectedError(previousDeclaration);
                    }
                    if (ts.nodeIsPresent(node.body)) {
                        if (!bodyDeclaration) {
                            bodyDeclaration = node;
                        }
                    }
                    else {
                        hasOverloads = true;
                    }
                    previousDeclaration = node;
                    if (!inAmbientContextOrInterface) {
                        lastSeenNonAmbientDeclaration = node;
                    }
                }
            }
            if (multipleConstructorImplementation) {
                ts.forEach(declarations, function (declaration) {
                    error(declaration, ts.Diagnostics.Multiple_constructor_implementations_are_not_allowed);
                });
            }
            if (duplicateFunctionDeclaration) {
                ts.forEach(declarations, function (declaration) {
                    error(declaration.name, ts.Diagnostics.Duplicate_function_implementation);
                });
            }
            // Abstract methods can't have an implementation -- in particular, they don't need one.
            if (!isExportSymbolInsideModule && lastSeenNonAmbientDeclaration && !lastSeenNonAmbientDeclaration.body &&
                !(lastSeenNonAmbientDeclaration.flags & ts.NodeFlags.Abstract)) {
                reportImplementationExpectedError(lastSeenNonAmbientDeclaration);
            }
            if (hasOverloads) {
                checkFlagAgreementBetweenOverloads(declarations, bodyDeclaration, flagsToCheck, someNodeFlags, allNodeFlags);
                checkQuestionTokenAgreementBetweenOverloads(declarations, bodyDeclaration, someHaveQuestionToken, allHaveQuestionToken);
                if (bodyDeclaration) {
                    var signatures = getSignaturesOfSymbol(symbol);
                    var bodySignature = getSignatureFromDeclaration(bodyDeclaration);
                    // If the implementation signature has string literals, we will have reported an error in
                    // checkSpecializedSignatureDeclaration
                    if (!bodySignature.hasStringLiterals) {
                        // TypeScript 1.0 spec (April 2014): 6.1
                        // If a function declaration includes overloads, the overloads determine the call
                        // signatures of the type given to the function object
                        // and the function implementation signature must be assignable to that type
                        //
                        // TypeScript 1.0 spec (April 2014): 3.8.4
                        // Note that specialized call and construct signatures (section 3.7.2.4) are not significant when determining assignment compatibility
                        // Consider checking against specialized signatures too. Not doing so creates a type hole:
                        //
                        // function g(x: "hi", y: boolean);
                        // function g(x: string, y: {});
                        // function g(x: string, y: string) { }
                        //
                        // The implementation is completely unrelated to the specialized signature, yet we do not check this.
                        for (var _a = 0; _a < signatures.length; _a++) {
                            var signature = signatures[_a];
                            if (!signature.hasStringLiterals && !isSignatureAssignableTo(bodySignature, signature)) {
                                error(signature.declaration, ts.Diagnostics.Overload_signature_is_not_compatible_with_function_implementation);
                                break;
                            }
                        }
                    }
                }
            }
        }
        function checkExportsOnMergedDeclarations(node) {
            if (!produceDiagnostics) {
                return;
            }
            // if localSymbol is defined on node then node itself is exported - check is required
            var symbol = node.localSymbol;
            if (!symbol) {
                // local symbol is undefined => this declaration is non-exported.
                // however symbol might contain other declarations that are exported
                symbol = getSymbolOfNode(node);
                if (!(symbol.flags & ts.SymbolFlags.Export)) {
                    // this is a pure local symbol (all declarations are non-exported) - no need to check anything
                    return;
                }
            }
            // run the check only for the first declaration in the list
            if (ts.getDeclarationOfKind(symbol, node.kind) !== node) {
                return;
            }
            // we use SymbolFlags.ExportValue, SymbolFlags.ExportType and SymbolFlags.ExportNamespace
            // to denote disjoint declarationSpaces (without making new enum type).
            var exportedDeclarationSpaces = ts.SymbolFlags.None;
            var nonExportedDeclarationSpaces = ts.SymbolFlags.None;
            var defaultExportedDeclarationSpaces = ts.SymbolFlags.None;
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var d = _a[_i];
                var declarationSpaces = getDeclarationSpaces(d);
                var effectiveDeclarationFlags = getEffectiveDeclarationFlags(d, ts.NodeFlags.Export | ts.NodeFlags.Default);
                if (effectiveDeclarationFlags & ts.NodeFlags.Export) {
                    if (effectiveDeclarationFlags & ts.NodeFlags.Default) {
                        defaultExportedDeclarationSpaces |= declarationSpaces;
                    }
                    else {
                        exportedDeclarationSpaces |= declarationSpaces;
                    }
                }
                else {
                    nonExportedDeclarationSpaces |= declarationSpaces;
                }
            }
            // Spaces for anyting not declared a 'default export'.
            var nonDefaultExportedDeclarationSpaces = exportedDeclarationSpaces | nonExportedDeclarationSpaces;
            var commonDeclarationSpacesForExportsAndLocals = exportedDeclarationSpaces & nonExportedDeclarationSpaces;
            var commonDeclarationSpacesForDefaultAndNonDefault = defaultExportedDeclarationSpaces & nonDefaultExportedDeclarationSpaces;
            if (commonDeclarationSpacesForExportsAndLocals || commonDeclarationSpacesForDefaultAndNonDefault) {
                // declaration spaces for exported and non-exported declarations intersect
                for (var _b = 0, _c = symbol.declarations; _b < _c.length; _b++) {
                    var d = _c[_b];
                    var declarationSpaces = getDeclarationSpaces(d);
                    // Only error on the declarations that conributed to the intersecting spaces.
                    if (declarationSpaces & commonDeclarationSpacesForDefaultAndNonDefault) {
                        error(d.name, ts.Diagnostics.Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead, ts.declarationNameToString(d.name));
                    }
                    else if (declarationSpaces & commonDeclarationSpacesForExportsAndLocals) {
                        error(d.name, ts.Diagnostics.Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local, ts.declarationNameToString(d.name));
                    }
                }
            }
            function getDeclarationSpaces(d) {
                switch (d.kind) {
                    case ts.SyntaxKind.InterfaceDeclaration:
                        return ts.SymbolFlags.ExportType;
                    case ts.SyntaxKind.ModuleDeclaration:
                        return d.name.kind === ts.SyntaxKind.StringLiteral || ts.getModuleInstanceState(d) !== ts.ModuleInstanceState.NonInstantiated
                            ? ts.SymbolFlags.ExportNamespace | ts.SymbolFlags.ExportValue
                            : ts.SymbolFlags.ExportNamespace;
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.BrandTypeDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                        return ts.SymbolFlags.ExportType | ts.SymbolFlags.ExportValue;
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                        var result = 0;
                        var target = resolveAlias(getSymbolOfNode(d));
                        ts.forEach(target.declarations, function (d) { result |= getDeclarationSpaces(d); });
                        return result;
                    default:
                        return ts.SymbolFlags.ExportValue;
                }
            }
        }
        function checkNonThenableType(type, location, message) {
            if (!(type.flags & ts.TypeFlags.Any) && isTypeAssignableTo(type, getGlobalThenableType())) {
                if (location) {
                    if (!message) {
                        message = ts.Diagnostics.Operand_for_await_does_not_have_a_valid_callable_then_member;
                    }
                    error(location, message);
                }
                return unknownType;
            }
            return type;
        }
        /**
          * Gets the "promised type" of a promise.
          * @param type The type of the promise.
          * @remarks The "promised type" of a type is the type of the "value" parameter of the "onfulfilled" callback.
          */
        function getPromisedType(promise) {
            //
            //  { // promise
            //      then( // thenFunction
            //          onfulfilled: ( // onfulfilledParameterType
            //              value: T // valueParameterType
            //          ) => any
            //      ): any;
            //  }
            //
            if (promise.flags & ts.TypeFlags.Any) {
                return undefined;
            }
            if ((promise.flags & ts.TypeFlags.Reference) && promise.target === tryGetGlobalPromiseType()) {
                return promise.typeArguments[0];
            }
            var globalPromiseLikeType = getInstantiatedGlobalPromiseLikeType();
            if (globalPromiseLikeType === emptyObjectType || !isTypeAssignableTo(promise, globalPromiseLikeType)) {
                return undefined;
            }
            var thenFunction = getTypeOfPropertyOfType(promise, "then");
            if (thenFunction && (thenFunction.flags & ts.TypeFlags.Any)) {
                return undefined;
            }
            var thenSignatures = thenFunction ? getSignaturesOfType(thenFunction, ts.SignatureKind.Call) : emptyArray;
            if (thenSignatures.length === 0) {
                return undefined;
            }
            var onfulfilledParameterType = getUnionType(ts.map(thenSignatures, getTypeOfFirstParameterOfSignature));
            if (onfulfilledParameterType.flags & ts.TypeFlags.Any) {
                return undefined;
            }
            var onfulfilledParameterSignatures = getSignaturesOfType(onfulfilledParameterType, ts.SignatureKind.Call);
            if (onfulfilledParameterSignatures.length === 0) {
                return undefined;
            }
            var valueParameterType = getUnionType(ts.map(onfulfilledParameterSignatures, getTypeOfFirstParameterOfSignature));
            return valueParameterType;
        }
        function getTypeOfFirstParameterOfSignature(signature) {
            return getTypeAtPosition(signature, 0);
        }
        /**
          * Gets the "awaited type" of a type.
          * @param type The type to await.
          * @remarks The "awaited type" of an expression is its "promised type" if the expression is a
          * Promise-like type; otherwise, it is the type of the expression. This is used to reflect
          * The runtime behavior of the `await` keyword.
          */
        function getAwaitedType(type) {
            return checkAwaitedType(type, /*location*/ undefined, /*message*/ undefined);
        }
        function checkAwaitedType(type, location, message) {
            return checkAwaitedTypeWorker(type);
            function checkAwaitedTypeWorker(type) {
                if (type.flags & ts.TypeFlags.Union) {
                    var types = [];
                    for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                        var constituentType = _a[_i];
                        types.push(checkAwaitedTypeWorker(constituentType));
                    }
                    return getUnionType(types);
                }
                else {
                    var promisedType = getPromisedType(type);
                    if (promisedType === undefined) {
                        // The type was not a PromiseLike, so it could not be unwrapped any further.
                        // As long as the type does not have a callable "then" property, it is
                        // safe to return the type; otherwise, an error will have been reported in
                        // the call to checkNonThenableType and we will return unknownType.
                        //
                        // An example of a non-promise "thenable" might be:
                        //
                        //  await { then(): void {} }
                        //
                        // The "thenable" does not match the minimal definition for a PromiseLike. When
                        // a Promise/A+-compatible or ES6 promise tries to adopt this value, the promise
                        // will never settle. We treat this as an error to help flag an early indicator
                        // of a runtime problem. If the user wants to return this value from an async
                        // function, they would need to wrap it in some other value. If they want it to
                        // be treated as a promise, they can cast to <any>.
                        return checkNonThenableType(type, location, message);
                    }
                    else {
                        if (type.id === promisedType.id || awaitedTypeStack.indexOf(promisedType.id) >= 0) {
                            // We have a bad actor in the form of a promise whose promised type is
                            // the same promise type, or a mutually recursive promise. Return the
                            // unknown type as we cannot guess the shape. If this were the actual
                            // case in the JavaScript, this Promise would never resolve.
                            //
                            // An example of a bad actor with a singly-recursive promise type might
                            // be:
                            //
                            //  interface BadPromise {
                            //      then(
                            //          onfulfilled: (value: BadPromise) => any,
                            //          onrejected: (error: any) => any): BadPromise;
                            //  }
                            //
                            // The above interface will pass the PromiseLike check, and return a
                            // promised type of `BadPromise`. Since this is a self reference, we
                            // don't want to keep recursing ad infinitum.
                            //
                            // An example of a bad actor in the form of a mutually-recursive
                            // promise type might be:
                            //
                            //  interface BadPromiseA {
                            //      then(
                            //          onfulfilled: (value: BadPromiseB) => any,
                            //          onrejected: (error: any) => any): BadPromiseB;
                            //  }
                            //
                            //  interface BadPromiseB {
                            //      then(
                            //          onfulfilled: (value: BadPromiseA) => any,
                            //          onrejected: (error: any) => any): BadPromiseA;
                            //  }
                            //
                            if (location) {
                                error(location, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method, symbolToString(type.symbol));
                            }
                            return unknownType;
                        }
                        // Keep track of the type we're about to unwrap to avoid bad recursive promise types.
                        // See the comments above for more information.
                        awaitedTypeStack.push(type.id);
                        var awaitedType = checkAwaitedTypeWorker(promisedType);
                        awaitedTypeStack.pop();
                        return awaitedType;
                    }
                }
            }
        }
        /**
          * Checks the return type of an async function to ensure it is a compatible
          * Promise implementation.
          * @param node The signature to check
          * @param returnType The return type for the function
          * @remarks
          * This checks that an async function has a valid Promise-compatible return type,
          * and returns the *awaited type* of the promise. An async function has a valid
          * Promise-compatible return type if the resolved value of the return type has a
          * construct signature that takes in an `initializer` function that in turn supplies
          * a `resolve` function as one of its arguments and results in an object with a
          * callable `then` signature.
          */
        function checkAsyncFunctionReturnType(node) {
            var globalPromiseConstructorLikeType = getGlobalPromiseConstructorLikeType();
            if (globalPromiseConstructorLikeType === emptyObjectType) {
                // If we couldn't resolve the global PromiseConstructorLike type we cannot verify
                // compatibility with __awaiter.
                return unknownType;
            }
            // As part of our emit for an async function, we will need to emit the entity name of
            // the return type annotation as an expression. To meet the necessary runtime semantics
            // for __awaiter, we must also check that the type of the declaration (e.g. the static
            // side or "constructor" of the promise type) is compatible `PromiseConstructorLike`.
            //
            // An example might be (from lib.es6.d.ts):
            //
            //  interface Promise<T> { ... }
            //  interface PromiseConstructor {
            //      new <T>(...): Promise<T>;
            //  }
            //  declare var Promise: PromiseConstructor;
            //
            // When an async function declares a return type annotation of `Promise<T>`, we
            // need to get the type of the `Promise` variable declaration above, which would
            // be `PromiseConstructor`.
            //
            // The same case applies to a class:
            //
            //  declare class Promise<T> {
            //      constructor(...);
            //      then<U>(...): Promise<U>;
            //  }
            //
            // When we get the type of the `Promise` symbol here, we get the type of the static
            // side of the `Promise` class, which would be `{ new <T>(...): Promise<T> }`.
            var promiseType = getTypeFromTypeNode(node.type);
            if (promiseType === unknownType && compilerOptions.isolatedModules) {
                // If we are compiling with isolatedModules, we may not be able to resolve the
                // type as a value. As such, we will just return unknownType;
                return unknownType;
            }
            var promiseConstructor = getMergedSymbol(promiseType.symbol);
            if (!promiseConstructor || !symbolIsValue(promiseConstructor)) {
                error(node, ts.Diagnostics.Type_0_is_not_a_valid_async_function_return_type, typeToString(promiseType));
                return unknownType;
            }
            // Validate the promise constructor type.
            var promiseConstructorType = getTypeOfSymbol(promiseConstructor);
            if (!checkTypeAssignableTo(promiseConstructorType, globalPromiseConstructorLikeType, node, ts.Diagnostics.Type_0_is_not_a_valid_async_function_return_type)) {
                return unknownType;
            }
            // Verify there is no local declaration that could collide with the promise constructor.
            var promiseName = ts.getEntityNameFromTypeNode(node.type);
            var root = getFirstIdentifier(promiseName);
            var rootSymbol = getSymbol(node.locals, root.text, ts.SymbolFlags.Value);
            if (rootSymbol) {
                error(rootSymbol.valueDeclaration, ts.Diagnostics.Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions, root.text, getFullyQualifiedName(promiseConstructor));
                return unknownType;
            }
            // Get and return the awaited type of the return type.
            return checkAwaitedType(promiseType, node, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
        }
        /** Check a decorator */
        function checkDecorator(node) {
            var signature = getResolvedSignature(node);
            var returnType = getReturnTypeOfSignature(signature);
            if (returnType.flags & ts.TypeFlags.Any) {
                return;
            }
            var expectedReturnType;
            var headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
            var errorInfo;
            switch (node.parent.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    var classSymbol = getSymbolOfNode(node.parent);
                    var classConstructorType = getTypeOfSymbol(classSymbol);
                    expectedReturnType = getUnionType([classConstructorType, voidType]);
                    break;
                case ts.SyntaxKind.Parameter:
                    expectedReturnType = voidType;
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any);
                    break;
                case ts.SyntaxKind.PropertyDeclaration:
                    expectedReturnType = voidType;
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.The_return_type_of_a_property_decorator_function_must_be_either_void_or_any);
                    break;
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    var methodType = getTypeOfNode(node.parent);
                    var descriptorType = createTypedPropertyDescriptorType(methodType);
                    expectedReturnType = getUnionType([descriptorType, voidType]);
                    break;
            }
            checkTypeAssignableTo(returnType, expectedReturnType, node, headMessage, errorInfo);
        }
        /** Checks a type reference node as an expression. */
        function checkTypeNodeAsExpression(node) {
            // When we are emitting type metadata for decorators, we need to try to check the type
            // as if it were an expression so that we can emit the type in a value position when we
            // serialize the type metadata.
            if (node && node.kind === ts.SyntaxKind.TypeReference) {
                var root = getFirstIdentifier(node.typeName);
                var meaning = root.parent.kind === ts.SyntaxKind.TypeReference ? ts.SymbolFlags.Type : ts.SymbolFlags.Namespace;
                // Resolve type so we know which symbol is referenced
                var rootSymbol = resolveName(root, root.text, meaning | ts.SymbolFlags.Alias, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined);
                // Resolved symbol is alias
                if (rootSymbol && rootSymbol.flags & ts.SymbolFlags.Alias) {
                    var aliasTarget = resolveAlias(rootSymbol);
                    // If alias has value symbol - mark alias as referenced
                    if (aliasTarget.flags & ts.SymbolFlags.Value && !isConstEnumOrConstEnumOnlyModule(resolveAlias(rootSymbol))) {
                        markAliasSymbolAsReferenced(rootSymbol);
                    }
                }
            }
        }
        /**
          * Checks the type annotation of an accessor declaration or property declaration as
          * an expression if it is a type reference to a type with a value declaration.
          */
        function checkTypeAnnotationAsExpression(node) {
            switch (node.kind) {
                case ts.SyntaxKind.PropertyDeclaration:
                    checkTypeNodeAsExpression(node.type);
                    break;
                case ts.SyntaxKind.Parameter:
                    checkTypeNodeAsExpression(node.type);
                    break;
                case ts.SyntaxKind.MethodDeclaration:
                    checkTypeNodeAsExpression(node.type);
                    break;
                case ts.SyntaxKind.GetAccessor:
                    checkTypeNodeAsExpression(node.type);
                    break;
                case ts.SyntaxKind.SetAccessor:
                    checkTypeNodeAsExpression(ts.getSetAccessorTypeAnnotationNode(node));
                    break;
            }
        }
        /** Checks the type annotation of the parameters of a function/method or the constructor of a class as expressions */
        function checkParameterTypeAnnotationsAsExpressions(node) {
            // ensure all type annotations with a value declaration are checked as an expression
            for (var _i = 0, _a = node.parameters; _i < _a.length; _i++) {
                var parameter = _a[_i];
                checkTypeAnnotationAsExpression(parameter);
            }
        }
        /** Check the decorators of a node */
        function checkDecorators(node) {
            if (!node.decorators) {
                return;
            }
            // skip this check for nodes that cannot have decorators. These should have already had an error reported by
            // checkGrammarDecorators.
            if (!ts.nodeCanBeDecorated(node)) {
                return;
            }
            if (!compilerOptions.experimentalDecorators) {
                error(node, ts.Diagnostics.Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Specify_experimentalDecorators_to_remove_this_warning);
            }
            if (compilerOptions.emitDecoratorMetadata) {
                // we only need to perform these checks if we are emitting serialized type metadata for the target of a decorator.
                switch (node.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                        var constructor = ts.getFirstConstructorWithBody(node);
                        if (constructor) {
                            checkParameterTypeAnnotationsAsExpressions(constructor);
                        }
                        break;
                    case ts.SyntaxKind.MethodDeclaration:
                        checkParameterTypeAnnotationsAsExpressions(node);
                    // fall-through
                    case ts.SyntaxKind.SetAccessor:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.Parameter:
                        checkTypeAnnotationAsExpression(node);
                        break;
                }
            }
            emitDecorate = true;
            if (node.kind === ts.SyntaxKind.Parameter) {
                emitParam = true;
            }
            ts.forEach(node.decorators, checkDecorator);
        }
        function checkFunctionDeclaration(node) {
            if (produceDiagnostics) {
                checkFunctionLikeDeclaration(node) || checkGrammarForGenerator(node);
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            }
        }
        function checkFunctionLikeDeclaration(node) {
            checkDecorators(node);
            checkSignatureDeclaration(node);
            var isAsync = ts.isAsyncFunctionLike(node);
            if (isAsync) {
                if (!compilerOptions.experimentalAsyncFunctions) {
                    error(node, ts.Diagnostics.Experimental_support_for_async_functions_is_a_feature_that_is_subject_to_change_in_a_future_release_Specify_experimentalAsyncFunctions_to_remove_this_warning);
                }
                emitAwaiter = true;
            }
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name && node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                // This check will account for methods in class/interface declarations,
                // as well as accessors in classes/object literals
                checkComputedPropertyName(node.name);
            }
            if (!ts.hasDynamicName(node)) {
                // first we want to check the local symbol that contain this declaration
                // - if node.localSymbol !== undefined - this is current declaration is exported and localSymbol points to the local symbol
                // - if node.localSymbol === undefined - this node is non-exported so we can just pick the result of getSymbolOfNode
                var symbol = getSymbolOfNode(node);
                var localSymbol = node.localSymbol || symbol;
                var firstDeclaration = ts.getDeclarationOfKind(localSymbol, node.kind);
                // Only type check the symbol once
                if (node === firstDeclaration) {
                    checkFunctionOrConstructorSymbol(localSymbol);
                }
                if (symbol.parent) {
                    // run check once for the first declaration
                    if (ts.getDeclarationOfKind(symbol, node.kind) === node) {
                        // run check on export symbol to check that modifiers agree across all exported declarations
                        checkFunctionOrConstructorSymbol(symbol);
                    }
                }
            }
            checkSourceElement(node.body);
            if (node.type && !isAccessor(node.kind) && !node.asteriskToken) {
                var returnType = getTypeFromTypeNode(node.type);
                var promisedType;
                if (isAsync) {
                    promisedType = checkAsyncFunctionReturnType(node);
                }
                checkIfNonVoidFunctionHasReturnExpressionsOrSingleThrowStatment(node, isAsync ? promisedType : returnType);
            }
            if (produceDiagnostics && !node.type) {
                // Report an implicit any error if there is no body, no explicit return type, and node is not a private method
                // in an ambient context
                if (compilerOptions.noImplicitAny && ts.nodeIsMissing(node.body) && !isPrivateWithinAmbient(node)) {
                    reportImplicitAnyError(node, anyType);
                }
                if (node.asteriskToken && ts.nodeIsPresent(node.body)) {
                    // A generator with a body and no type annotation can still cause errors. It can error if the
                    // yielded values have no common supertype, or it can give an implicit any error if it has no
                    // yielded values. The only way to trigger these errors is to try checking its return type.
                    getReturnTypeOfSignature(getSignatureFromDeclaration(node));
                }
            }
        }
        function checkBlock(node) {
            // Grammar checking for SyntaxKind.Block
            if (node.kind === ts.SyntaxKind.Block) {
                checkGrammarStatementInAmbientContext(node);
            }
            ts.forEach(node.statements, checkSourceElement);
            if (ts.isFunctionBlock(node) || node.kind === ts.SyntaxKind.ModuleBlock) {
                checkFunctionAndClassExpressionBodies(node);
            }
        }
        function checkCollisionWithArgumentsInGeneratedCode(node) {
            // no rest parameters \ declaration context \ overload - no codegen impact
            if (!ts.hasRestParameter(node) || ts.isInAmbientContext(node) || ts.nodeIsMissing(node.body)) {
                return;
            }
            ts.forEach(node.parameters, function (p) {
                if (p.name && !ts.isBindingPattern(p.name) && p.name.text === argumentsSymbol.name) {
                    error(p, ts.Diagnostics.Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters);
                }
            });
        }
        function needCollisionCheckForIdentifier(node, identifier, name) {
            if (!(identifier && identifier.text === name)) {
                return false;
            }
            if (node.kind === ts.SyntaxKind.PropertyDeclaration ||
                node.kind === ts.SyntaxKind.PropertySignature ||
                node.kind === ts.SyntaxKind.MethodDeclaration ||
                node.kind === ts.SyntaxKind.MethodSignature ||
                node.kind === ts.SyntaxKind.GetAccessor ||
                node.kind === ts.SyntaxKind.SetAccessor) {
                // it is ok to have member named '_super' or '_this' - member access is always qualified
                return false;
            }
            if (ts.isInAmbientContext(node)) {
                // ambient context - no codegen impact
                return false;
            }
            var root = ts.getRootDeclaration(node);
            if (root.kind === ts.SyntaxKind.Parameter && ts.nodeIsMissing(root.parent.body)) {
                // just an overload - no codegen impact
                return false;
            }
            return true;
        }
        function checkCollisionWithCapturedThisVariable(node, name) {
            if (needCollisionCheckForIdentifier(node, name, "_this")) {
                potentialThisCollisions.push(node);
            }
        }
        // this function will run after checking the source file so 'CaptureThis' is correct for all nodes
        function checkIfThisIsCapturedInEnclosingScope(node) {
            var current = node;
            while (current) {
                if (getNodeCheckFlags(current) & ts.NodeCheckFlags.CaptureThis) {
                    var isDeclaration_1 = node.kind !== ts.SyntaxKind.Identifier;
                    if (isDeclaration_1) {
                        error(node.name, ts.Diagnostics.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference);
                    }
                    else {
                        error(node, ts.Diagnostics.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference);
                    }
                    return;
                }
                current = current.parent;
            }
        }
        function checkCollisionWithCapturedSuperVariable(node, name) {
            if (!needCollisionCheckForIdentifier(node, name, "_super")) {
                return;
            }
            // bubble up and find containing type
            var enclosingClass = ts.getContainingClass(node);
            // if containing type was not found or it is ambient - exit (no codegen)
            if (!enclosingClass || ts.isInAmbientContext(enclosingClass)) {
                return;
            }
            if (ts.getClassExtendsHeritageClauseElement(enclosingClass)) {
                var isDeclaration_2 = node.kind !== ts.SyntaxKind.Identifier;
                if (isDeclaration_2) {
                    error(node, ts.Diagnostics.Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference);
                }
                else {
                    error(node, ts.Diagnostics.Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference);
                }
            }
        }
        function checkCollisionWithRequireExportsInGeneratedCode(node, name) {
            if (!needCollisionCheckForIdentifier(node, name, "require") && !needCollisionCheckForIdentifier(node, name, "exports")) {
                return;
            }
            // Uninstantiated modules shouldnt do this check
            if (node.kind === ts.SyntaxKind.ModuleDeclaration && ts.getModuleInstanceState(node) !== ts.ModuleInstanceState.Instantiated) {
                return;
            }
            // In case of variable declaration, node.parent is variable statement so look at the variable statement's parent
            var parent = getDeclarationContainer(node);
            if (parent.kind === ts.SyntaxKind.SourceFile && ts.isExternalModule(parent)) {
                // If the declaration happens to be in external module, report error that require and exports are reserved keywords
                error(name, ts.Diagnostics.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module, ts.declarationNameToString(name), ts.declarationNameToString(name));
            }
        }
        function checkVarDeclaredNamesNotShadowed(node) {
            // - ScriptBody : StatementList
            // It is a Syntax Error if any element of the LexicallyDeclaredNames of StatementList
            // also occurs in the VarDeclaredNames of StatementList.
            // - Block : { StatementList }
            // It is a Syntax Error if any element of the LexicallyDeclaredNames of StatementList
            // also occurs in the VarDeclaredNames of StatementList.
            // Variable declarations are hoisted to the top of their function scope. They can shadow
            // block scoped declarations, which bind tighter. this will not be flagged as duplicate definition
            // by the binder as the declaration scope is different.
            // A non-initialized declaration is a no-op as the block declaration will resolve before the var
            // declaration. the problem is if the declaration has an initializer. this will act as a write to the
            // block declared value. this is fine for let, but not const.
            // Only consider declarations with initializers, uninitialized let declarations will not
            // step on a let/const variable.
            // Do not consider let and const declarations, as duplicate block-scoped declarations
            // are handled by the binder.
            // We are only looking for let declarations that step on let\const declarations from a
            // different scope. e.g.:
            //      {
            //          const x = 0; // localDeclarationSymbol obtained after name resolution will correspond to this declaration
            //          let x = 0; // symbol for this declaration will be 'symbol'
            //      }
            // skip block-scoped variables and parameters
            if ((ts.getCombinedNodeFlags(node) & ts.NodeFlags.BlockScoped) !== 0 || ts.isParameterDeclaration(node)) {
                return;
            }
            // skip variable declarations that don't have initializers
            // NOTE: in ES6 spec initializer is required in variable declarations where name is binding pattern
            // so we'll always treat binding elements as initialized
            if (node.kind === ts.SyntaxKind.VariableDeclaration && !node.initializer) {
                return;
            }
            var symbol = getSymbolOfNode(node);
            if (symbol.flags & ts.SymbolFlags.FunctionScopedVariable) {
                var localDeclarationSymbol = resolveName(node, node.name.text, ts.SymbolFlags.Variable, /*nodeNotFoundErrorMessage*/ undefined, /*nameArg*/ undefined);
                if (localDeclarationSymbol &&
                    localDeclarationSymbol !== symbol &&
                    localDeclarationSymbol.flags & ts.SymbolFlags.BlockScopedVariable) {
                    if (getDeclarationFlagsFromSymbol(localDeclarationSymbol) & ts.NodeFlags.BlockScoped) {
                        var varDeclList = ts.getAncestor(localDeclarationSymbol.valueDeclaration, ts.SyntaxKind.VariableDeclarationList);
                        var container = varDeclList.parent.kind === ts.SyntaxKind.VariableStatement && varDeclList.parent.parent
                            ? varDeclList.parent.parent
                            : undefined;
                        // names of block-scoped and function scoped variables can collide only
                        // if block scoped variable is defined in the function\module\source file scope (because of variable hoisting)
                        var namesShareScope = container &&
                            (container.kind === ts.SyntaxKind.Block && ts.isFunctionLike(container.parent) ||
                                container.kind === ts.SyntaxKind.ModuleBlock ||
                                container.kind === ts.SyntaxKind.ModuleDeclaration ||
                                container.kind === ts.SyntaxKind.SourceFile);
                        // here we know that function scoped variable is shadowed by block scoped one
                        // if they are defined in the same scope - binder has already reported redeclaration error
                        // otherwise if variable has an initializer - show error that initialization will fail
                        // since LHS will be block scoped name instead of function scoped
                        if (!namesShareScope) {
                            var name_6 = symbolToString(localDeclarationSymbol);
                            error(node, ts.Diagnostics.Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1, name_6, name_6);
                        }
                    }
                }
            }
        }
        // Check that a parameter initializer contains no references to parameters declared to the right of itself
        function checkParameterInitializer(node) {
            if (ts.getRootDeclaration(node).kind !== ts.SyntaxKind.Parameter) {
                return;
            }
            var func = ts.getContainingFunction(node);
            visit(node.initializer);
            function visit(n) {
                if (n.kind === ts.SyntaxKind.Identifier) {
                    var referencedSymbol = getNodeLinks(n).resolvedSymbol;
                    // check FunctionLikeDeclaration.locals (stores parameters\function local variable)
                    // if it contains entry with a specified name and if this entry matches the resolved symbol
                    if (referencedSymbol && referencedSymbol !== unknownSymbol && getSymbol(func.locals, referencedSymbol.name, ts.SymbolFlags.Value) === referencedSymbol) {
                        if (referencedSymbol.valueDeclaration.kind === ts.SyntaxKind.Parameter) {
                            if (referencedSymbol.valueDeclaration === node) {
                                error(n, ts.Diagnostics.Parameter_0_cannot_be_referenced_in_its_initializer, ts.declarationNameToString(node.name));
                                return;
                            }
                            if (referencedSymbol.valueDeclaration.pos < node.pos) {
                                // legal case - parameter initializer references some parameter strictly on left of current parameter declaration
                                return;
                            }
                        }
                        error(n, ts.Diagnostics.Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it, ts.declarationNameToString(node.name), ts.declarationNameToString(n));
                    }
                }
                else {
                    ts.forEachChild(n, visit);
                }
            }
        }
        // Check variable, parameter, or property declaration
        function checkVariableLikeDeclaration(node) {
            checkDecorators(node);
            checkSourceElement(node.type);
            // For a computed property, just check the initializer and exit
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                checkComputedPropertyName(node.name);
                if (node.initializer) {
                    checkExpressionCached(node.initializer);
                }
            }
            // For a binding pattern, check contained binding elements
            if (ts.isBindingPattern(node.name)) {
                ts.forEach(node.name.elements, checkSourceElement);
            }
            // For a parameter declaration with an initializer, error and exit if the containing function doesn't have a body
            if (node.initializer && ts.getRootDeclaration(node).kind === ts.SyntaxKind.Parameter && ts.nodeIsMissing(ts.getContainingFunction(node).body)) {
                error(node, ts.Diagnostics.A_parameter_initializer_is_only_allowed_in_a_function_or_constructor_implementation);
                return;
            }
            // For a binding pattern, validate the initializer and exit
            if (ts.isBindingPattern(node.name)) {
                if (node.initializer) {
                    checkTypeAssignableTo(checkExpressionCached(node.initializer), getWidenedTypeForVariableLikeDeclaration(node), node, /*headMessage*/ undefined);
                    checkParameterInitializer(node);
                }
                return;
            }
            var symbol = getSymbolOfNode(node);
            var type = getTypeOfVariableOrParameterOrProperty(symbol);
            if (node === symbol.valueDeclaration) {
                // Node is the primary declaration of the symbol, just validate the initializer
                if (node.initializer) {
                    // Use default messages
                    checkTypeAssignableTo(getBindingType(checkExpressionCached(node.initializer)), type, node, /*headMessage*/ undefined);
                    // [ConcreteTypeScript]
                    var initType = checkExpressionCached(node.initializer); // FIXME: rechecking
                    checkCtsCoercion(node.initializer, initType, type);
                    // [/ConcreteTypeScript]
                    checkParameterInitializer(node);
                }
            }
            else {
                // Node is a secondary declaration, check that type is identical to primary declaration and check that
                // initializer is consistent with type associated with the node
                var declarationType = getWidenedTypeForVariableLikeDeclaration(node);
                if (type !== unknownType && declarationType !== unknownType && !isTypeIdenticalTo(type, declarationType)) {
                    error(node.name, ts.Diagnostics.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2, ts.declarationNameToString(node.name), typeToString(type), typeToString(declarationType));
                }
                if (node.initializer) {
                    checkTypeAssignableTo(checkExpressionCached(node.initializer), declarationType, node, /*headMessage*/ undefined);
                }
            }
            if (node.kind !== ts.SyntaxKind.PropertyDeclaration && node.kind !== ts.SyntaxKind.PropertySignature) {
                // We know we don't have a binding pattern or computed name here
                checkExportsOnMergedDeclarations(node);
                if (node.kind === ts.SyntaxKind.VariableDeclaration || node.kind === ts.SyntaxKind.BindingElement) {
                    checkVarDeclaredNamesNotShadowed(node);
                }
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            }
        }
        function checkVariableDeclaration(node) {
            checkGrammarVariableDeclaration(node);
            return checkVariableLikeDeclaration(node);
        }
        function checkBindingElement(node) {
            checkGrammarBindingElement(node);
            return checkVariableLikeDeclaration(node);
        }
        function checkVariableStatement(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarVariableDeclarationList(node.declarationList) || checkGrammarForDisallowedLetOrConstStatement(node);
            ts.forEach(node.declarationList.declarations, checkSourceElement);
        }
        function checkGrammarDisallowedModifiersOnObjectLiteralExpressionMethod(node) {
            // We only disallow modifier on a method declaration if it is a property of object-literal-expression
            if (node.modifiers && node.parent.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                if (ts.isAsyncFunctionLike(node)) {
                    if (node.modifiers.length > 1) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                }
                else {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                }
            }
        }
        function checkExpressionStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
        }
        function checkIfStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
            checkSourceElement(node.thenStatement);
            checkSourceElement(node.elseStatement);
        }
        function checkDoStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkSourceElement(node.statement);
            checkExpression(node.expression);
        }
        function checkWhileStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
            checkSourceElement(node.statement);
        }
        function checkForStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.initializer && node.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                    checkGrammarVariableDeclarationList(node.initializer);
                }
            }
            if (node.initializer) {
                if (node.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                    ts.forEach(node.initializer.declarations, checkVariableDeclaration);
                }
                else {
                    checkExpression(node.initializer);
                }
            }
            if (node.condition)
                checkExpression(node.condition);
            if (node.incrementor)
                checkExpression(node.incrementor);
            checkSourceElement(node.statement);
        }
        function checkForOfStatement(node) {
            checkGrammarForInOrForOfStatement(node);
            // Check the LHS and RHS
            // If the LHS is a declaration, just check it as a variable declaration, which will in turn check the RHS
            // via checkRightHandSideOfForOf.
            // If the LHS is an expression, check the LHS, as a destructuring assignment or as a reference.
            // Then check that the RHS is assignable to it.
            if (node.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                checkForInOrForOfVariableDeclaration(node);
            }
            else {
                var varExpr = node.initializer;
                var iteratedType = checkRightHandSideOfForOf(node.expression);
                // There may be a destructuring assignment on the left side
                if (varExpr.kind === ts.SyntaxKind.ArrayLiteralExpression || varExpr.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                    // iteratedType may be undefined. In this case, we still want to check the structure of
                    // varExpr, in particular making sure it's a valid LeftHandSideExpression. But we'd like
                    // to short circuit the type relation checking as much as possible, so we pass the unknownType.
                    checkDestructuringAssignment(varExpr, iteratedType || unknownType);
                }
                else {
                    var leftType = checkExpression(varExpr);
                    checkReferenceExpression(varExpr, /*invalidReferenceMessage*/ ts.Diagnostics.Invalid_left_hand_side_in_for_of_statement, 
                    /*constantVariableMessage*/ ts.Diagnostics.The_left_hand_side_of_a_for_of_statement_cannot_be_a_previously_defined_constant);
                    // iteratedType will be undefined if the rightType was missing properties/signatures
                    // required to get its iteratedType (like [Symbol.iterator] or next). This may be
                    // because we accessed properties from anyType, or it may have led to an error inside
                    // getElementTypeOfIterable.
                    if (iteratedType) {
                        checkTypeAssignableTo(iteratedType, leftType, varExpr, /*headMessage*/ undefined);
                    }
                }
            }
            checkSourceElement(node.statement);
        }
        function checkForInStatement(node) {
            // Grammar checking
            checkGrammarForInOrForOfStatement(node);
            // TypeScript 1.0 spec  (April 2014): 5.4
            // In a 'for-in' statement of the form
            // for (let VarDecl in Expr) Statement
            //   VarDecl must be a variable declaration without a type annotation that declares a variable of type Any,
            //   and Expr must be an expression of type Any, an object type, or a type parameter type.
            if (node.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                var variable = node.initializer.declarations[0];
                if (variable && ts.isBindingPattern(variable.name)) {
                    error(variable.name, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
                }
                checkForInOrForOfVariableDeclaration(node);
            }
            else {
                // In a 'for-in' statement of the form
                // for (Var in Expr) Statement
                //   Var must be an expression classified as a reference of type Any or the String primitive type,
                //   and Expr must be an expression of type Any, an object type, or a type parameter type.
                var varExpr = node.initializer;
                var leftType = checkExpression(varExpr);
                if (varExpr.kind === ts.SyntaxKind.ArrayLiteralExpression || varExpr.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                    error(varExpr, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
                }
                else if (!isTypeAnyOrAllConstituentTypesHaveKind(leftType, ts.TypeFlags.StringLike)) {
                    error(varExpr, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any);
                }
                else {
                    // run check only former check succeeded to avoid cascading errors
                    checkReferenceExpression(varExpr, ts.Diagnostics.Invalid_left_hand_side_in_for_in_statement, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_previously_defined_constant);
                }
            }
            var rightType = checkExpression(node.expression);
            // unknownType is returned i.e. if node.expression is identifier whose name cannot be resolved
            // in this case error about missing name is already reported - do not report extra one
            if (!isTypeAnyOrAllConstituentTypesHaveKind(rightType, ts.TypeFlags.ObjectType | ts.TypeFlags.TypeParameter)) {
                error(node.expression, ts.Diagnostics.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            checkSourceElement(node.statement);
        }
        function checkForInOrForOfVariableDeclaration(iterationStatement) {
            var variableDeclarationList = iterationStatement.initializer;
            // checkGrammarForInOrForOfStatement will check that there is exactly one declaration.
            if (variableDeclarationList.declarations.length >= 1) {
                var decl = variableDeclarationList.declarations[0];
                checkVariableDeclaration(decl);
            }
        }
        function checkRightHandSideOfForOf(rhsExpression) {
            var expressionType = getTypeOfExpression(rhsExpression);
            return checkIteratedTypeOrElementType(expressionType, rhsExpression, /*allowStringInput*/ true);
        }
        function checkIteratedTypeOrElementType(inputType, errorNode, allowStringInput) {
            if (isTypeAny(inputType)) {
                return inputType;
            }
            if (languageVersion >= ts.ScriptTarget.ES6) {
                return checkElementTypeOfIterable(inputType, errorNode);
            }
            if (allowStringInput) {
                return checkElementTypeOfArrayOrString(inputType, errorNode);
            }
            if (isArrayLikeType(inputType)) {
                var indexType = getIndexTypeOfType(inputType, ts.IndexKind.Number);
                if (indexType) {
                    return indexType;
                }
            }
            error(errorNode, ts.Diagnostics.Type_0_is_not_an_array_type, typeToString(inputType));
            return unknownType;
        }
        /**
         * When errorNode is undefined, it means we should not report any errors.
         */
        function checkElementTypeOfIterable(iterable, errorNode) {
            var elementType = getElementTypeOfIterable(iterable, errorNode);
            // Now even though we have extracted the iteratedType, we will have to validate that the type
            // passed in is actually an Iterable.
            if (errorNode && elementType) {
                checkTypeAssignableTo(iterable, createIterableType(elementType), errorNode);
            }
            return elementType || anyType;
        }
        /**
         * We want to treat type as an iterable, and get the type it is an iterable of. The iterable
         * must have the following structure (annotated with the names of the variables below):
         *
         * { // iterable
         *     [Symbol.iterator]: { // iteratorFunction
         *         (): Iterator<T>
         *     }
         * }
         *
         * T is the type we are after. At every level that involves analyzing return types
         * of signatures, we union the return types of all the signatures.
         *
         * Another thing to note is that at any step of this process, we could run into a dead end,
         * meaning either the property is missing, or we run into the anyType. If either of these things
         * happens, we return undefined to signal that we could not find the iterated type. If a property
         * is missing, and the previous step did not result in 'any', then we also give an error if the
         * caller requested it. Then the caller can decide what to do in the case where there is no iterated
         * type. This is different from returning anyType, because that would signify that we have matched the
         * whole pattern and that T (above) is 'any'.
         */
        function getElementTypeOfIterable(type, errorNode) {
            if (isTypeAny(type)) {
                return undefined;
            }
            var typeAsIterable = type;
            if (!typeAsIterable.iterableElementType) {
                // As an optimization, if the type is instantiated directly using the globalIterableType (Iterable<number>),
                // then just grab its type argument.
                if ((type.flags & ts.TypeFlags.Reference) && type.target === globalIterableType) {
                    typeAsIterable.iterableElementType = type.typeArguments[0];
                }
                else {
                    var iteratorFunction = getTypeOfPropertyOfType(type, ts.getPropertyNameForKnownSymbolName("iterator"));
                    if (isTypeAny(iteratorFunction)) {
                        return undefined;
                    }
                    var iteratorFunctionSignatures = iteratorFunction ? getSignaturesOfType(iteratorFunction, ts.SignatureKind.Call) : emptyArray;
                    if (iteratorFunctionSignatures.length === 0) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.Type_must_have_a_Symbol_iterator_method_that_returns_an_iterator);
                        }
                        return undefined;
                    }
                    typeAsIterable.iterableElementType = getElementTypeOfIterator(getUnionType(ts.map(iteratorFunctionSignatures, getReturnTypeOfSignature)), errorNode);
                }
            }
            return typeAsIterable.iterableElementType;
        }
        /**
         * This function has very similar logic as getElementTypeOfIterable, except that it operates on
         * Iterators instead of Iterables. Here is the structure:
         *
         *  { // iterator
         *      next: { // iteratorNextFunction
         *          (): { // iteratorNextResult
         *              value: T // iteratorNextValue
         *          }
         *      }
         *  }
         *
         */
        function getElementTypeOfIterator(type, errorNode) {
            if (isTypeAny(type)) {
                return undefined;
            }
            var typeAsIterator = type;
            if (!typeAsIterator.iteratorElementType) {
                // As an optimization, if the type is instantiated directly using the globalIteratorType (Iterator<number>),
                // then just grab its type argument.
                if ((type.flags & ts.TypeFlags.Reference) && type.target === globalIteratorType) {
                    typeAsIterator.iteratorElementType = type.typeArguments[0];
                }
                else {
                    var iteratorNextFunction = getTypeOfPropertyOfType(type, "next");
                    if (isTypeAny(iteratorNextFunction)) {
                        return undefined;
                    }
                    var iteratorNextFunctionSignatures = iteratorNextFunction ? getSignaturesOfType(iteratorNextFunction, ts.SignatureKind.Call) : emptyArray;
                    if (iteratorNextFunctionSignatures.length === 0) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.An_iterator_must_have_a_next_method);
                        }
                        return undefined;
                    }
                    var iteratorNextResult = getUnionType(ts.map(iteratorNextFunctionSignatures, getReturnTypeOfSignature));
                    if (isTypeAny(iteratorNextResult)) {
                        return undefined;
                    }
                    var iteratorNextValue = getTypeOfPropertyOfType(iteratorNextResult, "value");
                    if (!iteratorNextValue) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.The_type_returned_by_the_next_method_of_an_iterator_must_have_a_value_property);
                        }
                        return undefined;
                    }
                    typeAsIterator.iteratorElementType = iteratorNextValue;
                }
            }
            return typeAsIterator.iteratorElementType;
        }
        function getElementTypeOfIterableIterator(type) {
            if (isTypeAny(type)) {
                return undefined;
            }
            // As an optimization, if the type is instantiated directly using the globalIterableIteratorType (IterableIterator<number>),
            // then just grab its type argument.
            if ((type.flags & ts.TypeFlags.Reference) && type.target === globalIterableIteratorType) {
                return type.typeArguments[0];
            }
            return getElementTypeOfIterable(type, /*errorNode*/ undefined) ||
                getElementTypeOfIterator(type, /*errorNode*/ undefined);
        }
        /**
         * This function does the following steps:
         *   1. Break up arrayOrStringType (possibly a union) into its string constituents and array constituents.
         *   2. Take the element types of the array constituents.
         *   3. Return the union of the element types, and string if there was a string constitutent.
         *
         * For example:
         *     string -> string
         *     number[] -> number
         *     string[] | number[] -> string | number
         *     string | number[] -> string | number
         *     string | string[] | number[] -> string | number
         *
         * It also errors if:
         *   1. Some constituent is neither a string nor an array.
         *   2. Some constituent is a string and target is less than ES5 (because in ES3 string is not indexable).
         */
        function checkElementTypeOfArrayOrString(arrayOrStringType, errorNode) {
            ts.Debug.assert(languageVersion < ts.ScriptTarget.ES6);
            // After we remove all types that are StringLike, we will know if there was a string constituent
            // based on whether the remaining type is the same as the initial type.
            var arrayType = removeTypesFromUnionType(arrayOrStringType, ts.TypeFlags.StringLike, /*isTypeOfKind*/ true, /*allowEmptyUnionResult*/ true);
            var hasStringConstituent = arrayOrStringType !== arrayType;
            var reportedError = false;
            if (hasStringConstituent) {
                if (languageVersion < ts.ScriptTarget.ES5) {
                    error(errorNode, ts.Diagnostics.Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher);
                    reportedError = true;
                }
                // Now that we've removed all the StringLike types, if no constituents remain, then the entire
                // arrayOrStringType was a string.
                if (arrayType === emptyObjectType) {
                    return stringType;
                }
            }
            if (!isArrayLikeType(arrayType)) {
                if (!reportedError) {
                    // Which error we report depends on whether there was a string constituent. For example,
                    // if the input type is number | string, we want to say that number is not an array type.
                    // But if the input was just number, we want to say that number is not an array type
                    // or a string type.
                    var diagnostic = hasStringConstituent
                        ? ts.Diagnostics.Type_0_is_not_an_array_type
                        : ts.Diagnostics.Type_0_is_not_an_array_type_or_a_string_type;
                    error(errorNode, diagnostic, typeToString(arrayType));
                }
                return hasStringConstituent ? stringType : unknownType;
            }
            var arrayElementType = getIndexTypeOfType(arrayType, ts.IndexKind.Number) || unknownType;
            if (hasStringConstituent) {
                // This is just an optimization for the case where arrayOrStringType is string | string[]
                if (arrayElementType.flags & ts.TypeFlags.StringLike) {
                    return stringType;
                }
                return getUnionType([arrayElementType, stringType]);
            }
            return arrayElementType;
        }
        function checkBreakOrContinueStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node) || checkGrammarBreakOrContinueStatement(node);
            // TODO: Check that target label is valid
        }
        function isGetAccessorWithAnnotatatedSetAccessor(node) {
            return !!(node.kind === ts.SyntaxKind.GetAccessor && ts.getSetAccessorTypeAnnotationNode(ts.getDeclarationOfKind(node.symbol, ts.SyntaxKind.SetAccessor)));
        }
        function checkReturnStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                var functionBlock = ts.getContainingFunction(node);
                if (!functionBlock) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.A_return_statement_can_only_be_used_within_a_function_body);
                }
            }
            if (node.expression) {
                var func = ts.getContainingFunction(node);
                if (func) {
                    var signature = getSignatureFromDeclaration(func);
                    var returnType = getReturnTypeOfSignature(signature);
                    var exprType = checkExpressionCached(node.expression);
                    if (func.asteriskToken) {
                        // A generator does not need its return expressions checked against its return type.
                        // Instead, the yield expressions are checked against the element type.
                        // TODO: Check return expressions of generators when return type tracking is added
                        // for generators.
                        return;
                    }
                    if (func.kind === ts.SyntaxKind.SetAccessor) {
                        error(node.expression, ts.Diagnostics.Setters_cannot_return_a_value);
                    }
                    else if (func.kind === ts.SyntaxKind.Constructor) {
                        if (!isTypeAssignableTo(exprType, returnType)) {
                            error(node.expression, ts.Diagnostics.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
                        }
                    }
                    else if (func.type || isGetAccessorWithAnnotatatedSetAccessor(func) || signature.typePredicate) {
                        if (ts.isAsyncFunctionLike(func)) {
                            var promisedType = getPromisedType(returnType);
                            var awaitedType = checkAwaitedType(exprType, node.expression, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                            checkTypeAssignableTo(awaitedType, promisedType, node.expression);
                        }
                        else {
                            checkTypeAssignableTo(exprType, returnType, node.expression);
                        }
                    }
                    // [ConcreteTypeScript]
                    // If we took advantage of return-assignability to sneak in a non-concrete or non-float, check it
                    var expType = checkExpression(node.expression); // FIXME: rechecking
                    checkCtsCoercion(node.expression, expType, returnType);
                }
            }
        }
        function checkWithStatement(node) {
            // Grammar checking for withStatement
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.parserContextFlags & ts.ParserContextFlags.Await) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.with_statements_are_not_allowed_in_an_async_function_block);
                }
            }
            checkExpression(node.expression);
            error(node.expression, ts.Diagnostics.All_symbols_within_a_with_block_will_be_resolved_to_any);
        }
        function checkSwitchStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            var firstDefaultClause;
            var hasDuplicateDefaultClause = false;
            var expressionType = checkExpression(node.expression);
            ts.forEach(node.caseBlock.clauses, function (clause) {
                // Grammar check for duplicate default clauses, skip if we already report duplicate default clause
                if (clause.kind === ts.SyntaxKind.DefaultClause && !hasDuplicateDefaultClause) {
                    if (firstDefaultClause === undefined) {
                        firstDefaultClause = clause;
                    }
                    else {
                        var sourceFile = ts.getSourceFileOfNode(node);
                        var start = ts.skipTrivia(sourceFile.text, clause.pos);
                        var end = clause.statements.length > 0 ? clause.statements[0].pos : clause.end;
                        grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.A_default_clause_cannot_appear_more_than_once_in_a_switch_statement);
                        hasDuplicateDefaultClause = true;
                    }
                }
                if (produceDiagnostics && clause.kind === ts.SyntaxKind.CaseClause) {
                    var caseClause = clause;
                    // TypeScript 1.0 spec (April 2014):5.9
                    // In a 'switch' statement, each 'case' expression must be of a type that is assignable to or from the type of the 'switch' expression.
                    var caseType = checkExpression(caseClause.expression);
                    if (!isTypeAssignableTo(expressionType, caseType)) {
                        // check 'expressionType isAssignableTo caseType' failed, try the reversed check and report errors if it fails
                        checkTypeAssignableTo(caseType, expressionType, caseClause.expression, /*headMessage*/ undefined);
                    }
                }
                ts.forEach(clause.statements, checkSourceElement);
            });
        }
        function checkLabeledStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                var current = node.parent;
                while (current) {
                    if (ts.isFunctionLike(current)) {
                        break;
                    }
                    if (current.kind === ts.SyntaxKind.LabeledStatement && current.label.text === node.label.text) {
                        var sourceFile = ts.getSourceFileOfNode(node);
                        grammarErrorOnNode(node.label, ts.Diagnostics.Duplicate_label_0, ts.getTextOfNodeFromSourceText(sourceFile.text, node.label));
                        break;
                    }
                    current = current.parent;
                }
            }
            // ensure that label is unique
            checkSourceElement(node.statement);
        }
        function checkThrowStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.expression === undefined) {
                    grammarErrorAfterFirstToken(node, ts.Diagnostics.Line_break_not_permitted_here);
                }
            }
            if (node.expression) {
                checkExpression(node.expression);
            }
        }
        function checkTryStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkBlock(node.tryBlock);
            var catchClause = node.catchClause;
            if (catchClause) {
                // Grammar checking
                if (catchClause.variableDeclaration) {
                    if (catchClause.variableDeclaration.name.kind !== ts.SyntaxKind.Identifier) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.name, ts.Diagnostics.Catch_clause_variable_name_must_be_an_identifier);
                    }
                    else if (catchClause.variableDeclaration.type) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.type, ts.Diagnostics.Catch_clause_variable_cannot_have_a_type_annotation);
                    }
                    else if (catchClause.variableDeclaration.initializer) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.initializer, ts.Diagnostics.Catch_clause_variable_cannot_have_an_initializer);
                    }
                    else {
                        var identifierName = catchClause.variableDeclaration.name.text;
                        var locals = catchClause.block.locals;
                        if (locals && ts.hasProperty(locals, identifierName)) {
                            var localSymbol = locals[identifierName];
                            if (localSymbol && (localSymbol.flags & ts.SymbolFlags.BlockScopedVariable) !== 0) {
                                grammarErrorOnNode(localSymbol.valueDeclaration, ts.Diagnostics.Cannot_redeclare_identifier_0_in_catch_clause, identifierName);
                            }
                        }
                    }
                }
                checkBlock(catchClause.block);
            }
            if (node.finallyBlock) {
                checkBlock(node.finallyBlock);
            }
        }
        function checkIndexConstraints(type) {
            var declaredNumberIndexer = getIndexDeclarationOfSymbol(type.symbol, ts.IndexKind.Number);
            var declaredStringIndexer = getIndexDeclarationOfSymbol(type.symbol, ts.IndexKind.String);
            var stringIndexType = getIndexTypeOfType(type, ts.IndexKind.String);
            var numberIndexType = getIndexTypeOfType(type, ts.IndexKind.Number);
            if (stringIndexType || numberIndexType) {
                ts.forEach(getPropertiesOfObjectType(type), function (prop) {
                    var propType = getTypeOfSymbol(prop);
                    checkIndexConstraintForProperty(prop, propType, type, declaredStringIndexer, stringIndexType, ts.IndexKind.String);
                    checkIndexConstraintForProperty(prop, propType, type, declaredNumberIndexer, numberIndexType, ts.IndexKind.Number);
                });
                if (type.flags & ts.TypeFlags.Class && ts.isClassLike(type.symbol.valueDeclaration)) {
                    var classDeclaration = type.symbol.valueDeclaration;
                    for (var _i = 0, _a = classDeclaration.members; _i < _a.length; _i++) {
                        var member = _a[_i];
                        // Only process instance properties with computed names here.
                        // Static properties cannot be in conflict with indexers,
                        // and properties with literal names were already checked.
                        if (!(member.flags & ts.NodeFlags.Static) && ts.hasDynamicName(member)) {
                            var propType = getTypeOfSymbol(member.symbol);
                            checkIndexConstraintForProperty(member.symbol, propType, type, declaredStringIndexer, stringIndexType, ts.IndexKind.String);
                            checkIndexConstraintForProperty(member.symbol, propType, type, declaredNumberIndexer, numberIndexType, ts.IndexKind.Number);
                        }
                    }
                }
            }
            var errorNode;
            if (stringIndexType && numberIndexType) {
                errorNode = declaredNumberIndexer || declaredStringIndexer;
                // condition 'errorNode === undefined' may appear if types does not declare nor string neither number indexer
                if (!errorNode && (type.flags & ts.TypeFlags.Interface)) {
                    var someBaseTypeHasBothIndexers = ts.forEach(getBaseTypes(type), function (base) { return getIndexTypeOfType(base, ts.IndexKind.String) && getIndexTypeOfType(base, ts.IndexKind.Number); });
                    errorNode = someBaseTypeHasBothIndexers ? undefined : type.symbol.declarations[0];
                }
            }
            if (errorNode && !isTypeAssignableTo(numberIndexType, stringIndexType)) {
                error(errorNode, ts.Diagnostics.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType), typeToString(stringIndexType));
            }
            function checkIndexConstraintForProperty(prop, propertyType, containingType, indexDeclaration, indexType, indexKind) {
                if (!indexType) {
                    return;
                }
                // index is numeric and property name is not valid numeric literal
                if (indexKind === ts.IndexKind.Number && !isNumericName(prop.valueDeclaration.name)) {
                    return;
                }
                // perform property check if property or indexer is declared in 'type'
                // this allows to rule out cases when both property and indexer are inherited from the base class
                var errorNode;
                if (prop.valueDeclaration.name.kind === ts.SyntaxKind.ComputedPropertyName || prop.parent === containingType.symbol) {
                    errorNode = prop.valueDeclaration;
                }
                else if (indexDeclaration) {
                    errorNode = indexDeclaration;
                }
                else if (containingType.flags & ts.TypeFlags.Interface) {
                    // for interfaces property and indexer might be inherited from different bases
                    // check if any base class already has both property and indexer.
                    // check should be performed only if 'type' is the first type that brings property\indexer together
                    var someBaseClassHasBothPropertyAndIndexer = ts.forEach(getBaseTypes(containingType), function (base) { return getPropertyOfType(base, prop.name) && getIndexTypeOfType(base, indexKind); });
                    errorNode = someBaseClassHasBothPropertyAndIndexer ? undefined : containingType.symbol.declarations[0];
                }
                if (errorNode && !isTypeAssignableTo(propertyType, indexType)) {
                    var errorMessage = indexKind === ts.IndexKind.String
                        ? ts.Diagnostics.Property_0_of_type_1_is_not_assignable_to_string_index_type_2
                        : ts.Diagnostics.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
                    error(errorNode, errorMessage, symbolToString(prop), typeToString(propertyType), typeToString(indexType));
                }
            }
        }
        function checkTypeNameIsReserved(name, message) {
            // TS 1.0 spec (April 2014): 3.6.1
            // The predefined type keywords are reserved and cannot be used as names of user defined types.
            switch (name.text) {
                case "any":
                case "number":
                case "boolean":
                case "string":
                case "symbol":
                case "void":
                    error(name, message, name.text);
            }
        }
        // Check each type parameter and check that list has no duplicate type parameter declarations
        function checkTypeParameters(typeParameterDeclarations) {
            if (typeParameterDeclarations) {
                for (var i = 0, n = typeParameterDeclarations.length; i < n; i++) {
                    var node = typeParameterDeclarations[i];
                    checkTypeParameter(node);
                    if (produceDiagnostics) {
                        for (var j = 0; j < i; j++) {
                            if (typeParameterDeclarations[j].symbol === node.symbol) {
                                error(node.name, ts.Diagnostics.Duplicate_identifier_0, ts.declarationNameToString(node.name));
                            }
                        }
                    }
                }
            }
        }
        function checkClassExpression(node) {
            checkClassLikeDeclaration(node);
            return getTypeOfSymbol(getSymbolOfNode(node));
        }
        function checkClassDeclaration(node) {
            if (!node.name && !(node.flags & ts.NodeFlags.Default)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.A_class_declaration_without_the_default_modifier_must_have_a_name);
            }
            checkClassLikeDeclaration(node);
            // Interfaces cannot be merged with non-ambient classes.
            if (getSymbolOfNode(node).flags & ts.SymbolFlags.Interface && !ts.isInAmbientContext(node)) {
                error(node, ts.Diagnostics.Only_an_ambient_class_can_be_merged_with_an_interface);
            }
            ts.forEach(node.members, checkSourceElement);
        }
        function checkClassLikeDeclaration(node) {
            checkGrammarClassDeclarationHeritageClauses(node);
            checkDecorators(node);
            if (node.name) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Class_name_cannot_be_0);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            }
            checkTypeParameters(node.typeParameters);
            checkExportsOnMergedDeclarations(node);
            var symbol = getSymbolOfNode(node);
            var type = getDeclaredTypeOfSymbol(symbol);
            var staticType = getTypeOfSymbol(symbol);
            var baseTypeNode = ts.getClassExtendsHeritageClauseElement(node);
            if (baseTypeNode) {
                emitExtends = emitExtends || !ts.isInAmbientContext(node);
                var baseTypes = getBaseTypes(type);
                if (baseTypes.length && produceDiagnostics) {
                    var baseType = baseTypes[0];
                    var staticBaseType = getBaseConstructorTypeOfClass(type);
                    checkSourceElement(baseTypeNode.expression);
                    if (baseTypeNode.typeArguments) {
                        ts.forEach(baseTypeNode.typeArguments, checkSourceElement);
                        for (var _i = 0, _a = getConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments); _i < _a.length; _i++) {
                            var constructor = _a[_i];
                            if (!checkTypeArgumentConstraints(constructor.typeParameters, baseTypeNode.typeArguments)) {
                                break;
                            }
                        }
                    }
                    checkTypeAssignableTo(type, baseType, node.name || node, ts.Diagnostics.Class_0_incorrectly_extends_base_class_1);
                    checkTypeAssignableTo(staticType, getTypeWithoutSignatures(staticBaseType), node.name || node, ts.Diagnostics.Class_static_side_0_incorrectly_extends_base_class_static_side_1);
                    if (!(staticBaseType.symbol && staticBaseType.symbol.flags & ts.SymbolFlags.Class)) {
                        // When the static base type is a "class-like" constructor function (but not actually a class), we verify
                        // that all instantiated base constructor signatures return the same type. We can simply compare the type
                        // references (as opposed to checking the structure of the types) because elsewhere we have already checked
                        // that the base type is a class or interface type (and not, for example, an anonymous object type).
                        var constructors = getInstantiatedConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments);
                        if (ts.forEach(constructors, function (sig) { return getReturnTypeOfSignature(sig) !== baseType; })) {
                            error(baseTypeNode.expression, ts.Diagnostics.Base_constructors_must_all_have_the_same_return_type);
                        }
                    }
                    checkKindsOfPropertyMemberOverrides(type, baseType);
                }
            }
            var implementedTypeNodes = ts.getClassImplementsHeritageClauseElements(node);
            if (implementedTypeNodes) {
                ts.forEach(implementedTypeNodes, function (typeRefNode) {
                    if (!ts.isSupportedExpressionWithTypeArguments(typeRefNode)) {
                        error(typeRefNode.expression, ts.Diagnostics.A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments);
                    }
                    checkTypeReferenceNode(typeRefNode);
                    if (produceDiagnostics) {
                        var t = getTypeFromTypeNode(typeRefNode);
                        if (t !== unknownType) {
                            var declaredType = (t.flags & ts.TypeFlags.Reference) ? t.target : t;
                            if (declaredType.flags & (ts.TypeFlags.Class | ts.TypeFlags.Interface | ts.TypeFlags.Declare)) {
                                checkTypeAssignableTo(type, t, node.name || node, ts.Diagnostics.Class_0_incorrectly_implements_interface_1);
                            }
                            else {
                                error(typeRefNode, ts.Diagnostics.A_class_may_only_implement_another_class_or_interface);
                            }
                        }
                    }
                });
            }
            if (produceDiagnostics) {
                checkIndexConstraints(type);
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        function getTargetSymbol(s) {
            // if symbol is instantiated its flags are not copied from the 'target'
            // so we'll need to get back original 'target' symbol to work with correct set of flags
            return s.flags & ts.SymbolFlags.Instantiated ? getSymbolLinks(s).target : s;
        }
        function getClassLikeDeclarationOfSymbol(symbol) {
            return ts.forEach(symbol.declarations, function (d) { return ts.isClassLike(d) ? d : undefined; });
        }
        function checkKindsOfPropertyMemberOverrides(type, baseType) {
            // TypeScript 1.0 spec (April 2014): 8.2.3
            // A derived class inherits all members from its base class it doesn't override.
            // Inheritance means that a derived class implicitly contains all non - overridden members of the base class.
            // Both public and private property members are inherited, but only public property members can be overridden.
            // A property member in a derived class is said to override a property member in a base class
            // when the derived class property member has the same name and kind(instance or static)
            // as the base class property member.
            // The type of an overriding property member must be assignable(section 3.8.4)
            // to the type of the overridden property member, or otherwise a compile - time error occurs.
            // Base class instance member functions can be overridden by derived class instance member functions,
            // but not by other kinds of members.
            // Base class instance member variables and accessors can be overridden by
            // derived class instance member variables and accessors, but not by other kinds of members.
            // NOTE: assignability is checked in checkClassDeclaration
            var baseProperties = getPropertiesOfObjectType(baseType);
            for (var _i = 0; _i < baseProperties.length; _i++) {
                var baseProperty = baseProperties[_i];
                var base = getTargetSymbol(baseProperty);
                if (base.flags & ts.SymbolFlags.Prototype) {
                    continue;
                }
                var derived = getTargetSymbol(getPropertyOfObjectType(type, base.name));
                var baseDeclarationFlags = getDeclarationFlagsFromSymbol(base);
                ts.Debug.assert(!!derived, "derived should point to something, even if it is the base class' declaration.");
                if (derived) {
                    // In order to resolve whether the inherited method was overriden in the base class or not,
                    // we compare the Symbols obtained. Since getTargetSymbol returns the symbol on the *uninstantiated*
                    // type declaration, derived and base resolve to the same symbol even in the case of generic classes.
                    if (derived === base) {
                        // derived class inherits base without override/redeclaration
                        var derivedClassDecl = getClassLikeDeclarationOfSymbol(type.symbol);
                        // It is an error to inherit an abstract member without implementing it or being declared abstract.
                        // If there is no declaration for the derived class (as in the case of class expressions),
                        // then the class cannot be declared abstract.
                        if (baseDeclarationFlags & ts.NodeFlags.Abstract && (!derivedClassDecl || !(derivedClassDecl.flags & ts.NodeFlags.Abstract))) {
                            if (derivedClassDecl.kind === ts.SyntaxKind.ClassExpression) {
                                error(derivedClassDecl, ts.Diagnostics.Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1, symbolToString(baseProperty), typeToString(baseType));
                            }
                            else {
                                error(derivedClassDecl, ts.Diagnostics.Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2, typeToString(type), symbolToString(baseProperty), typeToString(baseType));
                            }
                        }
                    }
                    else {
                        // derived overrides base.
                        var derivedDeclarationFlags = getDeclarationFlagsFromSymbol(derived);
                        if ((baseDeclarationFlags & ts.NodeFlags.Private) || (derivedDeclarationFlags & ts.NodeFlags.Private)) {
                            // either base or derived property is private - not override, skip it
                            continue;
                        }
                        if ((baseDeclarationFlags & ts.NodeFlags.Static) !== (derivedDeclarationFlags & ts.NodeFlags.Static)) {
                            // value of 'static' is not the same for properties - not override, skip it
                            continue;
                        }
                        if ((base.flags & derived.flags & ts.SymbolFlags.Method) || ((base.flags & ts.SymbolFlags.PropertyOrAccessor) && (derived.flags & ts.SymbolFlags.PropertyOrAccessor))) {
                            // method is overridden with method or property/accessor is overridden with property/accessor - correct case
                            continue;
                        }
                        var errorMessage = void 0;
                        if (base.flags & ts.SymbolFlags.Method) {
                            if (derived.flags & ts.SymbolFlags.Accessor) {
                                errorMessage = ts.Diagnostics.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
                            }
                            else {
                                ts.Debug.assert((derived.flags & ts.SymbolFlags.Property) !== 0);
                                errorMessage = ts.Diagnostics.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_property;
                            }
                        }
                        else if (base.flags & ts.SymbolFlags.Property) {
                            ts.Debug.assert((derived.flags & ts.SymbolFlags.Method) !== 0);
                            errorMessage = ts.Diagnostics.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
                        }
                        else {
                            ts.Debug.assert((base.flags & ts.SymbolFlags.Accessor) !== 0);
                            ts.Debug.assert((derived.flags & ts.SymbolFlags.Method) !== 0);
                            errorMessage = ts.Diagnostics.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
                        }
                        error(derived.valueDeclaration.name, errorMessage, typeToString(baseType), symbolToString(base), typeToString(type));
                    }
                }
            }
        }
        function isAccessor(kind) {
            return kind === ts.SyntaxKind.GetAccessor || kind === ts.SyntaxKind.SetAccessor;
        }
        function areTypeParametersIdentical(list1, list2) {
            if (!list1 && !list2) {
                return true;
            }
            if (!list1 || !list2 || list1.length !== list2.length) {
                return false;
            }
            // TypeScript 1.0 spec (April 2014):
            // When a generic interface has multiple declarations,  all declarations must have identical type parameter
            // lists, i.e. identical type parameter names with identical constraints in identical order.
            for (var i = 0, len = list1.length; i < len; i++) {
                var tp1 = list1[i];
                var tp2 = list2[i];
                if (tp1.name.text !== tp2.name.text) {
                    return false;
                }
                if (!tp1.constraint && !tp2.constraint) {
                    continue;
                }
                if (!tp1.constraint || !tp2.constraint) {
                    return false;
                }
                if (!isTypeIdenticalTo(getTypeFromTypeNode(tp1.constraint), getTypeFromTypeNode(tp2.constraint))) {
                    return false;
                }
            }
            return true;
        }
        function checkInheritedPropertiesAreIdentical(type, typeNode) {
            var baseTypes = getBaseTypes(type);
            if (baseTypes.length < 2) {
                return true;
            }
            var seen = {};
            ts.forEach(resolveDeclaredMembers(type).declaredProperties, function (p) { seen[p.name] = { prop: p, containingType: type }; });
            var ok = true;
            for (var _i = 0; _i < baseTypes.length; _i++) {
                var base = baseTypes[_i];
                var properties = getPropertiesOfObjectType(base);
                for (var _a = 0; _a < properties.length; _a++) {
                    var prop = properties[_a];
                    if (!ts.hasProperty(seen, prop.name)) {
                        seen[prop.name] = { prop: prop, containingType: base };
                    }
                    else {
                        var existing = seen[prop.name];
                        var isInheritedProperty = existing.containingType !== type;
                        if (isInheritedProperty && !isPropertyIdenticalTo(existing.prop, prop)) {
                            ok = false;
                            var typeName1 = typeToString(existing.containingType);
                            var typeName2 = typeToString(base);
                            var errorInfo = ts.chainDiagnosticMessages(undefined, ts.Diagnostics.Named_property_0_of_types_1_and_2_are_not_identical, symbolToString(prop), typeName1, typeName2);
                            errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.Interface_0_cannot_simultaneously_extend_types_1_and_2, typeToString(type), typeName1, typeName2);
                            diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(typeNode, errorInfo));
                        }
                    }
                }
            }
            return ok;
        }
        function checkInterfaceDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarInterfaceDeclaration(node);
            checkTypeParameters(node.typeParameters);
            if (produceDiagnostics) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Interface_name_cannot_be_0);
                checkExportsOnMergedDeclarations(node);
                var symbol = getSymbolOfNode(node);
                var firstInterfaceDecl = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.InterfaceDeclaration);
                if (symbol.declarations.length > 1) {
                    if (node !== firstInterfaceDecl && !areTypeParametersIdentical(firstInterfaceDecl.typeParameters, node.typeParameters)) {
                        error(node.name, ts.Diagnostics.All_declarations_of_an_interface_must_have_identical_type_parameters);
                    }
                }
                // Only check this symbol once
                if (node === firstInterfaceDecl) {
                    var type = getDeclaredTypeOfSymbol(symbol);
                    // run subsequent checks only if first set succeeded
                    if (checkInheritedPropertiesAreIdentical(type, node.name)) {
                        ts.forEach(getBaseTypes(type), function (baseType) {
                            checkTypeAssignableTo(type, baseType, node.name, ts.Diagnostics.Interface_0_incorrectly_extends_interface_1);
                        });
                        checkIndexConstraints(type);
                    }
                }
                // Interfaces cannot merge with non-ambient classes.
                if (symbol && symbol.declarations) {
                    for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                        var declaration = _a[_i];
                        if (declaration.kind === ts.SyntaxKind.ClassDeclaration && !ts.isInAmbientContext(declaration)) {
                            error(node, ts.Diagnostics.Only_an_ambient_class_can_be_merged_with_an_interface);
                            break;
                        }
                    }
                }
            }
            ts.forEach(ts.getInterfaceBaseTypeNodes(node), function (heritageElement) {
                if (!ts.isSupportedExpressionWithTypeArguments(heritageElement)) {
                    error(heritageElement.expression, ts.Diagnostics.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments);
                }
                checkTypeReferenceNode(heritageElement);
            });
            ts.forEach(node.members, checkSourceElement);
            if (produceDiagnostics) {
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        // [ConcreteTypeScript] 
        function checkDeclareTypeDeclaration(node) {
            if (produceDiagnostics) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Interface_name_cannot_be_0);
            }
            ts.forEach(ts.getDeclareTypeBaseTypeNodes(node), function (heritageElement) {
                if (!ts.isSupportedExpressionWithTypeArguments(heritageElement)) {
                    error(heritageElement.expression, ts.Diagnostics.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments);
                }
                checkTypeReferenceNode(heritageElement);
            });
            ts.forEach(node.members, checkSourceElement);
            if (produceDiagnostics) {
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        // [/ConcreteTypeScript] 
        function checkTypeAliasDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            checkTypeNameIsReserved(node.name, ts.Diagnostics.Type_alias_name_cannot_be_0);
            checkSourceElement(node.type);
        }
        function computeEnumMemberValues(node) {
            var nodeLinks = getNodeLinks(node);
            if (!(nodeLinks.flags & ts.NodeCheckFlags.EnumValuesComputed)) {
                var enumSymbol = getSymbolOfNode(node);
                var enumType = getDeclaredTypeOfSymbol(enumSymbol);
                var autoValue = 0;
                var ambient = ts.isInAmbientContext(node);
                var enumIsConst = ts.isConst(node);
                ts.forEach(node.members, function (member) {
                    if (member.name.kind !== ts.SyntaxKind.ComputedPropertyName && isNumericLiteralName(member.name.text)) {
                        error(member.name, ts.Diagnostics.An_enum_member_cannot_have_a_numeric_name);
                    }
                    var initializer = member.initializer;
                    if (initializer) {
                        autoValue = computeConstantValueForEnumMemberInitializer(initializer, enumType, enumIsConst, ambient);
                    }
                    else if (ambient && !enumIsConst) {
                        autoValue = undefined;
                    }
                    if (autoValue !== undefined) {
                        getNodeLinks(member).enumMemberValue = autoValue++;
                    }
                });
                nodeLinks.flags |= ts.NodeCheckFlags.EnumValuesComputed;
            }
            function computeConstantValueForEnumMemberInitializer(initializer, enumType, enumIsConst, ambient) {
                // Controls if error should be reported after evaluation of constant value is completed
                // Can be false if another more precise error was already reported during evaluation.
                var reportError = true;
                var value = evalConstant(initializer);
                if (reportError) {
                    if (value === undefined) {
                        if (enumIsConst) {
                            error(initializer, ts.Diagnostics.In_const_enum_declarations_member_initializer_must_be_constant_expression);
                        }
                        else if (!ambient) {
                            // Only here do we need to check that the initializer is assignable to the enum type.
                            // If it is a constant value (not undefined), it is syntactically constrained to be a number.
                            // Also, we do not need to check this for ambients because there is already
                            // a syntax error if it is not a constant.
                            checkTypeAssignableTo(checkExpression(initializer), enumType, initializer, /*headMessage*/ undefined);
                        }
                    }
                    else if (enumIsConst) {
                        if (isNaN(value)) {
                            error(initializer, ts.Diagnostics.const_enum_member_initializer_was_evaluated_to_disallowed_value_NaN);
                        }
                        else if (!isFinite(value)) {
                            error(initializer, ts.Diagnostics.const_enum_member_initializer_was_evaluated_to_a_non_finite_value);
                        }
                    }
                }
                return value;
                function evalConstant(e) {
                    switch (e.kind) {
                        case ts.SyntaxKind.PrefixUnaryExpression:
                            var value_1 = evalConstant(e.operand);
                            if (value_1 === undefined) {
                                return undefined;
                            }
                            switch (e.operator) {
                                case ts.SyntaxKind.PlusToken: return value_1;
                                case ts.SyntaxKind.MinusToken: return -value_1;
                                case ts.SyntaxKind.TildeToken: return ~value_1;
                            }
                            return undefined;
                        case ts.SyntaxKind.BinaryExpression:
                            var left = evalConstant(e.left);
                            if (left === undefined) {
                                return undefined;
                            }
                            var right = evalConstant(e.right);
                            if (right === undefined) {
                                return undefined;
                            }
                            switch (e.operatorToken.kind) {
                                case ts.SyntaxKind.BarToken: return left | right;
                                case ts.SyntaxKind.AmpersandToken: return left & right;
                                case ts.SyntaxKind.GreaterThanGreaterThanToken: return left >> right;
                                case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken: return left >>> right;
                                case ts.SyntaxKind.LessThanLessThanToken: return left << right;
                                case ts.SyntaxKind.CaretToken: return left ^ right;
                                case ts.SyntaxKind.AsteriskToken: return left * right;
                                case ts.SyntaxKind.SlashToken: return left / right;
                                case ts.SyntaxKind.PlusToken: return left + right;
                                case ts.SyntaxKind.MinusToken: return left - right;
                                case ts.SyntaxKind.PercentToken: return left % right;
                            }
                            return undefined;
                        case ts.SyntaxKind.NumericLiteral:
                            return +e.text;
                        case ts.SyntaxKind.ParenthesizedExpression:
                            return evalConstant(e.expression);
                        case ts.SyntaxKind.Identifier:
                        case ts.SyntaxKind.ElementAccessExpression:
                        case ts.SyntaxKind.PropertyAccessExpression:
                            var member = initializer.parent;
                            var currentType = getTypeOfSymbol(getSymbolOfNode(member.parent));
                            var enumType_1;
                            var propertyName;
                            if (e.kind === ts.SyntaxKind.Identifier) {
                                // unqualified names can refer to member that reside in different declaration of the enum so just doing name resolution won't work.
                                // instead pick current enum type and later try to fetch member from the type
                                enumType_1 = currentType;
                                propertyName = e.text;
                            }
                            else {
                                var expression;
                                if (e.kind === ts.SyntaxKind.ElementAccessExpression) {
                                    if (e.argumentExpression === undefined ||
                                        e.argumentExpression.kind !== ts.SyntaxKind.StringLiteral) {
                                        return undefined;
                                    }
                                    expression = e.expression;
                                    propertyName = e.argumentExpression.text;
                                }
                                else {
                                    expression = e.expression;
                                    propertyName = e.name.text;
                                }
                                // expression part in ElementAccess\PropertyAccess should be either identifier or dottedName
                                var current = expression;
                                while (current) {
                                    if (current.kind === ts.SyntaxKind.Identifier) {
                                        break;
                                    }
                                    else if (current.kind === ts.SyntaxKind.PropertyAccessExpression) {
                                        current = current.expression;
                                    }
                                    else {
                                        return undefined;
                                    }
                                }
                                enumType_1 = checkExpression(expression);
                                // allow references to constant members of other enums
                                if (!(enumType_1.symbol && (enumType_1.symbol.flags & ts.SymbolFlags.Enum))) {
                                    return undefined;
                                }
                            }
                            if (propertyName === undefined) {
                                return undefined;
                            }
                            var property = getPropertyOfObjectType(enumType_1, propertyName);
                            if (!property || !(property.flags & ts.SymbolFlags.EnumMember)) {
                                return undefined;
                            }
                            var propertyDecl = property.valueDeclaration;
                            // self references are illegal
                            if (member === propertyDecl) {
                                return undefined;
                            }
                            // illegal case: forward reference
                            if (!isDefinedBefore(propertyDecl, member)) {
                                reportError = false;
                                error(e, ts.Diagnostics.A_member_initializer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums);
                                return undefined;
                            }
                            return getNodeLinks(propertyDecl).enumMemberValue;
                    }
                }
            }
        }
        function checkEnumDeclaration(node) {
            if (!produceDiagnostics) {
                return;
            }
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarEnumDeclaration(node);
            checkTypeNameIsReserved(node.name, ts.Diagnostics.Enum_name_cannot_be_0);
            checkCollisionWithCapturedThisVariable(node, node.name);
            checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            checkExportsOnMergedDeclarations(node);
            computeEnumMemberValues(node);
            var enumIsConst = ts.isConst(node);
            if (compilerOptions.isolatedModules && enumIsConst && ts.isInAmbientContext(node)) {
                error(node.name, ts.Diagnostics.Ambient_const_enums_are_not_allowed_when_the_isolatedModules_flag_is_provided);
            }
            // Spec 2014 - Section 9.3:
            // It isn't possible for one enum declaration to continue the automatic numbering sequence of another,
            // and when an enum type has multiple declarations, only one declaration is permitted to omit a value
            // for the first member.
            //
            // Only perform this check once per symbol
            var enumSymbol = getSymbolOfNode(node);
            var firstDeclaration = ts.getDeclarationOfKind(enumSymbol, node.kind);
            if (node === firstDeclaration) {
                if (enumSymbol.declarations.length > 1) {
                    // check that const is placed\omitted on all enum declarations
                    ts.forEach(enumSymbol.declarations, function (decl) {
                        if (ts.isConstEnumDeclaration(decl) !== enumIsConst) {
                            error(decl.name, ts.Diagnostics.Enum_declarations_must_all_be_const_or_non_const);
                        }
                    });
                }
                var seenEnumMissingInitialInitializer = false;
                ts.forEach(enumSymbol.declarations, function (declaration) {
                    // return true if we hit a violation of the rule, false otherwise
                    if (declaration.kind !== ts.SyntaxKind.EnumDeclaration) {
                        return false;
                    }
                    var enumDeclaration = declaration;
                    if (!enumDeclaration.members.length) {
                        return false;
                    }
                    var firstEnumMember = enumDeclaration.members[0];
                    if (!firstEnumMember.initializer) {
                        if (seenEnumMissingInitialInitializer) {
                            error(firstEnumMember.name, ts.Diagnostics.In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initializer_for_its_first_enum_element);
                        }
                        else {
                            seenEnumMissingInitialInitializer = true;
                        }
                    }
                });
            }
        }
        function getFirstNonAmbientClassOrFunctionDeclaration(symbol) {
            var declarations = symbol.declarations;
            for (var _i = 0; _i < declarations.length; _i++) {
                var declaration = declarations[_i];
                if ((declaration.kind === ts.SyntaxKind.ClassDeclaration ||
                    (declaration.kind === ts.SyntaxKind.FunctionDeclaration && ts.nodeIsPresent(declaration.body))) &&
                    !ts.isInAmbientContext(declaration)) {
                    return declaration;
                }
            }
            return undefined;
        }
        function inSameLexicalScope(node1, node2) {
            var container1 = ts.getEnclosingBlockScopeContainer(node1);
            var container2 = ts.getEnclosingBlockScopeContainer(node2);
            if (isGlobalSourceFile(container1)) {
                return isGlobalSourceFile(container2);
            }
            else if (isGlobalSourceFile(container2)) {
                return false;
            }
            else {
                return container1 === container2;
            }
        }
        function checkModuleDeclaration(node) {
            if (produceDiagnostics) {
                // Grammar checking
                var isAmbientExternalModule = node.name.kind === ts.SyntaxKind.StringLiteral;
                var contextErrorMessage = isAmbientExternalModule
                    ? ts.Diagnostics.An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file
                    : ts.Diagnostics.A_namespace_declaration_is_only_allowed_in_a_namespace_or_module;
                if (checkGrammarModuleElementContext(node, contextErrorMessage)) {
                    // If we hit a module declaration in an illegal context, just bail out to avoid cascading errors.
                    return;
                }
                if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node)) {
                    if (!ts.isInAmbientContext(node) && node.name.kind === ts.SyntaxKind.StringLiteral) {
                        grammarErrorOnNode(node.name, ts.Diagnostics.Only_ambient_modules_can_use_quoted_names);
                    }
                }
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
                checkExportsOnMergedDeclarations(node);
                var symbol = getSymbolOfNode(node);
                // The following checks only apply on a non-ambient instantiated module declaration.
                if (symbol.flags & ts.SymbolFlags.ValueModule
                    && symbol.declarations.length > 1
                    && !ts.isInAmbientContext(node)
                    && ts.isInstantiatedModule(node, compilerOptions.preserveConstEnums || compilerOptions.isolatedModules)) {
                    var firstNonAmbientClassOrFunc = getFirstNonAmbientClassOrFunctionDeclaration(symbol);
                    if (firstNonAmbientClassOrFunc) {
                        if (ts.getSourceFileOfNode(node) !== ts.getSourceFileOfNode(firstNonAmbientClassOrFunc)) {
                            error(node.name, ts.Diagnostics.A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged);
                        }
                        else if (node.pos < firstNonAmbientClassOrFunc.pos) {
                            error(node.name, ts.Diagnostics.A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged);
                        }
                    }
                    // if the module merges with a class declaration in the same lexical scope,
                    // we need to track this to ensure the correct emit.
                    var mergedClass = ts.getDeclarationOfKind(symbol, ts.SyntaxKind.ClassDeclaration);
                    if (mergedClass &&
                        inSameLexicalScope(node, mergedClass)) {
                        getNodeLinks(node).flags |= ts.NodeCheckFlags.LexicalModuleMergesWithClass;
                    }
                }
                // Checks for ambient external modules.
                if (isAmbientExternalModule) {
                    if (!isGlobalSourceFile(node.parent)) {
                        error(node.name, ts.Diagnostics.Ambient_modules_cannot_be_nested_in_other_modules);
                    }
                    if (isExternalModuleNameRelative(node.name.text)) {
                        error(node.name, ts.Diagnostics.Ambient_module_declaration_cannot_specify_relative_module_name);
                    }
                }
            }
            checkSourceElement(node.body);
        }
        function getFirstIdentifier(node) {
            while (true) {
                if (node.kind === ts.SyntaxKind.QualifiedName) {
                    node = node.left;
                }
                else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    node = node.expression;
                }
                else {
                    break;
                }
            }
            ts.Debug.assert(node.kind === ts.SyntaxKind.Identifier);
            return node;
        }
        function checkExternalImportOrExportDeclaration(node) {
            var moduleName = ts.getExternalModuleName(node);
            if (!ts.nodeIsMissing(moduleName) && moduleName.kind !== ts.SyntaxKind.StringLiteral) {
                error(moduleName, ts.Diagnostics.String_literal_expected);
                return false;
            }
            var inAmbientExternalModule = node.parent.kind === ts.SyntaxKind.ModuleBlock && node.parent.parent.name.kind === ts.SyntaxKind.StringLiteral;
            if (node.parent.kind !== ts.SyntaxKind.SourceFile && !inAmbientExternalModule) {
                error(moduleName, node.kind === ts.SyntaxKind.ExportDeclaration ?
                    ts.Diagnostics.Export_declarations_are_not_permitted_in_a_namespace :
                    ts.Diagnostics.Import_declarations_in_a_namespace_cannot_reference_a_module);
                return false;
            }
            if (inAmbientExternalModule && isExternalModuleNameRelative(moduleName.text)) {
                // TypeScript 1.0 spec (April 2013): 12.1.6
                // An ExternalImportDeclaration in an AmbientExternalModuleDeclaration may reference
                // other external modules only through top - level external module names.
                // Relative external module names are not permitted.
                error(node, ts.Diagnostics.Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name);
                return false;
            }
            return true;
        }
        function checkAliasSymbol(node) {
            var symbol = getSymbolOfNode(node);
            var target = resolveAlias(symbol);
            if (target !== unknownSymbol) {
                var excludedMeanings = (symbol.flags & ts.SymbolFlags.Value ? ts.SymbolFlags.Value : 0) |
                    (symbol.flags & ts.SymbolFlags.Type ? ts.SymbolFlags.Type : 0) |
                    (symbol.flags & ts.SymbolFlags.Namespace ? ts.SymbolFlags.Namespace : 0);
                if (target.flags & excludedMeanings) {
                    var message = node.kind === ts.SyntaxKind.ExportSpecifier ?
                        ts.Diagnostics.Export_declaration_conflicts_with_exported_declaration_of_0 :
                        ts.Diagnostics.Import_declaration_conflicts_with_local_declaration_of_0;
                    error(node, message, symbolToString(symbol));
                }
            }
        }
        function checkImportBinding(node) {
            checkCollisionWithCapturedThisVariable(node, node.name);
            checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            checkAliasSymbol(node);
        }
        function checkImportDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) {
                // If we hit an import declaration in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & ts.NodeFlags.Modifier)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_import_declaration_cannot_have_modifiers);
            }
            if (checkExternalImportOrExportDeclaration(node)) {
                var importClause = node.importClause;
                if (importClause) {
                    if (importClause.name) {
                        checkImportBinding(importClause);
                    }
                    if (importClause.namedBindings) {
                        if (importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
                            checkImportBinding(importClause.namedBindings);
                        }
                        else {
                            ts.forEach(importClause.namedBindings.elements, checkImportBinding);
                        }
                    }
                }
            }
        }
        function checkImportEqualsDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) {
                // If we hit an import declaration in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            if (ts.isInternalModuleImportEqualsDeclaration(node) || checkExternalImportOrExportDeclaration(node)) {
                checkImportBinding(node);
                if (node.flags & ts.NodeFlags.Export) {
                    markExportAsReferenced(node);
                }
                if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                    var target = resolveAlias(getSymbolOfNode(node));
                    if (target !== unknownSymbol) {
                        if (target.flags & ts.SymbolFlags.Value) {
                            // Target is a value symbol, check that it is not hidden by a local declaration with the same name
                            var moduleName = getFirstIdentifier(node.moduleReference);
                            if (!(resolveEntityName(moduleName, ts.SymbolFlags.Value | ts.SymbolFlags.Namespace).flags & ts.SymbolFlags.Namespace)) {
                                error(moduleName, ts.Diagnostics.Module_0_is_hidden_by_a_local_declaration_with_the_same_name, ts.declarationNameToString(moduleName));
                            }
                        }
                        if (target.flags & ts.SymbolFlags.Type) {
                            checkTypeNameIsReserved(node.name, ts.Diagnostics.Import_name_cannot_be_0);
                        }
                    }
                }
                else {
                    if (languageVersion >= ts.ScriptTarget.ES6 && !ts.isInAmbientContext(node)) {
                        // Import equals declaration is deprecated in es6 or above
                        grammarErrorOnNode(node, ts.Diagnostics.Import_assignment_cannot_be_used_when_targeting_ECMAScript_6_or_higher_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_or_import_d_from_mod_instead);
                    }
                }
            }
        }
        function checkExportDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_export_declaration_can_only_be_used_in_a_module)) {
                // If we hit an export in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & ts.NodeFlags.Modifier)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_export_declaration_cannot_have_modifiers);
            }
            if (!node.moduleSpecifier || checkExternalImportOrExportDeclaration(node)) {
                if (node.exportClause) {
                    // export { x, y }
                    // export { x, y } from "foo"
                    ts.forEach(node.exportClause.elements, checkExportSpecifier);
                    var inAmbientExternalModule = node.parent.kind === ts.SyntaxKind.ModuleBlock && node.parent.parent.name.kind === ts.SyntaxKind.StringLiteral;
                    if (node.parent.kind !== ts.SyntaxKind.SourceFile && !inAmbientExternalModule) {
                        error(node, ts.Diagnostics.Export_declarations_are_not_permitted_in_a_namespace);
                    }
                }
                else {
                    // export * from "foo"
                    var moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier);
                    if (moduleSymbol && moduleSymbol.exports["export="]) {
                        error(node.moduleSpecifier, ts.Diagnostics.Module_0_uses_export_and_cannot_be_used_with_export_Asterisk, symbolToString(moduleSymbol));
                    }
                }
            }
        }
        function checkGrammarModuleElementContext(node, errorMessage) {
            if (node.parent.kind !== ts.SyntaxKind.SourceFile && node.parent.kind !== ts.SyntaxKind.ModuleBlock && node.parent.kind !== ts.SyntaxKind.ModuleDeclaration) {
                return grammarErrorOnFirstToken(node, errorMessage);
            }
        }
        function checkExportSpecifier(node) {
            checkAliasSymbol(node);
            if (!node.parent.parent.moduleSpecifier) {
                markExportAsReferenced(node);
            }
        }
        function checkExportAssignment(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_export_assignment_can_only_be_used_in_a_module)) {
                // If we hit an export assignment in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            var container = node.parent.kind === ts.SyntaxKind.SourceFile ? node.parent : node.parent.parent;
            if (container.kind === ts.SyntaxKind.ModuleDeclaration && container.name.kind === ts.SyntaxKind.Identifier) {
                error(node, ts.Diagnostics.An_export_assignment_cannot_be_used_in_a_namespace);
                return;
            }
            // Grammar checking
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & ts.NodeFlags.Modifier)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_export_assignment_cannot_have_modifiers);
            }
            if (node.expression.kind === ts.SyntaxKind.Identifier) {
                markExportAsReferenced(node);
            }
            else {
                checkExpressionCached(node.expression);
            }
            checkExternalModuleExports(container);
            if (node.isExportEquals && !ts.isInAmbientContext(node)) {
                if (languageVersion >= ts.ScriptTarget.ES6) {
                    // export assignment is deprecated in es6 or above
                    grammarErrorOnNode(node, ts.Diagnostics.Export_assignment_cannot_be_used_when_targeting_ECMAScript_6_or_higher_Consider_using_export_default_instead);
                }
                else if (compilerOptions.module === ts.ModuleKind.System) {
                    // system modules does not support export assignment
                    grammarErrorOnNode(node, ts.Diagnostics.Export_assignment_is_not_supported_when_module_flag_is_system);
                }
            }
        }
        function getModuleStatements(node) {
            if (node.kind === ts.SyntaxKind.SourceFile) {
                return node.statements;
            }
            if (node.kind === ts.SyntaxKind.ModuleDeclaration && node.body.kind === ts.SyntaxKind.ModuleBlock) {
                return node.body.statements;
            }
            return emptyArray;
        }
        function hasExportedMembers(moduleSymbol) {
            for (var id in moduleSymbol.exports) {
                if (id !== "export=") {
                    return true;
                }
            }
            return false;
        }
        function checkExternalModuleExports(node) {
            var moduleSymbol = getSymbolOfNode(node);
            var links = getSymbolLinks(moduleSymbol);
            if (!links.exportsChecked) {
                var exportEqualsSymbol = moduleSymbol.exports["export="];
                if (exportEqualsSymbol && hasExportedMembers(moduleSymbol)) {
                    var declaration = getDeclarationOfAliasSymbol(exportEqualsSymbol) || exportEqualsSymbol.valueDeclaration;
                    error(declaration, ts.Diagnostics.An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements);
                }
                links.exportsChecked = true;
            }
        }
        function checkTypePredicate(node) {
            if (!isInLegalTypePredicatePosition(node)) {
                error(node, ts.Diagnostics.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
            }
        }
        // [ConcreteTypeScript] Allow for checking which nodes are associated with which errors
        function checkSourceElement(node) {
            var diagnosticsBefore = ts.ENABLE_DEBUG_ANNOTATIONS && diagnostics.getDiagnostics();
            checkSourceElementWorker(node);
            var diagnosticsAfter = ts.ENABLE_DEBUG_ANNOTATIONS && diagnostics.getDiagnostics();
            if (ts.ENABLE_DEBUG_ANNOTATIONS && node && !node.DEBUG_checked && diagnosticsAfter.length > diagnosticsBefore.length) {
                node.DEBUG_checked = true;
                for (var i = diagnosticsBefore.length; i < diagnosticsAfter.length; i++) {
                    node.DEBUG_check_diagonistics = node.DEBUG_check_diagonistics || [];
                    var diagnostic = diagnosticsAfter[i];
                    var data = diagnostic.messageText;
                    while (data) {
                        if (typeof data === "string") {
                            node.DEBUG_check_diagonistics.push(data);
                            break;
                        }
                        else {
                            var messageText = diagnostic.messageText;
                            node.DEBUG_check_diagonistics.push(data.messageText);
                            data = data.next;
                        }
                    }
                }
            }
        }
        function checkSourceElementWorker(node) {
            // [/ConcreteTypeScript]
            if (!node) {
                return;
            }
            var kind = node.kind;
            if (cancellationToken) {
                // Only bother checking on a few construct kinds.  We don't want to be excessivly
                // hitting the cancellation token on every node we check.
                switch (kind) {
                    case ts.SyntaxKind.ModuleDeclaration:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration:
                        cancellationToken.throwIfCancellationRequested();
                }
            }
            switch (kind) {
                case ts.SyntaxKind.TypeParameter:
                    return checkTypeParameter(node);
                case ts.SyntaxKind.Parameter:
                    return checkParameter(node);
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    return checkPropertyDeclaration(node);
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.ConstructSignature:
                    return checkSignatureDeclaration(node);
                case ts.SyntaxKind.IndexSignature:
                    return checkSignatureDeclaration(node);
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    return checkMethodDeclaration(node);
                case ts.SyntaxKind.Constructor:
                    return checkConstructorDeclaration(node);
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                    return checkAccessorDeclaration(node);
                case ts.SyntaxKind.TypeReference:
                    return checkTypeReferenceNode(node);
                case ts.SyntaxKind.TypePredicate:
                    return checkTypePredicate(node);
                case ts.SyntaxKind.TypeQuery:
                    return checkTypeQuery(node);
                case ts.SyntaxKind.TypeLiteral:
                    return checkTypeLiteral(node);
                case ts.SyntaxKind.ArrayType:
                    return checkArrayType(node);
                case ts.SyntaxKind.TupleType:
                    return checkTupleType(node);
                case ts.SyntaxKind.UnionType:
                case ts.SyntaxKind.IntersectionType:
                    return checkUnionOrIntersectionType(node);
                case ts.SyntaxKind.ParenthesizedType:
                    return checkSourceElement(node.type);
                case ts.SyntaxKind.FunctionDeclaration:
                    return checkFunctionDeclaration(node);
                case ts.SyntaxKind.Block:
                case ts.SyntaxKind.ModuleBlock:
                    return checkBlock(node);
                case ts.SyntaxKind.VariableStatement:
                    return checkVariableStatement(node);
                case ts.SyntaxKind.ExpressionStatement:
                    return checkExpressionStatement(node);
                case ts.SyntaxKind.IfStatement:
                    return checkIfStatement(node);
                case ts.SyntaxKind.DoStatement:
                    return checkDoStatement(node);
                case ts.SyntaxKind.WhileStatement:
                    return checkWhileStatement(node);
                case ts.SyntaxKind.ForStatement:
                    return checkForStatement(node);
                case ts.SyntaxKind.ForInStatement:
                    return checkForInStatement(node);
                case ts.SyntaxKind.ForOfStatement:
                    return checkForOfStatement(node);
                case ts.SyntaxKind.ContinueStatement:
                case ts.SyntaxKind.BreakStatement:
                    return checkBreakOrContinueStatement(node);
                case ts.SyntaxKind.ReturnStatement:
                    return checkReturnStatement(node);
                case ts.SyntaxKind.WithStatement:
                    return checkWithStatement(node);
                case ts.SyntaxKind.SwitchStatement:
                    return checkSwitchStatement(node);
                case ts.SyntaxKind.LabeledStatement:
                    return checkLabeledStatement(node);
                case ts.SyntaxKind.ThrowStatement:
                    return checkThrowStatement(node);
                case ts.SyntaxKind.TryStatement:
                    return checkTryStatement(node);
                case ts.SyntaxKind.VariableDeclaration:
                    return checkVariableDeclaration(node);
                case ts.SyntaxKind.BindingElement:
                    return checkBindingElement(node);
                case ts.SyntaxKind.ClassDeclaration:
                    return checkClassDeclaration(node);
                case ts.SyntaxKind.InterfaceDeclaration:
                    return checkInterfaceDeclaration(node);
                case ts.SyntaxKind.BecomesType:
                    return;
                case ts.SyntaxKind.TypeAliasDeclaration:
                    return checkTypeAliasDeclaration(node);
                case ts.SyntaxKind.EnumDeclaration:
                    return checkEnumDeclaration(node);
                case ts.SyntaxKind.ModuleDeclaration:
                    return checkModuleDeclaration(node);
                case ts.SyntaxKind.ImportDeclaration:
                    return checkImportDeclaration(node);
                case ts.SyntaxKind.ImportEqualsDeclaration:
                    return checkImportEqualsDeclaration(node);
                case ts.SyntaxKind.ExportDeclaration:
                    return checkExportDeclaration(node);
                case ts.SyntaxKind.ExportAssignment:
                    return checkExportAssignment(node);
                case ts.SyntaxKind.EmptyStatement:
                    checkGrammarStatementInAmbientContext(node);
                    return;
                case ts.SyntaxKind.DebuggerStatement:
                    checkGrammarStatementInAmbientContext(node);
                    return;
                case ts.SyntaxKind.MissingDeclaration:
                    return checkMissingDeclaration(node);
            }
        }
        // Function and class expression bodies are checked after all statements in the enclosing body. This is
        // to ensure constructs like the following are permitted:
        //     let foo = function () {
        //        let s = foo();
        //        return "hello";
        //     }
        // Here, performing a full type check of the body of the function expression whilst in the process of
        // determining the type of foo would cause foo to be given type any because of the recursive reference.
        // Delaying the type check of the body ensures foo has been assigned a type.
        function checkFunctionAndClassExpressionBodies(node) {
            switch (node.kind) {
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    ts.forEach(node.parameters, checkFunctionAndClassExpressionBodies);
                    checkFunctionExpressionOrObjectLiteralMethodBody(node);
                    break;
                case ts.SyntaxKind.ClassExpression:
                    ts.forEach(node.members, checkSourceElement);
                    break;
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    ts.forEach(node.decorators, checkFunctionAndClassExpressionBodies);
                    ts.forEach(node.parameters, checkFunctionAndClassExpressionBodies);
                    if (ts.isObjectLiteralMethod(node)) {
                        checkFunctionExpressionOrObjectLiteralMethodBody(node);
                    }
                    break;
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.FunctionDeclaration:
                    ts.forEach(node.parameters, checkFunctionAndClassExpressionBodies);
                    break;
                case ts.SyntaxKind.WithStatement:
                    checkFunctionAndClassExpressionBodies(node.expression);
                    break;
                case ts.SyntaxKind.Decorator:
                case ts.SyntaxKind.Parameter:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.ObjectBindingPattern:
                case ts.SyntaxKind.ArrayBindingPattern:
                case ts.SyntaxKind.BindingElement:
                case ts.SyntaxKind.ArrayLiteralExpression:
                case ts.SyntaxKind.ObjectLiteralExpression:
                case ts.SyntaxKind.PropertyAssignment:
                case ts.SyntaxKind.PropertyAccessExpression:
                case ts.SyntaxKind.ElementAccessExpression:
                case ts.SyntaxKind.CallExpression:
                case ts.SyntaxKind.NewExpression:
                case ts.SyntaxKind.TaggedTemplateExpression:
                case ts.SyntaxKind.TemplateExpression:
                case ts.SyntaxKind.TemplateSpan:
                case ts.SyntaxKind.TypeAssertionExpression:
                case ts.SyntaxKind.AsExpression:
                case ts.SyntaxKind.ParenthesizedExpression:
                case ts.SyntaxKind.TypeOfExpression:
                case ts.SyntaxKind.VoidExpression:
                case ts.SyntaxKind.AwaitExpression:
                case ts.SyntaxKind.DeleteExpression:
                case ts.SyntaxKind.PrefixUnaryExpression:
                case ts.SyntaxKind.PostfixUnaryExpression:
                case ts.SyntaxKind.BinaryExpression:
                case ts.SyntaxKind.ConditionalExpression:
                case ts.SyntaxKind.SpreadElementExpression:
                case ts.SyntaxKind.YieldExpression:
                case ts.SyntaxKind.Block:
                case ts.SyntaxKind.ModuleBlock:
                case ts.SyntaxKind.VariableStatement:
                case ts.SyntaxKind.ExpressionStatement:
                case ts.SyntaxKind.IfStatement:
                case ts.SyntaxKind.DoStatement:
                case ts.SyntaxKind.WhileStatement:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                case ts.SyntaxKind.ContinueStatement:
                case ts.SyntaxKind.BreakStatement:
                case ts.SyntaxKind.ReturnStatement:
                case ts.SyntaxKind.SwitchStatement:
                case ts.SyntaxKind.CaseBlock:
                case ts.SyntaxKind.CaseClause:
                case ts.SyntaxKind.DefaultClause:
                case ts.SyntaxKind.LabeledStatement:
                case ts.SyntaxKind.ThrowStatement:
                case ts.SyntaxKind.TryStatement:
                case ts.SyntaxKind.CatchClause:
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.VariableDeclarationList:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.HeritageClause:
                case ts.SyntaxKind.ExpressionWithTypeArguments:
                case ts.SyntaxKind.EnumDeclaration:
                case ts.SyntaxKind.EnumMember:
                case ts.SyntaxKind.ExportAssignment:
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.JsxExpression:
                case ts.SyntaxKind.JsxElement:
                case ts.SyntaxKind.JsxSelfClosingElement:
                case ts.SyntaxKind.JsxAttribute:
                case ts.SyntaxKind.JsxSpreadAttribute:
                case ts.SyntaxKind.JsxOpeningElement:
                    ts.forEachChild(node, checkFunctionAndClassExpressionBodies);
                    break;
            }
        }
        // [ConcreteTypeScript] Helpers for checkSourceFile
        function doBeforeCheckPass(node) {
            ts.beforeCheckPass(node, checker, evalInCheckerContext);
        }
        function doAfterCheckPass(node) {
            ts.afterCheckPass(node, checker, evalInCheckerContext);
        }
        // [/ConcreteTypeScript]
        function checkSourceFile(node) {
            var start = new Date().getTime();
            // [ConcreteTypeScript] Add a debug pass for annotations used in "unit" testing (aka something more granular than compilation tests).
            // if (debug...)
            if (node.fileName.indexOf(".d.ts") === -1) {
                ts.forEachChildRecursive(node, doBeforeCheckPass);
            }
            // [/ConcreteTypeScript]
            checkSourceFileWorker(node);
            ts.checkTime += new Date().getTime() - start;
            // [ConcreteTypeScript] Add a debug pass for annotations used in "unit" testing (aka something more granular than compilation tests).
            // if (debug...)
            if (node.fileName.indexOf(".d.ts") === -1) {
                ts.forEachChildRecursive(node, doAfterCheckPass);
            }
            // [/ConcreteTypeScript]
        }
        // Fully type check a source file and collect the relevant diagnostics.
        function checkSourceFileWorker(node) {
            var links = getNodeLinks(node);
            if (!(links.flags & ts.NodeCheckFlags.TypeChecked)) {
                // Check whether the file has declared it is the default lib,
                // and whether the user has specifically chosen to avoid checking it.
                if (node.isDefaultLib && compilerOptions.skipDefaultLibCheck) {
                    return;
                }
                // Grammar checking
                checkGrammarSourceFile(node);
                emitExtends = false;
                emitDecorate = false;
                emitParam = false;
                potentialThisCollisions.length = 0;
                ts.forEach(node.statements, checkSourceElement);
                checkFunctionAndClassExpressionBodies(node);
                if (ts.isExternalModule(node)) {
                    checkExternalModuleExports(node);
                }
                if (potentialThisCollisions.length) {
                    ts.forEach(potentialThisCollisions, checkIfThisIsCapturedInEnclosingScope);
                    potentialThisCollisions.length = 0;
                }
                if (emitExtends) {
                    links.flags |= ts.NodeCheckFlags.EmitExtends;
                }
                if (emitDecorate) {
                    links.flags |= ts.NodeCheckFlags.EmitDecorate;
                }
                if (emitParam) {
                    links.flags |= ts.NodeCheckFlags.EmitParam;
                }
                if (emitAwaiter) {
                    links.flags |= ts.NodeCheckFlags.EmitAwaiter;
                }
                if (emitGenerator || (emitAwaiter && languageVersion < ts.ScriptTarget.ES6)) {
                    links.flags |= ts.NodeCheckFlags.EmitGenerator;
                }
                links.flags |= ts.NodeCheckFlags.TypeChecked;
            }
        }
        function getDiagnostics(sourceFile, ct) {
            try {
                // Record the cancellation token so it can be checked later on during checkSourceElement.
                // Do this in a finally block so we can ensure that it gets reset back to nothing after
                // this call is done.
                cancellationToken = ct;
                return getDiagnosticsWorker(sourceFile);
            }
            finally {
                cancellationToken = undefined;
            }
        }
        function getDiagnosticsWorker(sourceFile) {
            throwIfNonDiagnosticsProducing();
            if (sourceFile) {
                checkSourceFile(sourceFile);
                return diagnostics.getDiagnostics(sourceFile.fileName);
            }
            ts.forEach(host.getSourceFiles(), checkSourceFile);
            return diagnostics.getDiagnostics();
        }
        function getGlobalDiagnostics() {
            throwIfNonDiagnosticsProducing();
            return diagnostics.getGlobalDiagnostics();
        }
        function throwIfNonDiagnosticsProducing() {
            if (!produceDiagnostics) {
                throw new Error("Trying to get diagnostics from a type checker that does not produce them.");
            }
        }
        // Language service support
        function isInsideWithStatementBody(node) {
            if (node) {
                while (node.parent) {
                    if (node.parent.kind === ts.SyntaxKind.WithStatement && node.parent.statement === node) {
                        return true;
                    }
                    node = node.parent;
                }
            }
            return false;
        }
        function getSymbolsInScope(location, meaning) {
            var symbols = {};
            var memberFlags = 0;
            if (isInsideWithStatementBody(location)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return [];
            }
            populateSymbols();
            return symbolsToArray(symbols);
            function populateSymbols() {
                while (location) {
                    if (location.locals && !isGlobalSourceFile(location)) {
                        copySymbols(location.locals, meaning);
                    }
                    switch (location.kind) {
                        case ts.SyntaxKind.SourceFile:
                            if (!ts.isExternalModule(location)) {
                                break;
                            }
                        case ts.SyntaxKind.ModuleDeclaration:
                            copySymbols(getSymbolOfNode(location).exports, meaning & ts.SymbolFlags.ModuleMember);
                            break;
                        case ts.SyntaxKind.EnumDeclaration:
                            copySymbols(getSymbolOfNode(location).exports, meaning & ts.SymbolFlags.EnumMember);
                            break;
                        case ts.SyntaxKind.ClassExpression:
                            var className = location.name;
                            if (className) {
                                copySymbol(location.symbol, meaning);
                            }
                        // fall through; this fall-through is necessary because we would like to handle
                        // type parameter inside class expression similar to how we handle it in classDeclaration and interface Declaration
                        case ts.SyntaxKind.ClassDeclaration:
                        case ts.SyntaxKind.InterfaceDeclaration:
                            // If we didn't come from static member of class or interface,
                            // add the type parameters into the symbol table
                            // (type parameters of classDeclaration/classExpression and interface are in member property of the symbol.
                            // Note: that the memberFlags come from previous iteration.
                            if (!(memberFlags & ts.NodeFlags.Static)) {
                                copySymbols(getSymbolOfNode(location).members, meaning & ts.SymbolFlags.Type);
                            }
                            break;
                        case ts.SyntaxKind.FunctionExpression:
                            var funcName = location.name;
                            if (funcName) {
                                copySymbol(location.symbol, meaning);
                            }
                            break;
                    }
                    if (ts.introducesArgumentsExoticObject(location)) {
                        copySymbol(argumentsSymbol, meaning);
                    }
                    memberFlags = location.flags;
                    location = location.parent;
                }
                copySymbols(globals, meaning);
            }
            /**
             * Copy the given symbol into symbol tables if the symbol has the given meaning
             * and it doesn't already existed in the symbol table
             * @param key a key for storing in symbol table; if undefined, use symbol.name
             * @param symbol the symbol to be added into symbol table
             * @param meaning meaning of symbol to filter by before adding to symbol table
             */
            function copySymbol(symbol, meaning) {
                if (symbol.flags & meaning) {
                    var id = symbol.name;
                    // We will copy all symbol regardless of its reserved name because
                    // symbolsToArray will check whether the key is a reserved name and
                    // it will not copy symbol with reserved name to the array
                    if (!ts.hasProperty(symbols, id)) {
                        symbols[id] = symbol;
                    }
                }
            }
            function copySymbols(source, meaning) {
                if (meaning) {
                    for (var id in source) {
                        var symbol = source[id];
                        copySymbol(symbol, meaning);
                    }
                }
            }
        }
        function isTypeDeclarationName(name) {
            return name.kind === ts.SyntaxKind.Identifier &&
                isTypeDeclaration(name.parent) &&
                name.parent.name === name;
        }
        function isTypeDeclaration(node) {
            switch (node.kind) {
                case ts.SyntaxKind.TypeParameter:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                case ts.SyntaxKind.BrandTypeDeclaration:
                case ts.SyntaxKind.TypeAliasDeclaration:
                case ts.SyntaxKind.EnumDeclaration:
                    return true;
            }
        }
        // True if the given identifier is part of a type reference
        function isTypeReferenceIdentifier(entityName) {
            var node = entityName;
            while (node.parent && node.parent.kind === ts.SyntaxKind.QualifiedName) {
                node = node.parent;
            }
            return node.parent && node.parent.kind === ts.SyntaxKind.TypeReference;
        }
        function isHeritageClauseElementIdentifier(entityName) {
            var node = entityName;
            while (node.parent && node.parent.kind === ts.SyntaxKind.PropertyAccessExpression) {
                node = node.parent;
            }
            return node.parent && node.parent.kind === ts.SyntaxKind.ExpressionWithTypeArguments;
        }
        function getLeftSideOfImportEqualsOrExportAssignment(nodeOnRightSide) {
            while (nodeOnRightSide.parent.kind === ts.SyntaxKind.QualifiedName) {
                nodeOnRightSide = nodeOnRightSide.parent;
            }
            if (nodeOnRightSide.parent.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
                return nodeOnRightSide.parent.moduleReference === nodeOnRightSide && nodeOnRightSide.parent;
            }
            if (nodeOnRightSide.parent.kind === ts.SyntaxKind.ExportAssignment) {
                return nodeOnRightSide.parent.expression === nodeOnRightSide && nodeOnRightSide.parent;
            }
            return undefined;
        }
        function isInRightSideOfImportOrExportAssignment(node) {
            return getLeftSideOfImportEqualsOrExportAssignment(node) !== undefined;
        }
        function getSymbolOfEntityNameOrPropertyAccessExpression(entityName) {
            if (ts.isDeclarationName(entityName)) {
                return getSymbolOfNode(entityName.parent);
            }
            if (entityName.parent.kind === ts.SyntaxKind.ExportAssignment) {
                return resolveEntityName(entityName, 
                /*all meanings*/ ts.SymbolFlags.Value | ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias);
            }
            if (entityName.kind !== ts.SyntaxKind.PropertyAccessExpression) {
                if (isInRightSideOfImportOrExportAssignment(entityName)) {
                    // Since we already checked for ExportAssignment, this really could only be an Import
                    return getSymbolOfPartOfRightHandSideOfImportEquals(entityName);
                }
            }
            if (ts.isRightSideOfQualifiedNameOrPropertyAccess(entityName)) {
                entityName = entityName.parent;
            }
            if (isHeritageClauseElementIdentifier(entityName)) {
                var meaning = entityName.parent.kind === ts.SyntaxKind.ExpressionWithTypeArguments ? ts.SymbolFlags.Type : ts.SymbolFlags.Namespace;
                meaning |= ts.SymbolFlags.Alias;
                return resolveEntityName(entityName, meaning);
            }
            else if ((entityName.parent.kind === ts.SyntaxKind.JsxOpeningElement) ||
                (entityName.parent.kind === ts.SyntaxKind.JsxSelfClosingElement) ||
                (entityName.parent.kind === ts.SyntaxKind.JsxClosingElement)) {
                return getJsxElementTagSymbol(entityName.parent);
            }
            else if (ts.isExpression(entityName)) {
                if (ts.nodeIsMissing(entityName)) {
                    // Missing entity name.
                    return undefined;
                }
                if (entityName.kind === ts.SyntaxKind.Identifier) {
                    // Include aliases in the meaning, this ensures that we do not follow aliases to where they point and instead
                    // return the alias symbol.
                    var meaning = ts.SymbolFlags.Value | ts.SymbolFlags.Alias;
                    return resolveEntityName(entityName, meaning);
                }
                else if (entityName.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    var symbol = getNodeLinks(entityName).resolvedSymbol;
                    if (!symbol) {
                        checkPropertyAccessExpression(entityName);
                    }
                    return getNodeLinks(entityName).resolvedSymbol;
                }
                else if (entityName.kind === ts.SyntaxKind.QualifiedName) {
                    var symbol = getNodeLinks(entityName).resolvedSymbol;
                    if (!symbol) {
                        checkQualifiedName(entityName);
                    }
                    return getNodeLinks(entityName).resolvedSymbol;
                }
            }
            else if (isTypeReferenceIdentifier(entityName)) {
                var meaning = entityName.parent.kind === ts.SyntaxKind.TypeReference ? ts.SymbolFlags.Type : ts.SymbolFlags.Namespace;
                // Include aliases in the meaning, this ensures that we do not follow aliases to where they point and instead
                // return the alias symbol.
                meaning |= ts.SymbolFlags.Alias;
                return resolveEntityName(entityName, meaning);
            }
            else if (entityName.parent.kind === ts.SyntaxKind.JsxAttribute) {
                return getJsxAttributePropertySymbol(entityName.parent);
            }
            if (entityName.parent.kind === ts.SyntaxKind.TypePredicate) {
                return resolveEntityName(entityName, /*meaning*/ ts.SymbolFlags.FunctionScopedVariable);
            }
            // Do we want to return undefined here?
            return undefined;
        }
        function getSymbolAtLocation(node) {
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            if (ts.isDeclarationName(node)) {
                // This is a declaration, call getSymbolOfNode
                return getSymbolOfNode(node.parent);
            }
            if (node.kind === ts.SyntaxKind.Identifier) {
                if (isInRightSideOfImportOrExportAssignment(node)) {
                    return node.parent.kind === ts.SyntaxKind.ExportAssignment
                        ? getSymbolOfEntityNameOrPropertyAccessExpression(node)
                        : getSymbolOfPartOfRightHandSideOfImportEquals(node);
                }
                else if (node.parent.kind === ts.SyntaxKind.BindingElement &&
                    node.parent.parent.kind === ts.SyntaxKind.ObjectBindingPattern &&
                    node === node.parent.propertyName) {
                    var typeOfPattern = getTypeOfNode(node.parent.parent);
                    var propertyDeclaration = typeOfPattern && getPropertyOfType(typeOfPattern, node.text);
                    if (propertyDeclaration) {
                        return propertyDeclaration;
                    }
                }
            }
            switch (node.kind) {
                case ts.SyntaxKind.Identifier:
                case ts.SyntaxKind.PropertyAccessExpression:
                case ts.SyntaxKind.QualifiedName:
                    return getSymbolOfEntityNameOrPropertyAccessExpression(node);
                case ts.SyntaxKind.ThisKeyword:
                case ts.SyntaxKind.SuperKeyword:
                    var type = checkExpression(node);
                    return type.symbol;
                case ts.SyntaxKind.ConstructorKeyword:
                    // constructor keyword for an overload, should take us to the definition if it exist
                    var constructorDeclaration = node.parent;
                    if (constructorDeclaration && constructorDeclaration.kind === ts.SyntaxKind.Constructor) {
                        return constructorDeclaration.parent.symbol;
                    }
                    return undefined;
                case ts.SyntaxKind.StringLiteral:
                    // External module name in an import declaration
                    if ((ts.isExternalModuleImportEqualsDeclaration(node.parent.parent) &&
                        ts.getExternalModuleImportEqualsDeclarationExpression(node.parent.parent) === node) ||
                        ((node.parent.kind === ts.SyntaxKind.ImportDeclaration || node.parent.kind === ts.SyntaxKind.ExportDeclaration) &&
                            node.parent.moduleSpecifier === node)) {
                        return resolveExternalModuleName(node, node);
                    }
                // Fall through
                case ts.SyntaxKind.NumericLiteral:
                    // index access
                    if (node.parent.kind === ts.SyntaxKind.ElementAccessExpression && node.parent.argumentExpression === node) {
                        var objectType = checkExpression(node.parent.expression);
                        if (objectType === unknownType)
                            return undefined;
                        var apparentType = getApparentType(objectType);
                        if (apparentType === unknownType)
                            return undefined;
                        return getPropertyOfType(apparentType, node.text);
                    }
                    break;
            }
            return undefined;
        }
        function getShorthandAssignmentValueSymbol(location) {
            // The function returns a value symbol of an identifier in the short-hand property assignment.
            // This is necessary as an identifier in short-hand property assignment can contains two meaning:
            // property name and property value.
            if (location && location.kind === ts.SyntaxKind.ShorthandPropertyAssignment) {
                return resolveEntityName(location.name, ts.SymbolFlags.Value);
            }
            return undefined;
        }
        // [ConcreteTypeScript]
        // TODO name this properly or find if its redundant
        function typeSubSet(current, target) {
            if (isConcreteType(target) && !isConcreteType(current)) {
                return false;
            }
            current = unconcrete(current);
            target = unconcrete(target);
            if (target && !isTypeSubtypeOf(current, target)) {
                return false;
            }
            return true;
        }
        function values(obj) {
            var ret = [];
            for (var key in obj) {
                if (ts.hasProperty(obj, key)) {
                    ret.push(obj[key]);
                }
            }
            return ret;
        }
        // [ConcreteTypeScript]
        function getBrandInterface(target) {
            return target.symbol && ts.getSymbolDecl(target.symbol, ts.SyntaxKind.DeclareTypeDeclaration);
        }
        // [ConcreteTypeScript]
        function getDeclareTypeNode(target) {
            return target.symbol && ts.getSymbolDecl(target.symbol, ts.SyntaxKind.DeclareType);
        }
        // [ConcreteTypeScript]
        function isFreshDeclareType(target) {
            // Remove concreteness to see declarations properly:
            target = unconcrete(target);
            // The target type is fresh if it is is a DeclareTypeNode that does not refer to a brand interface.
            return !getBrandInterface(target) && getDeclareTypeNode(target);
        }
        // [ConcreteTypeScript]
        function isIntermediateFlowTypeSubtypeOfTarget(type) {
            if (!type.targetType) {
                return false;
            }
            // If we are defining a new type through 'declare', we are a subset 
            // of our target type if members are bound to subsets of their types 
            // at the end of the function.
            // We treat this case specially to avoid calling getPropertyOfType in a cycle.
            if (isFreshDeclareType(type.targetType)) {
                // Path 1: Member-capturing becomes through 'declare MyType'
                var flowData = type.flowData;
                var target = unconcrete(type.targetType);
                var finalFlowData = getFlowDataForType(target);
                if (!finalFlowData) {
                    // Recursive case; assume true.
                    return true;
                }
                for (var i = 0; i < finalFlowData.flowTypes.length; i++) {
                    var hasOne = false;
                    for (var j = 0; j < flowData.flowTypes.length; j++) {
                        var tF = finalFlowData.flowTypes[i].type; // Final
                        var tC = flowData.flowTypes[j].type; // Current
                        // Must have at least one subsetting type:
                        if (typeSubSet(tC, tF)) {
                            hasOne = true;
                            break;
                        }
                    }
                    if (!hasOne)
                        return false;
                }
                for (var _i = 0, _a = values(finalFlowData.memberSet); _i < _a.length; _i++) {
                    var memberFinal = _a[_i];
                    var memberCurrent = ts.getProperty(flowData.memberSet, memberFinal.key);
                    if (!memberCurrent) {
                        return false;
                    }
                    var tC = flowTypeGet(memberCurrent);
                    var tF = flowTypeGet(memberFinal);
                    if (!typeSubSet(tC, tF)) {
                        return false;
                    }
                }
                return true;
            }
            else {
                for (var _b = 0, _c = getPropertiesOfType(type.targetType); _b < _c.length; _b++) {
                    var property = _c[_b];
                    var targetPropType = getTypeOfSymbol(property);
                    var currentProp = getPropertyOfType(type, property.name);
                    if (!currentProp) {
                        return false;
                    }
                    var currentPropType = getTypeOfSymbol(currentProp);
                    if (!typeSubSet(currentPropType, targetPropType)) {
                        return false;
                    }
                }
                return true;
            }
        }
        // [ConcreteTypeScript] The minimal intersection that represents the same declare-types, classes, and members.
        function getMinimalTypeList(types) {
            var filteredTypes = [];
            for (var i = 0; i < types.length; i++) {
                if (!isRedundant(i)) {
                    filteredTypes.push(types[i]);
                }
            }
            return filteredTypes;
            // Where:
            function isRedundant(i) {
                for (var j = 0; j < types.length; j++) {
                    if (i === j) {
                        continue;
                    }
                    var cj = isConcreteType(types[j]), ci = isConcreteType(types[i]);
                    var tj = unconcrete(types[j]), ti = unconcrete(types[i]);
                    if (isTypeIdenticalTo(tj, ti)) {
                        if (+cj > +ci) {
                            return true; // Obsoleted by stronger concrete version
                        }
                        // If we are the second duplicate of same concreteness, obsolete:
                        if (ci === cj && i > j) {
                            return true;
                        }
                    }
                    else if (isTypeSubtypeOf(types[j], types[i])) {
                        if (+cj >= +ci) {
                            return true; // Obsoleted by stronger concrete version
                        }
                    }
                }
                return false;
            }
        }
        // [ConcreteTypeScript] 
        // Determines if the target type has been achieved.
        // The formal type with degrading is used for binding.
        function getFormalTypeFromIntermediateFlowType(type, degrade) {
            if (isIntermediateFlowTypeSubtypeOfTarget(type)) {
                // Collect the base types and the target type:
                var types = type.flowData.flowTypes.map(function (ft) { return ft.type; });
                types.push(type.targetType);
                // Create an intersection type, but do manual pruning that typescript
                // doesnt do on getIntersectionType():
                return getIntersectionType(getMinimalTypeList(types));
            }
            return degrade ? flowDataFormalType(type.flowData) : type;
        }
        // [ConcreteTypeScript] 
        function getBindingType(type) {
            if (type.flags & ts.TypeFlags.IntermediateFlow) {
                return getFormalTypeFromIntermediateFlowType(type, /*Degrade*/ true);
            }
            return stripWeakConcreteType(type);
        }
        // [ConcreteTypeScript] 
        // Taking into account data-flow analysis, return the type and any augments.
        function getFlowTypeAtLocation(node, type) {
            // If we resolved as an intermediate type node, update with location information:
            //            let currentFlowData:FlowData = getFlowDataAtLocation(node, type);
            //          if (currentFlowData && type.flags & TypeFlags.IntermediateFlow) {
            // TODO: For now, don't support becomes on arbitrary values for perf. reasons
            if (type.flags & ts.TypeFlags.IntermediateFlow) {
                var currentFlowData = getFlowDataAtLocation(node, type);
                if (!currentFlowData) {
                    return type;
                }
                var intermediateFlowType = createObjectType(ts.TypeFlags.IntermediateFlow);
                intermediateFlowType.targetType = type.targetType;
                intermediateFlowType.declareTypeNode = type.declareTypeNode;
                intermediateFlowType.flowData = currentFlowData;
                return intermediateFlowType;
            }
            else {
                return type;
            }
        }
        // [ConcreteTypeScript]
        function getTypeOfNode(node, dontExpandIFT) {
            if (dontExpandIFT === void 0) { dontExpandIFT = false; }
            node.checker = checker;
            var type = getTypeOfNodeWorker(node);
            // Handle become-types:
            if (!dontExpandIFT && type.flags & ts.TypeFlags.IntermediateFlow) {
                return getFormalTypeFromIntermediateFlowType(type, /*Don't degrade: */ false);
            }
            return type;
        }
        // [/ConcreteTypeScript]
        function getTypeOfNodeWorker(node) {
            node.checker = checker; // [ConcreteTypeScript] For emit
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return unknownType;
            }
            if (ts.isTypeNode(node)) {
                return getTypeFromTypeNode(node);
            }
            if (ts.isExpression(node)) {
                return getTypeOfExpression(node);
            }
            if (ts.isExpressionWithTypeArgumentsInClassExtendsClause(node)) {
                // A SyntaxKind.ExpressionWithTypeArguments is considered a type node, except when it occurs in the
                // extends clause of a class. We handle that case here.
                return getBaseTypes(getDeclaredTypeOfSymbol(getSymbolOfNode(node.parent.parent)))[0];
            }
            if (isTypeDeclaration(node)) {
                // In this case, we call getSymbolOfNode instead of getSymbolAtLocation because it is a declaration
                var symbol = getSymbolOfNode(node);
                return getDeclaredTypeOfSymbol(symbol);
            }
            if (isTypeDeclarationName(node)) {
                var symbol = getSymbolAtLocation(node);
                return symbol && getDeclaredTypeOfSymbol(symbol);
            }
            if (ts.isDeclaration(node)) {
                // In this case, we call getSymbolOfNode instead of getSymbolAtLocation because it is a declaration
                var symbol = getSymbolOfNode(node);
                return getTypeOfSymbol(symbol);
            }
            if (ts.isDeclarationName(node)) {
                var symbol = getSymbolAtLocation(node);
                return symbol && getTypeOfSymbol(symbol);
            }
            if (ts.isBindingPattern(node)) {
                return getTypeForVariableLikeDeclaration(node.parent);
            }
            if (isInRightSideOfImportOrExportAssignment(node)) {
                var symbol = getSymbolAtLocation(node);
                var declaredType = symbol && getDeclaredTypeOfSymbol(symbol);
                return declaredType !== unknownType ? declaredType : getTypeOfSymbol(symbol);
            }
            return unknownType;
        }
        function getTypeOfExpression(expr) {
            expr.checker = checker; // [ConcreteTypeScript] For emit
            if (ts.isRightSideOfQualifiedNameOrPropertyAccess(expr)) {
                expr = expr.parent;
            }
            return checkExpression(expr);
        }
        /**
          * Gets either the static or instance type of a class element, based on
          * whether the element is declared as "static".
          */
        function getParentTypeOfClassElement(node) {
            var classSymbol = getSymbolOfNode(node.parent);
            return node.flags & ts.NodeFlags.Static
                ? getTypeOfSymbol(classSymbol)
                : getDeclaredTypeOfSymbol(classSymbol);
        }
        // Return the list of properties of the given type, augmented with properties from Function
        // if the type has call or construct signatures
        function getAugmentedPropertiesOfType(type) {
            type = getApparentType(type);
            var propsByName = createSymbolTable(getPropertiesOfType(type));
            if (getSignaturesOfType(type, ts.SignatureKind.Call).length || getSignaturesOfType(type, ts.SignatureKind.Construct).length) {
                ts.forEach(getPropertiesOfType(globalFunctionType), function (p) {
                    if (!ts.hasProperty(propsByName, p.name)) {
                        propsByName[p.name] = p;
                    }
                });
            }
            return getNamedMembers(propsByName);
        }
        function getRootSymbols(symbol) {
            if (symbol.flags & ts.SymbolFlags.SyntheticProperty) {
                var symbols = [];
                var name_7 = symbol.name;
                ts.forEach(getSymbolLinks(symbol).containingType.types, function (t) {
                    var symbol = getPropertyOfType(t, name_7);
                    if (symbol) {
                        symbols.push(symbol);
                    }
                });
                return symbols;
            }
            else if (symbol.flags & ts.SymbolFlags.Transient) {
                var target = getSymbolLinks(symbol).target;
                if (target) {
                    return [target];
                }
            }
            return [symbol];
        }
        // Emitter support
        // When resolved as an expression identifier, if the given node references an exported entity, return the declaration
        // node of the exported entity's container. Otherwise, return undefined.
        function getReferencedExportContainer(node) {
            var symbol = getReferencedValueSymbol(node);
            if (symbol) {
                if (symbol.flags & ts.SymbolFlags.ExportValue) {
                    // If we reference an exported entity within the same module declaration, then whether
                    // we prefix depends on the kind of entity. SymbolFlags.ExportHasLocal encompasses all the
                    // kinds that we do NOT prefix.
                    var exportSymbol = getMergedSymbol(symbol.exportSymbol);
                    if (exportSymbol.flags & ts.SymbolFlags.ExportHasLocal) {
                        return undefined;
                    }
                    symbol = exportSymbol;
                }
                var parentSymbol = getParentOfSymbol(symbol);
                if (parentSymbol) {
                    if (parentSymbol.flags & ts.SymbolFlags.ValueModule && parentSymbol.valueDeclaration.kind === ts.SyntaxKind.SourceFile) {
                        return parentSymbol.valueDeclaration;
                    }
                    for (var n = node.parent; n; n = n.parent) {
                        if ((n.kind === ts.SyntaxKind.ModuleDeclaration || n.kind === ts.SyntaxKind.EnumDeclaration) && getSymbolOfNode(n) === parentSymbol) {
                            return n;
                        }
                    }
                }
            }
        }
        // When resolved as an expression identifier, if the given node references an import, return the declaration of
        // that import. Otherwise, return undefined.
        function getReferencedImportDeclaration(node) {
            var symbol = getReferencedValueSymbol(node);
            return symbol && symbol.flags & ts.SymbolFlags.Alias ? getDeclarationOfAliasSymbol(symbol) : undefined;
        }
        function isStatementWithLocals(node) {
            switch (node.kind) {
                case ts.SyntaxKind.Block:
                case ts.SyntaxKind.CaseBlock:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                    return true;
            }
            return false;
        }
        function isNestedRedeclarationSymbol(symbol) {
            if (symbol.flags & ts.SymbolFlags.BlockScoped) {
                var links = getSymbolLinks(symbol);
                if (links.isNestedRedeclaration === undefined) {
                    var container = ts.getEnclosingBlockScopeContainer(symbol.valueDeclaration);
                    links.isNestedRedeclaration = isStatementWithLocals(container) &&
                        !!resolveName(container.parent, symbol.name, ts.SymbolFlags.Value, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined);
                }
                return links.isNestedRedeclaration;
            }
            return false;
        }
        // When resolved as an expression identifier, if the given node references a nested block scoped entity with
        // a name that hides an existing name, return the declaration of that entity. Otherwise, return undefined.
        function getReferencedNestedRedeclaration(node) {
            var symbol = getReferencedValueSymbol(node);
            return symbol && isNestedRedeclarationSymbol(symbol) ? symbol.valueDeclaration : undefined;
        }
        // Return true if the given node is a declaration of a nested block scoped entity with a name that hides an
        // existing name.
        function isNestedRedeclaration(node) {
            return isNestedRedeclarationSymbol(getSymbolOfNode(node));
        }
        function isValueAliasDeclaration(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportEqualsDeclaration:
                case ts.SyntaxKind.ImportClause:
                case ts.SyntaxKind.NamespaceImport:
                case ts.SyntaxKind.ImportSpecifier:
                case ts.SyntaxKind.ExportSpecifier:
                    return isAliasResolvedToValue(getSymbolOfNode(node));
                case ts.SyntaxKind.ExportDeclaration:
                    var exportClause = node.exportClause;
                    return exportClause && ts.forEach(exportClause.elements, isValueAliasDeclaration);
                case ts.SyntaxKind.ExportAssignment:
                    return node.expression && node.expression.kind === ts.SyntaxKind.Identifier ? isAliasResolvedToValue(getSymbolOfNode(node)) : true;
            }
            return false;
        }
        function isTopLevelValueImportEqualsWithEntityName(node) {
            if (node.parent.kind !== ts.SyntaxKind.SourceFile || !ts.isInternalModuleImportEqualsDeclaration(node)) {
                // parent is not source file or it is not reference to internal module
                return false;
            }
            var isValue = isAliasResolvedToValue(getSymbolOfNode(node));
            return isValue && node.moduleReference && !ts.nodeIsMissing(node.moduleReference);
        }
        function isAliasResolvedToValue(symbol) {
            var target = resolveAlias(symbol);
            if (target === unknownSymbol && compilerOptions.isolatedModules) {
                return true;
            }
            // const enums and modules that contain only const enums are not considered values from the emit perespective
            // unless 'preserveConstEnums' option is set to true
            return target !== unknownSymbol &&
                target &&
                target.flags & ts.SymbolFlags.Value &&
                (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target));
        }
        function isConstEnumOrConstEnumOnlyModule(s) {
            return isConstEnumSymbol(s) || s.constEnumOnlyModule;
        }
        function isReferencedAliasDeclaration(node, checkChildren) {
            if (ts.isAliasSymbolDeclaration(node)) {
                var symbol = getSymbolOfNode(node);
                if (getSymbolLinks(symbol).referenced) {
                    return true;
                }
            }
            if (checkChildren) {
                return ts.forEachChild(node, function (node) { return isReferencedAliasDeclaration(node, checkChildren); });
            }
            return false;
        }
        function isImplementationOfOverload(node) {
            if (ts.nodeIsPresent(node.body)) {
                var symbol = getSymbolOfNode(node);
                var signaturesOfSymbol = getSignaturesOfSymbol(symbol);
                // If this function body corresponds to function with multiple signature, it is implementation of overload
                // e.g.: function foo(a: string): string;
                //       function foo(a: number): number;
                //       function foo(a: any) { // This is implementation of the overloads
                //           return a;
                //       }
                return signaturesOfSymbol.length > 1 ||
                    // If there is single signature for the symbol, it is overload if that signature isn't coming from the node
                    // e.g.: function foo(a: string): string;
                    //       function foo(a: any) { // This is implementation of the overloads
                    //           return a;
                    //       }
                    (signaturesOfSymbol.length === 1 && signaturesOfSymbol[0].declaration !== node);
            }
            return false;
        }
        function getNodeCheckFlags(node) {
            return getNodeLinks(node).flags;
        }
        function getEnumMemberValue(node) {
            computeEnumMemberValues(node.parent);
            return getNodeLinks(node).enumMemberValue;
        }
        function getConstantValue(node) {
            if (node.kind === ts.SyntaxKind.EnumMember) {
                return getEnumMemberValue(node);
            }
            var symbol = getNodeLinks(node).resolvedSymbol;
            if (symbol && (symbol.flags & ts.SymbolFlags.EnumMember)) {
                // inline property\index accesses only for const enums
                if (ts.isConstEnumDeclaration(symbol.valueDeclaration.parent)) {
                    return getEnumMemberValue(symbol.valueDeclaration);
                }
            }
            return undefined;
        }
        function isFunctionType(type) {
            return type.flags & ts.TypeFlags.ObjectType && getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
        }
        function getTypeReferenceSerializationKind(typeName) {
            // Resolve the symbol as a value to ensure the type can be reached at runtime during emit.
            var valueSymbol = resolveEntityName(typeName, ts.SymbolFlags.Value, /*ignoreErrors*/ true);
            var constructorType = valueSymbol ? getTypeOfSymbol(valueSymbol) : undefined;
            if (constructorType && isConstructorType(constructorType)) {
                return ts.TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
            }
            // Resolve the symbol as a type so that we can provide a more useful hint for the type serializer.
            var typeSymbol = resolveEntityName(typeName, ts.SymbolFlags.Type, /*ignoreErrors*/ true);
            // We might not be able to resolve type symbol so use unknown type in that case (eg error case)
            if (!typeSymbol) {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
            var type = getDeclaredTypeOfSymbol(typeSymbol);
            if (type === unknownType) {
                return ts.TypeReferenceSerializationKind.Unknown;
            }
            else if (type.flags & ts.TypeFlags.Any) {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.Void)) {
                return ts.TypeReferenceSerializationKind.VoidType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.Boolean)) {
                return ts.TypeReferenceSerializationKind.BooleanType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.NumberLike)) {
                return ts.TypeReferenceSerializationKind.NumberLikeType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.StringLike)) {
                return ts.TypeReferenceSerializationKind.StringLikeType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.Tuple)) {
                return ts.TypeReferenceSerializationKind.ArrayLikeType;
            }
            else if (allConstituentTypesHaveKind(type, ts.TypeFlags.ESSymbol)) {
                return ts.TypeReferenceSerializationKind.ESSymbolType;
            }
            else if (isFunctionType(type)) {
                return ts.TypeReferenceSerializationKind.TypeWithCallSignature;
            }
            else if (isArrayType(type)) {
                return ts.TypeReferenceSerializationKind.ArrayLikeType;
            }
            else {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
        }
        function writeTypeOfDeclaration(declaration, enclosingDeclaration, flags, writer) {
            // Get type of the symbol if this is the valid symbol otherwise get type at location
            var symbol = getSymbolOfNode(declaration);
            var type = symbol && !(symbol.flags & (ts.SymbolFlags.TypeLiteral | ts.SymbolFlags.Signature))
                ? getTypeOfSymbol(symbol)
                : unknownType;
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
        }
        function writeReturnTypeOfSignatureDeclaration(signatureDeclaration, enclosingDeclaration, flags, writer) {
            var signature = getSignatureFromDeclaration(signatureDeclaration);
            getSymbolDisplayBuilder().buildTypeDisplay(getReturnTypeOfSignature(signature), writer, enclosingDeclaration, flags);
        }
        function writeTypeOfExpression(expr, enclosingDeclaration, flags, writer) {
            var type = getTypeOfExpression(expr);
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
        }
        function hasGlobalName(name) {
            return ts.hasProperty(globals, name);
        }
        function getReferencedValueSymbol(reference) {
            return getNodeLinks(reference).resolvedSymbol ||
                resolveName(reference, reference.text, ts.SymbolFlags.Value | ts.SymbolFlags.ExportValue | ts.SymbolFlags.Alias, 
                /*nodeNotFoundMessage*/ undefined, /*nameArg*/ undefined);
        }
        function getReferencedValueDeclaration(reference) {
            ts.Debug.assert(!ts.nodeIsSynthesized(reference));
            var symbol = getReferencedValueSymbol(reference);
            return symbol && getExportSymbolOfValueSymbolIfExported(symbol).valueDeclaration;
        }
        function getBlockScopedVariableId(n) {
            ts.Debug.assert(!ts.nodeIsSynthesized(n));
            var isVariableDeclarationOrBindingElement = n.parent.kind === ts.SyntaxKind.BindingElement || (n.parent.kind === ts.SyntaxKind.VariableDeclaration && n.parent.name === n);
            var symbol = (isVariableDeclarationOrBindingElement ? getSymbolOfNode(n.parent) : undefined) ||
                getNodeLinks(n).resolvedSymbol ||
                resolveName(n, n.text, ts.SymbolFlags.Value | ts.SymbolFlags.Alias, /*nodeNotFoundMessage*/ undefined, /*nameArg*/ undefined);
            var isLetOrConst = symbol &&
                (symbol.flags & ts.SymbolFlags.BlockScopedVariable) &&
                symbol.valueDeclaration.parent.kind !== ts.SyntaxKind.CatchClause;
            if (isLetOrConst) {
                // side-effect of calling this method:
                //   assign id to symbol if it was not yet set
                getSymbolLinks(symbol);
                return symbol.id;
            }
            return undefined;
        }
        function instantiateSingleCallFunctionType(functionType, typeArguments) {
            if (functionType === unknownType) {
                return unknownType;
            }
            var signature = getSingleCallSignature(functionType);
            if (!signature) {
                return unknownType;
            }
            var instantiatedSignature = getSignatureInstantiation(signature, typeArguments);
            return getOrCreateTypeFromSignature(instantiatedSignature);
        }
        function createResolver() {
            return {
                getReferencedExportContainer: getReferencedExportContainer,
                getReferencedImportDeclaration: getReferencedImportDeclaration,
                getReferencedNestedRedeclaration: getReferencedNestedRedeclaration,
                isNestedRedeclaration: isNestedRedeclaration,
                isValueAliasDeclaration: isValueAliasDeclaration,
                hasGlobalName: hasGlobalName,
                isReferencedAliasDeclaration: isReferencedAliasDeclaration,
                getNodeCheckFlags: getNodeCheckFlags,
                isTopLevelValueImportEqualsWithEntityName: isTopLevelValueImportEqualsWithEntityName,
                isDeclarationVisible: isDeclarationVisible,
                isImplementationOfOverload: isImplementationOfOverload,
                writeTypeOfDeclaration: writeTypeOfDeclaration,
                writeReturnTypeOfSignatureDeclaration: writeReturnTypeOfSignatureDeclaration,
                writeTypeOfExpression: writeTypeOfExpression,
                isSymbolAccessible: isSymbolAccessible,
                isEntityNameVisible: isEntityNameVisible,
                getConstantValue: getConstantValue,
                collectLinkedAliases: collectLinkedAliases,
                getBlockScopedVariableId: getBlockScopedVariableId,
                getReferencedValueDeclaration: getReferencedValueDeclaration,
                getTypeReferenceSerializationKind: getTypeReferenceSerializationKind,
                isOptionalParameter: isOptionalParameter
            };
        }
        function initializeTypeChecker() {
            // Bind all source files and propagate errors
            ts.forEach(host.getSourceFiles(), function (file) {
                ts.bindSourceFile(file);
            });
            // Initialize global symbol table
            ts.forEach(host.getSourceFiles(), function (file) {
                if (!ts.isExternalModule(file)) {
                    mergeSymbolTable(globals, file.locals);
                }
            });
            // Initialize special symbols
            getSymbolLinks(undefinedSymbol).type = undefinedType;
            getSymbolLinks(argumentsSymbol).type = getGlobalType("IArguments");
            getSymbolLinks(unknownSymbol).type = unknownType;
            globals[undefinedSymbol.name] = undefinedSymbol;
            // Initialize special types
            globalArrayType = getGlobalType("Array", /*arity*/ 1);
            globalObjectType = getGlobalType("Object");
            globalFunctionType = getGlobalType("Function");
            globalStringType = getGlobalType("String");
            globalNumberType = getGlobalType("Number");
            globalBooleanType = getGlobalType("Boolean");
            globalRegExpType = getGlobalType("RegExp");
            jsxElementType = getExportedTypeFromNamespace("JSX", JsxNames.Element);
            getGlobalClassDecoratorType = ts.memoize(function () { return getGlobalType("ClassDecorator"); });
            getGlobalPropertyDecoratorType = ts.memoize(function () { return getGlobalType("PropertyDecorator"); });
            getGlobalMethodDecoratorType = ts.memoize(function () { return getGlobalType("MethodDecorator"); });
            getGlobalParameterDecoratorType = ts.memoize(function () { return getGlobalType("ParameterDecorator"); });
            getGlobalTypedPropertyDescriptorType = ts.memoize(function () { return getGlobalType("TypedPropertyDescriptor", /*arity*/ 1); });
            getGlobalPromiseType = ts.memoize(function () { return getGlobalType("Promise", /*arity*/ 1); });
            tryGetGlobalPromiseType = ts.memoize(function () { return getGlobalSymbol("Promise", ts.SymbolFlags.Type, /*diagnostic*/ undefined) && getGlobalPromiseType(); });
            getGlobalPromiseLikeType = ts.memoize(function () { return getGlobalType("PromiseLike", /*arity*/ 1); });
            getInstantiatedGlobalPromiseLikeType = ts.memoize(createInstantiatedPromiseLikeType);
            getGlobalPromiseConstructorSymbol = ts.memoize(function () { return getGlobalValueSymbol("Promise"); });
            getGlobalPromiseConstructorLikeType = ts.memoize(function () { return getGlobalType("PromiseConstructorLike"); });
            getGlobalThenableType = ts.memoize(createThenableType);
            // If we're in ES6 mode, load the TemplateStringsArray.
            // Otherwise, default to 'unknown' for the purposes of type checking in LS scenarios.
            if (languageVersion >= ts.ScriptTarget.ES6) {
                globalTemplateStringsArrayType = getGlobalType("TemplateStringsArray");
                globalESSymbolType = getGlobalType("Symbol");
                globalESSymbolConstructorSymbol = getGlobalValueSymbol("Symbol");
                globalIterableType = getGlobalType("Iterable", /*arity*/ 1);
                globalIteratorType = getGlobalType("Iterator", /*arity*/ 1);
                globalIterableIteratorType = getGlobalType("IterableIterator", /*arity*/ 1);
            }
            else {
                globalTemplateStringsArrayType = unknownType;
                // Consider putting Symbol interface in lib.d.ts. On the plus side, putting it in lib.d.ts would make it
                // extensible for Polyfilling Symbols. But putting it into lib.d.ts could also break users that have
                // a global Symbol already, particularly if it is a class.
                globalESSymbolType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
                globalESSymbolConstructorSymbol = undefined;
                globalIterableType = emptyGenericType;
                globalIteratorType = emptyGenericType;
                globalIterableIteratorType = emptyGenericType;
            }
            anyArrayType = createArrayType(anyType);
        }
        function createInstantiatedPromiseLikeType() {
            var promiseLikeType = getGlobalPromiseLikeType();
            if (promiseLikeType !== emptyGenericType) {
                return createTypeReference(promiseLikeType, [anyType]);
            }
            return emptyObjectType;
        }
        function createThenableType() {
            // build the thenable type that is used to verify against a non-promise "thenable" operand to `await`.
            var thenPropertySymbol = createSymbol(ts.SymbolFlags.Transient | ts.SymbolFlags.Property, "then");
            getSymbolLinks(thenPropertySymbol).type = globalFunctionType;
            var thenableType = createObjectType(ts.TypeFlags.Anonymous);
            thenableType.properties = [thenPropertySymbol];
            thenableType.members = createSymbolTable(thenableType.properties);
            thenableType.callSignatures = [];
            thenableType.constructSignatures = [];
            return thenableType;
        }
        // GRAMMAR CHECKING
        function checkGrammarDecorators(node) {
            if (!node.decorators) {
                return false;
            }
            if (!ts.nodeCanBeDecorated(node)) {
                return grammarErrorOnFirstToken(node, ts.Diagnostics.Decorators_are_not_valid_here);
            }
            else if (languageVersion < ts.ScriptTarget.ES5) {
                return grammarErrorOnFirstToken(node, ts.Diagnostics.Decorators_are_only_available_when_targeting_ECMAScript_5_and_higher);
            }
            else if (node.kind === ts.SyntaxKind.GetAccessor || node.kind === ts.SyntaxKind.SetAccessor) {
                var accessors = ts.getAllAccessorDeclarations(node.parent.members, node);
                if (accessors.firstAccessor.decorators && node === accessors.secondAccessor) {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name);
                }
            }
            return false;
        }
        function checkGrammarModifiers(node) {
            switch (node.kind) {
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.BrandPropertyDeclaration: // [ConcreteTypeScript]
                case ts.SyntaxKind.PropertySignature:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.IndexSignature:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.ImportDeclaration:
                case ts.SyntaxKind.ImportEqualsDeclaration:
                case ts.SyntaxKind.ExportDeclaration:
                case ts.SyntaxKind.ExportAssignment:
                case ts.SyntaxKind.Parameter:
                    break;
                case ts.SyntaxKind.FunctionDeclaration:
                    if (node.modifiers && (node.modifiers.length > 1 || node.modifiers[0].kind !== ts.SyntaxKind.AsyncKeyword) &&
                        node.parent.kind !== ts.SyntaxKind.ModuleBlock && node.parent.kind !== ts.SyntaxKind.SourceFile) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                case ts.SyntaxKind.VariableStatement:
                case ts.SyntaxKind.TypeAliasDeclaration:
                    if (node.modifiers && node.parent.kind !== ts.SyntaxKind.ModuleBlock && node.parent.kind !== ts.SyntaxKind.SourceFile) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                case ts.SyntaxKind.EnumDeclaration:
                    if (node.modifiers && (node.modifiers.length > 1 || node.modifiers[0].kind !== ts.SyntaxKind.ConstKeyword) &&
                        node.parent.kind !== ts.SyntaxKind.ModuleBlock && node.parent.kind !== ts.SyntaxKind.SourceFile) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                default:
                    return false;
            }
            if (!node.modifiers) {
                return;
            }
            var lastStatic, lastPrivate, lastProtected, lastDeclare, lastAsync;
            var flags = 0;
            for (var _i = 0, _a = node.modifiers; _i < _a.length; _i++) {
                var modifier = _a[_i];
                switch (modifier.kind) {
                    case ts.SyntaxKind.PublicKeyword:
                    case ts.SyntaxKind.ProtectedKeyword:
                    case ts.SyntaxKind.PrivateKeyword:
                        var text = void 0;
                        if (modifier.kind === ts.SyntaxKind.PublicKeyword) {
                            text = "public";
                        }
                        else if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) {
                            text = "protected";
                            lastProtected = modifier;
                        }
                        else {
                            text = "private";
                            lastPrivate = modifier;
                        }
                        if (flags & ts.NodeFlags.AccessibilityModifier) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics.Accessibility_modifier_already_seen);
                        }
                        else if (flags & ts.NodeFlags.Static) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "static");
                        }
                        else if (flags & ts.NodeFlags.Async) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "async");
                        }
                        else if (node.parent.kind === ts.SyntaxKind.ModuleBlock || node.parent.kind === ts.SyntaxKind.SourceFile) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_module_element, text);
                        }
                        else if (flags & ts.NodeFlags.Abstract) {
                            if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, text, "abstract");
                            }
                            else {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "abstract");
                            }
                        }
                        flags |= ts.modifierToFlag(modifier.kind);
                        break;
                    case ts.SyntaxKind.StaticKeyword:
                        if (flags & ts.NodeFlags.Static) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "static");
                        }
                        else if (flags & ts.NodeFlags.Async) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "static", "async");
                        }
                        else if (node.parent.kind === ts.SyntaxKind.ModuleBlock || node.parent.kind === ts.SyntaxKind.SourceFile) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_module_element, "static");
                        }
                        else if (node.kind === ts.SyntaxKind.Parameter) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "static");
                        }
                        else if (flags & ts.NodeFlags.Abstract) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "static", "abstract");
                        }
                        flags |= ts.NodeFlags.Static;
                        lastStatic = modifier;
                        break;
                    case ts.SyntaxKind.ExportKeyword:
                        if (flags & ts.NodeFlags.Export) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "export");
                        }
                        else if (flags & ts.NodeFlags.Ambient) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "declare");
                        }
                        else if (flags & ts.NodeFlags.Abstract) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "abstract");
                        }
                        else if (flags & ts.NodeFlags.Async) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "async");
                        }
                        else if (node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_class_element, "export");
                        }
                        else if (node.kind === ts.SyntaxKind.Parameter) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "export");
                        }
                        flags |= ts.NodeFlags.Export;
                        break;
                    case ts.SyntaxKind.DeclareKeyword:
                        if (flags & ts.NodeFlags.Ambient) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "declare");
                        }
                        else if (flags & ts.NodeFlags.Async) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_in_an_ambient_context, "async");
                        }
                        else if (node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_class_element, "declare");
                        }
                        else if (node.kind === ts.SyntaxKind.Parameter) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "declare");
                        }
                        else if (ts.isInAmbientContext(node.parent) && node.parent.kind === ts.SyntaxKind.ModuleBlock) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics.A_declare_modifier_cannot_be_used_in_an_already_ambient_context);
                        }
                        flags |= ts.NodeFlags.Ambient;
                        lastDeclare = modifier;
                        break;
                    case ts.SyntaxKind.AbstractKeyword:
                        if (flags & ts.NodeFlags.Abstract) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "abstract");
                        }
                        if (node.kind !== ts.SyntaxKind.ClassDeclaration) {
                            if (node.kind !== ts.SyntaxKind.MethodDeclaration) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics.abstract_modifier_can_only_appear_on_a_class_or_method_declaration);
                            }
                            if (!(node.parent.kind === ts.SyntaxKind.ClassDeclaration && node.parent.flags & ts.NodeFlags.Abstract)) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics.Abstract_methods_can_only_appear_within_an_abstract_class);
                            }
                            if (flags & ts.NodeFlags.Static) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "static", "abstract");
                            }
                            if (flags & ts.NodeFlags.Private) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "private", "abstract");
                            }
                        }
                        flags |= ts.NodeFlags.Abstract;
                        break;
                    case ts.SyntaxKind.AsyncKeyword:
                        if (flags & ts.NodeFlags.Async) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "async");
                        }
                        else if (flags & ts.NodeFlags.Ambient || ts.isInAmbientContext(node.parent)) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_in_an_ambient_context, "async");
                        }
                        else if (node.kind === ts.SyntaxKind.Parameter) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "async");
                        }
                        flags |= ts.NodeFlags.Async;
                        lastAsync = modifier;
                        break;
                }
            }
            if (node.kind === ts.SyntaxKind.Constructor) {
                if (flags & ts.NodeFlags.Static) {
                    return grammarErrorOnNode(lastStatic, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "static");
                }
                if (flags & ts.NodeFlags.Abstract) {
                    return grammarErrorOnNode(lastStatic, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "abstract");
                }
                else if (flags & ts.NodeFlags.Protected) {
                    return grammarErrorOnNode(lastProtected, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "protected");
                }
                else if (flags & ts.NodeFlags.Private) {
                    return grammarErrorOnNode(lastPrivate, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "private");
                }
                else if (flags & ts.NodeFlags.Async) {
                    return grammarErrorOnNode(lastAsync, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "async");
                }
                return;
            }
            else if ((node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration) && flags & ts.NodeFlags.Ambient) {
                return grammarErrorOnNode(lastDeclare, ts.Diagnostics.A_0_modifier_cannot_be_used_with_an_import_declaration, "declare");
            }
            else if (node.kind === ts.SyntaxKind.Parameter && (flags & ts.NodeFlags.AccessibilityModifier) && ts.isBindingPattern(node.name)) {
                return grammarErrorOnNode(node, ts.Diagnostics.A_parameter_property_may_not_be_a_binding_pattern);
            }
            if (flags & ts.NodeFlags.Async) {
                return checkGrammarAsyncModifier(node, lastAsync);
            }
        }
        function checkGrammarAsyncModifier(node, asyncModifier) {
            if (languageVersion < ts.ScriptTarget.ES6) {
                return grammarErrorOnNode(asyncModifier, ts.Diagnostics.Async_functions_are_only_available_when_targeting_ECMAScript_6_and_higher);
            }
            switch (node.kind) {
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    if (!node.asteriskToken) {
                        return false;
                    }
                    break;
            }
            return grammarErrorOnNode(asyncModifier, ts.Diagnostics._0_modifier_cannot_be_used_here, "async");
        }
        function checkGrammarForDisallowedTrailingComma(list) {
            if (list && list.hasTrailingComma) {
                var start = list.end - ",".length;
                var end = list.end;
                var sourceFile = ts.getSourceFileOfNode(list[0]);
                return grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Trailing_comma_not_allowed);
            }
        }
        function checkGrammarTypeParameterList(node, typeParameters, file) {
            if (checkGrammarForDisallowedTrailingComma(typeParameters)) {
                return true;
            }
            if (typeParameters && typeParameters.length === 0) {
                var start = typeParameters.pos - "<".length;
                var end = ts.skipTrivia(file.text, typeParameters.end) + ">".length;
                return grammarErrorAtPos(file, start, end - start, ts.Diagnostics.Type_parameter_list_cannot_be_empty);
            }
        }
        function checkGrammarParameterList(parameters) {
            if (checkGrammarForDisallowedTrailingComma(parameters)) {
                return true;
            }
            var seenOptionalParameter = false;
            var parameterCount = parameters.length;
            for (var i = 0; i < parameterCount; i++) {
                var parameter = parameters[i];
                if (parameter.dotDotDotToken) {
                    if (i !== (parameterCount - 1)) {
                        return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.A_rest_parameter_must_be_last_in_a_parameter_list);
                    }
                    if (ts.isBindingPattern(parameter.name)) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_rest_element_cannot_contain_a_binding_pattern);
                    }
                    if (parameter.questionToken) {
                        return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.A_rest_parameter_cannot_be_optional);
                    }
                    if (parameter.initializer) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_rest_parameter_cannot_have_an_initializer);
                    }
                }
                else if (parameter.questionToken) {
                    seenOptionalParameter = true;
                    if (parameter.initializer) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.Parameter_cannot_have_question_mark_and_initializer);
                    }
                }
                else if (seenOptionalParameter && !parameter.initializer) {
                    return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_required_parameter_cannot_follow_an_optional_parameter);
                }
            }
        }
        function checkGrammarFunctionLikeDeclaration(node) {
            // Prevent cascading error by short-circuit
            var file = ts.getSourceFileOfNode(node);
            return checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarTypeParameterList(node, node.typeParameters, file) ||
                checkGrammarParameterList(node.parameters) || checkGrammarArrowFunction(node, file);
        }
        function checkGrammarArrowFunction(node, file) {
            if (node.kind === ts.SyntaxKind.ArrowFunction) {
                var arrowFunction = node;
                var startLine = ts.getLineAndCharacterOfPosition(file, arrowFunction.equalsGreaterThanToken.pos).line;
                var endLine = ts.getLineAndCharacterOfPosition(file, arrowFunction.equalsGreaterThanToken.end).line;
                if (startLine !== endLine) {
                    return grammarErrorOnNode(arrowFunction.equalsGreaterThanToken, ts.Diagnostics.Line_terminator_not_permitted_before_arrow);
                }
            }
            return false;
        }
        function checkGrammarIndexSignatureParameters(node) {
            var parameter = node.parameters[0];
            if (node.parameters.length !== 1) {
                if (parameter) {
                    return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_must_have_exactly_one_parameter);
                }
                else {
                    return grammarErrorOnNode(node, ts.Diagnostics.An_index_signature_must_have_exactly_one_parameter);
                }
            }
            if (parameter.dotDotDotToken) {
                return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.An_index_signature_cannot_have_a_rest_parameter);
            }
            if (parameter.flags & ts.NodeFlags.Modifier) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_cannot_have_an_accessibility_modifier);
            }
            if (parameter.questionToken) {
                return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.An_index_signature_parameter_cannot_have_a_question_mark);
            }
            if (parameter.initializer) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_cannot_have_an_initializer);
            }
            if (!parameter.type) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_must_have_a_type_annotation);
            }
            if (parameter.type.kind !== ts.SyntaxKind.StringKeyword && parameter.type.kind !== ts.SyntaxKind.NumberKeyword) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_type_must_be_string_or_number);
            }
            if (!node.type) {
                return grammarErrorOnNode(node, ts.Diagnostics.An_index_signature_must_have_a_type_annotation);
            }
        }
        function checkGrammarForIndexSignatureModifier(node) {
            if (node.flags & ts.NodeFlags.Modifier) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_not_permitted_on_index_signature_members);
            }
        }
        function checkGrammarIndexSignature(node) {
            // Prevent cascading error by short-circuit
            return checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarIndexSignatureParameters(node) || checkGrammarForIndexSignatureModifier(node);
        }
        function checkGrammarForAtLeastOneTypeArgument(node, typeArguments) {
            if (typeArguments && typeArguments.length === 0) {
                var sourceFile = ts.getSourceFileOfNode(node);
                var start = typeArguments.pos - "<".length;
                var end = ts.skipTrivia(sourceFile.text, typeArguments.end) + ">".length;
                return grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Type_argument_list_cannot_be_empty);
            }
        }
        function checkGrammarTypeArguments(node, typeArguments) {
            return checkGrammarForDisallowedTrailingComma(typeArguments) ||
                checkGrammarForAtLeastOneTypeArgument(node, typeArguments);
        }
        function checkGrammarForOmittedArgument(node, args) {
            if (args) {
                var sourceFile = ts.getSourceFileOfNode(node);
                for (var _i = 0; _i < args.length; _i++) {
                    var arg = args[_i];
                    if (arg.kind === ts.SyntaxKind.OmittedExpression) {
                        return grammarErrorAtPos(sourceFile, arg.pos, 0, ts.Diagnostics.Argument_expression_expected);
                    }
                }
            }
        }
        function checkGrammarArguments(node, args) {
            return checkGrammarForDisallowedTrailingComma(args) ||
                checkGrammarForOmittedArgument(node, args);
        }
        function checkGrammarHeritageClause(node) {
            var types = node.types;
            if (checkGrammarForDisallowedTrailingComma(types)) {
                return true;
            }
            if (types && types.length === 0) {
                var listType = ts.tokenToString(node.token);
                var sourceFile = ts.getSourceFileOfNode(node);
                return grammarErrorAtPos(sourceFile, types.pos, 0, ts.Diagnostics._0_list_cannot_be_empty, listType);
            }
        }
        function checkGrammarClassDeclarationHeritageClauses(node) {
            var seenExtendsClause = false;
            var seenImplementsClause = false;
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && node.heritageClauses) {
                for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                    var heritageClause = _a[_i];
                    if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                        if (seenExtendsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_already_seen);
                        }
                        if (seenImplementsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_must_precede_implements_clause);
                        }
                        if (heritageClause.types.length > 1) {
                            return grammarErrorOnFirstToken(heritageClause.types[1], ts.Diagnostics.Classes_can_only_extend_a_single_class);
                        }
                        seenExtendsClause = true;
                    }
                    else {
                        ts.Debug.assert(heritageClause.token === ts.SyntaxKind.ImplementsKeyword);
                        if (seenImplementsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.implements_clause_already_seen);
                        }
                        seenImplementsClause = true;
                    }
                    // Grammar checking heritageClause inside class declaration
                    checkGrammarHeritageClause(heritageClause);
                }
            }
        }
        function checkGrammarInterfaceDeclaration(node) {
            var seenExtendsClause = false;
            if (node.heritageClauses) {
                for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                    var heritageClause = _a[_i];
                    if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                        if (seenExtendsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_already_seen);
                        }
                        seenExtendsClause = true;
                    }
                    else {
                        ts.Debug.assert(heritageClause.token === ts.SyntaxKind.ImplementsKeyword);
                        return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.Interface_declaration_cannot_have_implements_clause);
                    }
                    // Grammar checking heritageClause inside class declaration
                    checkGrammarHeritageClause(heritageClause);
                }
            }
            return false;
        }
        function checkGrammarComputedPropertyName(node) {
            // If node is not a computedPropertyName, just skip the grammar checking
            if (node.kind !== ts.SyntaxKind.ComputedPropertyName) {
                return false;
            }
            var computedPropertyName = node;
            if (computedPropertyName.expression.kind === ts.SyntaxKind.BinaryExpression && computedPropertyName.expression.operatorToken.kind === ts.SyntaxKind.CommaToken) {
                return grammarErrorOnNode(computedPropertyName.expression, ts.Diagnostics.A_comma_expression_is_not_allowed_in_a_computed_property_name);
            }
        }
        function checkGrammarForGenerator(node) {
            if (node.asteriskToken) {
                ts.Debug.assert(node.kind === ts.SyntaxKind.FunctionDeclaration ||
                    node.kind === ts.SyntaxKind.FunctionExpression ||
                    node.kind === ts.SyntaxKind.MethodDeclaration);
                if (ts.isInAmbientContext(node)) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.Generators_are_not_allowed_in_an_ambient_context);
                }
                if (!node.body) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.An_overload_signature_cannot_be_declared_as_a_generator);
                }
                if (languageVersion < ts.ScriptTarget.ES6) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.Generators_are_only_available_when_targeting_ECMAScript_6_or_higher);
                }
            }
        }
        function checkGrammarForInvalidQuestionMark(node, questionToken, message) {
            if (questionToken) {
                return grammarErrorOnNode(questionToken, message);
            }
        }
        function checkGrammarObjectLiteralExpression(node) {
            var seen = {};
            var Property = 1;
            var GetAccessor = 2;
            var SetAccesor = 4;
            var GetOrSetAccessor = GetAccessor | SetAccesor;
            for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                var prop = _a[_i];
                var name_8 = prop.name;
                if (prop.kind === ts.SyntaxKind.OmittedExpression ||
                    name_8.kind === ts.SyntaxKind.ComputedPropertyName) {
                    // If the name is not a ComputedPropertyName, the grammar checking will skip it
                    checkGrammarComputedPropertyName(name_8);
                    continue;
                }
                // ECMA-262 11.1.5 Object Initialiser
                // If previous is not undefined then throw a SyntaxError exception if any of the following conditions are true
                // a.This production is contained in strict code and IsDataDescriptor(previous) is true and
                // IsDataDescriptor(propId.descriptor) is true.
                //    b.IsDataDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true.
                //    c.IsAccessorDescriptor(previous) is true and IsDataDescriptor(propId.descriptor) is true.
                //    d.IsAccessorDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true
                // and either both previous and propId.descriptor have[[Get]] fields or both previous and propId.descriptor have[[Set]] fields
                var currentKind = void 0;
                if (prop.kind === ts.SyntaxKind.PropertyAssignment || prop.kind === ts.SyntaxKind.ShorthandPropertyAssignment) {
                    // Grammar checking for computedPropertName and shorthandPropertyAssignment
                    checkGrammarForInvalidQuestionMark(prop, prop.questionToken, ts.Diagnostics.An_object_member_cannot_be_declared_optional);
                    if (name_8.kind === ts.SyntaxKind.NumericLiteral) {
                        checkGrammarNumericLiteral(name_8);
                    }
                    currentKind = Property;
                }
                else if (prop.kind === ts.SyntaxKind.MethodDeclaration) {
                    currentKind = Property;
                }
                else if (prop.kind === ts.SyntaxKind.GetAccessor) {
                    currentKind = GetAccessor;
                }
                else if (prop.kind === ts.SyntaxKind.SetAccessor) {
                    currentKind = SetAccesor;
                }
                else {
                    ts.Debug.fail("Unexpected syntax kind:" + prop.kind);
                }
                if (!ts.hasProperty(seen, name_8.text)) {
                    seen[name_8.text] = currentKind;
                }
                else {
                    var existingKind = seen[name_8.text];
                    if (currentKind === Property && existingKind === Property) {
                        continue;
                    }
                    else if ((currentKind & GetOrSetAccessor) && (existingKind & GetOrSetAccessor)) {
                        if (existingKind !== GetOrSetAccessor && currentKind !== existingKind) {
                            seen[name_8.text] = currentKind | existingKind;
                        }
                        else {
                            return grammarErrorOnNode(name_8, ts.Diagnostics.An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name);
                        }
                    }
                    else {
                        return grammarErrorOnNode(name_8, ts.Diagnostics.An_object_literal_cannot_have_property_and_accessor_with_the_same_name);
                    }
                }
            }
        }
        function checkGrammarJsxElement(node) {
            var seen = {};
            for (var _i = 0, _a = node.attributes; _i < _a.length; _i++) {
                var attr = _a[_i];
                if (attr.kind === ts.SyntaxKind.JsxSpreadAttribute) {
                    continue;
                }
                var jsxAttr = attr;
                var name_9 = jsxAttr.name;
                if (!ts.hasProperty(seen, name_9.text)) {
                    seen[name_9.text] = true;
                }
                else {
                    return grammarErrorOnNode(name_9, ts.Diagnostics.JSX_elements_cannot_have_multiple_attributes_with_the_same_name);
                }
                var initializer = jsxAttr.initializer;
                if (initializer && initializer.kind === ts.SyntaxKind.JsxExpression && !initializer.expression) {
                    return grammarErrorOnNode(jsxAttr.initializer, ts.Diagnostics.JSX_attributes_must_only_be_assigned_a_non_empty_expression);
                }
            }
        }
        function checkGrammarForInOrForOfStatement(forInOrOfStatement) {
            if (checkGrammarStatementInAmbientContext(forInOrOfStatement)) {
                return true;
            }
            if (forInOrOfStatement.initializer.kind === ts.SyntaxKind.VariableDeclarationList) {
                var variableList = forInOrOfStatement.initializer;
                if (!checkGrammarVariableDeclarationList(variableList)) {
                    if (variableList.declarations.length > 1) {
                        var diagnostic = forInOrOfStatement.kind === ts.SyntaxKind.ForInStatement
                            ? ts.Diagnostics.Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement
                            : ts.Diagnostics.Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement;
                        return grammarErrorOnFirstToken(variableList.declarations[1], diagnostic);
                    }
                    var firstDeclaration = variableList.declarations[0];
                    if (firstDeclaration.initializer) {
                        var diagnostic = forInOrOfStatement.kind === ts.SyntaxKind.ForInStatement
                            ? ts.Diagnostics.The_variable_declaration_of_a_for_in_statement_cannot_have_an_initializer
                            : ts.Diagnostics.The_variable_declaration_of_a_for_of_statement_cannot_have_an_initializer;
                        return grammarErrorOnNode(firstDeclaration.name, diagnostic);
                    }
                    if (firstDeclaration.type) {
                        var diagnostic = forInOrOfStatement.kind === ts.SyntaxKind.ForInStatement
                            ? ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation
                            : ts.Diagnostics.The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation;
                        return grammarErrorOnNode(firstDeclaration, diagnostic);
                    }
                }
            }
            return false;
        }
        function checkGrammarAccessor(accessor) {
            var kind = accessor.kind;
            if (languageVersion < ts.ScriptTarget.ES5) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher);
            }
            else if (ts.isInAmbientContext(accessor)) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.An_accessor_cannot_be_declared_in_an_ambient_context);
            }
            else if (accessor.body === undefined) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(accessor), accessor.end - 1, ";".length, ts.Diagnostics._0_expected, "{");
            }
            else if (accessor.typeParameters) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.An_accessor_cannot_have_type_parameters);
            }
            else if (kind === ts.SyntaxKind.GetAccessor && accessor.parameters.length) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_get_accessor_cannot_have_parameters);
            }
            else if (kind === ts.SyntaxKind.SetAccessor) {
                if (accessor.type) {
                    return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_cannot_have_a_return_type_annotation);
                }
                else if (accessor.parameters.length !== 1) {
                    return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_must_have_exactly_one_parameter);
                }
                else {
                    var parameter = accessor.parameters[0];
                    if (parameter.dotDotDotToken) {
                        return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.A_set_accessor_cannot_have_rest_parameter);
                    }
                    else if (parameter.flags & ts.NodeFlags.Modifier) {
                        return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
                    }
                    else if (parameter.questionToken) {
                        return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.A_set_accessor_cannot_have_an_optional_parameter);
                    }
                    else if (parameter.initializer) {
                        return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_parameter_cannot_have_an_initializer);
                    }
                }
            }
        }
        function checkGrammarForNonSymbolComputedProperty(node, message) {
            if (node.kind === ts.SyntaxKind.ComputedPropertyName && !ts.isWellKnownSymbolSyntactically(node.expression)) {
                return grammarErrorOnNode(node, message);
            }
        }
        function checkGrammarMethod(node) {
            if (checkGrammarDisallowedModifiersOnObjectLiteralExpressionMethod(node) ||
                checkGrammarFunctionLikeDeclaration(node) ||
                checkGrammarForGenerator(node)) {
                return true;
            }
            if (node.parent.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional)) {
                    return true;
                }
                else if (node.body === undefined) {
                    return grammarErrorAtPos(getSourceFile(node), node.end - 1, ";".length, ts.Diagnostics._0_expected, "{");
                }
            }
            if (ts.isClassLike(node.parent)) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional)) {
                    return true;
                }
                // Technically, computed properties in ambient contexts is disallowed
                // for property declarations and accessors too, not just methods.
                // However, property declarations disallow computed names in general,
                // and accessors are not allowed in ambient contexts in general,
                // so this error only really matters for methods.
                if (ts.isInAmbientContext(node)) {
                    return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_ambient_context_must_directly_refer_to_a_built_in_symbol);
                }
                else if (!node.body) {
                    return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_method_overload_must_directly_refer_to_a_built_in_symbol);
                }
            }
            else if (node.parent.kind === ts.SyntaxKind.InterfaceDeclaration) {
                return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_interface_must_directly_refer_to_a_built_in_symbol);
            }
            else if (node.parent.kind === ts.SyntaxKind.TypeLiteral) {
                return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_type_literal_must_directly_refer_to_a_built_in_symbol);
            }
        }
        function isIterationStatement(node, lookInLabeledStatements) {
            switch (node.kind) {
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                case ts.SyntaxKind.DoStatement:
                case ts.SyntaxKind.WhileStatement:
                    return true;
                case ts.SyntaxKind.LabeledStatement:
                    return lookInLabeledStatements && isIterationStatement(node.statement, lookInLabeledStatements);
            }
            return false;
        }
        function checkGrammarBreakOrContinueStatement(node) {
            var current = node;
            while (current) {
                if (ts.isFunctionLike(current)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.Jump_target_cannot_cross_function_boundary);
                }
                switch (current.kind) {
                    case ts.SyntaxKind.LabeledStatement:
                        if (node.label && current.label.text === node.label.text) {
                            // found matching label - verify that label usage is correct
                            // continue can only target labels that are on iteration statements
                            var isMisplacedContinueLabel = node.kind === ts.SyntaxKind.ContinueStatement
                                && !isIterationStatement(current.statement, /*lookInLabeledStatement*/ true);
                            if (isMisplacedContinueLabel) {
                                return grammarErrorOnNode(node, ts.Diagnostics.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement);
                            }
                            return false;
                        }
                        break;
                    case ts.SyntaxKind.SwitchStatement:
                        if (node.kind === ts.SyntaxKind.BreakStatement && !node.label) {
                            // unlabeled break within switch statement - ok
                            return false;
                        }
                        break;
                    default:
                        if (isIterationStatement(current, /*lookInLabeledStatement*/ false) && !node.label) {
                            // unlabeled break or continue within iteration statement - ok
                            return false;
                        }
                        break;
                }
                current = current.parent;
            }
            if (node.label) {
                var message = node.kind === ts.SyntaxKind.BreakStatement
                    ? ts.Diagnostics.A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement
                    : ts.Diagnostics.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement;
                return grammarErrorOnNode(node, message);
            }
            else {
                var message = node.kind === ts.SyntaxKind.BreakStatement
                    ? ts.Diagnostics.A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement
                    : ts.Diagnostics.A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement;
                return grammarErrorOnNode(node, message);
            }
        }
        function checkGrammarBindingElement(node) {
            if (node.dotDotDotToken) {
                var elements = node.parent.elements;
                if (node !== ts.lastOrUndefined(elements)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.A_rest_element_must_be_last_in_an_array_destructuring_pattern);
                }
                if (node.name.kind === ts.SyntaxKind.ArrayBindingPattern || node.name.kind === ts.SyntaxKind.ObjectBindingPattern) {
                    return grammarErrorOnNode(node.name, ts.Diagnostics.A_rest_element_cannot_contain_a_binding_pattern);
                }
                if (node.initializer) {
                    // Error on equals token which immediate precedes the initializer
                    return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.initializer.pos - 1, 1, ts.Diagnostics.A_rest_element_cannot_have_an_initializer);
                }
            }
        }
        function checkGrammarVariableDeclaration(node) {
            if (node.parent.parent.kind !== ts.SyntaxKind.ForInStatement && node.parent.parent.kind !== ts.SyntaxKind.ForOfStatement) {
                if (ts.isInAmbientContext(node)) {
                    if (node.initializer) {
                        // Error on equals token which immediate precedes the initializer
                        var equalsTokenLength = "=".length;
                        return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.initializer.pos - equalsTokenLength, equalsTokenLength, ts.Diagnostics.Initializers_are_not_allowed_in_ambient_contexts);
                    }
                }
                else if (!node.initializer) {
                    if (ts.isBindingPattern(node.name) && !ts.isBindingPattern(node.parent)) {
                        return grammarErrorOnNode(node, ts.Diagnostics.A_destructuring_declaration_must_have_an_initializer);
                    }
                    if (ts.isConst(node)) {
                        return grammarErrorOnNode(node, ts.Diagnostics.const_declarations_must_be_initialized);
                    }
                }
            }
            var checkLetConstNames = languageVersion >= ts.ScriptTarget.ES6 && (ts.isLet(node) || ts.isConst(node));
            // 1. LexicalDeclaration : LetOrConst BindingList ;
            // It is a Syntax Error if the BoundNames of BindingList contains "let".
            // 2. ForDeclaration: ForDeclaration : LetOrConst ForBinding
            // It is a Syntax Error if the BoundNames of ForDeclaration contains "let".
            // It is a SyntaxError if a VariableDeclaration or VariableDeclarationNoIn occurs within strict code
            // and its Identifier is eval or arguments
            return checkLetConstNames && checkGrammarNameInLetOrConstDeclarations(node.name);
        }
        function checkGrammarNameInLetOrConstDeclarations(name) {
            if (name.kind === ts.SyntaxKind.Identifier) {
                if (name.text === "let") {
                    return grammarErrorOnNode(name, ts.Diagnostics.let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations);
                }
            }
            else {
                var elements = name.elements;
                for (var _i = 0; _i < elements.length; _i++) {
                    var element = elements[_i];
                    if (element.kind !== ts.SyntaxKind.OmittedExpression) {
                        checkGrammarNameInLetOrConstDeclarations(element.name);
                    }
                }
            }
        }
        function checkGrammarVariableDeclarationList(declarationList) {
            var declarations = declarationList.declarations;
            if (checkGrammarForDisallowedTrailingComma(declarationList.declarations)) {
                return true;
            }
            if (!declarationList.declarations.length) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(declarationList), declarations.pos, declarations.end - declarations.pos, ts.Diagnostics.Variable_declaration_list_cannot_be_empty);
            }
        }
        function allowLetAndConstDeclarations(parent) {
            switch (parent.kind) {
                case ts.SyntaxKind.IfStatement:
                case ts.SyntaxKind.DoStatement:
                case ts.SyntaxKind.WhileStatement:
                case ts.SyntaxKind.WithStatement:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                    return false;
                case ts.SyntaxKind.LabeledStatement:
                    return allowLetAndConstDeclarations(parent.parent);
            }
            return true;
        }
        function checkGrammarForDisallowedLetOrConstStatement(node) {
            if (!allowLetAndConstDeclarations(node.parent)) {
                if (ts.isLet(node.declarationList)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.let_declarations_can_only_be_declared_inside_a_block);
                }
                else if (ts.isConst(node.declarationList)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.const_declarations_can_only_be_declared_inside_a_block);
                }
            }
        }
        function isIntegerLiteral(expression) {
            if (expression.kind === ts.SyntaxKind.PrefixUnaryExpression) {
                var unaryExpression = expression;
                if (unaryExpression.operator === ts.SyntaxKind.PlusToken || unaryExpression.operator === ts.SyntaxKind.MinusToken) {
                    expression = unaryExpression.operand;
                }
            }
            if (expression.kind === ts.SyntaxKind.NumericLiteral) {
                // Allows for scientific notation since literalExpression.text was formed by
                // coercing a number to a string. Sometimes this coercion can yield a string
                // in scientific notation.
                // We also don't need special logic for hex because a hex integer is converted
                // to decimal when it is coerced.
                return /^[0-9]+([eE]\+?[0-9]+)?$/.test(expression.text);
            }
            return false;
        }
        function checkGrammarEnumDeclaration(enumDecl) {
            var enumIsConst = (enumDecl.flags & ts.NodeFlags.Const) !== 0;
            var hasError = false;
            // skip checks below for const enums  - they allow arbitrary initializers as long as they can be evaluated to constant expressions.
            // since all values are known in compile time - it is not necessary to check that constant enum section precedes computed enum members.
            if (!enumIsConst) {
                var inConstantEnumMemberSection = true;
                var inAmbientContext = ts.isInAmbientContext(enumDecl);
                for (var _i = 0, _a = enumDecl.members; _i < _a.length; _i++) {
                    var node = _a[_i];
                    // Do not use hasDynamicName here, because that returns false for well known symbols.
                    // We want to perform checkComputedPropertyName for all computed properties, including
                    // well known symbols.
                    if (node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                        hasError = grammarErrorOnNode(node.name, ts.Diagnostics.Computed_property_names_are_not_allowed_in_enums);
                    }
                    else if (inAmbientContext) {
                        if (node.initializer && !isIntegerLiteral(node.initializer)) {
                            hasError = grammarErrorOnNode(node.name, ts.Diagnostics.Ambient_enum_elements_can_only_have_integer_literal_initializers) || hasError;
                        }
                    }
                    else if (node.initializer) {
                        inConstantEnumMemberSection = isIntegerLiteral(node.initializer);
                    }
                    else if (!inConstantEnumMemberSection) {
                        hasError = grammarErrorOnNode(node.name, ts.Diagnostics.Enum_member_must_have_initializer) || hasError;
                    }
                }
            }
            return hasError;
        }
        function hasParseDiagnostics(sourceFile) {
            return sourceFile.parseDiagnostics.length > 0;
        }
        function grammarErrorOnFirstToken(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                var span = ts.getSpanOfTokenAtPosition(sourceFile, node.pos);
                diagnostics.add(ts.createFileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2));
                return true;
            }
        }
        function grammarErrorAtPos(sourceFile, start, length, message, arg0, arg1, arg2) {
            if (!hasParseDiagnostics(sourceFile)) {
                diagnostics.add(ts.createFileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2));
                return true;
            }
        }
        function grammarErrorOnNode(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                diagnostics.add(ts.createDiagnosticForNode(node, message, arg0, arg1, arg2));
                return true;
            }
        }
        function isEvalOrArgumentsIdentifier(node) {
            return node.kind === ts.SyntaxKind.Identifier &&
                (node.text === "eval" || node.text === "arguments");
        }
        function checkGrammarConstructorTypeParameters(node) {
            if (node.typeParameters) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.typeParameters.pos, node.typeParameters.end - node.typeParameters.pos, ts.Diagnostics.Type_parameters_cannot_appear_on_a_constructor_declaration);
            }
        }
        function checkGrammarConstructorTypeAnnotation(node) {
            if (node.type) {
                return grammarErrorOnNode(node.type, ts.Diagnostics.Type_annotation_cannot_appear_on_a_constructor_declaration);
            }
        }
        function checkGrammarProperty(node) {
            if (ts.isClassLike(node.parent)) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional) ||
                    checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_class_property_declaration_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
            }
            else if (node.parent.kind === ts.SyntaxKind.InterfaceDeclaration) {
                if (checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_interface_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
            }
            else if (node.parent.kind === ts.SyntaxKind.TypeLiteral) {
                if (checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_type_literal_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
            }
            if (ts.isInAmbientContext(node) && node.initializer) {
                return grammarErrorOnFirstToken(node.initializer, ts.Diagnostics.Initializers_are_not_allowed_in_ambient_contexts);
            }
        }
        function checkGrammarTopLevelElementForRequiredDeclareModifier(node) {
            // A declare modifier is required for any top level .d.ts declaration except export=, export default,
            // interfaces and imports categories:
            //
            //  DeclarationElement:
            //     ExportAssignment
            //     export_opt   InterfaceDeclaration
            //     export_opt   ImportDeclaration
            //     export_opt   ExternalImportDeclaration
            //     export_opt   AmbientDeclaration
            //
            if (node.kind === ts.SyntaxKind.InterfaceDeclaration ||
                node.kind === ts.SyntaxKind.ImportDeclaration ||
                node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
                node.kind === ts.SyntaxKind.ExportDeclaration ||
                node.kind === ts.SyntaxKind.ExportAssignment ||
                (node.flags & ts.NodeFlags.Ambient) ||
                (node.flags & (ts.NodeFlags.Export | ts.NodeFlags.Default))) {
                return false;
            }
            return grammarErrorOnFirstToken(node, ts.Diagnostics.A_declare_modifier_is_required_for_a_top_level_declaration_in_a_d_ts_file);
        }
        function checkGrammarTopLevelElementsForRequiredDeclareModifier(file) {
            for (var _i = 0, _a = file.statements; _i < _a.length; _i++) {
                var decl = _a[_i];
                if (ts.isDeclaration(decl) || decl.kind === ts.SyntaxKind.VariableStatement) {
                    if (checkGrammarTopLevelElementForRequiredDeclareModifier(decl)) {
                        return true;
                    }
                }
            }
        }
        function checkGrammarSourceFile(node) {
            return ts.isInAmbientContext(node) && checkGrammarTopLevelElementsForRequiredDeclareModifier(node);
        }
        function checkGrammarStatementInAmbientContext(node) {
            if (ts.isInAmbientContext(node)) {
                // An accessors is already reported about the ambient context
                if (isAccessor(node.parent.kind)) {
                    return getNodeLinks(node).hasReportedStatementInAmbientContext = true;
                }
                // Find containing block which is either Block, ModuleBlock, SourceFile
                var links = getNodeLinks(node);
                if (!links.hasReportedStatementInAmbientContext && ts.isFunctionLike(node.parent)) {
                    return getNodeLinks(node).hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, ts.Diagnostics.An_implementation_cannot_be_declared_in_ambient_contexts);
                }
                // We are either parented by another statement, or some sort of block.
                // If we're in a block, we only want to really report an error once
                // to prevent noisyness.  So use a bit on the block to indicate if
                // this has already been reported, and don't report if it has.
                //
                if (node.parent.kind === ts.SyntaxKind.Block || node.parent.kind === ts.SyntaxKind.ModuleBlock || node.parent.kind === ts.SyntaxKind.SourceFile) {
                    var links_1 = getNodeLinks(node.parent);
                    // Check if the containing block ever report this error
                    if (!links_1.hasReportedStatementInAmbientContext) {
                        return links_1.hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, ts.Diagnostics.Statements_are_not_allowed_in_ambient_contexts);
                    }
                }
                else {
                }
            }
        }
        function checkGrammarNumericLiteral(node) {
            // Grammar checking
            if (node.flags & ts.NodeFlags.OctalLiteral && languageVersion >= ts.ScriptTarget.ES5) {
                return grammarErrorOnNode(node, ts.Diagnostics.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher);
            }
        }
        function grammarErrorAfterFirstToken(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                var span = ts.getSpanOfTokenAtPosition(sourceFile, node.pos);
                diagnostics.add(ts.createFileDiagnostic(sourceFile, ts.textSpanEnd(span), /*length*/ 0, message, arg0, arg1, arg2));
                return true;
            }
        }
        /***********************************************************************************************************
         * [ConcreteTypeScript] Assignment analysis section.
         ***********************************************************************************************************/
        // Analyze two type arrays. Keep the common types, degrade the rest to 'weak members'.
        // They are non-concrete, and non-definitely assigned.
        function flowUnionTypesDegradeToMembers(flowTypesA, flowTypesB) {
            var hasTypeInA = function (_a) {
                var type = _a.type;
                return flowHasType(flowTypesA, type);
            };
            var commonTypes = flowTypesB.filter(hasTypeInA);
            var hasTypeInCommon = function (_a) {
                var type = _a.type;
                return flowHasType(commonTypes, type);
            };
            var differentTypes = flowTypesA.concat(flowTypesB).filter(hasTypeInCommon);
            var doesntHavePropertyAlready = function (_a) {
                var name = _a.name;
                for (var _i = 0; _i < commonTypes.length; _i++) {
                    var type = commonTypes[_i].type;
                    if (getPropertyOfType(type, name)) {
                        return true;
                    }
                }
                return false;
            };
            var memberSet = {};
            for (var _i = 0; _i < differentTypes.length; _i++) {
                var _a = differentTypes[_i], type = _a.type, firstBindingSite = _a.firstBindingSite;
                for (var _b = 0, _c = getPropertiesOfType(type).filter(doesntHavePropertyAlready); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    var propType = getTypeOfSymbol(prop);
                    // Add a 'weak member' (non-concrete, not definitely assigned)
                    memberSet[prop.name] = {
                        key: prop.name,
                        definitelyAssigned: false,
                        conditionalBarrierPassed: true,
                        flowTypes: [{ type: unconcrete(propType), firstBindingSite: firstBindingSite }]
                    };
                }
            }
            return { flowTypes: commonTypes, memberSet: memberSet };
        }
        function flowDataGetPropertyType(_a, property) {
            var memberSet = _a.memberSet, flowTypes = _a.flowTypes;
            if (ts.hasProperty(memberSet, property)) {
                return flowTypeGet(memberSet[property]);
            }
            for (var _i = 0; _i < flowTypes.length; _i++) {
                var type = flowTypes[_i].type;
                var typeProp = getPropertyOfType(type, property);
                if (typeProp) {
                    return getTypeOfSymbol(typeProp);
                }
            }
        }
        function flowDataBecomesType(contextNode, flowData, targetType) {
            ts.Debug.assert((unconcrete(targetType).flags & (ts.TypeFlags.Interface | ts.TypeFlags.Declare)) !== 0);
            for (var _i = 0, _a = flowData.flowTypes; _i < _a.length; _i++) {
                var type = _a[_i].type;
                if (isTypeSubtypeOf(type, targetType)) {
                    // No need to do anything if we are already a supertype of the type we are becoming:
                    return flowData;
                }
            }
            var startingType = flowDataFormalType(flowData);
            for (var _b = 0, _c = getPropertiesOfObjectType(targetType); _b < _c.length; _b++) {
                var property = _c[_b];
                var currentProperty = getPropertyOfType(startingType, property.name);
                if (currentProperty) {
                    checkTypeSubtypeOf(getTypeOfSymbol(currentProperty), getTypeOfSymbol(property), contextNode, ts.Diagnostics.ConcreteTypeScript_Inferred_type_conflict_0_is_not_a_subtype_of_1);
                }
            }
            var newFlowType = { type: targetType, firstBindingSite: contextNode };
            return {
                flowTypes: flowData.flowTypes.concat([newFlowType]),
                memberSet: flowData.memberSet
            };
        }
        function flowUnionTypes(flowTypesA, flowTypesB) {
            flowTypesA = flowTypesA || [];
            flowTypesB = flowTypesB || [];
            var doesntHaveType = function (_a) {
                var type = _a.type;
                return !flowHasType(flowTypesA, type);
            };
            return flowTypesA.concat(flowTypesB.filter(doesntHaveType));
        }
        function flowHasType(flowTypes, comparisonType) {
            for (var _i = 0; _i < flowTypes.length; _i++) {
                var type = flowTypes[_i].type;
                if (type === comparisonType) {
                    return true;
                }
            }
            return false;
        }
        function flowDataFormalType(flowData) {
            var typeList = getMinimalTypeList((flowData.flowTypes.map(function (_a) {
                var type = _a.type;
                return type;
            })));
            return getIntersectionType(typeList);
        }
        function flowTypeGet(flowMember) {
            if (!flowMember)
                return null;
            return getUnionType(flowMember.flowTypes.map(function (_a) {
                var type = _a.type;
                return type;
            }));
        }
        // Revert the 'conditionalBarrierPassed' mark values to those of the previous set.
        function flowDataPopConditionalMarks(oldData, newData) {
            return {
                flowTypes: newData.flowTypes,
                memberSet: flowPopConditionalMarks(oldData.memberSet, newData.memberSet)
            };
        }
        function flowTypesEqual(dataA, dataB) {
            if (dataA.length !== dataB.length) {
                return false;
            }
            for (var i = 0; i < dataA.length; i++) {
                if (dataA[i].type !== dataB[i].type) {
                    return false;
                }
            }
            return true;
        }
        function haveSameMembers(dataA, dataB) {
            var keys1 = Object.keys(dataA.memberSet), keys2 = Object.keys(dataB.memberSet);
            if (keys1.length !== keys2.length) {
                return false;
            }
            for (var i = 0; i < keys1.length; i++) {
                if (keys1[i] !== keys2[i]) {
                    return false;
                }
                if (flowTypesEqual(dataA.memberSet[keys1[i]].flowTypes, dataB.memberSet[keys2[i]].flowTypes)) {
                    return false;
                }
            }
            return true;
        }
        function flowDataEqual(dataA, dataB) {
            if (!flowTypesEqual(dataA.flowTypes, dataB.flowTypes)) {
                return false;
            }
            return haveSameMembers(dataA, dataB);
        }
        function flowDataUnion(dataA, dataB) {
            if (flowTypesEqual(dataA.flowTypes, dataB.flowTypes)) {
                return {
                    flowTypes: dataA.flowTypes,
                    memberSet: flowUnion(dataA.memberSet, dataB.memberSet)
                };
            }
            var base = flowUnionTypesDegradeToMembers(dataA.flowTypes, dataB.flowTypes);
            var unionMemberSet = flowUnion(dataA.memberSet, dataB.memberSet);
            return {
                flowTypes: base.flowTypes,
                memberSet: flowUnion(unionMemberSet, base.memberSet)
            };
        }
        function flowDataAssignment(data, key, flowType) {
            return {
                flowTypes: data.flowTypes,
                memberSet: flowAssignment(data.memberSet, key, flowType)
            };
        }
        function flowDataConditionalBarrier(data, conditionalBarrierPassed) {
            if (conditionalBarrierPassed === void 0) { conditionalBarrierPassed = true; }
            return {
                flowTypes: data.flowTypes,
                memberSet: flowConditionalBarrier(data.memberSet, conditionalBarrierPassed)
            };
        }
        // TODO RENAME THE BELOW
        function flowUnionMembers(memberA, memberB) {
            if (!memberA || !memberB) {
                return (memberA || memberB);
            }
            var key = memberA.key;
            var conditionalBarrierPassed = (memberA.conditionalBarrierPassed && memberB.conditionalBarrierPassed);
            var definitelyAssigned = (memberA.definitelyAssigned && memberB.definitelyAssigned);
            var flowTypes = flowUnionTypes(memberA.flowTypes, memberB.flowTypes);
            ts.Debug.assert(key === memberB.key);
            return { key: key, conditionalBarrierPassed: conditionalBarrierPassed, definitelyAssigned: definitelyAssigned, flowTypes: flowTypes };
        }
        // Revert the 'conditionalBarrierPassed' mark values to those of the previous set.
        function flowPopConditionalMarks(prevSet, newSet) {
            var copy = {};
            for (var _i = 0, _a = Object.keys(newSet); _i < _a.length; _i++) {
                var key = _a[_i];
                if (!ts.getProperty(prevSet, key)) {
                    copy[key] = flowConditionalBarrierMember(ts.getProperty(newSet, key), false);
                }
                else {
                    copy[key] = flowConditionalBarrierMember(ts.getProperty(newSet, key), ts.getProperty(newSet, key).conditionalBarrierPassed);
                }
            }
            return copy;
        }
        function flowUnion(setA, setB) {
            var union = {};
            for (var _i = 0, _a = Object.keys(setA); _i < _a.length; _i++) {
                var key = _a[_i];
                union[key] = ts.getProperty(setA, key);
            }
            for (var _b = 0, _c = Object.keys(setB); _b < _c.length; _b++) {
                var key = _c[_b];
                union[key] = flowUnionMembers(ts.getProperty(union, key), ts.getProperty(setB, key));
            }
            return union;
        }
        // Calculate the new member if there was an existing member:
        function flowAssignmentMember(oldMember, newMember) {
            var definitelyAssigned = oldMember.definitelyAssigned, conditionalBarrierPassed = oldMember.conditionalBarrierPassed, flowTypes = oldMember.flowTypes;
            if (definitelyAssigned && !conditionalBarrierPassed) {
                ts.Debug.assert(newMember.flowTypes.length !== 0);
                checkTypeSubtypeOf(flowTypeGet(newMember), flowTypeGet(oldMember), newMember.flowTypes[0].firstBindingSite, ts.Diagnostics.ConcreteTypeScript_Inferred_type_conflict_0_is_not_a_subtype_of_1);
                return flowUnionMembers(oldMember, newMember); // Ensure that only one error per conflicting type occurs
            }
            // Not definitely assigned:
            return newMember;
        }
        function flowAssignment(set, key, flowType) {
            var newMember = { key: key, conditionalBarrierPassed: false, definitelyAssigned: true, flowTypes: [flowType] };
            var copy = (_a = {}, _a[key] = newMember, _a);
            for (var _i = 0, _b = Object.keys(set); _i < _b.length; _i++) {
                var setKey = _b[_i];
                if (setKey === key) {
                    copy[setKey] = flowAssignmentMember(ts.getProperty(set, setKey), newMember);
                }
                else {
                    copy[setKey] = ts.getProperty(set, setKey);
                }
            }
            return copy;
            var _a;
        }
        function flowConditionalBarrierMember(_a, conditionalBarrierPassed) {
            var key = _a.key, flowTypes = _a.flowTypes, definitelyAssigned = _a.definitelyAssigned;
            if (conditionalBarrierPassed === void 0) { conditionalBarrierPassed = true; }
            return { key: key, definitelyAssigned: definitelyAssigned, conditionalBarrierPassed: conditionalBarrierPassed, flowTypes: flowTypes };
        }
        function flowConditionalBarrier(memberSet, conditionalBarrierPassed) {
            if (conditionalBarrierPassed === void 0) { conditionalBarrierPassed = true; }
            var copy = {};
            for (var _i = 0, _a = Object.keys(memberSet); _i < _a.length; _i++) {
                var key = _a[_i];
                copy[key] = flowConditionalBarrierMember(ts.getProperty(memberSet, key), conditionalBarrierPassed);
            }
            return copy;
        }
        // TODO RENAME THE ABOVE 
        function areSameVariable(objA, objB) {
            if (objA.text !== objB.text) {
                return false;
            }
            ts.Debug.assert(objA.symbol == objB.symbol); // TODO is this true?
            return ts.findDeclarationForName(objA, objA.text) === ts.findDeclarationForName(objB, objB.text);
        }
        function areSameValue(objA, objB) {
            ts.Debug.assert(objA != null && objB != null);
            if (!objA || !objB) {
                return false;
            }
            // Handle the case where different-kinded nodes could be equal, 
            // a 'this' keyword and our hacked on pseudo-this with an identifier
            // (only found in ThisParameter's):
            var isAThis = (objA.kind === ts.SyntaxKind.ThisKeyword);
            var isBThis = (objB.kind === ts.SyntaxKind.ThisKeyword);
            if (objA.kind === ts.SyntaxKind.Identifier) {
                isAThis = isAThis || (objA.text === "this");
            }
            if (objB.kind === ts.SyntaxKind.Identifier) {
                isBThis = isBThis || (objB.text === "this");
            }
            if (isAThis && isBThis) {
                return true;
            }
            // Reject the rest of different-kinded comparisons: 
            if (objA.kind !== objB.kind) {
                return false;
            }
            if (objA.kind === ts.SyntaxKind.Identifier) {
                return areSameVariable(objA, objB);
            }
            if (ts.isPrototypeAccess(objA) && ts.isPrototypeAccess(objB)) {
                return areSameValue(objA.expression, objB.expression);
            }
            return false;
        }
        function smartPrint(object, name) {
            console.log("<V" + name + "V>");
            // Detect 'Symbol' objects:
            if (object.exports || object.declarations) {
                flagPrint(object, ts.SymbolFlags, 'flags');
                console.log(object);
            }
            // Detect 'Node' by presence of 'kind'
            if (object != null && object.kind) {
                ts.printNodeDeep(object);
            }
            else if (object != null && object.flags) {
                console.log(typeToString(object));
            }
            else {
                console.log(object);
            }
            console.log("<*" + name + "*>");
        }
        function canHaveFlowData(obj) {
            if (ts.isPrototypeAccess(obj)) {
                return true;
            }
            if (obj.kind === ts.SyntaxKind.ThisKeyword) {
                return true;
            }
            if (obj.kind !== ts.SyntaxKind.Identifier) {
                return false;
            }
            var declaration = ts.findDeclarationForName(obj, obj.text);
            return ts.isVariableLike(declaration);
        }
        function getScopeContainer(obj) {
            var scopeContainer = getScopeContainerWorker(obj);
            ts.Debug.assert(!!scopeContainer);
            return scopeContainer;
        }
        function getScopeContainerWorker(obj) {
            if (ts.isPrototypeAccess(obj)) {
                return getScopeContainer(obj.expression);
            }
            if (obj.kind === ts.SyntaxKind.ThisKeyword || obj.text === "this") {
                return ts.getThisContainer(obj, /*Don't include arrow functions:*/ false);
            }
            if (obj.kind !== ts.SyntaxKind.Identifier) {
                return null;
            }
            return ts.getSymbolScope(obj, obj.text, ts.SymbolFlags.Value);
        }
        function getDeclareTypeName(type) {
            return type.symbol.declarations[0].name;
        }
        function getTempProtectVar(scope, type, member) {
            var text = 'anonymous';
            if (getDeclareTypeName(type)) {
                text = getDeclareTypeName(type).text + "_" + type.id;
            }
            return getTempVar(scope, text, member);
        }
        function getTempVar(scope, prefix, name) {
            getNodeLinks(scope).nextTempVar = getNodeLinks(scope).nextTempVar || 0;
            getNodeLinks(scope).tempVarsToEmit = getNodeLinks(scope).tempVarsToEmit || {};
            return getNodeLinks(scope).tempVarsToEmit[(prefix + "." + name)] || (getNodeLinks(scope).tempVarsToEmit[(prefix + "." + name)] = "cts$$temp$$" + (prefix + '_' + name) + "$$" + getNodeLinks(scope).nextTempVar++);
        }
        function getTempTypeVar(sourceFile, type) {
            var id = type.id;
            return getTempVar(sourceFile, 'types', "" + id);
        }
        function getFunctionDeclarationForDeclareType(type) {
            var node = getDeclareTypeNode(type);
            while (node && !ts.isFunctionLike(node)) {
                node = node.parent;
            }
            return node;
        }
        function isPrototypeType(type) {
            if (!type.symbol) {
                return false;
            }
            return !!(type.symbol.flags & ts.SymbolFlags.Prototype);
        }
        function getScopeContainerAndIdentifierForDeclareType(type) {
            if (isPrototypeType(type)) {
                var funcDecl = getFunctionDeclarationForDeclareType(type.symbol.classType); //getTypeOfSymbol(type.symbol.parent));
                ts.Debug.assert(!!funcDecl);
                if (!funcDecl) {
                    return [null, null];
                }
                return [funcDecl.parent, funcDecl.name];
            }
            else {
                var name_10 = getVariableNameFromDeclareTypeNode(getDeclareTypeNode(type));
                return [ts.getModuleOrSourceFileOrFunction(getDeclareTypeNode(type)), name_10];
            }
        }
        function getFlowDataForDeclareType(type) {
            if (!type.flowData) {
                var _a = getScopeContainerAndIdentifierForDeclareType(type), containerScope = _a[0], identifier = _a[1];
                // Placeholder:
                //                type.flowData = {memberSet: {}, flowTypes: []};
                if (containerScope) {
                    // Remove any previously cached value?
                    var flowType = getTypeFromDeclareTypeNode(getDeclareTypeNode(type), type);
                    computeFlowData(containerScope, isReference, flowType);
                    ts.Debug.assert(!!type.flowData);
                }
            }
            ts.Debug.assert(!!type.flowData);
            return type.flowData;
            // Where:
            function isReference(node) {
                if (!isPrototypeType(type)) {
                    // Handles 'this' and identifier case:
                    return areSameValue(node, identifier);
                }
                else if (node && ts.isPrototypeAccess(node)) {
                    return areSameValue(node.expression, identifier);
                }
                else {
                    return false;
                }
            }
        }
        function getFlowDataAtLocation(reference, type) {
            if (!canHaveFlowData(reference)) {
                return null;
            }
            if (getNodeLinks(reference).ctsFlowData === undefined) {
                var containerScope = getScopeContainer(reference);
                computeFlowData(containerScope, isReference, type);
            }
            ts.Debug.assert(getNodeLinks(reference).ctsFlowData !== undefined);
            return getNodeLinks(reference).ctsFlowData;
            // Where:
            function isReference(node) {
                return areSameValue(node, reference);
            }
        }
        // [ConcreteTypeScript] 
        function getFlowDataForType(type) {
            type = unconcrete(type);
            if (type.flags & ts.TypeFlags.IntermediateFlow) {
                return type.flowData;
            }
            if (type.flags & ts.TypeFlags.Declare) {
                // TODO add to type
                var brandInterfaceDeclaration = ts.getSymbolDecl(type.symbol, ts.SyntaxKind.DeclareTypeDeclaration);
                if (brandInterfaceDeclaration) {
                    // This was defined using a 'brand interface' declaration. There should be no associated flow data.
                    return undefined;
                }
                return getFlowDataForDeclareType(type);
            }
            return undefined;
        }
        // The contextual flow data is the flow data computed such that
        // ignored types are 'dummied out'. 'Dummied out' types 
        // are represented by an IntermediateFlowType object of the type information 
        // known from standard TypeScript type inference.
        function getFlowContextualType(type) {
            var locusType = unboxLocusType(type);
            if (locusType && resolvingLocusTypeStack.indexOf(locusType) > -1) {
                pushIgnoredLocusType(locusType);
                var tempFlowType = createObjectType(ts.TypeFlags.IntermediateFlow);
                tempFlowType.flowData = getFlowDataForDeclareType(locusType);
                popIgnoredLocusType();
                return tempFlowType;
            }
            if (locusType && ignoredLocusTypeStack.indexOf(locusType) > -1) {
                var identifier = getVariableNameFromDeclareTypeNode(type.symbol.declarations[0]);
                ts.Debug.assert(identifier.kind === ts.SyntaxKind.Identifier);
                return getTypeOfNode(identifier, /* Don't invoke flow analysis: */ true);
            }
            return type;
        }
        function pushIgnoredLocusType(type) {
            ignoredLocusTypeStack.push(type);
            produceDiagnostics = false;
        }
        function popIgnoredLocusType() {
            ignoredLocusTypeStack.pop();
        }
        function pushResolvingLocusType(type) {
            resolvingLocusTypeStack.push(type);
        }
        function popResolvingLocusType() {
            resolvingLocusTypeStack.pop();
            if (resolvingLocusTypeStack.length === 0) {
                produceDiagnostics = true;
            }
        }
        function unboxLocusType(targetType) {
            targetType = unconcrete(targetType);
            if (targetType.flags & ts.TypeFlags.Declare) {
                return targetType;
            }
            return null;
        }
        // Temporal logic for becomes-types.
        //function computeFlowDataOverScope({targetType, flowData, declareTypeNode}: IntermediateFlowType, containerScope: Node, isReference: ReferenceDecider) {
        //            // Get the type, be careful not to trigger a loop:
        //            if (unconcrete(targetType).flags & TypeFlags.Declare && !isPrototypeType(unconcrete(targetType))) {
        //                let prototypeSymbol = getPrototypeSymbolOfType(targetDeclareType);
        //                if (prototypeSymbol) {
        //                    Debug.assert(!!(prototypeSymbol.flags & SymbolFlags.Prototype));
        //                    // Bug fix: Ensure we always resolve the prototype object first.
        //                    getFlowDataForDeclareType(<InterfaceType> unconcrete(getTypeOfPrototypeProperty(prototypeSymbol)));
        //                }
        //            }
        //        }
        function computeFlowDataForNonLocusTypeWorker(scope, isReference, initialFlowData, targetType) {
            ts.Debug.assert(unboxLocusType(targetType) == null);
            return computeFlowDataWorker(
            /*Reference decider: */ isReference, 
            /*Type we wish to become in the end: */ targetType, 
            /*Non-inferred member types (besides base types): */ function (member) {
                var property = getPropertyOfType(targetType, member);
                return property ? getTypeOfSymbol(property) : undefinedType;
            }, 
            /*Node-links for control flow (eg break): */ {}, 
            /*Container scope: */ scope, 
            /*Current node in recursive scan: */ scope, 
            /*Current flow-data: */ initialFlowData, 
            /*Original flow-data: */ initialFlowData, 
            /*Protection emit callback, no-op if not declare type target:*/ function () { });
        }
        function computeFlowData(scope, isReference, type) {
            if (!(type.flags & ts.TypeFlags.IntermediateFlow)) {
                return null;
            }
            var _a = type, initialFlowData = _a.flowData, targetType = _a.targetType, declareTypeNode = _a.declareTypeNode;
            if (!!declareTypeNode) {
                var finalFlowData = computeFlowDataForLocusTypeWorker(scope, isReference, initialFlowData, targetType);
            }
            else {
                var finalFlowData = computeFlowDataForNonLocusTypeWorker(scope, isReference, initialFlowData, targetType);
            }
            ts.forEachChildRecursive(scope, function (node) {
                // Don't brand for eg uncaptured 'this'
                if (isReference(node) && getNodeLinks(node).ctsFlowData) {
                    getNodeLinks(node).ctsFinalFlowData = finalFlowData;
                }
            });
            return finalFlowData;
        }
        function computeFlowDataForLocusTypeWorker(scope, isReference, initialFlowData, targetType) {
            ts.Debug.assert(unboxLocusType(targetType) != null);
            var protectionQueue = [];
            pushResolvingLocusType(unboxLocusType(targetType));
            // Analysis was not yet run for this scope
            var finalFlowData = computeFlowDataWorker(
            /*Reference decider: */ isReference, 
            /*Type we wish to become in the end: */ targetType, 
            /*Non-inferred member types (besides base types): */ getTargetTypeForMember, 
            /*Node-links for control flow (eg break): */ {}, 
            /*Container scope: */ scope, 
            /*Current node in recursive scan: */ scope, 
            /*Current flow-data: */ initialFlowData, 
            /*Original flow-data: */ initialFlowData, 
            /*Protection emit callback, no-op if not declare type target:*/ emitProtection);
            // Remove ourselves from the list of resolving types:
            popResolvingLocusType();
            if (flowDataEqual(finalFlowData, initialFlowData)) {
                unboxLocusType(targetType).emptyFlowType = true; // TODO fix for explicitly defined locus types 
            }
            for (var _i = 0; _i < protectionQueue.length; _i++) {
                var protect = protectionQueue[_i];
                protect(finalFlowData);
            }
            unboxLocusType(targetType).flowData = finalFlowData; // TODO evaluate need / fix for explicitly defined locus types
            return finalFlowData;
            // Note: 'right' can be null, signifying that we are protecting the existing value.
            function emitProtection(flowDataAfterAssignment, node, left, member, right) {
                protectionQueue.push(function (_a) {
                    var memberSet = _a.memberSet;
                    var type = flowTypeGet(ts.getProperty(memberSet, member));
                    if (!isConcreteType(type)) {
                        return;
                    }
                    var guardVariable = getTempProtectVar(scope, unboxLocusType(targetType), member);
                    var brandGuardVariable = getTempProtectVar(scope, unboxLocusType(targetType), '$$BRAND$$GUARD');
                    // Creating closures is not ideal for performance but we cannot reason about the targetDeclareType
                    // until this function ends so it's convenient.
                    function isTypeComplete() {
                        if (!getDeclareTypeName(unboxLocusType(targetType))) {
                            return false;
                        }
                        var tempFlowType = createObjectType(ts.TypeFlags.IntermediateFlow);
                        tempFlowType.flowData = flowDataAfterAssignment;
                        tempFlowType.targetType = targetType;
                        return isIntermediateFlowTypeSubtypeOfTarget(tempFlowType);
                    }
                    var bindingData = {
                        left: left, member: member, right: right, type: (isWeakConcreteType(type) ? null : type),
                        targetDeclareType: unboxLocusType(targetType), isTypeComplete: isTypeComplete, guardVariable: guardVariable, brandGuardVariable: brandGuardVariable,
                        typeVar: getTempTypeVar(ts.getSourceFileOfNode(scope), type)
                    };
                    if (right && ts.isFunctionLike(right)) {
                        right.nameForRawFunctionEmit = member;
                    }
                    if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                        getNodeLinks(node).bindingsAfter = getNodeLinks(node).bindingsAfter || [];
                        getNodeLinks(node).bindingsAfter.push(bindingData);
                    }
                    else {
                        getNodeLinks(node).bindingInline = bindingData;
                    }
                });
            }
            // Where:
            function getTargetTypeForMember(member) {
                if (isFreshDeclareType(targetType)) {
                    // For a fresh type definition (ie, a standard declare), accept all members.
                    return null;
                }
                var prop = getPropertyOfType(targetType, member);
                return prop ? getTypeOfSymbol(prop) : undefinedType;
            }
        }
        // Carefully avoid problems we may run into.
        function getNonContextualType(thisType, node) {
            if (ts.isFunctionLike(node)) {
                var callSignatures = getSignaturesOfType(getTypeOfSymbol(node.symbol), ts.SignatureKind.Call).map(cloneSignature);
                for (var _i = 0; _i < callSignatures.length; _i++) {
                    var signature = callSignatures[_i];
                    if (thisType && !signature.resolvedThisType) {
                        if (isPrototypeType(thisType) && thisType.symbol.parent) {
                            // If we have inferred that a flow-type expression should take our type, and it is a .prototype type,
                            // we should actually infer the outer type as .prototype types are not meant to be used directly.
                            thisType = getDeclaredTypeOfSymbol(thisType.symbol.parent);
                        }
                        signature.resolvedThisType = thisType;
                    }
                }
                // Function-like nodes are concrete:
                var type = createAnonymousType(undefined, emptySymbols, callSignatures, emptyArray, undefined, undefined);
                return createConcreteType(type, /*Weakly concrete*/ false);
            }
            else {
                return getTypeOfNode(node);
            }
        }
        // Recursively find all references to our node object descending from the node 'node'
        function computeFlowDataWorker(// Refer to the same object throughout a recursion instance:
            isReference, targetType, getTargetTypeForMember, nodePostLinks, containerScope, 
            // Current node in recursive scan:
            node, prev, orig, emitProtection) {
            /** Function skeleton: **/
            // Correct conditional marks: (TODO inefficient)
            if (isReference(node)) {
                ts.Debug.assert(!getNodeLinks(node).ctsFlowData);
                getNodeLinks(node).ctsFlowData = prev;
            }
            else {
                var orig_1 = prev;
                scanWorker();
                prev = flowDataPopConditionalMarks(orig_1, prev);
            }
            return prev;
            /** Helper functions: **/
            function scanReturnOrContinueOrBreakStatement(node) {
                // Truncate the scope to only the topmost block we care about
                var breakingContainer = ts.findBreakingScope(node);
                if (ts.isNodeDescendentOf(containerScope, breakingContainer)) {
                    breakingContainer = containerScope;
                }
                var id = breakingContainer.id;
                nodePostLinks[id] = (nodePostLinks[id] || []);
                descend();
                // We do not allow assignment expressions branding occurs _before_ the return statement has a chance to execute.
                nodePostLinks[id].push(prev);
            }
            // We recursively scan become/declare function calls
            function scanCallExpression(node) {
                // Make sure to visit the constituent nodes, they will need flow data as well:
                prev = recurse(node.expression, prev);
                var couldBeBecomes = false;
                for (var _i = 0, _a = node.arguments; _i < _a.length; _i++) {
                    var argument = _a[_i];
                    if (isReference(argument)) {
                        couldBeBecomes = true;
                    }
                    prev = recurse(argument, prev);
                }
                // TODO proper fix to recursive call problem
                if (!couldBeBecomes) {
                    return; // Avoid further analysis
                }
                var exprType = getTypeOfNode(node.expression);
                var callSignatures = getSignaturesOfType(getApparentType(exprType), ts.SignatureKind.Call);
                // TODO Work-around for circular logic with getResolvedSignature
                if (callSignatures.length !== 1) {
                    return;
                }
                var signature = callSignatures[0];
                var becomesAmount = 0;
                for (var i = 0; i < signature.parameters.length && i < node.arguments.length; i++) {
                    var paramType = getTypeAtPosition(signature, i);
                    // Cannot do anything without type information:
                    if (!paramType) {
                        continue;
                    }
                    if (paramType.flags & ts.TypeFlags.IntermediateFlow) {
                        if (isReference(node.arguments[i])) {
                            becomesAmount++;
                            var flowType = paramType;
                            var targetType_1 = flowType.targetType;
                            prev = flowDataBecomesType(node, prev, targetType_1);
                            if (isConcreteType(targetType_1) && !isConcreteType(exprType)) {
                                // For emit:
                                getNodeLinks(node).mustCheckBecomes = getNodeLinks(node).mustCheckBecomes || [];
                                getNodeLinks(node).mustCheckBecomes.push({ expr: node.arguments[i], type: targetType_1 });
                            }
                        }
                    }
                }
                if (becomesAmount > 1) {
                    throw new Error("TODO make special error. Cannot have more than one becomes reference to same alias for now.");
                }
            }
            function scanSwitchStatement(node) {
                prev = recurse(node.expression, prev);
                var beforeCases = prev;
                // Flow analysis: Merge the result of every case
                for (var _i = 0, _a = node.caseBlock.clauses; _i < _a.length; _i++) {
                    var clause = _a[_i];
                    prev = flowDataUnion(prev, recurse(clause, flowDataConditionalBarrier(beforeCases)));
                }
            }
            function scanConditionalExpression(node) {
                prev = recurse(node.condition, prev);
                var whenTrue = recurse(node.whenTrue, flowDataConditionalBarrier(prev));
                var whenFalse = recurse(node.whenFalse, flowDataConditionalBarrier(prev));
                // Flow analysis: Merge the result of the left and the right
                prev = flowDataUnion(whenTrue, whenFalse);
            }
            function scanMemberBinding(member, flowType) {
                var memberTarget = getTargetTypeForMember(member);
                if (memberTarget) {
                    if (memberTarget === undefinedType) {
                        // The type that we wish to become either does not have this member.
                        // We will allow the normal check* functions to error in this case.
                        return false;
                    }
                    else if (!isTypeAssignableTo(flowType.type, memberTarget)) {
                        // The type that we wish to become has an incompatible type for this member.
                        // We will pretend that the types are correct here and let the check* methods error about the mismatch.
                        flowType = { type: memberTarget, firstBindingSite: flowType.firstBindingSite };
                    }
                    else if (isTypeSubtypeOf(flowType.type, memberTarget)) {
                        // If the type is a supertype of our target type, use the target type.
                        // This prevents inconsistency with a type suddenly losing information
                        // when the become has been fulfilled, as it becomes the target type then anyway.
                        flowType = { type: memberTarget, firstBindingSite: flowType.firstBindingSite };
                    }
                }
                // Incorporate into our type:
                prev = flowDataAssignment(prev, member, flowType);
                return true;
            }
            function scanBinaryExpression(node) {
                if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                    node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                    // Consider the shortcircuting behaviour of && or ||
                    // Flow analysis: Merge the result of the left and of the left-then-right
                    var left = recurse(node.left, prev);
                    var right = recurse(node.right, left);
                    prev = flowDataUnion(left, right);
                }
                else {
                    // Normal expression where left occurs first.
                    prev = recurse(node.left, prev);
                    prev = recurse(node.right, prev);
                }
                /* Check if we have a relevant binding assignment: */
                if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
                    var left = node.left, right = node.right;
                    // If there are any assignments to our LHS, throw away the previous information!
                    if (isReference(left)) {
                        prev = orig;
                    }
                    else if (isMemberAccess(left)) {
                        var member = left.name.text;
                        var memberTarget = getTargetTypeForMember(member);
                        if (memberTarget && memberTarget !== undefinedType) {
                            var assumeFinalType = flowDataAssignment(prev, member, { firstBindingSite: node, type: memberTarget });
                            // Make sure the contextual type resolves to the type we want it to be:
                            getNodeLinks(left.expression).ctsFlowData = assumeFinalType;
                            getNodeLinks(left.expression).ctsFinalFlowData = assumeFinalType;
                            var type = getNonContextualType(targetType, right);
                        }
                        else {
                            var type = getNonContextualType(targetType, right);
                        }
                        if (scanMemberBinding(left.name.text, { firstBindingSite: node, type: type })) {
                            emitProtection(prev, node, left.expression, member, right);
                        }
                        // Ensure that nodes being assigned to are aware of their incoming types
                        getNodeLinks(left.expression).ctsFlowData = prev;
                    }
                }
            }
            function scanForStatement(node) {
                prev = recurse(node.initializer, prev);
                prev = recurse(node.condition, prev);
                // Flow analysis: Merge the result of entering the loop and of not
                prev = flowDataUnion(recurse(node.statement, prev), prev);
            }
            function scanVariableDeclarationList(node) {
                for (var _i = 0, _a = node.declarations; _i < _a.length; _i++) {
                    var decl = _a[_i];
                    prev = recurse(decl, prev);
                }
            }
            function scanObjectLiteralInitializer(varName, node) {
                // TODO also implement for special object literal emits
                // [ConcreteTypeScript] Emit protectors that were not emitted in the object initializer
                var literalType = checkObjectLiteral(node);
                var properties = getPropertiesOfType(literalType);
                for (var _i = 0; _i < properties.length; _i++) {
                    var property = properties[_i];
                    var elementNode = ts.getSymbolDecl(property, ts.SyntaxKind.PropertyAssignment);
                    var type = getTypeOfSymbol(property);
                    scanMemberBinding(property.name, { firstBindingSite: elementNode, type: type });
                    // Emit protection after:
                    emitProtection(prev, node, varName, property.name, null);
                }
            }
            function scanVariableLikeDeclaration(node) {
                if (node.initializer && isReference(node.name)) {
                    if (node.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                        scanObjectLiteralInitializer(node.name, node.initializer);
                    }
                }
                descend();
            }
            function scanForInStatement(node) {
                prev = recurse(node.expression, prev);
                // Flow analysis: Merge the result of entering the loop and of not
                prev = flowDataUnion(recurse(node.statement, prev), prev);
            }
            function scanFunctionLikeDeclaration(node) {
                // Special case so we don't consider our declaration scope as conditionally occuring:
                var bodyScan = recurse(node.body, prev);
                if (containerScope === node) {
                    prev = bodyScan;
                }
                else {
                }
            }
            function scanTryStatement(node) {
                // Scan the try block:
                var ifTry = recurse(node.tryBlock, prev);
                // Treat it as conditional, pass to 'catch' block:
                var ifCatch = recurse(node.catchClause, flowDataConditionalBarrier(flowDataUnion(ifTry, prev)));
                // Scan the finally block (possibly 'undefined'):
                prev = recurse(node.finallyBlock, flowDataUnion(ifCatch, prev));
            }
            function scanIfStatement(node) {
                prev = recurse(node.expression, prev);
                var ifTrue = recurse(node.thenStatement, flowDataConditionalBarrier(prev));
                var ifFalse = recurse(node.elseStatement, flowDataConditionalBarrier(prev));
                prev = flowDataUnion(ifTrue, ifFalse);
            }
            function scanPropertyAccessExpression(node) {
                prev = recurse(node.expression, prev);
            }
            function scanWhileStatement(node) {
                prev = recurse(node.expression, prev);
                // Flow analysis: Merge the result of entering the loop and of not
                prev = flowDataUnion(recurse(node.statement, prev), prev);
            }
            // Switch statement segregated for cleanliness:
            function scanWorker() {
                if (!node)
                    return;
                switch (node.kind) {
                    // Handle nodes with their handling function:
                    case ts.SyntaxKind.PropertyAccessExpression:
                        return scanPropertyAccessExpression(node);
                    case ts.SyntaxKind.SwitchStatement:
                        return scanSwitchStatement(node);
                    case ts.SyntaxKind.ConditionalExpression:
                        return scanConditionalExpression(node);
                    case ts.SyntaxKind.CallExpression:
                        return scanCallExpression(node);
                    case ts.SyntaxKind.BinaryExpression:
                        return scanBinaryExpression(node);
                    case ts.SyntaxKind.ForStatement:
                        return scanForStatement(node);
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.VariableDeclaration:
                        return scanVariableLikeDeclaration(node);
                    case ts.SyntaxKind.VariableDeclarationList:
                        return scanVariableDeclarationList(node);
                    case ts.SyntaxKind.ForInStatement:
                        return scanForInStatement(node);
                    case ts.SyntaxKind.TryStatement:
                        return scanTryStatement(node);
                    case ts.SyntaxKind.IfStatement:
                        return scanIfStatement(node);
                    case ts.SyntaxKind.WhileStatement:
                        return scanWhileStatement(node);
                    // Handle 'goto-like' nodes:
                    case ts.SyntaxKind.BreakStatement:
                    case ts.SyntaxKind.ContinueStatement:
                    case ts.SyntaxKind.ReturnStatement:
                        return scanReturnOrContinueOrBreakStatement(node);
                    // Handle function nodes:
                    case ts.SyntaxKind.ArrowFunction:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.FunctionDeclaration:
                        return scanFunctionLikeDeclaration(node);
                    default:
                        descend();
                }
                if (typeof nodePostLinks[node.id] !== "undefined") {
                    for (var _i = 0, _a = nodePostLinks[node.id]; _i < _a.length; _i++) {
                        var links = _a[_i];
                        prev = flowDataUnion(prev, links);
                    }
                }
            }
            function recurse(node, prev) {
                return computeFlowDataWorker(isReference, targetType, getTargetTypeForMember, nodePostLinks, containerScope, node, prev, orig, emitProtection);
            }
            function descend() {
                ts.forEachChild(node, function (subchild) {
                    prev = recurse(subchild, prev);
                });
            }
            function isMemberAccess(node) {
                if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    return isReference(node.expression);
                }
                return false;
            }
        }
    }
    ts.createTypeChecker = createTypeChecker;
})(ts || (ts = {}));
//# sourceMappingURL=checker.js.map