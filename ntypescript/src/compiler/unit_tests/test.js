/// <reference path="./harness.d.ts"/>
require('./harness');
Harness.lightMode = true;
describe("getPropertyOfType", function () {
    var sourceText = "var foo: declare Foo = {};\n        foo.x = 1;\n        foo.y = 1;\n        /*foo*/ foo;";
    var _a = compileOne(sourceText), sourceFile = _a.rootNode, checker = _a.checker;
    findWithComment(sourceFile, "foo", ts.isExpression).map(checker.getTypeAtLocation).forEach(testFooPropertiesAreXAndY);
    return;
    // Where:
    function testFooPropertiesAreXAndY(ref) {
        it("testFooPropertiesAreXAndY", function () {
            assert(!!checker.getPropertyOfType(ref, 'x'), "getPropertyOfType('x')");
            assert(!!checker.getPropertyOfType(ref, 'y'), "getPropertyOfType('y')");
            assert(checker.getPropertiesOfType(ref).length === 2, "getPropertiesOfType()");
        });
    }
});
// use ./run.sh 'brand i'
describe("emitBrandInterface", function () {
    var implicitSource = "var bar: declare Bar = {};\n        var foo: declare Foo = bar;\n        foo.x = 1;\n        foo.y = 1;\n        /*foo*/ foo;";
    var explicitSource = implicitSource + "\nbrand interface Foo {\n    x: !number;\n}";
    // TODO organize this better:
    it("should emit brand interface with x and y", function () {
        var _a = compileOne(implicitSource), sourceFile = _a.rootNode, checker = _a.checker;
        var ref = findWithComment(sourceFile, "foo", ts.isExpression)[0];
        var _b = checker.getBrandInterfaceRefactorData(ref), replaceText = _b.replaceText, replaceSpan = _b.replaceSpan;
        console.log(replaceText);
        assert(replaceSpan.start === 0);
    });
    // TODO organize this better:
    it("should update brand interface with x and y", function () {
        var _a = compileOne(explicitSource), sourceFile = _a.rootNode, checker = _a.checker;
        var ref = findWithComment(sourceFile, "foo", ts.isExpression)[0];
        var _b = checker.getBrandInterfaceRefactorData(ref), replaceText = _b.replaceText, replaceSpan = _b.replaceSpan;
        assert(replaceSpan.length == 40);
    });
});
describe("Nominal this", function () {
    var sourceText = "function Foo(this: declare Foo) {\n        /* first */ /*x*/ (this.x); \n        this.y = 1;\n        /*y*/ (this.y);\n        /*x*/ (this.x);\n    }\n    Foo.prototype.x = 1;\n    function useFoo() {\n        var foo = new Foo();\n        /*x*/ (foo.x);\n        /*x*/ (Foo.prototype.x);\n        /*y*/ (foo.y);\n    }\n    ";
    var _a = compileOne(sourceText), sourceFile = _a.rootNode, checker = _a.checker;
    findWithComment(sourceFile, "x", ts.isExpression).forEach(testRefIsNumber);
    findWithComment(sourceFile, "y", ts.isExpression).forEach(testRefIsNumber);
    return;
    // Where:
    function testRefIsNumber(ref) {
        it("\"" + sourceFile.text.substring(ref.pos, ref.end).trim() + "\" @" + ts.nodePosToString(ref) + " should be a !number", function () {
            var type = checker.getTypeAtLocation(ref);
            var strippedType = checker.unconcrete(type);
            assert(strippedType.flags & 132 /* NumberLike */, "Not a number, was " + checker.typeToString(type));
            assert(type !== strippedType, "Should be concrete, was " + checker.typeToString(type));
        });
    }
});
describe("Compilation tests", function () {
    it("simple becomes", function () {
        var sourceText = "function test(funcParam: becomes {x: number}) {\n            funcParam.x = 1;\n        }\n        ";
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
    });
    it("brand interface", function () {
        var sourceText = "brand interface Foo {\n            x: number;\n            y: number;\n        }\n        \n        function foo(obj: !Foo) {\n            /*x*/ (obj.x);\n            /*y*/ (obj.y);\n        }";
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
        var objXRefType = findWithComment(rootNode, "x", ts.isExpression)
            .map(checker.getTypeAtLocation)[0];
        var objYRefType = findWithComment(rootNode, "y", ts.isExpression)
            .map(checker.getTypeAtLocation)[0];
        assert(objXRefType.flags & 132 /* NumberLike */, "should have x : number");
        assert(objYRefType.flags & 132 /* NumberLike */, "should have y : number");
    });
});
describe("Calling functions mutually recursive", function () {
    it("should test mutually recursive functions", function () {
        function smartPrint(object, name) {
            console.log("<V" + name + "V>");
            if (object != null && object.kind) {
                ts.printNodeDeep(object);
            }
            else if (object != null && object.flags) {
                console.log(checker.typeToString(object));
            }
            else {
                console.log(object);
            }
            console.log("<*" + name + "*>");
        }
        var sourceText = "\n            function Foo(foo : declare Foo) {\n                foo.barMember = Bar({});\n                foo.field1 = 1;\n                /*Lookup*/ (foo.barMember.field2);\n                /*After*/ foo;\n                return foo;\n            }\n            function Bar(bar : declare Bar) {\n                bar.fooMember = Foo({});\n                bar.field2 = 1;\n                /*Lookup*/ (bar.fooMember.field1);\n                /*After*/ bar;\n                return bar;\n            }\n        ";
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
        var _b = findWithComment(rootNode, "Lookup", ts.isExpression)
            .map(checker.getTypeAtLocation), type1 = _b[0], type2 = _b[1];
        var _c = findWithComment(rootNode, "After", ts.isExpression)
            .map(checker.getTypeAtLocation), lastRefType1 = _c[0], lastRefType2 = _c[1];
        smartPrint(type1, "type1");
        smartPrint(type2, "type2");
        smartPrint(lastRefType1, "lastRefType1");
        smartPrint(lastRefType2, "lastRefType2");
        assert(checker.getPropertyOfType(lastRefType1, "field1"), "Should have 'field1' member.");
        assert(checker.getPropertyOfType(lastRefType1, "barMember"), "Should have 'barMember' member.");
        assert(!checker.getPropertyOfType(lastRefType1, "control"), "Should not have 'control' member.!");
        assert(checker.getPropertyOfType(lastRefType2, "fooMember"), "Should have 'fooMember' member.");
        assert(checker.unconcrete(type1).flags & 132 /* NumberLike */, "foo.barMember.field2 should be of type number");
        assert(checker.unconcrete(type2).flags & 132 /* NumberLike */, "bar.fooMember.field1 should be of type number");
    });
});
describe("Calling functions with a declare parameter", function () {
    function callFunctionWithDeclareParameter(context, varName, expectedKind) {
        var calledFunction = "function calledFunction(funcParam: declare DeclaredType1) {\n            funcParam.x = 1;\n            funcParam.y = 1;\n            funcParam;\n        ";
        var referrer = context(varName, "DeclaredType2", "\n            calledFunction(" + varName + ");\n            " + varName + ";\n        ");
        var _a = compileOne(calledFunction + referrer), rootNode = _a.rootNode, checker = _a.checker;
        var callNode = findFirst(rootNode, 178 /* CallExpression */);
        if (expectedKind === 77 /* Identifier */) {
            var reference = findFirst(callNode, function (_a) {
                var text = _a.text;
                return text === varName;
            });
            var refAfter = findFirst(rootNode, function (_a) {
                var text = _a.text, pos = _a.pos;
                return text === varName && pos > reference.pos;
            });
        }
        else {
            var reference = findFirst(callNode, expectedKind);
            var refAfter = findFirst(rootNode, function (_a) {
                var kind = _a.kind, pos = _a.pos;
                return kind === expectedKind && pos > reference.pos;
            });
        }
        var typeAfter = checker.getTypeAtLocation(refAfter);
        console.log(checker.typeToString(typeAfter));
        assert(!!(checker.unconcrete(typeAfter).flags & 268435456 /* Locus */), "Should resolve to locus type!");
        console.log(checker.getBaseTypes(checker.unconcrete(typeAfter)).map(checker.typeToString));
        assert(checker.getPropertyOfType(typeAfter, "x"), "Does not have 'x' member.");
        assert(checker.getPropertyOfType(typeAfter, "y"), "Does not have 'y' member.");
    }
    it("should bind through function call for a 'this' parameter", function () {
        callFunctionWithDeclareParameter(parameterFunctionContext, "this", 106 /* ThisKeyword */);
    });
    it("should bind through function call for a normal parameter", function () {
        callFunctionWithDeclareParameter(parameterFunctionContext, "testVar", 77 /* Identifier */);
    });
    it("should bind x and y to a 'var'-declared variable", function () {
        callFunctionWithDeclareParameter(varContext, "testVar", 77 /* Identifier */);
    });
    it("should bind x and y to a 'let'-declared variable", function () {
        callFunctionWithDeclareParameter(letContext, "testVar", 77 /* Identifier */);
    });
});
// TODO test ensure variable not assignable
describe("Type relations of ConcreteTypeScript", function () {
    it("DTRTB: test relationships for Locus types related through 'becomes'", function () {
        var varName = 'variable';
        var _a = compileOne(becomesSource(varName)), checker = _a.checker, rootNode = _a.rootNode;
        var nodes = findWithComment(rootNode, "Member1Ref", ts.isExpression);
        for (var _i = 0; _i < nodes.length; _i++) {
            var node = nodes[_i];
            ts.printNodeDeep(node);
        }
        var refTypes = findWithComment(rootNode, "Member1Ref", ts.isExpression)
            .map(checker.getTypeAtLocation)
            .map(checker.unconcrete);
        var idTypes = findWithComment(rootNode, "Member1Ref", ts.isExpression)
            .map(function (n) { return findFirst(n, function (_a) {
            var text = _a.text;
            return text && !!text.match(varName);
        }); })
            .map(checker.getTypeAtLocation);
        console.log(idTypes.map(checker.typeToString));
        assert(refTypes[0].flags & 132 /* NumberLike */, "Type 1 inherited through becomes relationship should be a number!");
        assert(refTypes[1].flags & 132 /* NumberLike */, "Type 2 inherited through becomes relationship should be a number!");
    });
    it("test relationships for IntermediateFlowType's and their parts", function () {
        var _a = getLocusTypes(disjointSource), checker = _a.checker, declType1 = _a.declType1, intermType1 = _a.intermType1;
        var targetType1 = intermType1.targetType;
        var startingType1 = intermType1.flowData.flowTypes[0].type;
        var isTypeIdenticalTo = checker.isTypeIdenticalTo, checkTypeSubtypeOf = checker.checkTypeSubtypeOf, checkTypeAssignableTo = checker.checkTypeAssignableTo;
        assert(checkTypeAssignableTo(intermType1, startingType1, undefined), "Should be assignable to starting type!");
        assert(checkTypeAssignableTo(targetType1, startingType1, undefined), "Should be assignable to starting type!");
        // Make sure that our intermediate result is not reassignable, as this would invalidate analysis:
        assert(!checkTypeAssignableTo(targetType1, intermType1, undefined), "Should not be assignable to starting type!");
        assert(!checkTypeAssignableTo(startingType1, intermType1, undefined), "Should not be assignable from starting type!");
    });
    it("test relationships for disjoint Locus-types", function () {
        var _a = getLocusTypes(disjointSource), checker = _a.checker, declType1 = _a.declType1, declType2 = _a.declType2;
        var isTypeIdenticalTo = checker.isTypeIdenticalTo, checkTypeSubtypeOf = checker.checkTypeSubtypeOf, checkTypeAssignableTo = checker.checkTypeAssignableTo;
        assert(!isTypeIdenticalTo(declType1, declType2));
        assert(!isTypeIdenticalTo(declType2, declType1));
        assert(!checkTypeSubtypeOf(declType1, declType2, undefined));
        assert(!checkTypeSubtypeOf(declType2, declType1, undefined));
        assert(!checkTypeAssignableTo(declType1, declType2, undefined));
        assert(!checkTypeAssignableTo(declType2, declType1, undefined));
    });
    it("test relationships for 'Decl1 declare Decl2' Declare-types", function () {
        var _a = getLocusTypes(impliedBaseSource), checker = _a.checker, declType1 = _a.declType1, declType2 = _a.declType2;
        var getBaseTypes = checker.getBaseTypes, isTypeIdenticalTo = checker.isTypeIdenticalTo, checkTypeSubtypeOf = checker.checkTypeSubtypeOf, checkTypeAssignableTo = checker.checkTypeAssignableTo;
        var baseType = getBaseTypes(declType2)[0];
        assert(checker.unconcrete(baseType) === declType1, "Base type should be declType1");
        assert(!isTypeIdenticalTo(declType1, declType2), "Types should not be identical");
        assert(!isTypeIdenticalTo(declType2, declType1), "Types should not be identical");
        assert(checkTypeSubtypeOf(declType2, declType1, undefined), "declType2 should be a subtype of declType1");
        assert(!checkTypeSubtypeOf(declType1, declType2, undefined));
        assert(!checkTypeAssignableTo(declType1, declType2, undefined));
        assert(checkTypeAssignableTo(declType2, declType1, undefined));
    });
    return;
    function impliedBaseSource(varName) {
        return "\n            var " + varName + "1 : declare DeclareType1 = {};\n            " + varName + "1.member1 = \"string\";\n            var " + varName + "2 : DeclareType1 declare DeclareType2 = " + varName + "1;\n            " + varName + "2.member2 = \"string\";\n        ";
    }
    function becomesSource(varName) {
        return "\n            function becomeFoo1(" + varName + "1: declare Foo1): void {\n                " + varName + "1.member1 = 1;\n            }\n            function Foo2(" + varName + "2 : declare Foo2): void {\n                becomeFoo1(" + varName + "2);\n                /*Member1Ref*/ (" + varName + "2.member1);\n                " + varName + "2.member2 = 1;\n                /*Member1Ref*/ (" + varName + "2.member1);\n            }\n        ";
    }
    function disjointSource(varName) {
        return "\n            var " + varName + "1 : declare DeclareType1 = {};\n            var " + varName + "2 : declare DeclareType2 = {};\n            " + varName + "1.member = \"string\";\n            " + varName + "2.member = \"string\";\n        ";
    }
    function getLocusTypes(source) {
        var varName = "simpleBindingVar";
        var sourceText = source(varName);
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
        var _b = getVarRefs(), varNode1 = _b[0], varNode2 = _b[1];
        return { checker: checker,
            rootNode: rootNode,
            intermType1: getIntermediateType(varNode1),
            intermType2: getIntermediateType(varNode2),
            declType1: getDeclType(varNode1),
            declType2: getDeclType(varNode2)
        };
        function getVarRefs() {
            return [
                findFirst(rootNode, function (_a) {
                    var text = _a.text;
                    return text === varName + "1";
                }),
                findFirst(rootNode, function (_a) {
                    var text = _a.text;
                    return text === varName + "2";
                })
            ];
        }
        // Will not depend on whether resolves correctly:
        function getDeclType(node) {
            var type = getIntermediateType(node);
            var declType = checker.unconcrete(type.targetType);
            assert(!!(declType.flags & 268435456 /* Locus */), "getDeclType failure");
            return declType;
        }
        function getIntermediateType(node) {
            var intermediate = checker.getTypeAtLocation(node);
            assert(!!(intermediate.flags & 536870912 /* IntermediateFlow */), "getIntermediateType failure");
            return intermediate;
        }
    }
});
describe("The stages of binding", function () {
    it("Should test the stages of locus-type binding", function () {
        testBindingStages(/*Do not use becomes*/ false);
    });
    it("Should test the stages of becomes-type binding", function () {
        testBindingStages(/*Use becomes*/ true);
    });
    return;
    function testBindingStages(useBecomes) {
        var varName = "simpleBindingVar";
        var varType = (useBecomes ? "becomes BecomesType" : "declare DeclareType");
        var sourceText = "\n            interface BecomesType {\n                objProp1: number; objProp2: string;\n                x: number; y: string;\n            }\n            var " + varName + " : " + varType + " = {objProp1: 1, objProp2: \"string\"};\n            " + varName + ";\n            " + varName + ".x = 1;\n            " + varName + ".y = \"string\";\n            " + varName + ";\n        ";
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
        assertHasXAndY();
        assertLastRefIsTargetType();
        assert2ndRefHasBecomeTypeAndObjectLiteralElements();
        return;
        function getTargetType() {
            var varNode = findFirst(rootNode, 221 /* VariableDeclaration */);
            var targetTypeNode = varNode.type;
            if (useBecomes) {
                assert(targetTypeNode.kind === 6 /* BecomesType */, "Should resolve to becomes type");
            }
            else {
                assert(targetTypeNode.kind === 7 /* LocusType */, "Should resolve to locus type");
            }
            var intermediateType = checker.getTypeFromTypeNode(targetTypeNode);
            console.log(checker.typeToString(intermediateType));
            assert(intermediateType.flags & 536870912 /* IntermediateFlow */, "Resulting type should have IntermediateFlow");
            var targetType = intermediateType.targetType;
            return targetType;
        }
        function get2ndVarRef() {
            var varRefs = find(rootNode, function (_a) {
                var text = _a.text;
                return text === varName;
            });
            ts.Debug.assert(varRefs.length >= 1);
            return varRefs[1];
        }
        function getLastVarRef() {
            var varRefs = find(rootNode, function (_a) {
                var text = _a.text;
                return text === varName;
            });
            ts.Debug.assert(varRefs.length >= 1);
            return varRefs[varRefs.length - 1];
        }
        function assert2ndRefHasBecomeTypeAndObjectLiteralElements() {
            var refType = checker.getTypeAtLocation(get2ndVarRef());
            console.log(checker.typeToString(refType));
            assert(refType.flags & 536870912 /* IntermediateFlow */, "Resulting type should have IntermediateFlow");
            var flowData = refType.flowData;
            var _a = flowData.memberSet, objProp1 = _a.objProp1, objProp2 = _a.objProp2;
            assert(objProp1 && objProp2, "Should bind members from object literal.");
        }
        function assertHasXAndY() {
            var targetType = getTargetType();
            if (!useBecomes) {
                assert(checker.unconcrete(targetType).flags & 268435456 /* Locus */, "Resulting type should have Locus");
            }
            assert(checker.getPropertyOfType(targetType, "x"), "Target type should have 'x' attribute");
            assert(checker.getPropertyOfType(targetType, "y"), "Target type should have 'y' attribute");
            var refType = checker.getTypeAtLocation(getLastVarRef());
            //console.log(checker.getFlowDataAtLocation(getLastVarRef(), refType));
            assert(checker.getPropertyOfType(refType, "x"), "Should infer 'x' attribute");
            assert(checker.getPropertyOfType(refType, "y"), "Should infer 'y' attribute");
        }
        function assertLastRefIsTargetType() {
            var refType = checker.getTypeAtLocation(getLastVarRef());
            console.log("WHATasda" + checker.typeToString(refType));
            console.log("//WHATasda" + checker.typeToString(refType));
            assert(checker.checkTypeSubtypeOf(refType, getTargetType(), undefined), "last ref should be target type!");
        }
    }
});
describe("Simple sequential assignments", function () {
    function basicAssignmentTest(context, varName, expectedKind) {
        var sourceText = context(varName, "DeclaredType", "\n            /*Before*/ " + varName + ";\n            " + varName + ".x = 1;\n            " + varName + ".y = 1;\n        ");
        var _a = compileOne(sourceText), rootNode = _a.rootNode, checker = _a.checker;
        var before = findWithComment(rootNode, "Before", expectedKind)[0];
        var _b = find(rootNode, 176 /* PropertyAccessExpression */), xAssign = _b[0], yAssign = _b[1];
        var varType = checker.getTypeAtLocation(before);
        assert(!!varType.targetType, "Must be IntermediateFlowType with targetType");
        var _c = checker.getFlowDataAtLocation(before, varType).memberSet, x0 = _c.x, y0 = _c.y;
        var _d = checker.getFlowDataAtLocation(findFirst(xAssign, expectedKind), varType).memberSet, x1 = _d.x, y1 = _d.y;
        var _e = checker.getFlowDataAtLocation(findFirst(yAssign, expectedKind), varType).memberSet, x2 = _e.x, y2 = _e.y;
        var _f = checker.getFlowDataForType(varType.targetType).memberSet, x3 = _f.x, y3 = _f.y;
        assert(!x0 && !y0, "Incorrect members before first assignment.");
        assert(x1 && !y1, "Incorrect members during first assignment.");
        assert(x2 && y2, "Incorrect members during second assignment.");
        assert(x3 && y3, "Incorrect members after second assignment.");
    }
    it("should bind x and y to a 'this' parameter", function () {
        basicAssignmentTest(parameterFunctionContext, "this", 106 /* ThisKeyword */);
    });
    it("should bind x and y to a normal parameter", function () {
        basicAssignmentTest(parameterFunctionContext, "testVar", 77 /* Identifier */);
    });
    it("should bind x and y to a 'var'-declared variable", function () {
        basicAssignmentTest(varContext, "testVar", 77 /* Identifier */);
    });
    it("should bind x and y to a 'let'-declared variable", function () {
        basicAssignmentTest(letContext, "testVar", 77 /* Identifier */);
    });
});
function findWithComment(rootNode, label, filter) {
    return find(rootNode, function (node) {
        if (typeof filter === "number" ? node.kind === filter : filter(node)) {
            var sourceFile = ts.getSourceFileOfNode(node);
            var leadingCommentRanges = ts.getLeadingCommentRanges(sourceFile.text, node.pos);
            if (!leadingCommentRanges)
                return false;
            var comments = leadingCommentRanges.map(function (_a) {
                var pos = _a.pos, end = _a.end;
                return sourceFile.text.substring(pos, end);
            });
            for (var _i = 0; _i < comments.length; _i++) {
                var comment = comments[_i];
                if (comment.match(label)) {
                    return true;
                }
            }
        }
        return false;
    });
}
function findFirst(node, filter) {
    var first = find(node, filter)[0];
    assert(first != null, "findFirst should not fail!");
    return first;
}
function find(node, filter) {
    assert(node);
    var ret = [];
    function collectRecursively(node) {
        // Unsafe cast, don't use members beyond Node in filter 
        // unless type has been discriminated:
        if (typeof filter === "number" ? node.kind === filter : filter(node)) {
            ret.push(node);
        }
        ts.forEachChild(node, collectRecursively);
    }
    collectRecursively(node);
    return ret;
}
function filterSourceFiles(inputFiles, sourceFiles) {
    return sourceFiles.filter(function (_a) {
        var fileName = _a.fileName;
        for (var _i = 0; _i < inputFiles.length; _i++) {
            var unitName = inputFiles[_i].unitName;
            if (unitName === fileName) {
                return true;
            }
        }
        return false;
    });
}
function compileOne(inputContent, options) {
    if (options === void 0) { options = {}; }
    var _a = compile([inputContent], options), rootNode = _a.sourceFiles[0], checker = _a.checker;
    return { rootNode: rootNode, checker: checker };
}
function compile(inputContents, options) {
    if (options === void 0) { options = {}; }
    var compilerResult = null;
    var harnessCompiler = Harness.Compiler.getCompiler();
    var nUnits = 0;
    var inputFiles = inputContents.map(function (content) { return ({ unitName: "simulated_file" + ++nUnits + ".ts", content: content }); });
    var _a = harnessCompiler.createProgram(inputFiles, 
    /* otherFiles: */ [], function (newCompilerResults) { compilerResult = newCompilerResults; }, 
    /*settingsCallback*/ undefined, options), program = _a.program, emit = _a.emit;
    // Rely on knowledge that the harness is not actually asynchronous (otherwise 'program' may be null)
    return {
        sourceFiles: filterSourceFiles(inputFiles, program.getSourceFiles()),
        checker: program.getTypeChecker()
    };
}
function parameterFunctionContext(varName, typeName, body) {
    return "function parameterFunction(" + varName + ": declare " + typeName + ") {\n        " + body + "\n    }";
}
function varContext(varName, typeName, body) {
    return "\n        var " + varName + ": declare " + typeName + " = {};\n        " + body + "\n    ";
}
function letContext(varName, typeName, body) {
    return "\n        let " + varName + ": declare " + typeName + " = {};\n        " + body + "\n    ";
}
//# sourceMappingURL=test.js.map