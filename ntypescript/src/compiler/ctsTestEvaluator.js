// This file is part of ConcreteTypeScript.
/// <reference path="binder.ts"/>
/// <reference path="types.ts"/>
/// <reference path="checker.ts"/>
/// <reference path="printNode.ts"/>
/// <reference path="ctsUtilities.ts"/>
/// <reference path="ctsTypes.ts"/>
/* @internal */
var ts;
(function (ts) {
    function dropFirstAndLastChars(str) {
        return str.substring(1, str.length - 1);
    }
    var AT_NAME = "@([a-zA-Z]+)";
    var SQUARE_PARAMS = "\\[([^{\\(]+)\\]";
    var PARAMS = "\\(([^]+)\\)";
    // Let the default be on expressions, except if its assertEmitted:
    var macros = (_a = {},
        _a["" + AT_NAME + PARAMS] = function (f, s) {
            if (f.match(/assert[a-zA-Z]*Emitted/)) {
                return "@afterEmit{" + f + "(" + s + ")}";
            }
            else {
                return "@afterCheck[isExpression]{" + f + "(" + s + ")}";
            }
        },
        _a["" + AT_NAME + SQUARE_PARAMS + PARAMS] = function (f, c, s) {
            if (f.match(/assert[a-zA-Z]*Emitted/)) {
                return "@afterEmit[" + c + "]{" + f + "(" + s + ")}";
            }
            else {
                return "@afterCheck[" + c + "]{" + f + "(" + s + ")}";
            }
        },
        _a
    );
    function getAnnotationsFromComment(sourceText, type, range) {
        var comment = sourceText.substring(range.pos, range.end);
        for (var _i = 0, _a = Object.keys(macros); _i < _a.length; _i++) {
            var key = _a[_i];
            var match = null;
            while (match = comment.match(new RegExp(key))) {
                var prevString = match.shift();
                comment = comment.replace(prevString, macros[key].apply(macros, match));
            }
        }
        var annotations = [];
        // Handle debug annotations with a node type filter:
        var withFilterRegex = new RegExp("@" + type + "\\[[^{]+\\]\\{[^]+\\}", 'g');
        for (var _b = 0, _c = comment.match(withFilterRegex) || []; _b < _c.length; _b++) {
            var match = _c[_b];
            annotations.push({
                annotationCode: dropFirstAndLastChars(match.match(/{[^]+}/)[0]),
                filterFunctionCode: dropFirstAndLastChars(match.match(/\[[^{]+\]/)[0])
            });
        }
        // Handle uncoditional debug annotations:
        var withoutFilterRegex = new RegExp("@" + type + "{[^]+}", 'g');
        for (var _d = 0, _e = comment.match(withoutFilterRegex) || []; _d < _e.length; _d++) {
            var match = _e[_d];
            annotations.push({
                annotationCode: dropFirstAndLastChars(match.match(/{[^]+}/)[0])
            });
        }
        return annotations;
    }
    function getAnnotationsForNode(sourceText, type, node) {
        var annotations = [];
        var ranges = ts.getLeadingCommentRanges(sourceText, node.pos);
        if (ranges) {
            for (var _i = 0; _i < ranges.length; _i++) {
                var range = ranges[_i];
                annotations = annotations.concat(getAnnotationsFromComment(sourceText, type, range));
            }
        }
        return annotations;
    }
    function wrapAsFunc(code, injectedValues) {
        return "(function(" + Object.keys(injectedValues).join(',') + ") {" + code + "})";
    }
    function wrapEvaler(evaler, code, injectedValues) {
        var args = Object.keys(injectedValues).map(function (key) { return injectedValues[key]; });
        var funcBody = wrapAsFunc(code, injectedValues);
        try {
            return evaler(funcBody).apply(null, args);
        }
        catch (err) {
            console.log(err, "When executing " + code);
            console.log(err.stack);
        }
    }
    var filesWrittenTo = {};
    function writeLineToFile(fileName, line) {
        if (!filesWrittenTo[fileName]) {
            try {
                require("fs").unlinkSync(fileName);
            }
            catch (err) { }
            filesWrittenTo[fileName] = true;
        }
        console.log(line);
        require("fs").appendFileSync(fileName, line + '\n');
    }
    function merge(a, b) {
        var ret = {};
        for (var _i = 0, _a = Object.keys(a); _i < _a.length; _i++) {
            var k = _a[_i];
            ret[k] = a[k];
        }
        for (var _b = 0, _c = Object.keys(b); _b < _c.length; _b++) {
            var k = _c[_b];
            ret[k] = b[k];
        }
        return ret;
    }
    var STORAGE = {}; // For storing for multipart tests
    function getEvaluationScope(node, pass, checker) {
        var sourceFile = ts.getSourceFileOfNode(node);
        ts.Debug.assert(!!sourceFile);
        var resultFileName = sourceFile.fileName + "." + pass + ".output";
        var emittedText = node.DEBUG_emitted_text;
        // Remove comments:
        emittedText = emittedText && emittedText.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
        function writeLine(line) {
            writeLineToFile(resultFileName, line);
        }
        function getType() {
            return checker.getTypeAtLocation(node);
        }
        function toType(str) {
            if (typeof str !== "string")
                return str;
            return resolveType(checker, node, str);
        }
        function assert(condition, message) {
            if (message === void 0) { message = "assert failed"; }
            var prefix = condition ? "Passes" : "FAILURE executing";
            var lineNum = ts.getLineOfLocalPosition(sourceFile, node.pos);
            var linePos = node.pos - ts.getLineStarts(sourceFile)[lineNum];
            var line = prefix + " at (" + ts.getNodeKindAsString(node) + ") " + sourceFile.fileName + ":" + lineNum + ":" + linePos + ", " + message;
            writeLine(line);
        }
        function assertNotEmitted(string) {
            var matched = emittedText.match(string);
            return assert(!matched, "Expected to NOT emit '" + string + "'.");
        }
        function assertEmitted(string) {
            var matched = emittedText.match(string);
            return assert(matched, "Expected to emit '" + string + "'.");
        }
        function assertError(string) {
            var errors = node.DEBUG_check_diagonistics;
            if (!errors) {
                return assert(false, "Asserted that we have an error containing '" + string + "', but had no errors.");
            }
            for (var _i = 0; _i < errors.length; _i++) {
                var error = errors[_i];
                if (error.match(string)) {
                    return assert(true, "Found error containing '" + string + "'.");
                }
            }
            return assert(false, "Asserted that we have an error containing '" + string + "', but no errors matched.");
        }
        function assertNotError() {
            var errors = node.DEBUG_check_diagonistics;
            if (!errors || errors.length === 0) {
                return;
            }
            assert(false, "Asserted that we have no errors, but had " + errors.join('\n') + ".");
        }
        function hasType(type) {
            if (typeof type === "string") {
                var actualType = getType();
                var typeString = checker.typeToString(actualType);
                return typeString.replace(/\s/g, '') === type.replace(/\s/g, '');
            }
            return checker.isTypeIdenticalTo(getType(), toType(type));
        }
        function concrete(type) {
            return checker.createConcreteType(type);
        }
        // Expose all of the 'ts' namespace:
        return merge(ts, {
            concrete: concrete, STORAGE: STORAGE, sourceFile: sourceFile, node: node,
            sourceText: sourceFile.text,
            emittedText: emittedText,
            isSourceFile: function (node) {
                return node.kind === ts.SyntaxKind.SourceFile;
            },
            toType: toType,
            getType: getType,
            hasType: hasType,
            writeLine: writeLine,
            assert: assert,
            assertEmitted: assertEmitted,
            assertNotEmitted: assertNotEmitted,
            assertError: assertError,
            assertNotError: assertNotError,
            assertType: function (type) { return assert(hasType(type), "Should have type equal to '" + (typeof type === "string" ? type : checker.typeToString(toType(type))) + "', has type '" + checker.typeToString(getType()) + "'"); }
        });
    }
    function onPass(node, prefix, evaler, functions) {
        var sourceFile = ts.getSourceFileOfNode(node);
        // if (sourceFile.fileName.indexOf(".d.ts") >= 0) {
        //     return;
        // }
        var sourceText = sourceFile.text;
        for (var _i = 0, _a = getAnnotationsForNode(sourceText, prefix, node); _i < _a.length; _i++) {
            var _b = _a[_i], annotationCode = _b.annotationCode, filterFunctionCode = _b.filterFunctionCode;
            // If a filter is specified with [], use this before executing the code in {}
            if (!filterFunctionCode || wrapEvaler(evaler, "return " + filterFunctionCode + ";", functions)(node)) {
                wrapEvaler(evaler, annotationCode, functions);
            }
        }
    }
    function beforeCheckPass(node, checker, evaler) {
        if (!ts.ENABLE_DEBUG_ANNOTATIONS)
            return;
        if (!node.__wasVisitedBeforeCheck) {
            onPass(node, "beforeCheck", evaler, getEvaluationScope(node, "beforeCheck", checker));
            node.__wasVisitedBeforeCheck = true;
        }
    }
    ts.beforeCheckPass = beforeCheckPass;
    function afterCheckPass(node, checker, evaler) {
        if (!ts.ENABLE_DEBUG_ANNOTATIONS)
            return;
        if (!node.__wasVisitedAfterCheck) {
            onPass(node, "afterCheck", evaler, getEvaluationScope(node, "afterCheck", checker));
            node.__wasVisitedAfterCheck = true;
        }
    }
    ts.afterCheckPass = afterCheckPass;
    function evalInLocalScope(s) {
        return eval(s);
    }
    function afterParsePass(node) {
        if (!ts.ENABLE_DEBUG_ANNOTATIONS)
            return;
        if (!node.__wasVisitedAfterParse) {
            onPass(node, "afterParse", evalInLocalScope, getEvaluationScope(node, "afterParse"));
            node.__wasVisitedAfterParse = true;
        }
    }
    ts.afterParsePass = afterParsePass;
    function afterEmitPass(node, evaler) {
        if (!ts.ENABLE_DEBUG_ANNOTATIONS)
            return;
        if (!node.__wasVisitedAfterEmit) {
            onPass(node, "afterEmit", evaler, getEvaluationScope(node, "afterEmit"));
            node.__wasVisitedAfterEmit = true;
        }
    }
    ts.afterEmitPass = afterEmitPass;
    // Supported checks:
    function resolveType(checker, node, typeName) {
        var _a = typeName.split("."), left = _a[0], right = _a[1];
        typeName = left;
        var isConcrete = (typeName.indexOf("!") === 0);
        if (isConcrete) {
            typeName = typeName.substring(1);
        }
        var typeSymbol = checker.resolveName(node, typeName, ts.SymbolFlags.Type, null, typeName);
        var type = checker.getDeclaredTypeOfSymbol(typeSymbol);
        // Special case .prototype:
        if (right === "prototype" && ts.getSymbolDecl(typeSymbol, ts.SyntaxKind.BrandTypeDeclaration)) {
            var decl = ts.getSymbolDecl(typeSymbol, ts.SyntaxKind.BrandTypeDeclaration);
            type = checker.getDeclaredTypeOfSymbol(decl.prototypeBrandDeclaration.symbol);
        }
        if (isConcrete) {
            return checker.createConcreteType(type);
        }
        return type;
    }
    var _a;
})(ts || (ts = {}));
//# sourceMappingURL=ctsTestEvaluator.js.map