// This file is part of ConcreteTypeScript.
/// <reference path="types.ts"/>
/// <reference path="core.ts"/>
/// <reference path="scanner.ts"/>
/// <reference path="parser.ts"/>
/// <reference path="binder.ts"/>
/// <reference path="emitter.ts"/>
/// <reference path="utilities.ts"/>
var ts;
(function (ts) {
    ts.ENABLE_DEBUG_ANNOTATIONS = !!process.env.CTS_TEST;
    ts.DISABLE_PROTECTED_MEMBERS = !!process.env.CTS_DISABLE_TYPE_PROTECTION;
    function forEachChildRecursive(node, callback) {
        function callbackPrime(node) {
            callback(node);
            ts.forEachChild(node, callbackPrime);
        }
        callbackPrime(node);
    }
    ts.forEachChildRecursive = forEachChildRecursive;
    /*
        export function addPreEmit(node: Node, emitCallback:EmitCallback) {
    
            if (!node.preEmitCallbacks) {
                node.preEmitCallbacks = [];
            }
            node.preEmitCallbacks.push(emitCallback);
        }
        
        export function addPostEmit(node: Node, emitCallback:EmitCallback) {
            if (!node.postEmitCallbacks) {
                node.postEmitCallbacks = [];
            }
            node.postEmitCallbacks.push(emitCallback);
        }
      */
    // Is this an expression of type <identifier>.<identifier> = <expression>?
    function isPropertyAssignment(node) {
        if (node.kind === ts.SyntaxKind.BinaryExpression && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
            var binNode = node;
            if (binNode.left.kind === ts.SyntaxKind.PropertyAccessExpression) {
                return true;
            }
        }
        return false;
    }
    ts.isPropertyAssignment = isPropertyAssignment;
    // Used when determinining if a Foo.prototype expression represents a protected declare-type prototype
    function getDeclareTypeFromThisParam(param) {
        var typeNode = param.type;
        if (typeNode.kind === ts.SyntaxKind.DeclareType) {
            return typeNode;
        }
        return null;
    }
    ts.getDeclareTypeFromThisParam = getDeclareTypeFromThisParam;
    function getThisParamFromFunction(node) {
        var decl = getFunctionDeclaration(node.symbol);
        if (decl) {
            return decl.parameters.thisParam;
        }
        return null;
    }
    ts.getThisParamFromFunction = getThisParamFromFunction;
    function getDeclareTypeFromFunction(node) {
        var thisParam = getThisParamFromFunction(node);
        if (!thisParam) {
            return null;
        }
        return getDeclareTypeFromThisParam(thisParam);
    }
    ts.getDeclareTypeFromFunction = getDeclareTypeFromFunction;
    function getFunctionDeclaration(symbol) {
        for (var i = 0; i < symbol.declarations.length; i++) {
            if (ts.isFunctionLike(symbol.declarations[i])) {
                return symbol.declarations[i];
            }
        }
        return null;
    }
    ts.getFunctionDeclaration = getFunctionDeclaration;
    function getBrandTypesInScope(scope) {
        var useExports = (scope.symbol && scope.symbol.flags & ts.SymbolFlags.HasExports);
        var symbols = (useExports ? scope.symbol.exports : scope.locals) || {};
        var declarations = [];
        for (var _i = 0, _a = Object.keys(symbols); _i < _a.length; _i++) {
            var symbolName = _a[_i];
            var brandType = getSymbolDecl(symbols[symbolName], ts.SyntaxKind.DeclareType);
            brandType = brandType || getSymbolDecl(symbols[symbolName], ts.SyntaxKind.DeclareTypeDeclaration);
            if (brandType) {
                declarations.push(brandType);
            }
        }
        return declarations;
    }
    ts.getBrandTypesInScope = getBrandTypesInScope;
    function getDeclarations(block, filter) {
        if (!block.locals)
            return [];
        var declarations = [];
        for (var symbolName in block.locals) {
            if (ts.hasProperty(block.locals, symbolName)) {
                var symbol = block.locals[symbolName];
                declarations = declarations.concat(symbol.declarations.filter(filter));
            }
        }
        return declarations;
    }
    ts.getDeclarations = getDeclarations;
    function getSymbolDeclareTypeDecl(symbol) {
        return (getSymbolDecl(symbol, ts.SyntaxKind.DeclareType) || getSymbolDecl(symbol, ts.SyntaxKind.DeclareTypeDeclaration));
    }
    ts.getSymbolDeclareTypeDecl = getSymbolDeclareTypeDecl;
    function getClassOrDeclareBaseType(checker, type) {
        for (var _i = 0, _a = checker.getBaseTypes(type); _i < _a.length; _i++) {
            var baseType = _a[_i];
            if (baseType.flags & (ts.TypeFlags.Declare | ts.TypeFlags.Class)) {
                return baseType;
            }
        }
        return null;
    }
    ts.getClassOrDeclareBaseType = getClassOrDeclareBaseType;
    function getSymbolDecl(symbol, kind) {
        if (symbol.declarations) {
            for (var i = 0; i < symbol.declarations.length; i++) {
                if (symbol.declarations[i].kind === kind) {
                    return symbol.declarations[i];
                }
            }
        }
        return null;
    }
    ts.getSymbolDecl = getSymbolDecl;
    function getFunctionDeclarationsWithThisBrand(block) {
        return getDeclarations(block, isFunctionLikeDeclarationWithThisBrand);
    }
    ts.getFunctionDeclarationsWithThisBrand = getFunctionDeclarationsWithThisBrand;
    function getBrandTypeDeclarations(block) {
        var declarations = getDeclarations(block, isBrandDecl);
        if (ts.isFunctionLike(block)) {
            if (block.parameters.thisParam && block.parameters.thisParam.type && block.parameters.thisParam.type.kind === ts.SyntaxKind.DeclareType) {
                declarations = declarations.concat([block.parameters.thisParam]);
            }
        }
        return declarations;
        function isBrandDecl(node) {
            if (node.kind === ts.SyntaxKind.VariableDeclaration || node.kind == ts.SyntaxKind.Parameter) {
                var typeNode = node.type;
                return typeNode && typeNode.kind === ts.SyntaxKind.DeclareType;
            }
            return false;
        }
        ;
    }
    ts.getBrandTypeDeclarations = getBrandTypeDeclarations;
    function isNodeDescendentOf(node, ancestor) {
        while (node) {
            if (node === ancestor)
                return true;
            node = node.parent;
        }
        return false;
    }
    ts.isNodeDescendentOf = isNodeDescendentOf;
    function findBreakingScope(node) {
        if (node.kind === ts.SyntaxKind.BreakStatement || node.kind === ts.SyntaxKind.ContinueStatement) {
            var label = node.label;
            while (node.parent) {
                var child = node;
                node = node.parent;
                switch (node.kind) {
                    case ts.SyntaxKind.LabeledStatement:
                        if (label.text === node.label.text) {
                            return node;
                        }
                        break;
                    case ts.SyntaxKind.SwitchStatement:
                        if (!label) {
                            return node;
                        }
                        break;
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForStatement:
                    case ts.SyntaxKind.WhileStatement:
                        if (!label && child === node.statement) {
                            return node;
                        }
                        break;
                }
            }
            throw new Error("Unexpected!");
        }
        else {
            // Return statement:
            while (node.parent) {
                var child = node;
                node = node.parent;
                if (ts.isFunctionLike(node)) {
                    return node;
                }
            }
        }
    }
    ts.findBreakingScope = findBreakingScope;
    function getSymbolScope(location, text, flags) {
        var i = 0;
        while (true) {
            // If not a 'locals'-having context
            if ((!location.locals || !ts.hasProperty(location.locals, text) || !(location.locals[text].flags & flags))
                && (!location.symbol || !location.symbol.exports || !ts.hasProperty(location.symbol.exports, text) || !(location.symbol.exports[text].flags & flags))) {
                location = location.parent;
                continue;
            }
            return location;
        }
        // Reference error. Let checker error out.
        return null;
    }
    ts.getSymbolScope = getSymbolScope;
    function getSymbol(location, text, flags) {
        while (location) {
            // If not a 'locals'-having context
            if (!location.locals || !ts.hasProperty(location.locals, text) || !(location.locals[text].flags & flags)) {
                location = location.parent;
                continue;
            }
            return location.locals[text];
        }
        // Not found, let checker handle error reporting:
        return null;
    }
    ts.getSymbol = getSymbol;
    function isPrototypeAccess(node) {
        if (node.kind !== ts.SyntaxKind.PropertyAccessExpression)
            return false;
        var propAccess = node;
        return (propAccess.name.text === "prototype");
    }
    ts.isPrototypeAccess = isPrototypeAccess;
    // [ConcreteTypeScript] Find variable declaration associated with identifier, or 'null' if not a VariableDeclaration
    function findDeclarationForName(location, text) {
        if (text === "this") {
            var funcScope = ts.getThisContainer(location, false);
            if (ts.isFunctionLike(funcScope)) {
                if (funcScope.parameters.thisParam) {
                    return funcScope.parameters.thisParam;
                }
            }
        }
        var symbol = getSymbol(location, text, ts.SymbolFlags.Variable);
        if (!symbol || symbol.declarations.length < 1) {
            return null;
        }
        // Matched, return declaration (if exists):
        return (getSymbolDecl(symbol, ts.SyntaxKind.VariableDeclaration) || getSymbolDecl(symbol, ts.SyntaxKind.Parameter));
    }
    ts.findDeclarationForName = findDeclarationForName;
    function getExportedSymbol(location, text, symbolFlag) {
        while (location) {
            var exports_1 = (location.symbol && location.symbol.exports);
            if (!exports_1 || !ts.hasProperty(exports_1, text) || !(exports_1[text].flags & symbolFlag)) {
                location = location.parent;
                continue;
            }
            return location.locals[text];
        }
        return null;
    }
    ts.getExportedSymbol = getExportedSymbol;
    // Find function declaration associated with identifier, or 'null' if not a FunctionDeclaration
    function findFunctionDeclarationSymbolForName(location, text) {
        return getSymbol(location, text, ts.SymbolFlags.Function) || getExportedSymbol(location, text, ts.SymbolFlags.Function);
    }
    ts.findFunctionDeclarationSymbolForName = findFunctionDeclarationSymbolForName;
    function findFunctionDeclarationForName(location, text) {
        var symbol = findFunctionDeclarationSymbolForName(location, text);
        if (!symbol || symbol.declarations.length < 1) {
            return null;
        }
        // Matched, return function declaration (if exists):
        return getSymbolDecl(symbol, ts.SyntaxKind.FunctionDeclaration);
    }
    ts.findFunctionDeclarationForName = findFunctionDeclarationForName;
    function findParent(node, symbolFlag) {
        while (node.parent) {
            node = node.parent;
            if (node.symbol && node.symbol.flags & symbolFlag) {
                return node;
            }
        }
    }
    ts.findParent = findParent;
    function isFunctionLikeDeclarationWithThisBrand(scope) {
        if (ts.isFunctionLike(scope)) {
            var thisParam = scope.parameters.thisParam;
            return !!(thisParam && thisParam.type.brandTypeDeclaration);
        }
        return false;
    }
    ts.isFunctionLikeDeclarationWithThisBrand = isFunctionLikeDeclarationWithThisBrand;
    function isFunctionLikeDeclarationCheckThisBrand(scope, brandTypeDecl) {
        if (isFunctionLikeDeclarationWithThisBrand(scope)) {
            return scope.parameters.thisParam.type.brandTypeDeclaration === brandTypeDecl;
        }
        return false;
    }
    ts.isFunctionLikeDeclarationCheckThisBrand = isFunctionLikeDeclarationCheckThisBrand;
    function getOuterStatement(scope) {
        while (scope && !ts.isStatement(scope)) {
            scope = scope.parent;
        }
        return scope;
    }
    ts.getOuterStatement = getOuterStatement;
    function getModuleOrSourceFileOrFunction(scope) {
        while (scope.kind !== ts.SyntaxKind.ModuleDeclaration && scope.kind !== ts.SyntaxKind.SourceFile && !ts.isFunctionLike(scope)) {
            // Should always terminate; all incoming nodes should be children of the SourceFile:
            scope = scope.parent;
        }
        return scope;
    }
    ts.getModuleOrSourceFileOrFunction = getModuleOrSourceFileOrFunction;
    function getModuleOrSourceFile(scope) {
        while (scope.kind !== ts.SyntaxKind.ModuleDeclaration && scope.kind !== ts.SyntaxKind.SourceFile) {
            // Should always terminate; all incoming nodes should be children of the SourceFile:
            scope = scope.parent;
        }
        return scope;
    }
    ts.getModuleOrSourceFile = getModuleOrSourceFile;
})(ts || (ts = {}));
//# sourceMappingURL=ctsUtilities.js.map