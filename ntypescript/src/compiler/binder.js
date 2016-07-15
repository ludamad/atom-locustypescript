/// <reference path="parser.ts"/>
/// <reference path="ctsUtilities.ts"/>
/* @internal */
var ts;
(function (ts) {
    ts.bindTime = 0;
    (function (ModuleInstanceState) {
        ModuleInstanceState[ModuleInstanceState["NonInstantiated"] = 0] = "NonInstantiated";
        ModuleInstanceState[ModuleInstanceState["Instantiated"] = 1] = "Instantiated";
        ModuleInstanceState[ModuleInstanceState["ConstEnumOnly"] = 2] = "ConstEnumOnly";
    })(ts.ModuleInstanceState || (ts.ModuleInstanceState = {}));
    var ModuleInstanceState = ts.ModuleInstanceState;
    function getModuleInstanceState(node) {
        // A module is uninstantiated if it contains only
        // 1. interface declarations, type alias declarations
        if (node.kind === ts.SyntaxKind.InterfaceDeclaration || node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            return ModuleInstanceState.NonInstantiated;
        }
        else if (ts.isConstEnumDeclaration(node)) {
            return ModuleInstanceState.ConstEnumOnly;
        }
        else if ((node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration) && !(node.flags & ts.NodeFlags.Export)) {
            return ModuleInstanceState.NonInstantiated;
        }
        else if (node.kind === ts.SyntaxKind.ModuleBlock) {
            var state = ModuleInstanceState.NonInstantiated;
            ts.forEachChild(node, function (n) {
                switch (getModuleInstanceState(n)) {
                    case ModuleInstanceState.NonInstantiated:
                        // child is non-instantiated - continue searching
                        return false;
                    case ModuleInstanceState.ConstEnumOnly:
                        // child is const enum only - record state and continue searching
                        state = ModuleInstanceState.ConstEnumOnly;
                        return false;
                    case ModuleInstanceState.Instantiated:
                        // child is instantiated - record state and stop
                        state = ModuleInstanceState.Instantiated;
                        return true;
                }
            });
            return state;
        }
        else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
            return getModuleInstanceState(node.body);
        }
        else {
            return ModuleInstanceState.Instantiated;
        }
    }
    ts.getModuleInstanceState = getModuleInstanceState;
    var ContainerFlags;
    (function (ContainerFlags) {
        // The current node is not a container, and no container manipulation should happen before
        // recursing into it.
        ContainerFlags[ContainerFlags["None"] = 0] = "None";
        // The current node is a container.  It should be set as the current container (and block-
        // container) before recursing into it.  The current node does not have locals.  Examples:
        //
        //      Classes, ObjectLiterals, TypeLiterals, Interfaces...
        ContainerFlags[ContainerFlags["IsContainer"] = 1] = "IsContainer";
        // The current node is a block-scoped-container.  It should be set as the current block-
        // container before recursing into it.  Examples:
        //
        //      Blocks (when not parented by functions), Catch clauses, For/For-in/For-of statements...
        ContainerFlags[ContainerFlags["IsBlockScopedContainer"] = 2] = "IsBlockScopedContainer";
        ContainerFlags[ContainerFlags["HasLocals"] = 4] = "HasLocals";
        // If the current node is a container that also container that also contains locals.  Examples:
        //
        //      Functions, Methods, Modules, Source-files.
        ContainerFlags[ContainerFlags["IsContainerWithLocals"] = 5] = "IsContainerWithLocals";
    })(ContainerFlags || (ContainerFlags = {}));
    function bindSourceFile(file) {
        var start = new Date().getTime();
        bindSourceFileWorker(file);
        ts.bindTime += new Date().getTime() - start;
    }
    ts.bindSourceFile = bindSourceFile;
    function bindSourceFileWorker(file) {
        var parent;
        var container;
        var blockScopeContainer;
        var lastContainer;
        // If this file is an external module, then it is automatically in strict-mode according to
        // ES6.  If it is not an external module, then we'll determine if it is in strict mode or
        // not depending on if we see "use strict" in certain places (or if we hit a class/namespace).
        var inStrictMode = !!file.externalModuleIndicator;
        var symbolCount = 0;
        var Symbol = ts.objectAllocator.getSymbolConstructor();
        var classifiableNames = {};
        if (!file.locals) {
            bind(file);
            file.symbolCount = symbolCount;
            file.classifiableNames = classifiableNames;
        }
        return;
        function createSymbol(flags, name) {
            symbolCount++;
            return new Symbol(flags, name);
        }
        function addDeclarationToSymbol(symbol, node, symbolFlags) {
            symbol.flags |= symbolFlags;
            node.symbol = symbol;
            if (!symbol.declarations) {
                symbol.declarations = [];
            }
            symbol.declarations.push(node);
            if (symbolFlags & ts.SymbolFlags.HasExports && !symbol.exports) {
                symbol.exports = {};
            }
            if (symbolFlags & ts.SymbolFlags.HasMembers && !symbol.members) {
                symbol.members = {};
            }
            if (symbolFlags & ts.SymbolFlags.Value && !symbol.valueDeclaration) {
                symbol.valueDeclaration = node;
            }
        }
        // Should not be called on a declaration with a computed property name,
        // unless it is a well known Symbol.
        function getDeclarationName(node) {
            if (node.name) {
                if (node.kind === ts.SyntaxKind.ModuleDeclaration && node.name.kind === ts.SyntaxKind.StringLiteral) {
                    return "\"" + node.name.text + "\"";
                }
                if (node.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                    var nameExpression = node.name.expression;
                    ts.Debug.assert(ts.isWellKnownSymbolSyntactically(nameExpression));
                    return ts.getPropertyNameForKnownSymbolName(nameExpression.name.text);
                }
                return node.name.text;
            }
            switch (node.kind) {
                case ts.SyntaxKind.Constructor:
                    return "__constructor";
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.CallSignature:
                    return "__call";
                case ts.SyntaxKind.ConstructorType:
                case ts.SyntaxKind.ConstructSignature:
                    return "__new";
                case ts.SyntaxKind.IndexSignature:
                    return "__index";
                case ts.SyntaxKind.ExportDeclaration:
                    return "__export";
                case ts.SyntaxKind.ExportAssignment:
                    return node.isExportEquals ? "export=" : "default";
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.ClassDeclaration:
                    return node.flags & ts.NodeFlags.Default ? "default" : undefined;
            }
        }
        function getDisplayName(node) {
            return node.name ? ts.declarationNameToString(node.name) : getDeclarationName(node);
        }
        /**
         * Declares a Symbol for the node and adds it to symbols. Reports errors for conflicting identifier names.
         * @param symbolTable - The symbol table which node will be added to.
         * @param parent - node's parent declaration.
         * @param node - The declaration to be added to the symbol table
         * @param includes - The SymbolFlags that node has in addition to its declaration type (eg: export, ambient, etc.)
         * @param excludes - The flags which node cannot be declared alongside in a symbol table. Used to report forbidden declarations.
         */
        function declareSymbol(symbolTable, parent, node, includes, excludes) {
            ts.Debug.assert(!ts.hasDynamicName(node));
            // The exported symbol for an export default function/class node is always named "default"
            var name = node.flags & ts.NodeFlags.Default && parent ? "default" : getDeclarationName(node);
            var symbol;
            if (name !== undefined) {
                // Check and see if the symbol table already has a symbol with this name.  If not,
                // create a new symbol with this name and add it to the table.  Note that we don't
                // give the new symbol any flags *yet*.  This ensures that it will not conflict
                // with the 'excludes' flags we pass in.
                //
                // If we do get an existing symbol, see if it conflicts with the new symbol we're
                // creating.  For example, a 'var' symbol and a 'class' symbol will conflict within
                // the same symbol table.  If we have a conflict, report the issue on each
                // declaration we have for this symbol, and then create a new symbol for this
                // declaration.
                //
                // If we created a new symbol, either because we didn't have a symbol with this name
                // in the symbol table, or we conflicted with an existing symbol, then just add this
                // node as the sole declaration of the new symbol.
                //
                // Otherwise, we'll be merging into a compatible existing symbol (for example when
                // you have multiple 'vars' with the same name in the same container).  In this case
                // just add this node into the declarations list of the symbol.
                symbol = ts.hasProperty(symbolTable, name)
                    ? symbolTable[name]
                    : (symbolTable[name] = createSymbol(ts.SymbolFlags.None, name));
                if (name && (includes & ts.SymbolFlags.Classifiable)) {
                    classifiableNames[name] = name;
                }
                if (symbol.flags & excludes) {
                    if (node.name) {
                        node.name.parent = node;
                    }
                    // Report errors every position with duplicate declaration
                    // Report errors on previous encountered declarations
                    var message = symbol.flags & ts.SymbolFlags.BlockScopedVariable
                        ? ts.Diagnostics.Cannot_redeclare_block_scoped_variable_0
                        : ts.Diagnostics.Duplicate_identifier_0;
                    ts.forEach(symbol.declarations, function (declaration) {
                        file.bindDiagnostics.push(ts.createDiagnosticForNode(declaration.name || declaration, message, getDisplayName(declaration)));
                    });
                    file.bindDiagnostics.push(ts.createDiagnosticForNode(node.name || node, message, getDisplayName(node)));
                    symbol = createSymbol(ts.SymbolFlags.None, name);
                }
            }
            else {
                // [ConcreteTypeScript]
                symbol = createSymbol(ts.SymbolFlags.None, "<anonymous>");
            }
            addDeclarationToSymbol(symbol, node, includes);
            symbol.parent = parent;
            return symbol;
        }
        function declareModuleMember(node, symbolFlags, symbolExcludes) {
            var hasExportModifier = ts.getCombinedNodeFlags(node) & ts.NodeFlags.Export;
            if (symbolFlags & ts.SymbolFlags.Alias) {
                if (node.kind === ts.SyntaxKind.ExportSpecifier || (node.kind === ts.SyntaxKind.ImportEqualsDeclaration && hasExportModifier)) {
                    return declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                }
                else {
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
                }
            }
            else {
                // Exported module members are given 2 symbols: A local symbol that is classified with an ExportValue,
                // ExportType, or ExportContainer flag, and an associated export symbol with all the correct flags set
                // on it. There are 2 main reasons:
                //
                //   1. We treat locals and exports of the same name as mutually exclusive within a container.
                //      That means the binder will issue a Duplicate Identifier error if you mix locals and exports
                //      with the same name in the same container.
                //      TODO: Make this a more specific error and decouple it from the exclusion logic.
                //   2. When we checkIdentifier in the checker, we set its resolved symbol to the local symbol,
                //      but return the export symbol (by calling getExportSymbolOfValueSymbolIfExported). That way
                //      when the emitter comes back to it, it knows not to qualify the name if it was found in a containing scope.
                if (hasExportModifier || container.flags & ts.NodeFlags.ExportContext) {
                    var exportKind = (symbolFlags & ts.SymbolFlags.Value ? ts.SymbolFlags.ExportValue : 0) |
                        (symbolFlags & ts.SymbolFlags.Type ? ts.SymbolFlags.ExportType : 0) |
                        (symbolFlags & ts.SymbolFlags.Namespace ? ts.SymbolFlags.ExportNamespace : 0);
                    var local = declareSymbol(container.locals, undefined, node, exportKind, symbolExcludes);
                    local.exportSymbol = declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                    node.localSymbol = local;
                    return local;
                }
                else {
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
                }
            }
        }
        // All container nodes are kept on a linked list in declaration order. This list is used by
        // the getLocalNameOfContainer function in the type checker to validate that the local name
        // used for a container is unique.
        function bindChildren(node) {
            // Before we recurse into a node's chilren, we first save the existing parent, container
            // and block-container.  Then after we pop out of processing the children, we restore
            // these saved values.
            var saveParent = parent;
            var saveContainer = container;
            var savedBlockScopeContainer = blockScopeContainer;
            // This node will now be set as the parent of all of its children as we recurse into them.
            parent = node;
            // Depending on what kind of node this is, we may have to adjust the current container
            // and block-container.   If the current node is a container, then it is automatically
            // considered the current block-container as well.  Also, for containers that we know
            // may contain locals, we proactively initialize the .locals field. We do this because
            // it's highly likely that the .locals will be needed to place some child in (for example,
            // a parameter, or variable declaration).
            //
            // However, we do not proactively create the .locals for block-containers because it's
            // totally normal and common for block-containers to never actually have a block-scoped
            // variable in them.  We don't want to end up allocating an object for every 'block' we
            // run into when most of them won't be necessary.
            //
            // Finally, if this is a block-container, then we clear out any existing .locals object
            // it may contain within it.  This happens in incremental scenarios.  Because we can be
            // reusing a node from a previous compilation, that node may have had 'locals' created
            // for it.  We must clear this so we don't accidently move any stale data forward from
            // a previous compilation.
            var containerFlags = getContainerFlags(node);
            if (containerFlags & ContainerFlags.IsContainer) {
                container = blockScopeContainer = node;
                if (containerFlags & ContainerFlags.HasLocals) {
                    container.locals = {};
                }
                addToContainerChain(container);
            }
            else if (containerFlags & ContainerFlags.IsBlockScopedContainer) {
                blockScopeContainer = node;
                blockScopeContainer.locals = undefined;
            }
            ts.forEachChild(node, bind);
            container = saveContainer;
            parent = saveParent;
            blockScopeContainer = savedBlockScopeContainer;
        }
        function getContainerFlags(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassExpression:
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.InterfaceDeclaration:
                // [ConcreteTypeScript]
                case ts.SyntaxKind.DeclareTypeDeclaration:
                // [/ConcreteTypeScript]
                case ts.SyntaxKind.EnumDeclaration:
                case ts.SyntaxKind.TypeLiteral:
                case ts.SyntaxKind.ObjectLiteralExpression:
                    return ContainerFlags.IsContainer;
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.ConstructSignature:
                case ts.SyntaxKind.IndexSignature:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                case ts.SyntaxKind.ModuleDeclaration:
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.TypeAliasDeclaration:
                    return ContainerFlags.IsContainerWithLocals;
                case ts.SyntaxKind.CatchClause:
                case ts.SyntaxKind.ForStatement:
                case ts.SyntaxKind.ForInStatement:
                case ts.SyntaxKind.ForOfStatement:
                case ts.SyntaxKind.CaseBlock:
                    return ContainerFlags.IsBlockScopedContainer;
                case ts.SyntaxKind.Block:
                    // do not treat blocks directly inside a function as a block-scoped-container.
                    // Locals that reside in this block should go to the function locals. Othewise 'x'
                    // would not appear to be a redeclaration of a block scoped local in the following
                    // example:
                    //
                    //      function foo() {
                    //          var x;
                    //          let x;
                    //      }
                    //
                    // If we placed 'var x' into the function locals and 'let x' into the locals of
                    // the block, then there would be no collision.
                    //
                    // By not creating a new block-scoped-container here, we ensure that both 'var x'
                    // and 'let x' go into the Function-container's locals, and we do get a collision
                    // conflict.
                    return ts.isFunctionLike(node.parent) ? ContainerFlags.None : ContainerFlags.IsBlockScopedContainer;
            }
            return ContainerFlags.None;
        }
        // [ConcreteTypeScript]
        function getFunctionDeclarationParent(node) {
            while (node && !ts.isFunctionLike(node)) {
                node = node.parent;
            }
            return node;
        }
        // [ConcreteTypeScript]
        function bindDeclareTypeDeclaration(node) {
            var scope = ts.getModuleOrSourceFile(container);
            // The parent of the declaration is expected to be the containing scope:
            if (scope.symbol && scope.symbol.flags & ts.SymbolFlags.HasExports) {
                var symbol = declareSymbol(scope.symbol.exports, undefined, node, ts.SymbolFlags.Declare | ts.SymbolFlags.ExportType, ts.SymbolFlags.DeclareTypeExcludes);
            }
            else {
                var symbol = declareSymbol(scope.locals, undefined, node, ts.SymbolFlags.Declare | ts.SymbolFlags.ExportType, ts.SymbolFlags.DeclareTypeExcludes);
            }
            // If we have a 'this' type, create a prototype parameter.
            if (node.parent.kind === ts.SyntaxKind.ThisParameter) {
                bindPrototypeAsDeclareType(getFunctionDeclarationParent(node), symbol);
            }
        }
        function bindPrototypeAsDeclareType(node, symbol) {
            // Create identifier:
            var identifier = ts.createSynthesizedNode(ts.SyntaxKind.Identifier);
            identifier.text = "prototype";
            identifier.pos = 0; // Very wrong but needs to be nonzero range
            identifier.end = 1;
            identifier.parent = node;
            // Create decl:
            var decl = ts.createNode(ts.SyntaxKind.DeclareType);
            decl.pos = node.pos;
            decl.name = identifier;
            decl.enclosingDeclareSymbol = symbol;
            decl.end = node.end;
            decl.parent = node;
            var prototypeSymbol = declareSymbol(symbol.exports, undefined, decl, ts.SymbolFlags.Declare | ts.SymbolFlags.Prototype | ts.SymbolFlags.Property | ts.SymbolFlags.ExportType, ts.SymbolFlags.DeclareTypeExcludes);
            bindPrototypeSymbol(node, symbol, prototypeSymbol);
        }
        function addToContainerChain(next) {
            if (lastContainer) {
                lastContainer.nextContainer = next;
            }
            lastContainer = next;
        }
        function declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes) {
            // Just call this directly so that the return type of this function stays "void".
            var symbol = declareSymbolAndAddToSymbolTableWorker(node, symbolFlags, symbolExcludes);
        }
        // [ConcreteTypeScript] Find variable declaration associated with identifier, or 'null' if not a VariableDeclaration
        function findVariableDeclaration(location, name) {
            while (true) {
                if (!location) {
                    // Not found, let checker handle error reporting:
                    return null;
                }
                if (!location.locals || !ts.hasProperty(location.locals, name)) {
                    location = location.parent;
                    continue;
                }
                var symbol = location.locals[name];
                if (symbol.declarations.length < 1) {
                    return null;
                }
                return ts.getSymbolDecl(symbol, ts.SyntaxKind.VariableDeclaration);
            }
        }
        function declareSymbolAndAddToSymbolTableWorker(node, symbolFlags, symbolExcludes) {
            switch (container.kind) {
                // Modules, source files, and classes need specialized handling for how their
                // members are declared (for example, a member of a class will go into a specific
                // symbol table depending on if it is static or not). We defer to specialized
                // handlers to take care of declaring these child members.
                case ts.SyntaxKind.ModuleDeclaration:
                    return declareModuleMember(node, symbolFlags, symbolExcludes);
                case ts.SyntaxKind.SourceFile:
                    return declareSourceFileMember(node, symbolFlags, symbolExcludes);
                case ts.SyntaxKind.ClassExpression:
                case ts.SyntaxKind.ClassDeclaration:
                    return declareClassMember(node, symbolFlags, symbolExcludes);
                case ts.SyntaxKind.EnumDeclaration:
                    return declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                case ts.SyntaxKind.TypeLiteral:
                case ts.SyntaxKind.ObjectLiteralExpression:
                case ts.SyntaxKind.InterfaceDeclaration:
                // [ConcreteTypeScript]
                case ts.SyntaxKind.DeclareTypeDeclaration:
                    // [/ConcreteTypeScript]
                    // Interface/Object-types always have their children added to the 'members' of
                    // their container. They are only accessible through an instance of their
                    // container, and are never in scope otherwise (even inside the body of the
                    // object / type / interface declaring them). An exception is type parameters,
                    // which are in scope without qualification (similar to 'locals').
                    return declareSymbol(container.symbol.members, container.symbol, node, symbolFlags, symbolExcludes);
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.ConstructSignature:
                case ts.SyntaxKind.IndexSignature:
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                case ts.SyntaxKind.Constructor:
                case ts.SyntaxKind.GetAccessor:
                case ts.SyntaxKind.SetAccessor:
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                case ts.SyntaxKind.TypeAliasDeclaration:
                    // All the children of these container types are never visible through another
                    // symbol (i.e. through another symbol's 'exports' or 'members').  Instead,
                    // they're only accessed 'lexically' (i.e. from code that exists underneath
                    // their container in the tree.  To accomplish this, we simply add their declared
                    // symbol to the 'locals' of the container.  These symbols can then be found as
                    // the type checker walks up the containers, checking them for matching names.
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
            }
        }
        function declareClassMember(node, symbolFlags, symbolExcludes) {
            return node.flags & ts.NodeFlags.Static
                ? declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes)
                : declareSymbol(container.symbol.members, container.symbol, node, symbolFlags, symbolExcludes);
        }
        function declareSourceFileMember(node, symbolFlags, symbolExcludes) {
            return ts.isExternalModule(file)
                ? declareModuleMember(node, symbolFlags, symbolExcludes)
                : declareSymbol(file.locals, undefined, node, symbolFlags, symbolExcludes);
        }
        function isAmbientContext(node) {
            while (node) {
                if (node.flags & ts.NodeFlags.Ambient) {
                    return true;
                }
                node = node.parent;
            }
            return false;
        }
        function hasExportDeclarations(node) {
            var body = node.kind === ts.SyntaxKind.SourceFile ? node : node.body;
            if (body.kind === ts.SyntaxKind.SourceFile || body.kind === ts.SyntaxKind.ModuleBlock) {
                for (var _i = 0, _a = body.statements; _i < _a.length; _i++) {
                    var stat = _a[_i];
                    if (stat.kind === ts.SyntaxKind.ExportDeclaration || stat.kind === ts.SyntaxKind.ExportAssignment) {
                        return true;
                    }
                }
            }
            return false;
        }
        function setExportContextFlag(node) {
            // A declaration source file or ambient module declaration that contains no export declarations (but possibly regular
            // declarations with export modifiers) is an export context in which declarations are implicitly exported.
            if (isAmbientContext(node) && !hasExportDeclarations(node)) {
                node.flags |= ts.NodeFlags.ExportContext;
            }
            else {
                node.flags &= ~ts.NodeFlags.ExportContext;
            }
        }
        function bindModuleDeclaration(node) {
            setExportContextFlag(node);
            if (node.name.kind === ts.SyntaxKind.StringLiteral) {
                declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.ValueModule, ts.SymbolFlags.ValueModuleExcludes);
            }
            else {
                var state = getModuleInstanceState(node);
                if (state === ModuleInstanceState.NonInstantiated) {
                    declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.NamespaceModule, ts.SymbolFlags.NamespaceModuleExcludes);
                }
                else {
                    declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.ValueModule, ts.SymbolFlags.ValueModuleExcludes);
                    if (node.symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Class | ts.SymbolFlags.RegularEnum)) {
                        // if module was already merged with some function, class or non-const enum
                        // treat is a non-const-enum-only
                        node.symbol.constEnumOnlyModule = false;
                    }
                    else {
                        var currentModuleIsConstEnumOnly = state === ModuleInstanceState.ConstEnumOnly;
                        if (node.symbol.constEnumOnlyModule === undefined) {
                            // non-merged case - use the current state
                            node.symbol.constEnumOnlyModule = currentModuleIsConstEnumOnly;
                        }
                        else {
                            // merged case: module is const enum only if all its pieces are non-instantiated or const enum
                            node.symbol.constEnumOnlyModule = node.symbol.constEnumOnlyModule && currentModuleIsConstEnumOnly;
                        }
                    }
                }
            }
        }
        function bindFunctionOrConstructorType(node) {
            // For a given function symbol "<...>(...) => T" we want to generate a symbol identical
            // to the one we would get for: { <...>(...): T }
            //
            // We do that by making an anonymous type literal symbol, and then setting the function
            // symbol as its sole member. To the rest of the system, this symbol will be  indistinguishable
            // from an actual type literal symbol you would have gotten had you used the long form.
            var symbol = createSymbol(ts.SymbolFlags.Signature, getDeclarationName(node));
            addDeclarationToSymbol(symbol, node, ts.SymbolFlags.Signature);
            var typeLiteralSymbol = createSymbol(ts.SymbolFlags.TypeLiteral, "__type");
            addDeclarationToSymbol(typeLiteralSymbol, node, ts.SymbolFlags.TypeLiteral);
            typeLiteralSymbol.members = (_a = {}, _a[symbol.name] = symbol, _a);
            var _a;
        }
        function bindObjectLiteralExpression(node) {
            var ElementKind;
            (function (ElementKind) {
                ElementKind[ElementKind["Property"] = 1] = "Property";
                ElementKind[ElementKind["Accessor"] = 2] = "Accessor";
            })(ElementKind || (ElementKind = {}));
            if (inStrictMode) {
                var seen = {};
                for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                    var prop = _a[_i];
                    if (prop.name.kind !== ts.SyntaxKind.Identifier) {
                        continue;
                    }
                    var identifier = prop.name;
                    // ECMA-262 11.1.5 Object Initialiser
                    // If previous is not undefined then throw a SyntaxError exception if any of the following conditions are true
                    // a.This production is contained in strict code and IsDataDescriptor(previous) is true and
                    // IsDataDescriptor(propId.descriptor) is true.
                    //    b.IsDataDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true.
                    //    c.IsAccessorDescriptor(previous) is true and IsDataDescriptor(propId.descriptor) is true.
                    //    d.IsAccessorDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true
                    // and either both previous and propId.descriptor have[[Get]] fields or both previous and propId.descriptor have[[Set]] fields
                    var currentKind = prop.kind === ts.SyntaxKind.PropertyAssignment || prop.kind === ts.SyntaxKind.ShorthandPropertyAssignment || prop.kind === ts.SyntaxKind.MethodDeclaration
                        ? ElementKind.Property
                        : ElementKind.Accessor;
                    var existingKind = seen[identifier.text];
                    if (!existingKind) {
                        seen[identifier.text] = currentKind;
                        continue;
                    }
                    if (currentKind === ElementKind.Property && existingKind === ElementKind.Property) {
                        var span = ts.getErrorSpanForNode(file, identifier);
                        file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, ts.Diagnostics.An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode));
                    }
                }
            }
            return bindAnonymousDeclaration(node, ts.SymbolFlags.ObjectLiteral, "__object");
        }
        function bindAnonymousDeclaration(node, symbolFlags, name) {
            var symbol = createSymbol(symbolFlags, name);
            addDeclarationToSymbol(symbol, node, symbolFlags);
        }
        function bindBlockScopedDeclaration(node, symbolFlags, symbolExcludes) {
            switch (blockScopeContainer.kind) {
                case ts.SyntaxKind.ModuleDeclaration:
                    declareModuleMember(node, symbolFlags, symbolExcludes);
                    break;
                case ts.SyntaxKind.SourceFile:
                    if (ts.isExternalModule(container)) {
                        declareModuleMember(node, symbolFlags, symbolExcludes);
                        break;
                    }
                // fall through.
                default:
                    if (!blockScopeContainer.locals) {
                        blockScopeContainer.locals = {};
                        addToContainerChain(blockScopeContainer);
                    }
                    declareSymbol(blockScopeContainer.locals, undefined, node, symbolFlags, symbolExcludes);
            }
        }
        function bindBlockScopedVariableDeclaration(node) {
            bindBlockScopedDeclaration(node, ts.SymbolFlags.BlockScopedVariable, ts.SymbolFlags.BlockScopedVariableExcludes);
        }
        // The binder visits every node in the syntax tree so it is a convenient place to perform a single localized
        // check for reserved words used as identifiers in strict mode code.
        function checkStrictModeIdentifier(node) {
            if (inStrictMode &&
                node.originalKeywordKind >= ts.SyntaxKind.FirstFutureReservedWord &&
                node.originalKeywordKind <= ts.SyntaxKind.LastFutureReservedWord &&
                !ts.isIdentifierName(node)) {
                // Report error only if there are no parse errors in file
                if (!file.parseDiagnostics.length) {
                    file.bindDiagnostics.push(ts.createDiagnosticForNode(node, getStrictModeIdentifierMessage(node), ts.declarationNameToString(node)));
                }
            }
        }
        function getStrictModeIdentifierMessage(node) {
            // Provide specialized messages to help the user understand why we think they're in
            // strict mode.
            if (ts.getContainingClass(node)) {
                return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode;
            }
            if (file.externalModuleIndicator) {
                return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode;
            }
            return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode;
        }
        function checkStrictModeBinaryExpression(node) {
            if (inStrictMode && ts.isLeftHandSideExpression(node.left) && ts.isAssignmentOperator(node.operatorToken.kind)) {
                // ECMA 262 (Annex C) The identifier eval or arguments may not appear as the LeftHandSideExpression of an
                // Assignment operator(11.13) or of a PostfixExpression(11.3)
                checkStrictModeEvalOrArguments(node, node.left);
            }
        }
        function checkStrictModeCatchClause(node) {
            // It is a SyntaxError if a TryStatement with a Catch occurs within strict code and the Identifier of the
            // Catch production is eval or arguments
            if (inStrictMode && node.variableDeclaration) {
                checkStrictModeEvalOrArguments(node, node.variableDeclaration.name);
            }
        }
        function checkStrictModeDeleteExpression(node) {
            // Grammar checking
            if (inStrictMode && node.expression.kind === ts.SyntaxKind.Identifier) {
                // When a delete operator occurs within strict mode code, a SyntaxError is thrown if its
                // UnaryExpression is a direct reference to a variable, function argument, or function name
                var span = ts.getErrorSpanForNode(file, node.expression);
                file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, ts.Diagnostics.delete_cannot_be_called_on_an_identifier_in_strict_mode));
            }
        }
        function isEvalOrArgumentsIdentifier(node) {
            return node.kind === ts.SyntaxKind.Identifier &&
                (node.text === "eval" || node.text === "arguments");
        }
        function checkStrictModeEvalOrArguments(contextNode, name) {
            if (name && name.kind === ts.SyntaxKind.Identifier) {
                var identifier = name;
                if (isEvalOrArgumentsIdentifier(identifier)) {
                    // We check first if the name is inside class declaration or class expression; if so give explicit message
                    // otherwise report generic error message.
                    var span = ts.getErrorSpanForNode(file, name);
                    file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, getStrictModeEvalOrArgumentsMessage(contextNode), identifier.text));
                }
            }
        }
        function getStrictModeEvalOrArgumentsMessage(node) {
            // Provide specialized messages to help the user understand why we think they're in
            // strict mode.
            if (ts.getContainingClass(node)) {
                return ts.Diagnostics.Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode;
            }
            if (file.externalModuleIndicator) {
                return ts.Diagnostics.Invalid_use_of_0_Modules_are_automatically_in_strict_mode;
            }
            return ts.Diagnostics.Invalid_use_of_0_in_strict_mode;
        }
        function checkStrictModeFunctionName(node) {
            if (inStrictMode) {
                // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a strict mode FunctionDeclaration or FunctionExpression (13.1))
                checkStrictModeEvalOrArguments(node, node.name);
            }
        }
        function checkStrictModeNumericLiteral(node) {
            if (inStrictMode && node.flags & ts.NodeFlags.OctalLiteral) {
                file.bindDiagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.Octal_literals_are_not_allowed_in_strict_mode));
            }
        }
        function checkStrictModePostfixUnaryExpression(node) {
            // Grammar checking
            // The identifier eval or arguments may not appear as the LeftHandSideExpression of an
            // Assignment operator(11.13) or of a PostfixExpression(11.3) or as the UnaryExpression
            // operated upon by a Prefix Increment(11.4.4) or a Prefix Decrement(11.4.5) operator.
            if (inStrictMode) {
                checkStrictModeEvalOrArguments(node, node.operand);
            }
        }
        function checkStrictModePrefixUnaryExpression(node) {
            // Grammar checking
            if (inStrictMode) {
                if (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) {
                    checkStrictModeEvalOrArguments(node, node.operand);
                }
            }
        }
        function checkStrictModeWithStatement(node) {
            // Grammar checking for withStatement
            if (inStrictMode) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.with_statements_are_not_allowed_in_strict_mode);
            }
        }
        function grammarErrorOnFirstToken(node, message, arg0, arg1, arg2) {
            var span = ts.getSpanOfTokenAtPosition(file, node.pos);
            file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, message, arg0, arg1, arg2));
        }
        function getDestructuringParameterName(node) {
            return "__" + ts.indexOf(node.parent.parameters, node);
        }
        function bind(node) {
            node.parent = parent;
            var savedInStrictMode = inStrictMode;
            if (!savedInStrictMode) {
                updateStrictMode(node);
            }
            // First we bind declaration nodes to a symbol if possible.  We'll both create a symbol
            // and then potentially add the symbol to an appropriate symbol table. Possible
            // destination symbol tables are:
            //
            //  1) The 'exports' table of the current container's symbol.
            //  2) The 'members' table of the current container's symbol.
            //  3) The 'locals' table of the current container.
            //
            // However, not all symbols will end up in any of these tables.  'Anonymous' symbols
            // (like TypeLiterals for example) will not be put in any table.
            bindWorker(node);
            // Then we recurse into the children of the node to bind them as well.  For certain
            // symbols we do specialized work when we recurse.  For example, we'll keep track of
            // the current 'container' node when it changes.  This helps us know which symbol table
            // a local should go into for example.
            bindChildren(node);
            inStrictMode = savedInStrictMode;
        }
        function updateStrictMode(node) {
            switch (node.kind) {
                case ts.SyntaxKind.SourceFile:
                case ts.SyntaxKind.ModuleBlock:
                    updateStrictModeStatementList(node.statements);
                    return;
                case ts.SyntaxKind.Block:
                    if (ts.isFunctionLike(node.parent)) {
                        updateStrictModeStatementList(node.statements);
                    }
                    return;
                case ts.SyntaxKind.ClassDeclaration:
                case ts.SyntaxKind.ClassExpression:
                    // All classes are automatically in strict mode in ES6.
                    inStrictMode = true;
                    return;
            }
        }
        function updateStrictModeStatementList(statements) {
            for (var _i = 0; _i < statements.length; _i++) {
                var statement = statements[_i];
                if (!ts.isPrologueDirective(statement)) {
                    return;
                }
                if (isUseStrictPrologueDirective(statement)) {
                    inStrictMode = true;
                    return;
                }
            }
        }
        /// Should be called only on prologue directives (isPrologueDirective(node) should be true)
        function isUseStrictPrologueDirective(node) {
            var nodeText = ts.getTextOfNodeFromSourceText(file.text, node.expression);
            // Note: the node text must be exactly "use strict" or 'use strict'.  It is not ok for the
            // string to contain unicode escapes (as per ES5).
            return nodeText === "\"use strict\"" || nodeText === "'use strict'";
        }
        function bindWorker(node) {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier:
                    return checkStrictModeIdentifier(node);
                case ts.SyntaxKind.BinaryExpression:
                    return checkStrictModeBinaryExpression(node);
                case ts.SyntaxKind.CatchClause:
                    return checkStrictModeCatchClause(node);
                case ts.SyntaxKind.DeleteExpression:
                    return checkStrictModeDeleteExpression(node);
                case ts.SyntaxKind.NumericLiteral:
                    return checkStrictModeNumericLiteral(node);
                case ts.SyntaxKind.PostfixUnaryExpression:
                    return checkStrictModePostfixUnaryExpression(node);
                case ts.SyntaxKind.PrefixUnaryExpression:
                    return checkStrictModePrefixUnaryExpression(node);
                case ts.SyntaxKind.WithStatement:
                    return checkStrictModeWithStatement(node);
                case ts.SyntaxKind.TypeParameter:
                    return declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.TypeParameter, ts.SymbolFlags.TypeParameterExcludes);
                case ts.SyntaxKind.ThisParameter:
                    return bindThisParameter(node);
                case ts.SyntaxKind.Parameter:
                    return bindParameter(node);
                case ts.SyntaxKind.VariableDeclaration:
                case ts.SyntaxKind.BindingElement:
                    return bindVariableDeclarationOrBindingElement(node);
                case ts.SyntaxKind.PropertyDeclaration:
                case ts.SyntaxKind.PropertySignature:
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.Property | (node.questionToken ? ts.SymbolFlags.Optional : ts.SymbolFlags.None), ts.SymbolFlags.PropertyExcludes);
                case ts.SyntaxKind.PropertyAssignment:
                case ts.SyntaxKind.ShorthandPropertyAssignment:
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.Property, ts.SymbolFlags.PropertyExcludes);
                case ts.SyntaxKind.EnumMember:
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.EnumMember, ts.SymbolFlags.EnumMemberExcludes);
                case ts.SyntaxKind.DeclareType:
                case ts.SyntaxKind.DeclareTypeDeclaration:
                    return bindDeclareTypeDeclaration(node);
                case ts.SyntaxKind.CallSignature:
                case ts.SyntaxKind.ConstructSignature:
                case ts.SyntaxKind.IndexSignature:
                    return declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.Signature, ts.SymbolFlags.None);
                case ts.SyntaxKind.MethodDeclaration:
                case ts.SyntaxKind.MethodSignature:
                    // If this is an ObjectLiteralExpression method, then it sits in the same space
                    // as other properties in the object literal.  So we use SymbolFlags.PropertyExcludes
                    // so that it will conflict with any other object literal members with the same
                    // name.
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.Method | (node.questionToken ? ts.SymbolFlags.Optional : ts.SymbolFlags.None), ts.isObjectLiteralMethod(node) ? ts.SymbolFlags.PropertyExcludes : ts.SymbolFlags.MethodExcludes);
                case ts.SyntaxKind.FunctionDeclaration:
                    checkStrictModeFunctionName(node);
                    return declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.Function, ts.SymbolFlags.FunctionExcludes);
                case ts.SyntaxKind.Constructor:
                    return declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.Constructor, /*symbolExcludes:*/ ts.SymbolFlags.None);
                case ts.SyntaxKind.GetAccessor:
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.GetAccessor, ts.SymbolFlags.GetAccessorExcludes);
                case ts.SyntaxKind.SetAccessor:
                    return bindPropertyOrMethodOrAccessor(node, ts.SymbolFlags.SetAccessor, ts.SymbolFlags.SetAccessorExcludes);
                case ts.SyntaxKind.FunctionType:
                case ts.SyntaxKind.ConstructorType:
                    return bindFunctionOrConstructorType(node);
                case ts.SyntaxKind.TypeLiteral:
                    return bindAnonymousDeclaration(node, ts.SymbolFlags.TypeLiteral, "__type");
                case ts.SyntaxKind.ObjectLiteralExpression:
                    return bindObjectLiteralExpression(node);
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction:
                    checkStrictModeFunctionName(node);
                    var bindingName = node.name ? node.name.text : "__function";
                    return bindAnonymousDeclaration(node, ts.SymbolFlags.Function, bindingName);
                case ts.SyntaxKind.ClassExpression:
                case ts.SyntaxKind.ClassDeclaration:
                    return bindClassLikeDeclaration(node);
                case ts.SyntaxKind.InterfaceDeclaration:
                    return bindBlockScopedDeclaration(node, ts.SymbolFlags.Interface, ts.SymbolFlags.InterfaceExcludes);
                case ts.SyntaxKind.TypeAliasDeclaration:
                    return bindBlockScopedDeclaration(node, ts.SymbolFlags.TypeAlias, ts.SymbolFlags.TypeAliasExcludes);
                case ts.SyntaxKind.EnumDeclaration:
                    return bindEnumDeclaration(node);
                case ts.SyntaxKind.ModuleDeclaration:
                    return bindModuleDeclaration(node);
                case ts.SyntaxKind.ImportEqualsDeclaration:
                case ts.SyntaxKind.NamespaceImport:
                case ts.SyntaxKind.ImportSpecifier:
                case ts.SyntaxKind.ExportSpecifier:
                    return declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.Alias, ts.SymbolFlags.AliasExcludes);
                case ts.SyntaxKind.ImportClause:
                    return bindImportClause(node);
                case ts.SyntaxKind.ExportDeclaration:
                    return bindExportDeclaration(node);
                case ts.SyntaxKind.ExportAssignment:
                    return bindExportAssignment(node);
                case ts.SyntaxKind.SourceFile:
                    return bindSourceFileIfExternalModule();
            }
        }
        function bindSourceFileIfExternalModule() {
            setExportContextFlag(file);
            if (ts.isExternalModule(file)) {
                bindAnonymousDeclaration(file, ts.SymbolFlags.ValueModule, "\"" + ts.removeFileExtension(file.fileName) + "\"");
            }
        }
        function bindExportAssignment(node) {
            if (!container.symbol || !container.symbol.exports) {
                // Export assignment in some sort of block construct
                bindAnonymousDeclaration(node, ts.SymbolFlags.Alias, getDeclarationName(node));
            }
            else if (node.expression.kind === ts.SyntaxKind.Identifier) {
                // An export default clause with an identifier exports all meanings of that identifier
                declareSymbol(container.symbol.exports, container.symbol, node, ts.SymbolFlags.Alias, ts.SymbolFlags.PropertyExcludes | ts.SymbolFlags.AliasExcludes);
            }
            else {
                // An export default clause with an expression exports a value
                declareSymbol(container.symbol.exports, container.symbol, node, ts.SymbolFlags.Property, ts.SymbolFlags.PropertyExcludes | ts.SymbolFlags.AliasExcludes);
            }
        }
        function bindExportDeclaration(node) {
            if (!container.symbol || !container.symbol.exports) {
                // Export * in some sort of block construct
                bindAnonymousDeclaration(node, ts.SymbolFlags.ExportStar, getDeclarationName(node));
            }
            else if (!node.exportClause) {
                // All export * declarations are collected in an __export symbol
                declareSymbol(container.symbol.exports, container.symbol, node, ts.SymbolFlags.ExportStar, ts.SymbolFlags.None);
            }
        }
        function bindImportClause(node) {
            if (node.name) {
                declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.Alias, ts.SymbolFlags.AliasExcludes);
            }
        }
        // [ConcreteTypeScript] Extracted from bindClassLikeDeclaration
        // and modified to support definining prototype symbols on function declarations
        function bindPrototypeSymbol(node, symbol, prototypeSymbol) {
            if (!symbol.exports) {
                symbol.exports = {};
            }
            if (ts.hasProperty(symbol.exports, prototypeSymbol.name)) {
                if (node.name) {
                    node.name.parent = node;
                }
            }
            // HACK: Place this such that its easy to detect later. TODO do this properly 
            node.prototypeSymbol = prototypeSymbol;
            symbol.exports[prototypeSymbol.name] = prototypeSymbol;
            prototypeSymbol.parent = symbol;
        }
        function bindClassLikeDeclaration(node) {
            if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                bindBlockScopedDeclaration(node, ts.SymbolFlags.Class, ts.SymbolFlags.ClassExcludes);
            }
            else {
                var bindingName = node.name ? node.name.text : "__class";
                bindAnonymousDeclaration(node, ts.SymbolFlags.Class, bindingName);
                // Add name of class expression into the map for semantic classifier
                if (node.name) {
                    classifiableNames[node.name.text] = node.name.text;
                }
            }
            var symbol = node.symbol;
            // TypeScript 1.0 spec (April 2014): 8.4
            // Every class automatically contains a static property member named 'prototype', the
            // type of which is an instantiation of the class type with type Any supplied as a type
            // argument for each type parameter. It is an error to explicitly declare a static
            // property member with the name 'prototype'.
            //
            // Note: we check for this here because this class may be merging into a module.  The
            // module might have an exported variable called 'prototype'.  We can't allow that as
            // that would clash with the built-in 'prototype' for the class.
            // [ConcreteTypeScript]
            // All prototype symbols have declare types.
            bindPrototypeAsDeclareType(node, symbol);
            // [/ConcreteTypeScript]
        }
        function bindEnumDeclaration(node) {
            return ts.isConst(node)
                ? bindBlockScopedDeclaration(node, ts.SymbolFlags.ConstEnum, ts.SymbolFlags.ConstEnumExcludes)
                : bindBlockScopedDeclaration(node, ts.SymbolFlags.RegularEnum, ts.SymbolFlags.RegularEnumExcludes);
        }
        function bindVariableDeclarationOrBindingElement(node) {
            if (inStrictMode) {
                checkStrictModeEvalOrArguments(node, node.name);
            }
            if (!ts.isBindingPattern(node.name)) {
                if (ts.isBlockOrCatchScoped(node)) {
                    bindBlockScopedVariableDeclaration(node);
                }
                else if (ts.isParameterDeclaration(node)) {
                    // It is safe to walk up parent chain to find whether the node is a destructing parameter declaration
                    // because its parent chain has already been set up, since parents are set before descending into children.
                    //
                    // If node is a binding element in parameter declaration, we need to use ParameterExcludes.
                    // Using ParameterExcludes flag allows the compiler to report an error on duplicate identifiers in Parameter Declaration
                    // For example:
                    //      function foo([a,a]) {} // Duplicate Identifier error
                    //      function bar(a,a) {}   // Duplicate Identifier error, parameter declaration in this case is handled in bindParameter
                    //                             // which correctly set excluded symbols
                    declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.FunctionScopedVariable, ts.SymbolFlags.ParameterExcludes);
                }
                else {
                    declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.FunctionScopedVariable, ts.SymbolFlags.FunctionScopedVariableExcludes);
                }
            }
        }
        // [ConcreteTypeScript]
        function bindThisParameter(node) {
        }
        function bindParameter(node) {
            if (inStrictMode) {
                // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a
                // strict mode FunctionLikeDeclaration or FunctionExpression(13.1)
                checkStrictModeEvalOrArguments(node, node.name);
            }
            if (ts.isBindingPattern(node.name)) {
                bindAnonymousDeclaration(node, ts.SymbolFlags.FunctionScopedVariable, getDestructuringParameterName(node));
            }
            else {
                declareSymbolAndAddToSymbolTable(node, ts.SymbolFlags.FunctionScopedVariable, ts.SymbolFlags.ParameterExcludes);
            }
            // If this is a property-parameter, then also declare the property symbol into the
            // containing class.
            if (node.flags & ts.NodeFlags.AccessibilityModifier &&
                node.parent.kind === ts.SyntaxKind.Constructor &&
                ts.isClassLike(node.parent.parent)) {
                var classDeclaration = node.parent.parent;
                declareSymbol(classDeclaration.symbol.members, classDeclaration.symbol, node, ts.SymbolFlags.Property, ts.SymbolFlags.PropertyExcludes);
            }
        }
        function bindPropertyOrMethodOrAccessor(node, symbolFlags, symbolExcludes) {
            return ts.hasDynamicName(node)
                ? bindAnonymousDeclaration(node, symbolFlags, "__computed")
                : declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
        }
    }
})(ts || (ts = {}));
//# sourceMappingURL=binder.js.map