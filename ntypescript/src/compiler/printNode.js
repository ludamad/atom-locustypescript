/// <reference path="types.ts"/>
/// <reference path="core.ts"/>
/// <reference path="scanner.ts"/>
/// <reference path="parser.ts"/>
/// <reference path="binder.ts"/>
/// <reference path="emitter.ts"/>
/// <reference path="utilities.ts"/>
var ts;
(function (ts) {
    function getNodeKindAsString(node) {
        var result;
        printRecursor(node, function (node, value) { return result = value; });
        return result;
    }
    ts.getNodeKindAsString = getNodeKindAsString;
    function printRecursor(node, print) {
        if (node) {
            return print(node, ts.SyntaxKind[node.kind]);
        }
        else if (node === null) {
            return "<null>";
        }
        else if (node === undefined) {
            return "<undefined>";
        }
        switch (node.kind) {
            case ts.SyntaxKind.BrandTypeDeclaration:
                print(node, "BrandTypeDeclaration");
                print(node.name, "BrandTypeDeclaration.name");
                return;
            case ts.SyntaxKind.Identifier: return print(node, "Identifier");
            case ts.SyntaxKind.Parameter: return print(node, "Parameter");
            case ts.SyntaxKind.TypeReference: return print(node, "TypeReference");
            case ts.SyntaxKind.ThisParameter: return print(node, "ThisParameter"); // [ConcreteTypeScript]
            case ts.SyntaxKind.GetAccessor: return print(node, "GetAccessor");
            case ts.SyntaxKind.SetAccessor: return print(node, "SetAccessor");
            case ts.SyntaxKind.ThisKeyword: return print(node, "ThisKeyword");
            case ts.SyntaxKind.SuperKeyword: return print(node, "SuperKeyword");
            case ts.SyntaxKind.NullKeyword: return print(node, "NullKeyword");
            case ts.SyntaxKind.TrueKeyword: return print(node, "TrueKeyword");
            case ts.SyntaxKind.FalseKeyword: return print(node, "FalseKeyword");
            case ts.SyntaxKind.NumericLiteral: return print(node, "NumericLiteral");
            case ts.SyntaxKind.StringLiteral: return print(node, "StringLiteral");
            case ts.SyntaxKind.RegularExpressionLiteral: return print(node, "RegularExpressionLiteral");
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral: return print(node, "NoSubstitutionTemplateLiteral");
            case ts.SyntaxKind.TemplateHead: return print(node, "TemplateHead");
            case ts.SyntaxKind.TemplateMiddle: return print(node, "TemplateMiddle");
            case ts.SyntaxKind.TemplateTail: return print(node, "TemplateTail");
            case ts.SyntaxKind.TemplateExpression: return print(node, "TemplateExpression");
            case ts.SyntaxKind.TemplateSpan: return print(node, "TemplateSpan");
            case ts.SyntaxKind.QualifiedName: return print(node, "QualifiedName");
            case ts.SyntaxKind.ArrayLiteralExpression: return print(node, "ArrayLiteralExpression");
            case ts.SyntaxKind.ObjectLiteralExpression: return print(node, "ObjectLiteralExpression");
            case ts.SyntaxKind.PropertyAssignment: return print(node, "PropertyAssignment");
            case ts.SyntaxKind.ComputedPropertyName: return print(node, "ComputedPrope rtyName");
            case ts.SyntaxKind.PropertyAccessExpression: return print(node, "PropertyAccessExpression");
            case ts.SyntaxKind.ElementAccessExpression: return print(node, "ElementAccessExpression");
            case ts.SyntaxKind.CallExpression: return print(node, "CallExpression");
            case ts.SyntaxKind.NewExpression: return print(node, "NewExpression");
            case ts.SyntaxKind.TaggedTemplateExpression: return print(node, "TaggedTemplateExpression");
            case ts.SyntaxKind.TypeAssertionExpression: return print(node, "TypeAssertionExpression");
            case ts.SyntaxKind.ParenthesizedExpression: return print(node, "ParenthesizedExpression");
            case ts.SyntaxKind.FunctionDeclaration: return print(node, "FunctionDeclaration");
            case ts.SyntaxKind.FunctionExpression: return print(node, "FunctionExpression");
            case ts.SyntaxKind.DeclareType: return print(node, "DeclareType");
            case ts.SyntaxKind.ArrowFunction: return print(node, "ArrowFunction");
            case ts.SyntaxKind.DeleteExpression: return print(node, "DeleteExpression");
            case ts.SyntaxKind.TypeOfExpression: return print(node, "TypeOfExpression");
            case ts.SyntaxKind.VoidExpression: return print(node, "VoidExpression");
            case ts.SyntaxKind.PrefixUnaryExpression: return print(node, "PrefixUnaryExpression");
            case ts.SyntaxKind.PostfixUnaryExpression: return print(node, "PostfixUnaryExpression");
            case ts.SyntaxKind.BinaryExpression: return print(node, "BinaryExpression");
            case ts.SyntaxKind.ConditionalExpression: return print(node, "ConditionalExpression");
            case ts.SyntaxKind.OmittedExpression: return print(node, "OmittedExpression");
            case ts.SyntaxKind.Block: return print(node, "Block");
            case ts.SyntaxKind.TryStatement: return print(node, "TryBlock");
            case ts.SyntaxKind.ModuleBlock: return print(node, "ModuleBlock");
            case ts.SyntaxKind.VariableStatement: return print(node, "VariableStatement");
            case ts.SyntaxKind.EmptyStatement: return print(node, "EmptyStatement");
            case ts.SyntaxKind.ExpressionStatement: return print(node, "ExpressionStatement");
            case ts.SyntaxKind.IfStatement: return print(node, "IfStatement");
            case ts.SyntaxKind.DoStatement: return print(node, "DoStatement");
            case ts.SyntaxKind.WhileStatement: return print(node, "WhileStatement");
            case ts.SyntaxKind.ForStatement: return print(node, "ForStatement");
            case ts.SyntaxKind.ForInStatement: return print(node, "ForInStatement");
            case ts.SyntaxKind.ContinueStatement: return print(node, "ContinueStatement");
            case ts.SyntaxKind.BreakStatement: return print(node, "BreakStatement");
            case ts.SyntaxKind.ReturnStatement: return print(node, "ReturnStatement");
            case ts.SyntaxKind.WithStatement: return print(node, "WithStatement");
            case ts.SyntaxKind.SwitchStatement: return print(node, "SwitchStatement");
            case ts.SyntaxKind.CaseClause: return print(node, "CaseClause");
            case ts.SyntaxKind.DefaultClause: return print(node, "DefaultClause");
            case ts.SyntaxKind.LabeledStatement: return print(node, "LabeledStatement");
            case ts.SyntaxKind.ThrowStatement: return print(node, "ThrowStatement");
            case ts.SyntaxKind.TryStatement: return print(node, "TryStatement");
            case ts.SyntaxKind.CatchClause: return print(node, "CatchClause");
            case ts.SyntaxKind.DebuggerStatement: return print(node, "DebuggerStatement");
            case ts.SyntaxKind.MethodDeclaration: return print(node, "MethodDeclaration");
            case ts.SyntaxKind.VariableDeclaration: return print(node, "VariableDeclaration");
            case ts.SyntaxKind.ClassDeclaration: return print(node, "ClassDeclaration");
            case ts.SyntaxKind.InterfaceDeclaration: return print(node, "InterfaceDeclaration");
            case ts.SyntaxKind.EnumDeclaration: return print(node, "EnumDeclaration");
            case ts.SyntaxKind.ModuleDeclaration: return print(node, "ModuleDeclaration");
            case ts.SyntaxKind.ImportDeclaration: return print(node, "ImportDeclaration");
            case ts.SyntaxKind.BrandPropertyDeclaration: return print(node, "BrandPropertyDeclaration");
            case ts.SyntaxKind.SourceFile: return print(node, "SourceFile");
            default: return print(node, "<" + node.kind + ">");
        }
    }
    function printNode(parent, indent) {
        if (indent === void 0) { indent = 0; }
        console.log("WHAT");
        function print(node, name) {
            var indentStr = '';
            for (var i = 0; i < indent; i++) {
                indentStr += '  ';
            }
            var addendum = [];
            var keys = Object.keys(node);
            for (var _i = 0; _i < keys.length; _i++) {
                var str = keys[_i];
                if (typeof node[str] === "string" || typeof node[str] === "number") {
                    addendum.push(str + ": " + node[str]);
                }
                else if (node[str] != null && node[str].kind == ts.SyntaxKind.Identifier) {
                    addendum.push(str + ": " + node[str].text);
                }
            }
            console.log("" + indentStr + name + " (" + addendum.join(', ') + ")");
        }
        function printSwitch(node) {
            printRecursor(node, print);
        }
        printSwitch(parent);
    }
    ts.printNode = printNode;
    function printNodeDeep(parent, indent) {
        if (indent === void 0) { indent = 0; }
        console.log("WHAT");
        function print(node, name) {
            var indentStr = '';
            for (var i = 0; i < indent; i++) {
                indentStr += '  ';
            }
            var addendum = [];
            var keys = Object.keys(node);
            for (var _i = 0; _i < keys.length; _i++) {
                var str = keys[_i];
                if (typeof node[str] === "string" || typeof node[str] === "number") {
                    addendum.push(str + ": " + node[str]);
                }
            }
            console.log("" + indentStr + name + " (" + addendum.join(', ') + ")");
            indent++;
            ts.forEachChild(node, printSwitch);
            indent--;
        }
        function printSwitch(node) {
            printRecursor(node, print);
        }
        printSwitch(parent);
    }
    ts.printNodeDeep = printNodeDeep;
    var USE_COLOUR = true;
    var CHECKER = null;
    function flowTypeToString(_a) {
        var firstBindingSite = _a.firstBindingSite, type = _a.type;
        return CHECKER.typeToString(type) + "@" + ts.nodePosToString(firstBindingSite);
    }
    function flowMemberToString(_a) {
        var key = _a.key, definitelyAssigned = _a.definitelyAssigned, conditionalBarrierPassed = _a.conditionalBarrierPassed, flowTypes = _a.flowTypes;
        var ofType = definitelyAssigned ? ':' : '??:';
        var conditionality = conditionalBarrierPassed ? '' : ' [in conditional]';
        return key + " " + ofType + " " + flowTypes.map(flowTypeToString).join(" | ") + conditionality;
    }
    function flowMemberSetToString(checker, memberSet) {
        CHECKER = checker;
        var setAsString = "FlowMemberSet {\n";
        for (var _i = 0, _a = Object.keys(memberSet); _i < _a.length; _i++) {
            var key = _a[_i];
            setAsString += '    ' + flowMemberToString(memberSet[key]) + "\n";
        }
        setAsString += "}\n";
        CHECKER = null;
        return setAsString;
    }
    ts.flowMemberSetToString = flowMemberSetToString;
})(ts || (ts = {}));
//# sourceMappingURL=printNode.js.map