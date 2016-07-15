/// <reference path="harness.d.ts" />
declare type Filter = ts.SyntaxKind | ((node: ts.Node) => boolean);
declare function findWithComment(rootNode: ts.Node, label: string, filter: Filter): ts.Node[];
declare function findFirst(node: ts.Node, filter: Filter): ts.Node;
declare function find(node: ts.Node, filter: Filter): ts.Node[];
declare type HarnessFile = {
    unitName: string;
    content: string;
};
declare function filterSourceFiles(inputFiles: HarnessFile[], sourceFiles: ts.SourceFile[]): ts.SourceFile[];
declare function compileOne(inputContent: string, options?: ts.CompilerOptions & Harness.Compiler.HarnessOptions): {
    rootNode: ts.SourceFile;
    checker: ts.TypeChecker;
};
declare function compile(inputContents: string[], options?: ts.CompilerOptions & Harness.Compiler.HarnessOptions): {
    sourceFiles: ts.SourceFile[];
    checker: ts.TypeChecker;
};
declare function parameterFunctionContext(varName: string, typeName: string, body: string): string;
declare function varContext(varName: string, typeName: string, body: string): string;
declare function letContext(varName: string, typeName: string, body: string): string;
