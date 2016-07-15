var ts;
(function (ts) {
    // token > SyntaxKind.Identifer => token is a keyword
    // Also, If you add a new SyntaxKind be sure to keep the `Markers` section at the bottom in sync
    (function (SyntaxKind) {
        // [ConcreteTypeScript]
        SyntaxKind[SyntaxKind["BecomesKeyword"] = 0] = "BecomesKeyword";
        SyntaxKind[SyntaxKind["BrandKeyword"] = 1] = "BrandKeyword";
        SyntaxKind[SyntaxKind["DeclareTypeDeclaration"] = 2] = "DeclareTypeDeclaration";
        SyntaxKind[SyntaxKind["DeclaredAsKeyword"] = 3] = "DeclaredAsKeyword";
        SyntaxKind[SyntaxKind["FloatNumberKeyword"] = 4] = "FloatNumberKeyword";
        SyntaxKind[SyntaxKind["LikeKeyword"] = 5] = "LikeKeyword";
        SyntaxKind[SyntaxKind["IntNumberKeyword"] = 6] = "IntNumberKeyword";
        SyntaxKind[SyntaxKind["BecomesType"] = 7] = "BecomesType";
        SyntaxKind[SyntaxKind["DeclareType"] = 8] = "DeclareType";
        SyntaxKind[SyntaxKind["BrandTypeDeclaration"] = 9] = "BrandTypeDeclaration";
        SyntaxKind[SyntaxKind["BrandPropertyDeclaration"] = 10] = "BrandPropertyDeclaration";
        // [/ConcreteTypeScript]
        SyntaxKind[SyntaxKind["Unknown"] = 11] = "Unknown";
        SyntaxKind[SyntaxKind["EndOfFileToken"] = 12] = "EndOfFileToken";
        SyntaxKind[SyntaxKind["SingleLineCommentTrivia"] = 13] = "SingleLineCommentTrivia";
        SyntaxKind[SyntaxKind["MultiLineCommentTrivia"] = 14] = "MultiLineCommentTrivia";
        SyntaxKind[SyntaxKind["NewLineTrivia"] = 15] = "NewLineTrivia";
        SyntaxKind[SyntaxKind["WhitespaceTrivia"] = 16] = "WhitespaceTrivia";
        // We detect and preserve #! on the first line
        SyntaxKind[SyntaxKind["ShebangTrivia"] = 17] = "ShebangTrivia";
        // We detect and provide better error recovery when we encounter a git merge marker.  This
        // allows us to edit files with git-conflict markers in them in a much more pleasant manner.
        SyntaxKind[SyntaxKind["ConflictMarkerTrivia"] = 18] = "ConflictMarkerTrivia";
        // Literals
        SyntaxKind[SyntaxKind["NumericLiteral"] = 19] = "NumericLiteral";
        SyntaxKind[SyntaxKind["StringLiteral"] = 20] = "StringLiteral";
        SyntaxKind[SyntaxKind["RegularExpressionLiteral"] = 21] = "RegularExpressionLiteral";
        SyntaxKind[SyntaxKind["NoSubstitutionTemplateLiteral"] = 22] = "NoSubstitutionTemplateLiteral";
        // Pseudo-literals
        SyntaxKind[SyntaxKind["TemplateHead"] = 23] = "TemplateHead";
        SyntaxKind[SyntaxKind["TemplateMiddle"] = 24] = "TemplateMiddle";
        SyntaxKind[SyntaxKind["TemplateTail"] = 25] = "TemplateTail";
        // Punctuation
        SyntaxKind[SyntaxKind["OpenBraceToken"] = 26] = "OpenBraceToken";
        SyntaxKind[SyntaxKind["CloseBraceToken"] = 27] = "CloseBraceToken";
        SyntaxKind[SyntaxKind["OpenParenToken"] = 28] = "OpenParenToken";
        SyntaxKind[SyntaxKind["CloseParenToken"] = 29] = "CloseParenToken";
        SyntaxKind[SyntaxKind["OpenBracketToken"] = 30] = "OpenBracketToken";
        SyntaxKind[SyntaxKind["CloseBracketToken"] = 31] = "CloseBracketToken";
        SyntaxKind[SyntaxKind["DotToken"] = 32] = "DotToken";
        SyntaxKind[SyntaxKind["DotDotDotToken"] = 33] = "DotDotDotToken";
        SyntaxKind[SyntaxKind["SemicolonToken"] = 34] = "SemicolonToken";
        SyntaxKind[SyntaxKind["CommaToken"] = 35] = "CommaToken";
        SyntaxKind[SyntaxKind["LessThanToken"] = 36] = "LessThanToken";
        SyntaxKind[SyntaxKind["LessThanSlashToken"] = 37] = "LessThanSlashToken";
        SyntaxKind[SyntaxKind["GreaterThanToken"] = 38] = "GreaterThanToken";
        SyntaxKind[SyntaxKind["LessThanEqualsToken"] = 39] = "LessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanEqualsToken"] = 40] = "GreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["EqualsEqualsToken"] = 41] = "EqualsEqualsToken";
        SyntaxKind[SyntaxKind["ExclamationEqualsToken"] = 42] = "ExclamationEqualsToken";
        SyntaxKind[SyntaxKind["EqualsEqualsEqualsToken"] = 43] = "EqualsEqualsEqualsToken";
        SyntaxKind[SyntaxKind["ExclamationEqualsEqualsToken"] = 44] = "ExclamationEqualsEqualsToken";
        SyntaxKind[SyntaxKind["EqualsGreaterThanToken"] = 45] = "EqualsGreaterThanToken";
        SyntaxKind[SyntaxKind["PlusToken"] = 46] = "PlusToken";
        SyntaxKind[SyntaxKind["MinusToken"] = 47] = "MinusToken";
        SyntaxKind[SyntaxKind["AsteriskToken"] = 48] = "AsteriskToken";
        SyntaxKind[SyntaxKind["SlashToken"] = 49] = "SlashToken";
        SyntaxKind[SyntaxKind["PercentToken"] = 50] = "PercentToken";
        SyntaxKind[SyntaxKind["PlusPlusToken"] = 51] = "PlusPlusToken";
        SyntaxKind[SyntaxKind["MinusMinusToken"] = 52] = "MinusMinusToken";
        SyntaxKind[SyntaxKind["LessThanLessThanToken"] = 53] = "LessThanLessThanToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanToken"] = 54] = "GreaterThanGreaterThanToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanToken"] = 55] = "GreaterThanGreaterThanGreaterThanToken";
        SyntaxKind[SyntaxKind["AmpersandToken"] = 56] = "AmpersandToken";
        SyntaxKind[SyntaxKind["BarToken"] = 57] = "BarToken";
        SyntaxKind[SyntaxKind["CaretToken"] = 58] = "CaretToken";
        SyntaxKind[SyntaxKind["ExclamationToken"] = 59] = "ExclamationToken";
        SyntaxKind[SyntaxKind["TildeToken"] = 60] = "TildeToken";
        SyntaxKind[SyntaxKind["AmpersandAmpersandToken"] = 61] = "AmpersandAmpersandToken";
        SyntaxKind[SyntaxKind["BarBarToken"] = 62] = "BarBarToken";
        SyntaxKind[SyntaxKind["QuestionToken"] = 63] = "QuestionToken";
        SyntaxKind[SyntaxKind["ColonToken"] = 64] = "ColonToken";
        SyntaxKind[SyntaxKind["AtToken"] = 65] = "AtToken";
        // Assignments
        SyntaxKind[SyntaxKind["EqualsToken"] = 66] = "EqualsToken";
        SyntaxKind[SyntaxKind["PlusEqualsToken"] = 67] = "PlusEqualsToken";
        SyntaxKind[SyntaxKind["MinusEqualsToken"] = 68] = "MinusEqualsToken";
        SyntaxKind[SyntaxKind["AsteriskEqualsToken"] = 69] = "AsteriskEqualsToken";
        SyntaxKind[SyntaxKind["SlashEqualsToken"] = 70] = "SlashEqualsToken";
        SyntaxKind[SyntaxKind["PercentEqualsToken"] = 71] = "PercentEqualsToken";
        SyntaxKind[SyntaxKind["LessThanLessThanEqualsToken"] = 72] = "LessThanLessThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanEqualsToken"] = 73] = "GreaterThanGreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["GreaterThanGreaterThanGreaterThanEqualsToken"] = 74] = "GreaterThanGreaterThanGreaterThanEqualsToken";
        SyntaxKind[SyntaxKind["AmpersandEqualsToken"] = 75] = "AmpersandEqualsToken";
        SyntaxKind[SyntaxKind["BarEqualsToken"] = 76] = "BarEqualsToken";
        SyntaxKind[SyntaxKind["CaretEqualsToken"] = 77] = "CaretEqualsToken";
        // Identifiers
        SyntaxKind[SyntaxKind["Identifier"] = 78] = "Identifier";
        // Reserved words
        SyntaxKind[SyntaxKind["BreakKeyword"] = 79] = "BreakKeyword";
        SyntaxKind[SyntaxKind["CaseKeyword"] = 80] = "CaseKeyword";
        SyntaxKind[SyntaxKind["CatchKeyword"] = 81] = "CatchKeyword";
        SyntaxKind[SyntaxKind["ClassKeyword"] = 82] = "ClassKeyword";
        SyntaxKind[SyntaxKind["ConstKeyword"] = 83] = "ConstKeyword";
        SyntaxKind[SyntaxKind["ContinueKeyword"] = 84] = "ContinueKeyword";
        SyntaxKind[SyntaxKind["DebuggerKeyword"] = 85] = "DebuggerKeyword";
        SyntaxKind[SyntaxKind["DefaultKeyword"] = 86] = "DefaultKeyword";
        SyntaxKind[SyntaxKind["DeleteKeyword"] = 87] = "DeleteKeyword";
        SyntaxKind[SyntaxKind["DoKeyword"] = 88] = "DoKeyword";
        SyntaxKind[SyntaxKind["ElseKeyword"] = 89] = "ElseKeyword";
        SyntaxKind[SyntaxKind["EnumKeyword"] = 90] = "EnumKeyword";
        SyntaxKind[SyntaxKind["ExportKeyword"] = 91] = "ExportKeyword";
        SyntaxKind[SyntaxKind["ExtendsKeyword"] = 92] = "ExtendsKeyword";
        SyntaxKind[SyntaxKind["FalseKeyword"] = 93] = "FalseKeyword";
        SyntaxKind[SyntaxKind["FinallyKeyword"] = 94] = "FinallyKeyword";
        SyntaxKind[SyntaxKind["ForKeyword"] = 95] = "ForKeyword";
        SyntaxKind[SyntaxKind["FunctionKeyword"] = 96] = "FunctionKeyword";
        SyntaxKind[SyntaxKind["IfKeyword"] = 97] = "IfKeyword";
        SyntaxKind[SyntaxKind["ImportKeyword"] = 98] = "ImportKeyword";
        SyntaxKind[SyntaxKind["InKeyword"] = 99] = "InKeyword";
        SyntaxKind[SyntaxKind["InstanceOfKeyword"] = 100] = "InstanceOfKeyword";
        SyntaxKind[SyntaxKind["NewKeyword"] = 101] = "NewKeyword";
        SyntaxKind[SyntaxKind["NullKeyword"] = 102] = "NullKeyword";
        SyntaxKind[SyntaxKind["UndefinedKeyword"] = 103] = "UndefinedKeyword";
        SyntaxKind[SyntaxKind["ReturnKeyword"] = 104] = "ReturnKeyword";
        SyntaxKind[SyntaxKind["SuperKeyword"] = 105] = "SuperKeyword";
        SyntaxKind[SyntaxKind["SwitchKeyword"] = 106] = "SwitchKeyword";
        SyntaxKind[SyntaxKind["ThisKeyword"] = 107] = "ThisKeyword";
        SyntaxKind[SyntaxKind["ThrowKeyword"] = 108] = "ThrowKeyword";
        SyntaxKind[SyntaxKind["TrueKeyword"] = 109] = "TrueKeyword";
        SyntaxKind[SyntaxKind["TryKeyword"] = 110] = "TryKeyword";
        SyntaxKind[SyntaxKind["TypeOfKeyword"] = 111] = "TypeOfKeyword";
        SyntaxKind[SyntaxKind["VarKeyword"] = 112] = "VarKeyword";
        SyntaxKind[SyntaxKind["VoidKeyword"] = 113] = "VoidKeyword";
        SyntaxKind[SyntaxKind["WhileKeyword"] = 114] = "WhileKeyword";
        SyntaxKind[SyntaxKind["WithKeyword"] = 115] = "WithKeyword";
        // Strict mode reserved words
        SyntaxKind[SyntaxKind["ImplementsKeyword"] = 116] = "ImplementsKeyword";
        SyntaxKind[SyntaxKind["InterfaceKeyword"] = 117] = "InterfaceKeyword";
        SyntaxKind[SyntaxKind["LetKeyword"] = 118] = "LetKeyword";
        SyntaxKind[SyntaxKind["PackageKeyword"] = 119] = "PackageKeyword";
        SyntaxKind[SyntaxKind["PrivateKeyword"] = 120] = "PrivateKeyword";
        SyntaxKind[SyntaxKind["ProtectedKeyword"] = 121] = "ProtectedKeyword";
        SyntaxKind[SyntaxKind["PublicKeyword"] = 122] = "PublicKeyword";
        SyntaxKind[SyntaxKind["StaticKeyword"] = 123] = "StaticKeyword";
        SyntaxKind[SyntaxKind["YieldKeyword"] = 124] = "YieldKeyword";
        // Contextual keywords
        SyntaxKind[SyntaxKind["AbstractKeyword"] = 125] = "AbstractKeyword";
        SyntaxKind[SyntaxKind["AsKeyword"] = 126] = "AsKeyword";
        SyntaxKind[SyntaxKind["AnyKeyword"] = 127] = "AnyKeyword";
        SyntaxKind[SyntaxKind["AsyncKeyword"] = 128] = "AsyncKeyword";
        SyntaxKind[SyntaxKind["AwaitKeyword"] = 129] = "AwaitKeyword";
        SyntaxKind[SyntaxKind["BooleanKeyword"] = 130] = "BooleanKeyword";
        SyntaxKind[SyntaxKind["ConstructorKeyword"] = 131] = "ConstructorKeyword";
        SyntaxKind[SyntaxKind["DeclareKeyword"] = 132] = "DeclareKeyword";
        SyntaxKind[SyntaxKind["GetKeyword"] = 133] = "GetKeyword";
        SyntaxKind[SyntaxKind["IsKeyword"] = 134] = "IsKeyword";
        SyntaxKind[SyntaxKind["ModuleKeyword"] = 135] = "ModuleKeyword";
        SyntaxKind[SyntaxKind["NamespaceKeyword"] = 136] = "NamespaceKeyword";
        SyntaxKind[SyntaxKind["RequireKeyword"] = 137] = "RequireKeyword";
        SyntaxKind[SyntaxKind["NumberKeyword"] = 138] = "NumberKeyword";
        SyntaxKind[SyntaxKind["SetKeyword"] = 139] = "SetKeyword";
        SyntaxKind[SyntaxKind["StringKeyword"] = 140] = "StringKeyword";
        SyntaxKind[SyntaxKind["SymbolKeyword"] = 141] = "SymbolKeyword";
        SyntaxKind[SyntaxKind["TypeKeyword"] = 142] = "TypeKeyword";
        SyntaxKind[SyntaxKind["FromKeyword"] = 143] = "FromKeyword";
        SyntaxKind[SyntaxKind["OfKeyword"] = 144] = "OfKeyword";
        // Parse tree nodes
        // Names
        SyntaxKind[SyntaxKind["QualifiedName"] = 145] = "QualifiedName";
        SyntaxKind[SyntaxKind["ComputedPropertyName"] = 146] = "ComputedPropertyName";
        // Signature elements
        SyntaxKind[SyntaxKind["TypeParameter"] = 147] = "TypeParameter";
        SyntaxKind[SyntaxKind["Parameter"] = 148] = "Parameter";
        SyntaxKind[SyntaxKind["ThisParameter"] = 149] = "ThisParameter";
        SyntaxKind[SyntaxKind["Decorator"] = 150] = "Decorator";
        // TypeMember
        SyntaxKind[SyntaxKind["PropertySignature"] = 151] = "PropertySignature";
        SyntaxKind[SyntaxKind["PropertyDeclaration"] = 152] = "PropertyDeclaration";
        SyntaxKind[SyntaxKind["MethodSignature"] = 153] = "MethodSignature";
        SyntaxKind[SyntaxKind["MethodDeclaration"] = 154] = "MethodDeclaration";
        SyntaxKind[SyntaxKind["Constructor"] = 155] = "Constructor";
        SyntaxKind[SyntaxKind["GetAccessor"] = 156] = "GetAccessor";
        SyntaxKind[SyntaxKind["SetAccessor"] = 157] = "SetAccessor";
        SyntaxKind[SyntaxKind["CallSignature"] = 158] = "CallSignature";
        SyntaxKind[SyntaxKind["ConstructSignature"] = 159] = "ConstructSignature";
        SyntaxKind[SyntaxKind["IndexSignature"] = 160] = "IndexSignature";
        // Type
        SyntaxKind[SyntaxKind["TypePredicate"] = 161] = "TypePredicate";
        SyntaxKind[SyntaxKind["TypeReference"] = 162] = "TypeReference";
        SyntaxKind[SyntaxKind["FunctionType"] = 163] = "FunctionType";
        SyntaxKind[SyntaxKind["ConstructorType"] = 164] = "ConstructorType";
        SyntaxKind[SyntaxKind["TypeQuery"] = 165] = "TypeQuery";
        SyntaxKind[SyntaxKind["TypeLiteral"] = 166] = "TypeLiteral";
        SyntaxKind[SyntaxKind["ArrayType"] = 167] = "ArrayType";
        SyntaxKind[SyntaxKind["TupleType"] = 168] = "TupleType";
        SyntaxKind[SyntaxKind["UnionType"] = 169] = "UnionType";
        SyntaxKind[SyntaxKind["IntersectionType"] = 170] = "IntersectionType";
        SyntaxKind[SyntaxKind["ParenthesizedType"] = 171] = "ParenthesizedType";
        // Binding patterns
        SyntaxKind[SyntaxKind["ObjectBindingPattern"] = 172] = "ObjectBindingPattern";
        SyntaxKind[SyntaxKind["ArrayBindingPattern"] = 173] = "ArrayBindingPattern";
        SyntaxKind[SyntaxKind["BindingElement"] = 174] = "BindingElement";
        // Expression
        SyntaxKind[SyntaxKind["ArrayLiteralExpression"] = 175] = "ArrayLiteralExpression";
        SyntaxKind[SyntaxKind["ObjectLiteralExpression"] = 176] = "ObjectLiteralExpression";
        SyntaxKind[SyntaxKind["PropertyAccessExpression"] = 177] = "PropertyAccessExpression";
        SyntaxKind[SyntaxKind["ElementAccessExpression"] = 178] = "ElementAccessExpression";
        SyntaxKind[SyntaxKind["CallExpression"] = 179] = "CallExpression";
        SyntaxKind[SyntaxKind["NewExpression"] = 180] = "NewExpression";
        SyntaxKind[SyntaxKind["TaggedTemplateExpression"] = 181] = "TaggedTemplateExpression";
        SyntaxKind[SyntaxKind["TypeAssertionExpression"] = 182] = "TypeAssertionExpression";
        SyntaxKind[SyntaxKind["ParenthesizedExpression"] = 183] = "ParenthesizedExpression";
        SyntaxKind[SyntaxKind["FunctionExpression"] = 184] = "FunctionExpression";
        SyntaxKind[SyntaxKind["ArrowFunction"] = 185] = "ArrowFunction";
        SyntaxKind[SyntaxKind["DeleteExpression"] = 186] = "DeleteExpression";
        SyntaxKind[SyntaxKind["TypeOfExpression"] = 187] = "TypeOfExpression";
        SyntaxKind[SyntaxKind["VoidExpression"] = 188] = "VoidExpression";
        SyntaxKind[SyntaxKind["AwaitExpression"] = 189] = "AwaitExpression";
        SyntaxKind[SyntaxKind["PrefixUnaryExpression"] = 190] = "PrefixUnaryExpression";
        SyntaxKind[SyntaxKind["PostfixUnaryExpression"] = 191] = "PostfixUnaryExpression";
        SyntaxKind[SyntaxKind["BinaryExpression"] = 192] = "BinaryExpression";
        SyntaxKind[SyntaxKind["ConditionalExpression"] = 193] = "ConditionalExpression";
        SyntaxKind[SyntaxKind["TemplateExpression"] = 194] = "TemplateExpression";
        SyntaxKind[SyntaxKind["YieldExpression"] = 195] = "YieldExpression";
        SyntaxKind[SyntaxKind["SpreadElementExpression"] = 196] = "SpreadElementExpression";
        SyntaxKind[SyntaxKind["ClassExpression"] = 197] = "ClassExpression";
        SyntaxKind[SyntaxKind["OmittedExpression"] = 198] = "OmittedExpression";
        SyntaxKind[SyntaxKind["ExpressionWithTypeArguments"] = 199] = "ExpressionWithTypeArguments";
        SyntaxKind[SyntaxKind["AsExpression"] = 200] = "AsExpression";
        // Misc
        SyntaxKind[SyntaxKind["TemplateSpan"] = 201] = "TemplateSpan";
        SyntaxKind[SyntaxKind["SemicolonClassElement"] = 202] = "SemicolonClassElement";
        // Element
        SyntaxKind[SyntaxKind["Block"] = 203] = "Block";
        SyntaxKind[SyntaxKind["VariableStatement"] = 204] = "VariableStatement";
        SyntaxKind[SyntaxKind["EmptyStatement"] = 205] = "EmptyStatement";
        SyntaxKind[SyntaxKind["ExpressionStatement"] = 206] = "ExpressionStatement";
        SyntaxKind[SyntaxKind["IfStatement"] = 207] = "IfStatement";
        SyntaxKind[SyntaxKind["DoStatement"] = 208] = "DoStatement";
        SyntaxKind[SyntaxKind["WhileStatement"] = 209] = "WhileStatement";
        SyntaxKind[SyntaxKind["ForStatement"] = 210] = "ForStatement";
        SyntaxKind[SyntaxKind["ForInStatement"] = 211] = "ForInStatement";
        SyntaxKind[SyntaxKind["ForOfStatement"] = 212] = "ForOfStatement";
        SyntaxKind[SyntaxKind["ContinueStatement"] = 213] = "ContinueStatement";
        SyntaxKind[SyntaxKind["BreakStatement"] = 214] = "BreakStatement";
        SyntaxKind[SyntaxKind["ReturnStatement"] = 215] = "ReturnStatement";
        SyntaxKind[SyntaxKind["WithStatement"] = 216] = "WithStatement";
        SyntaxKind[SyntaxKind["SwitchStatement"] = 217] = "SwitchStatement";
        SyntaxKind[SyntaxKind["LabeledStatement"] = 218] = "LabeledStatement";
        SyntaxKind[SyntaxKind["ThrowStatement"] = 219] = "ThrowStatement";
        SyntaxKind[SyntaxKind["TryStatement"] = 220] = "TryStatement";
        SyntaxKind[SyntaxKind["DebuggerStatement"] = 221] = "DebuggerStatement";
        SyntaxKind[SyntaxKind["VariableDeclaration"] = 222] = "VariableDeclaration";
        SyntaxKind[SyntaxKind["VariableDeclarationList"] = 223] = "VariableDeclarationList";
        SyntaxKind[SyntaxKind["FunctionDeclaration"] = 224] = "FunctionDeclaration";
        SyntaxKind[SyntaxKind["ClassDeclaration"] = 225] = "ClassDeclaration";
        SyntaxKind[SyntaxKind["InterfaceDeclaration"] = 226] = "InterfaceDeclaration";
        SyntaxKind[SyntaxKind["TypeAliasDeclaration"] = 227] = "TypeAliasDeclaration";
        SyntaxKind[SyntaxKind["EnumDeclaration"] = 228] = "EnumDeclaration";
        SyntaxKind[SyntaxKind["ModuleDeclaration"] = 229] = "ModuleDeclaration";
        SyntaxKind[SyntaxKind["ModuleBlock"] = 230] = "ModuleBlock";
        SyntaxKind[SyntaxKind["CaseBlock"] = 231] = "CaseBlock";
        SyntaxKind[SyntaxKind["ImportEqualsDeclaration"] = 232] = "ImportEqualsDeclaration";
        SyntaxKind[SyntaxKind["ImportDeclaration"] = 233] = "ImportDeclaration";
        SyntaxKind[SyntaxKind["ImportClause"] = 234] = "ImportClause";
        SyntaxKind[SyntaxKind["NamespaceImport"] = 235] = "NamespaceImport";
        SyntaxKind[SyntaxKind["NamedImports"] = 236] = "NamedImports";
        SyntaxKind[SyntaxKind["ImportSpecifier"] = 237] = "ImportSpecifier";
        SyntaxKind[SyntaxKind["ExportAssignment"] = 238] = "ExportAssignment";
        SyntaxKind[SyntaxKind["ExportDeclaration"] = 239] = "ExportDeclaration";
        SyntaxKind[SyntaxKind["NamedExports"] = 240] = "NamedExports";
        SyntaxKind[SyntaxKind["ExportSpecifier"] = 241] = "ExportSpecifier";
        SyntaxKind[SyntaxKind["MissingDeclaration"] = 242] = "MissingDeclaration";
        // Module references
        SyntaxKind[SyntaxKind["ExternalModuleReference"] = 243] = "ExternalModuleReference";
        // JSX
        SyntaxKind[SyntaxKind["JsxElement"] = 244] = "JsxElement";
        SyntaxKind[SyntaxKind["JsxSelfClosingElement"] = 245] = "JsxSelfClosingElement";
        SyntaxKind[SyntaxKind["JsxOpeningElement"] = 246] = "JsxOpeningElement";
        SyntaxKind[SyntaxKind["JsxText"] = 247] = "JsxText";
        SyntaxKind[SyntaxKind["JsxClosingElement"] = 248] = "JsxClosingElement";
        SyntaxKind[SyntaxKind["JsxAttribute"] = 249] = "JsxAttribute";
        SyntaxKind[SyntaxKind["JsxSpreadAttribute"] = 250] = "JsxSpreadAttribute";
        SyntaxKind[SyntaxKind["JsxExpression"] = 251] = "JsxExpression";
        // Clauses
        SyntaxKind[SyntaxKind["CaseClause"] = 252] = "CaseClause";
        SyntaxKind[SyntaxKind["DefaultClause"] = 253] = "DefaultClause";
        SyntaxKind[SyntaxKind["HeritageClause"] = 254] = "HeritageClause";
        SyntaxKind[SyntaxKind["CatchClause"] = 255] = "CatchClause";
        // Property assignments
        SyntaxKind[SyntaxKind["PropertyAssignment"] = 256] = "PropertyAssignment";
        SyntaxKind[SyntaxKind["ShorthandPropertyAssignment"] = 257] = "ShorthandPropertyAssignment";
        // Enum
        SyntaxKind[SyntaxKind["EnumMember"] = 258] = "EnumMember";
        // Top-level nodes
        SyntaxKind[SyntaxKind["SourceFile"] = 259] = "SourceFile";
        // JSDoc nodes.
        SyntaxKind[SyntaxKind["JSDocTypeExpression"] = 260] = "JSDocTypeExpression";
        // The * type.
        SyntaxKind[SyntaxKind["JSDocAllType"] = 261] = "JSDocAllType";
        // The ? type.
        SyntaxKind[SyntaxKind["JSDocUnknownType"] = 262] = "JSDocUnknownType";
        SyntaxKind[SyntaxKind["JSDocArrayType"] = 263] = "JSDocArrayType";
        SyntaxKind[SyntaxKind["JSDocUnionType"] = 264] = "JSDocUnionType";
        SyntaxKind[SyntaxKind["JSDocTupleType"] = 265] = "JSDocTupleType";
        SyntaxKind[SyntaxKind["JSDocNullableType"] = 266] = "JSDocNullableType";
        SyntaxKind[SyntaxKind["JSDocNonNullableType"] = 267] = "JSDocNonNullableType";
        SyntaxKind[SyntaxKind["JSDocRecordType"] = 268] = "JSDocRecordType";
        SyntaxKind[SyntaxKind["JSDocRecordMember"] = 269] = "JSDocRecordMember";
        SyntaxKind[SyntaxKind["JSDocTypeReference"] = 270] = "JSDocTypeReference";
        SyntaxKind[SyntaxKind["JSDocOptionalType"] = 271] = "JSDocOptionalType";
        SyntaxKind[SyntaxKind["JSDocFunctionType"] = 272] = "JSDocFunctionType";
        SyntaxKind[SyntaxKind["JSDocVariadicType"] = 273] = "JSDocVariadicType";
        SyntaxKind[SyntaxKind["JSDocConstructorType"] = 274] = "JSDocConstructorType";
        SyntaxKind[SyntaxKind["JSDocThisType"] = 275] = "JSDocThisType";
        SyntaxKind[SyntaxKind["JSDocComment"] = 276] = "JSDocComment";
        SyntaxKind[SyntaxKind["JSDocTag"] = 277] = "JSDocTag";
        SyntaxKind[SyntaxKind["JSDocParameterTag"] = 278] = "JSDocParameterTag";
        SyntaxKind[SyntaxKind["JSDocReturnTag"] = 279] = "JSDocReturnTag";
        SyntaxKind[SyntaxKind["JSDocTypeTag"] = 280] = "JSDocTypeTag";
        SyntaxKind[SyntaxKind["JSDocTemplateTag"] = 281] = "JSDocTemplateTag";
        // Synthesized list
        SyntaxKind[SyntaxKind["SyntaxList"] = 282] = "SyntaxList";
        // Enum value count
        SyntaxKind[SyntaxKind["Count"] = 283] = "Count";
        // Markers
        SyntaxKind[SyntaxKind["FirstAssignment"] = 66] = "FirstAssignment";
        SyntaxKind[SyntaxKind["LastAssignment"] = 77] = "LastAssignment";
        SyntaxKind[SyntaxKind["FirstReservedWord"] = 79] = "FirstReservedWord";
        SyntaxKind[SyntaxKind["LastReservedWord"] = 115] = "LastReservedWord";
        SyntaxKind[SyntaxKind["FirstKeyword"] = 79] = "FirstKeyword";
        SyntaxKind[SyntaxKind["LastKeyword"] = 144] = "LastKeyword";
        SyntaxKind[SyntaxKind["FirstFutureReservedWord"] = 116] = "FirstFutureReservedWord";
        SyntaxKind[SyntaxKind["LastFutureReservedWord"] = 124] = "LastFutureReservedWord";
        SyntaxKind[SyntaxKind["FirstTypeNode"] = 162] = "FirstTypeNode";
        SyntaxKind[SyntaxKind["LastTypeNode"] = 171] = "LastTypeNode";
        SyntaxKind[SyntaxKind["FirstPunctuation"] = 26] = "FirstPunctuation";
        SyntaxKind[SyntaxKind["LastPunctuation"] = 77] = "LastPunctuation";
        SyntaxKind[SyntaxKind["FirstToken"] = 11] = "FirstToken";
        SyntaxKind[SyntaxKind["LastToken"] = 144] = "LastToken";
        SyntaxKind[SyntaxKind["FirstTriviaToken"] = 13] = "FirstTriviaToken";
        SyntaxKind[SyntaxKind["LastTriviaToken"] = 18] = "LastTriviaToken";
        SyntaxKind[SyntaxKind["FirstLiteralToken"] = 19] = "FirstLiteralToken";
        SyntaxKind[SyntaxKind["LastLiteralToken"] = 22] = "LastLiteralToken";
        SyntaxKind[SyntaxKind["FirstTemplateToken"] = 22] = "FirstTemplateToken";
        SyntaxKind[SyntaxKind["LastTemplateToken"] = 25] = "LastTemplateToken";
        SyntaxKind[SyntaxKind["FirstBinaryOperator"] = 36] = "FirstBinaryOperator";
        SyntaxKind[SyntaxKind["LastBinaryOperator"] = 77] = "LastBinaryOperator";
        SyntaxKind[SyntaxKind["FirstNode"] = 145] = "FirstNode";
    })(ts.SyntaxKind || (ts.SyntaxKind = {}));
    var SyntaxKind = ts.SyntaxKind;
    (function (NodeFlags) {
        NodeFlags[NodeFlags["Export"] = 1] = "Export";
        NodeFlags[NodeFlags["Ambient"] = 2] = "Ambient";
        NodeFlags[NodeFlags["Public"] = 16] = "Public";
        NodeFlags[NodeFlags["Private"] = 32] = "Private";
        NodeFlags[NodeFlags["Protected"] = 64] = "Protected";
        NodeFlags[NodeFlags["Static"] = 128] = "Static";
        NodeFlags[NodeFlags["Abstract"] = 256] = "Abstract";
        NodeFlags[NodeFlags["Async"] = 512] = "Async";
        NodeFlags[NodeFlags["Default"] = 1024] = "Default";
        NodeFlags[NodeFlags["MultiLine"] = 2048] = "MultiLine";
        NodeFlags[NodeFlags["Synthetic"] = 4096] = "Synthetic";
        NodeFlags[NodeFlags["DeclarationFile"] = 8192] = "DeclarationFile";
        NodeFlags[NodeFlags["Let"] = 16384] = "Let";
        NodeFlags[NodeFlags["Const"] = 32768] = "Const";
        NodeFlags[NodeFlags["OctalLiteral"] = 65536] = "OctalLiteral";
        NodeFlags[NodeFlags["Namespace"] = 131072] = "Namespace";
        NodeFlags[NodeFlags["ExportContext"] = 262144] = "ExportContext";
        NodeFlags[NodeFlags["Modifier"] = 2035] = "Modifier";
        NodeFlags[NodeFlags["AccessibilityModifier"] = 112] = "AccessibilityModifier";
        NodeFlags[NodeFlags["BlockScoped"] = 49152] = "BlockScoped";
    })(ts.NodeFlags || (ts.NodeFlags = {}));
    var NodeFlags = ts.NodeFlags;
    /* @internal */
    (function (ParserContextFlags) {
        ParserContextFlags[ParserContextFlags["None"] = 0] = "None";
        // If this node was parsed in a context where 'in-expressions' are not allowed.
        ParserContextFlags[ParserContextFlags["DisallowIn"] = 1] = "DisallowIn";
        // If this node was parsed in the 'yield' context created when parsing a generator.
        ParserContextFlags[ParserContextFlags["Yield"] = 2] = "Yield";
        // If this node was parsed as part of a decorator
        ParserContextFlags[ParserContextFlags["Decorator"] = 4] = "Decorator";
        // If this node was parsed in the 'await' context created when parsing an async function.
        ParserContextFlags[ParserContextFlags["Await"] = 8] = "Await";
        // If the parser encountered an error when parsing the code that created this node.  Note
        // the parser only sets this directly on the node it creates right after encountering the
        // error.
        ParserContextFlags[ParserContextFlags["ThisNodeHasError"] = 16] = "ThisNodeHasError";
        // This node was parsed in a JavaScript file and can be processed differently.  For example
        // its type can be specified usign a JSDoc comment.
        ParserContextFlags[ParserContextFlags["JavaScriptFile"] = 32] = "JavaScriptFile";
        // Context flags set directly by the parser.
        ParserContextFlags[ParserContextFlags["ParserGeneratedFlags"] = 31] = "ParserGeneratedFlags";
        // Exclude these flags when parsing a Type
        ParserContextFlags[ParserContextFlags["TypeExcludesFlags"] = 10] = "TypeExcludesFlags";
        // Context flags computed by aggregating child flags upwards.
        // Used during incremental parsing to determine if this node or any of its children had an
        // error.  Computed only once and then cached.
        ParserContextFlags[ParserContextFlags["ThisNodeOrAnySubNodesHasError"] = 64] = "ThisNodeOrAnySubNodesHasError";
        // Used to know if we've computed data from children and cached it in this node.
        ParserContextFlags[ParserContextFlags["HasAggregatedChildData"] = 128] = "HasAggregatedChildData";
    })(ts.ParserContextFlags || (ts.ParserContextFlags = {}));
    var ParserContextFlags = ts.ParserContextFlags;
    (function (JsxFlags) {
        JsxFlags[JsxFlags["None"] = 0] = "None";
        JsxFlags[JsxFlags["IntrinsicNamedElement"] = 1] = "IntrinsicNamedElement";
        JsxFlags[JsxFlags["IntrinsicIndexedElement"] = 2] = "IntrinsicIndexedElement";
        JsxFlags[JsxFlags["ClassElement"] = 4] = "ClassElement";
        JsxFlags[JsxFlags["UnknownElement"] = 8] = "UnknownElement";
        JsxFlags[JsxFlags["IntrinsicElement"] = 3] = "IntrinsicElement";
    })(ts.JsxFlags || (ts.JsxFlags = {}));
    var JsxFlags = ts.JsxFlags;
    /* @internal */
    (function (RelationComparisonResult) {
        RelationComparisonResult[RelationComparisonResult["Succeeded"] = 1] = "Succeeded";
        RelationComparisonResult[RelationComparisonResult["Failed"] = 2] = "Failed";
        RelationComparisonResult[RelationComparisonResult["FailedAndReported"] = 3] = "FailedAndReported";
    })(ts.RelationComparisonResult || (ts.RelationComparisonResult = {}));
    var RelationComparisonResult = ts.RelationComparisonResult;
    ;
    var OperationCanceledException = (function () {
        function OperationCanceledException() {
        }
        return OperationCanceledException;
    })();
    ts.OperationCanceledException = OperationCanceledException;
    /** Return code used by getEmitOutput function to indicate status of the function */
    (function (ExitStatus) {
        // Compiler ran successfully.  Either this was a simple do-nothing compilation (for example,
        // when -version or -help was provided, or this was a normal compilation, no diagnostics
        // were produced, and all outputs were generated successfully.
        ExitStatus[ExitStatus["Success"] = 0] = "Success";
        // Diagnostics were produced and because of them no code was generated.
        ExitStatus[ExitStatus["DiagnosticsPresent_OutputsSkipped"] = 1] = "DiagnosticsPresent_OutputsSkipped";
        // Diagnostics were produced and outputs were generated in spite of them.
        ExitStatus[ExitStatus["DiagnosticsPresent_OutputsGenerated"] = 2] = "DiagnosticsPresent_OutputsGenerated";
    })(ts.ExitStatus || (ts.ExitStatus = {}));
    var ExitStatus = ts.ExitStatus;
    // [ConcreteTypeScript] For getPropertyProtection in checker.ts
    (function (ProtectionFlags) {
        ProtectionFlags[ProtectionFlags["None"] = 0] = "None";
        ProtectionFlags[ProtectionFlags["Cemented"] = 1] = "Cemented";
        ProtectionFlags[ProtectionFlags["Protected"] = 2] = "Protected";
        ProtectionFlags[ProtectionFlags["Stable"] = 4] = "Stable";
        ProtectionFlags[ProtectionFlags["MustCheck"] = 8] = "MustCheck";
        ProtectionFlags[ProtectionFlags["MustDemote"] = 16] = "MustDemote";
        ProtectionFlags[ProtectionFlags["ProtectedOrCemented"] = 3] = "ProtectedOrCemented";
    })(ts.ProtectionFlags || (ts.ProtectionFlags = {}));
    var ProtectionFlags = ts.ProtectionFlags;
    (function (TypeFormatFlags) {
        TypeFormatFlags[TypeFormatFlags["None"] = 0] = "None";
        TypeFormatFlags[TypeFormatFlags["WriteArrayAsGenericType"] = 1] = "WriteArrayAsGenericType";
        TypeFormatFlags[TypeFormatFlags["UseTypeOfFunction"] = 2] = "UseTypeOfFunction";
        TypeFormatFlags[TypeFormatFlags["NoTruncation"] = 4] = "NoTruncation";
        TypeFormatFlags[TypeFormatFlags["WriteArrowStyleSignature"] = 8] = "WriteArrowStyleSignature";
        TypeFormatFlags[TypeFormatFlags["WriteOwnNameForAnyLike"] = 16] = "WriteOwnNameForAnyLike";
        TypeFormatFlags[TypeFormatFlags["WriteTypeArgumentsOfSignature"] = 32] = "WriteTypeArgumentsOfSignature";
        TypeFormatFlags[TypeFormatFlags["InElementType"] = 64] = "InElementType";
        TypeFormatFlags[TypeFormatFlags["UseFullyQualifiedType"] = 128] = "UseFullyQualifiedType";
    })(ts.TypeFormatFlags || (ts.TypeFormatFlags = {}));
    var TypeFormatFlags = ts.TypeFormatFlags;
    (function (SymbolFormatFlags) {
        SymbolFormatFlags[SymbolFormatFlags["None"] = 0] = "None";
        // Write symbols's type argument if it is instantiated symbol
        // eg. class C<T> { p: T }   <-- Show p as C<T>.p here
        //     var a: C<number>;
        //     var p = a.p;  <--- Here p is property of C<number> so show it as C<number>.p instead of just C.p
        SymbolFormatFlags[SymbolFormatFlags["WriteTypeParametersOrArguments"] = 1] = "WriteTypeParametersOrArguments";
        // Use only external alias information to get the symbol name in the given context
        // eg.  module m { export class c { } } import x = m.c;
        // When this flag is specified m.c will be used to refer to the class instead of alias symbol x
        SymbolFormatFlags[SymbolFormatFlags["UseOnlyExternalAliasing"] = 2] = "UseOnlyExternalAliasing";
    })(ts.SymbolFormatFlags || (ts.SymbolFormatFlags = {}));
    var SymbolFormatFlags = ts.SymbolFormatFlags;
    /* @internal */
    (function (SymbolAccessibility) {
        SymbolAccessibility[SymbolAccessibility["Accessible"] = 0] = "Accessible";
        SymbolAccessibility[SymbolAccessibility["NotAccessible"] = 1] = "NotAccessible";
        SymbolAccessibility[SymbolAccessibility["CannotBeNamed"] = 2] = "CannotBeNamed";
    })(ts.SymbolAccessibility || (ts.SymbolAccessibility = {}));
    var SymbolAccessibility = ts.SymbolAccessibility;
    /** Indicates how to serialize the name for a TypeReferenceNode when emitting decorator
      * metadata */
    /* @internal */
    (function (TypeReferenceSerializationKind) {
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["Unknown"] = 0] = "Unknown";
        // should be emitted using a safe fallback.
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithConstructSignatureAndValue"] = 1] = "TypeWithConstructSignatureAndValue";
        // function that can be reached at runtime (e.g. a `class`
        // declaration or a `var` declaration for the static side
        // of a type, such as the global `Promise` type in lib.d.ts).
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["VoidType"] = 2] = "VoidType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["NumberLikeType"] = 3] = "NumberLikeType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["StringLikeType"] = 4] = "StringLikeType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["BooleanType"] = 5] = "BooleanType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["ArrayLikeType"] = 6] = "ArrayLikeType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["ESSymbolType"] = 7] = "ESSymbolType";
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["TypeWithCallSignature"] = 8] = "TypeWithCallSignature";
        // with call signatures.
        TypeReferenceSerializationKind[TypeReferenceSerializationKind["ObjectType"] = 9] = "ObjectType";
    })(ts.TypeReferenceSerializationKind || (ts.TypeReferenceSerializationKind = {}));
    var TypeReferenceSerializationKind = ts.TypeReferenceSerializationKind;
    (function (SymbolFlags) {
        SymbolFlags[SymbolFlags["None"] = 0] = "None";
        SymbolFlags[SymbolFlags["FunctionScopedVariable"] = 1] = "FunctionScopedVariable";
        SymbolFlags[SymbolFlags["BlockScopedVariable"] = 2] = "BlockScopedVariable";
        SymbolFlags[SymbolFlags["Property"] = 4] = "Property";
        SymbolFlags[SymbolFlags["EnumMember"] = 8] = "EnumMember";
        SymbolFlags[SymbolFlags["Function"] = 16] = "Function";
        SymbolFlags[SymbolFlags["Class"] = 32] = "Class";
        // [ConcreteTypeScript]
        SymbolFlags[SymbolFlags["Declare"] = 2147483648] = "Declare";
        // [/ConcreteTypeScript]
        SymbolFlags[SymbolFlags["Interface"] = 64] = "Interface";
        SymbolFlags[SymbolFlags["ConstEnum"] = 128] = "ConstEnum";
        SymbolFlags[SymbolFlags["RegularEnum"] = 256] = "RegularEnum";
        SymbolFlags[SymbolFlags["ValueModule"] = 512] = "ValueModule";
        SymbolFlags[SymbolFlags["NamespaceModule"] = 1024] = "NamespaceModule";
        SymbolFlags[SymbolFlags["TypeLiteral"] = 2048] = "TypeLiteral";
        SymbolFlags[SymbolFlags["ObjectLiteral"] = 4096] = "ObjectLiteral";
        SymbolFlags[SymbolFlags["Method"] = 8192] = "Method";
        SymbolFlags[SymbolFlags["Constructor"] = 16384] = "Constructor";
        SymbolFlags[SymbolFlags["GetAccessor"] = 32768] = "GetAccessor";
        SymbolFlags[SymbolFlags["SetAccessor"] = 65536] = "SetAccessor";
        SymbolFlags[SymbolFlags["Signature"] = 131072] = "Signature";
        SymbolFlags[SymbolFlags["TypeParameter"] = 262144] = "TypeParameter";
        SymbolFlags[SymbolFlags["TypeAlias"] = 524288] = "TypeAlias";
        SymbolFlags[SymbolFlags["ExportValue"] = 1048576] = "ExportValue";
        SymbolFlags[SymbolFlags["ExportType"] = 2097152] = "ExportType";
        SymbolFlags[SymbolFlags["ExportNamespace"] = 4194304] = "ExportNamespace";
        SymbolFlags[SymbolFlags["Alias"] = 8388608] = "Alias";
        SymbolFlags[SymbolFlags["Instantiated"] = 16777216] = "Instantiated";
        SymbolFlags[SymbolFlags["Merged"] = 33554432] = "Merged";
        SymbolFlags[SymbolFlags["Transient"] = 67108864] = "Transient";
        SymbolFlags[SymbolFlags["Prototype"] = 134217728] = "Prototype";
        SymbolFlags[SymbolFlags["SyntheticProperty"] = 268435456] = "SyntheticProperty";
        SymbolFlags[SymbolFlags["Optional"] = 536870912] = "Optional";
        SymbolFlags[SymbolFlags["ExportStar"] = 1073741824] = "ExportStar";
        SymbolFlags[SymbolFlags["Enum"] = 384] = "Enum";
        SymbolFlags[SymbolFlags["Variable"] = 3] = "Variable";
        SymbolFlags[SymbolFlags["Value"] = 107455] = "Value";
        SymbolFlags[SymbolFlags["Type"] = -2146690592] = "Type";
        SymbolFlags[SymbolFlags["Namespace"] = -2147482112] = "Namespace";
        SymbolFlags[SymbolFlags["Module"] = 1536] = "Module";
        SymbolFlags[SymbolFlags["Accessor"] = 98304] = "Accessor";
        // Variables can be redeclared, but can not redeclare a block-scoped declaration with the
        // same name, or any other value that is not a variable, e.g. ValueModule or Class
        SymbolFlags[SymbolFlags["FunctionScopedVariableExcludes"] = 107454] = "FunctionScopedVariableExcludes";
        // Block-scoped declarations are not allowed to be re-declared
        // they can not merge with anything in the value space
        SymbolFlags[SymbolFlags["BlockScopedVariableExcludes"] = 107455] = "BlockScopedVariableExcludes";
        SymbolFlags[SymbolFlags["ParameterExcludes"] = 107455] = "ParameterExcludes";
        SymbolFlags[SymbolFlags["PropertyExcludes"] = 107455] = "PropertyExcludes";
        SymbolFlags[SymbolFlags["EnumMemberExcludes"] = 107455] = "EnumMemberExcludes";
        SymbolFlags[SymbolFlags["FunctionExcludes"] = 106927] = "FunctionExcludes";
        SymbolFlags[SymbolFlags["ClassExcludes"] = -2146584129] = "ClassExcludes";
        SymbolFlags[SymbolFlags["InterfaceExcludes"] = -2146690688] = "InterfaceExcludes";
        SymbolFlags[SymbolFlags["RegularEnumExcludes"] = -2146584321] = "RegularEnumExcludes";
        SymbolFlags[SymbolFlags["ConstEnumExcludes"] = -2146583681] = "ConstEnumExcludes";
        SymbolFlags[SymbolFlags["ValueModuleExcludes"] = 106639] = "ValueModuleExcludes";
        SymbolFlags[SymbolFlags["NamespaceModuleExcludes"] = 0] = "NamespaceModuleExcludes";
        SymbolFlags[SymbolFlags["MethodExcludes"] = 99263] = "MethodExcludes";
        SymbolFlags[SymbolFlags["GetAccessorExcludes"] = 41919] = "GetAccessorExcludes";
        SymbolFlags[SymbolFlags["SetAccessorExcludes"] = 74687] = "SetAccessorExcludes";
        SymbolFlags[SymbolFlags["TypeParameterExcludes"] = -2146952736] = "TypeParameterExcludes";
        SymbolFlags[SymbolFlags["TypeAliasExcludes"] = -2146690592] = "TypeAliasExcludes";
        SymbolFlags[SymbolFlags["AliasExcludes"] = 8388608] = "AliasExcludes";
        SymbolFlags[SymbolFlags["ModuleMember"] = -2138568717] = "ModuleMember";
        SymbolFlags[SymbolFlags["ExportHasLocal"] = -2147482704] = "ExportHasLocal";
        SymbolFlags[SymbolFlags["HasExports"] = -2147481680] = "HasExports";
        SymbolFlags[SymbolFlags["HasMembers"] = -2147477408] = "HasMembers";
        SymbolFlags[SymbolFlags["BlockScoped"] = -2147483230] = "BlockScoped";
        SymbolFlags[SymbolFlags["PropertyOrAccessor"] = 98308] = "PropertyOrAccessor";
        SymbolFlags[SymbolFlags["Export"] = 7340032] = "Export";
        /* @internal */
        // The set of things we consider semantically classifiable.  Used to speed up the LS during
        // classification.
        SymbolFlags[SymbolFlags["Classifiable"] = -2146695200] = "Classifiable";
        SymbolFlags[SymbolFlags["BrandTypeExcludes"] = -2146690592] = "BrandTypeExcludes";
        SymbolFlags[SymbolFlags["DeclareTypeExcludes"] = 793056] = "DeclareTypeExcludes"; // [ConcreteTypeScript]
    })(ts.SymbolFlags || (ts.SymbolFlags = {}));
    var SymbolFlags = ts.SymbolFlags;
    /* @internal */
    (function (NodeCheckFlags) {
        NodeCheckFlags[NodeCheckFlags["TypeChecked"] = 1] = "TypeChecked";
        NodeCheckFlags[NodeCheckFlags["LexicalThis"] = 2] = "LexicalThis";
        NodeCheckFlags[NodeCheckFlags["CaptureThis"] = 4] = "CaptureThis";
        NodeCheckFlags[NodeCheckFlags["EmitExtends"] = 8] = "EmitExtends";
        NodeCheckFlags[NodeCheckFlags["EmitDecorate"] = 16] = "EmitDecorate";
        NodeCheckFlags[NodeCheckFlags["EmitParam"] = 32] = "EmitParam";
        NodeCheckFlags[NodeCheckFlags["EmitAwaiter"] = 64] = "EmitAwaiter";
        NodeCheckFlags[NodeCheckFlags["EmitGenerator"] = 128] = "EmitGenerator";
        NodeCheckFlags[NodeCheckFlags["SuperInstance"] = 256] = "SuperInstance";
        NodeCheckFlags[NodeCheckFlags["SuperStatic"] = 512] = "SuperStatic";
        NodeCheckFlags[NodeCheckFlags["ContextChecked"] = 1024] = "ContextChecked";
        NodeCheckFlags[NodeCheckFlags["LexicalArguments"] = 2048] = "LexicalArguments";
        NodeCheckFlags[NodeCheckFlags["CaptureArguments"] = 4096] = "CaptureArguments";
        // Values for enum members have been computed, and any errors have been reported for them.
        NodeCheckFlags[NodeCheckFlags["EnumValuesComputed"] = 8192] = "EnumValuesComputed";
        NodeCheckFlags[NodeCheckFlags["BlockScopedBindingInLoop"] = 16384] = "BlockScopedBindingInLoop";
        NodeCheckFlags[NodeCheckFlags["LexicalModuleMergesWithClass"] = 32768] = "LexicalModuleMergesWithClass";
    })(ts.NodeCheckFlags || (ts.NodeCheckFlags = {}));
    var NodeCheckFlags = ts.NodeCheckFlags;
    (function (TypeFlags) {
        TypeFlags[TypeFlags["Any"] = 1] = "Any";
        TypeFlags[TypeFlags["String"] = 2] = "String";
        TypeFlags[TypeFlags["Number"] = 4] = "Number";
        TypeFlags[TypeFlags["Boolean"] = 8] = "Boolean";
        TypeFlags[TypeFlags["Void"] = 16] = "Void";
        TypeFlags[TypeFlags["Undefined"] = 32] = "Undefined";
        TypeFlags[TypeFlags["Null"] = 64] = "Null";
        TypeFlags[TypeFlags["Enum"] = 128] = "Enum";
        TypeFlags[TypeFlags["StringLiteral"] = 256] = "StringLiteral";
        TypeFlags[TypeFlags["TypeParameter"] = 512] = "TypeParameter";
        TypeFlags[TypeFlags["Class"] = 1024] = "Class";
        TypeFlags[TypeFlags["Interface"] = 2048] = "Interface";
        TypeFlags[TypeFlags["Reference"] = 4096] = "Reference";
        TypeFlags[TypeFlags["Tuple"] = 8192] = "Tuple";
        TypeFlags[TypeFlags["Union"] = 16384] = "Union";
        TypeFlags[TypeFlags["Intersection"] = 32768] = "Intersection";
        TypeFlags[TypeFlags["Anonymous"] = 65536] = "Anonymous";
        TypeFlags[TypeFlags["Instantiated"] = 131072] = "Instantiated";
        /* @internal */
        TypeFlags[TypeFlags["FromSignature"] = 262144] = "FromSignature";
        TypeFlags[TypeFlags["ObjectLiteral"] = 524288] = "ObjectLiteral";
        /* @internal */
        TypeFlags[TypeFlags["FreshObjectLiteral"] = 1048576] = "FreshObjectLiteral";
        /* @internal */
        TypeFlags[TypeFlags["ContainsUndefinedOrNull"] = 2097152] = "ContainsUndefinedOrNull";
        /* @internal */
        TypeFlags[TypeFlags["ContainsObjectLiteral"] = 4194304] = "ContainsObjectLiteral";
        /* @internal */
        TypeFlags[TypeFlags["ContainsAnyFunctionType"] = 8388608] = "ContainsAnyFunctionType";
        TypeFlags[TypeFlags["ESSymbol"] = 16777216] = "ESSymbol";
        // [ConcreteTypeScript]
        // Flag for concrete types, which wrap their non-concrete base types
        TypeFlags[TypeFlags["Concrete"] = 33554432] = "Concrete";
        // Flag for the floating-point hint
        TypeFlags[TypeFlags["FloatHint"] = 67108864] = "FloatHint";
        // Flag for the int hint
        TypeFlags[TypeFlags["IntHint"] = 134217728] = "IntHint";
        // Object brand, nominal typing stemming from a code location
        TypeFlags[TypeFlags["Declare"] = 268435456] = "Declare";
        // For 'becomes' types, holds a 'before' type, the type the object resolves to now, and an 'after' type.
        // 'becomes' declarations are (always?) statically checked (?)
        TypeFlags[TypeFlags["IntermediateFlow"] = 536870912] = "IntermediateFlow";
        // [/ConcreteTypeScript]
        /* @internal */
        TypeFlags[TypeFlags["Intrinsic"] = 16777343] = "Intrinsic";
        /* @internal */
        TypeFlags[TypeFlags["Primitive"] = 16777726] = "Primitive";
        TypeFlags[TypeFlags["StringLike"] = 258] = "StringLike";
        TypeFlags[TypeFlags["NumberLike"] = 132] = "NumberLike";
        TypeFlags[TypeFlags["ObjectType"] = 805387264] = "ObjectType";
        TypeFlags[TypeFlags["RuntimeCheckable"] = 285214079] = "RuntimeCheckable";
        TypeFlags[TypeFlags["UnionOrIntersection"] = 49152] = "UnionOrIntersection";
        TypeFlags[TypeFlags["StructuredType"] = 805436416] = "StructuredType";
        /* @internal */
        TypeFlags[TypeFlags["RequiresWidening"] = 6291456] = "RequiresWidening";
        /* @internal */
        TypeFlags[TypeFlags["PropagatingFlags"] = 14680064] = "PropagatingFlags";
    })(ts.TypeFlags || (ts.TypeFlags = {}));
    var TypeFlags = ts.TypeFlags;
    (function (SignatureKind) {
        SignatureKind[SignatureKind["Call"] = 0] = "Call";
        SignatureKind[SignatureKind["Construct"] = 1] = "Construct";
    })(ts.SignatureKind || (ts.SignatureKind = {}));
    var SignatureKind = ts.SignatureKind;
    (function (IndexKind) {
        IndexKind[IndexKind["String"] = 0] = "String";
        IndexKind[IndexKind["Number"] = 1] = "Number";
    })(ts.IndexKind || (ts.IndexKind = {}));
    var IndexKind = ts.IndexKind;
    (function (DiagnosticCategory) {
        DiagnosticCategory[DiagnosticCategory["Warning"] = 0] = "Warning";
        DiagnosticCategory[DiagnosticCategory["Error"] = 1] = "Error";
        DiagnosticCategory[DiagnosticCategory["Message"] = 2] = "Message";
    })(ts.DiagnosticCategory || (ts.DiagnosticCategory = {}));
    var DiagnosticCategory = ts.DiagnosticCategory;
    (function (ModuleResolutionKind) {
        ModuleResolutionKind[ModuleResolutionKind["Classic"] = 1] = "Classic";
        ModuleResolutionKind[ModuleResolutionKind["NodeJs"] = 2] = "NodeJs";
    })(ts.ModuleResolutionKind || (ts.ModuleResolutionKind = {}));
    var ModuleResolutionKind = ts.ModuleResolutionKind;
    (function (ModuleKind) {
        ModuleKind[ModuleKind["None"] = 0] = "None";
        ModuleKind[ModuleKind["CommonJS"] = 1] = "CommonJS";
        ModuleKind[ModuleKind["AMD"] = 2] = "AMD";
        ModuleKind[ModuleKind["UMD"] = 3] = "UMD";
        ModuleKind[ModuleKind["System"] = 4] = "System";
    })(ts.ModuleKind || (ts.ModuleKind = {}));
    var ModuleKind = ts.ModuleKind;
    (function (JsxEmit) {
        JsxEmit[JsxEmit["None"] = 0] = "None";
        JsxEmit[JsxEmit["Preserve"] = 1] = "Preserve";
        JsxEmit[JsxEmit["React"] = 2] = "React";
    })(ts.JsxEmit || (ts.JsxEmit = {}));
    var JsxEmit = ts.JsxEmit;
    (function (NewLineKind) {
        NewLineKind[NewLineKind["CarriageReturnLineFeed"] = 0] = "CarriageReturnLineFeed";
        NewLineKind[NewLineKind["LineFeed"] = 1] = "LineFeed";
    })(ts.NewLineKind || (ts.NewLineKind = {}));
    var NewLineKind = ts.NewLineKind;
    (function (ScriptTarget) {
        ScriptTarget[ScriptTarget["ES3"] = 0] = "ES3";
        ScriptTarget[ScriptTarget["ES5"] = 1] = "ES5";
        ScriptTarget[ScriptTarget["ES6"] = 2] = "ES6";
        ScriptTarget[ScriptTarget["Latest"] = 2] = "Latest";
    })(ts.ScriptTarget || (ts.ScriptTarget = {}));
    var ScriptTarget = ts.ScriptTarget;
    (function (LanguageVariant) {
        LanguageVariant[LanguageVariant["Standard"] = 0] = "Standard";
        LanguageVariant[LanguageVariant["JSX"] = 1] = "JSX";
    })(ts.LanguageVariant || (ts.LanguageVariant = {}));
    var LanguageVariant = ts.LanguageVariant;
    /* @internal */
    (function (CharacterCodes) {
        CharacterCodes[CharacterCodes["nullCharacter"] = 0] = "nullCharacter";
        CharacterCodes[CharacterCodes["maxAsciiCharacter"] = 127] = "maxAsciiCharacter";
        CharacterCodes[CharacterCodes["lineFeed"] = 10] = "lineFeed";
        CharacterCodes[CharacterCodes["carriageReturn"] = 13] = "carriageReturn";
        CharacterCodes[CharacterCodes["lineSeparator"] = 8232] = "lineSeparator";
        CharacterCodes[CharacterCodes["paragraphSeparator"] = 8233] = "paragraphSeparator";
        CharacterCodes[CharacterCodes["nextLine"] = 133] = "nextLine";
        // Unicode 3.0 space characters
        CharacterCodes[CharacterCodes["space"] = 32] = "space";
        CharacterCodes[CharacterCodes["nonBreakingSpace"] = 160] = "nonBreakingSpace";
        CharacterCodes[CharacterCodes["enQuad"] = 8192] = "enQuad";
        CharacterCodes[CharacterCodes["emQuad"] = 8193] = "emQuad";
        CharacterCodes[CharacterCodes["enSpace"] = 8194] = "enSpace";
        CharacterCodes[CharacterCodes["emSpace"] = 8195] = "emSpace";
        CharacterCodes[CharacterCodes["threePerEmSpace"] = 8196] = "threePerEmSpace";
        CharacterCodes[CharacterCodes["fourPerEmSpace"] = 8197] = "fourPerEmSpace";
        CharacterCodes[CharacterCodes["sixPerEmSpace"] = 8198] = "sixPerEmSpace";
        CharacterCodes[CharacterCodes["figureSpace"] = 8199] = "figureSpace";
        CharacterCodes[CharacterCodes["punctuationSpace"] = 8200] = "punctuationSpace";
        CharacterCodes[CharacterCodes["thinSpace"] = 8201] = "thinSpace";
        CharacterCodes[CharacterCodes["hairSpace"] = 8202] = "hairSpace";
        CharacterCodes[CharacterCodes["zeroWidthSpace"] = 8203] = "zeroWidthSpace";
        CharacterCodes[CharacterCodes["narrowNoBreakSpace"] = 8239] = "narrowNoBreakSpace";
        CharacterCodes[CharacterCodes["ideographicSpace"] = 12288] = "ideographicSpace";
        CharacterCodes[CharacterCodes["mathematicalSpace"] = 8287] = "mathematicalSpace";
        CharacterCodes[CharacterCodes["ogham"] = 5760] = "ogham";
        CharacterCodes[CharacterCodes["_"] = 95] = "_";
        CharacterCodes[CharacterCodes["$"] = 36] = "$";
        CharacterCodes[CharacterCodes["_0"] = 48] = "_0";
        CharacterCodes[CharacterCodes["_1"] = 49] = "_1";
        CharacterCodes[CharacterCodes["_2"] = 50] = "_2";
        CharacterCodes[CharacterCodes["_3"] = 51] = "_3";
        CharacterCodes[CharacterCodes["_4"] = 52] = "_4";
        CharacterCodes[CharacterCodes["_5"] = 53] = "_5";
        CharacterCodes[CharacterCodes["_6"] = 54] = "_6";
        CharacterCodes[CharacterCodes["_7"] = 55] = "_7";
        CharacterCodes[CharacterCodes["_8"] = 56] = "_8";
        CharacterCodes[CharacterCodes["_9"] = 57] = "_9";
        CharacterCodes[CharacterCodes["a"] = 97] = "a";
        CharacterCodes[CharacterCodes["b"] = 98] = "b";
        CharacterCodes[CharacterCodes["c"] = 99] = "c";
        CharacterCodes[CharacterCodes["d"] = 100] = "d";
        CharacterCodes[CharacterCodes["e"] = 101] = "e";
        CharacterCodes[CharacterCodes["f"] = 102] = "f";
        CharacterCodes[CharacterCodes["g"] = 103] = "g";
        CharacterCodes[CharacterCodes["h"] = 104] = "h";
        CharacterCodes[CharacterCodes["i"] = 105] = "i";
        CharacterCodes[CharacterCodes["j"] = 106] = "j";
        CharacterCodes[CharacterCodes["k"] = 107] = "k";
        CharacterCodes[CharacterCodes["l"] = 108] = "l";
        CharacterCodes[CharacterCodes["m"] = 109] = "m";
        CharacterCodes[CharacterCodes["n"] = 110] = "n";
        CharacterCodes[CharacterCodes["o"] = 111] = "o";
        CharacterCodes[CharacterCodes["p"] = 112] = "p";
        CharacterCodes[CharacterCodes["q"] = 113] = "q";
        CharacterCodes[CharacterCodes["r"] = 114] = "r";
        CharacterCodes[CharacterCodes["s"] = 115] = "s";
        CharacterCodes[CharacterCodes["t"] = 116] = "t";
        CharacterCodes[CharacterCodes["u"] = 117] = "u";
        CharacterCodes[CharacterCodes["v"] = 118] = "v";
        CharacterCodes[CharacterCodes["w"] = 119] = "w";
        CharacterCodes[CharacterCodes["x"] = 120] = "x";
        CharacterCodes[CharacterCodes["y"] = 121] = "y";
        CharacterCodes[CharacterCodes["z"] = 122] = "z";
        CharacterCodes[CharacterCodes["A"] = 65] = "A";
        CharacterCodes[CharacterCodes["B"] = 66] = "B";
        CharacterCodes[CharacterCodes["C"] = 67] = "C";
        CharacterCodes[CharacterCodes["D"] = 68] = "D";
        CharacterCodes[CharacterCodes["E"] = 69] = "E";
        CharacterCodes[CharacterCodes["F"] = 70] = "F";
        CharacterCodes[CharacterCodes["G"] = 71] = "G";
        CharacterCodes[CharacterCodes["H"] = 72] = "H";
        CharacterCodes[CharacterCodes["I"] = 73] = "I";
        CharacterCodes[CharacterCodes["J"] = 74] = "J";
        CharacterCodes[CharacterCodes["K"] = 75] = "K";
        CharacterCodes[CharacterCodes["L"] = 76] = "L";
        CharacterCodes[CharacterCodes["M"] = 77] = "M";
        CharacterCodes[CharacterCodes["N"] = 78] = "N";
        CharacterCodes[CharacterCodes["O"] = 79] = "O";
        CharacterCodes[CharacterCodes["P"] = 80] = "P";
        CharacterCodes[CharacterCodes["Q"] = 81] = "Q";
        CharacterCodes[CharacterCodes["R"] = 82] = "R";
        CharacterCodes[CharacterCodes["S"] = 83] = "S";
        CharacterCodes[CharacterCodes["T"] = 84] = "T";
        CharacterCodes[CharacterCodes["U"] = 85] = "U";
        CharacterCodes[CharacterCodes["V"] = 86] = "V";
        CharacterCodes[CharacterCodes["W"] = 87] = "W";
        CharacterCodes[CharacterCodes["X"] = 88] = "X";
        CharacterCodes[CharacterCodes["Y"] = 89] = "Y";
        CharacterCodes[CharacterCodes["Z"] = 90] = "Z";
        CharacterCodes[CharacterCodes["ampersand"] = 38] = "ampersand";
        CharacterCodes[CharacterCodes["asterisk"] = 42] = "asterisk";
        CharacterCodes[CharacterCodes["at"] = 64] = "at";
        CharacterCodes[CharacterCodes["backslash"] = 92] = "backslash";
        CharacterCodes[CharacterCodes["backtick"] = 96] = "backtick";
        CharacterCodes[CharacterCodes["bar"] = 124] = "bar";
        CharacterCodes[CharacterCodes["caret"] = 94] = "caret";
        CharacterCodes[CharacterCodes["closeBrace"] = 125] = "closeBrace";
        CharacterCodes[CharacterCodes["closeBracket"] = 93] = "closeBracket";
        CharacterCodes[CharacterCodes["closeParen"] = 41] = "closeParen";
        CharacterCodes[CharacterCodes["colon"] = 58] = "colon";
        CharacterCodes[CharacterCodes["comma"] = 44] = "comma";
        CharacterCodes[CharacterCodes["dot"] = 46] = "dot";
        CharacterCodes[CharacterCodes["doubleQuote"] = 34] = "doubleQuote";
        CharacterCodes[CharacterCodes["equals"] = 61] = "equals";
        CharacterCodes[CharacterCodes["exclamation"] = 33] = "exclamation";
        CharacterCodes[CharacterCodes["greaterThan"] = 62] = "greaterThan";
        CharacterCodes[CharacterCodes["hash"] = 35] = "hash";
        CharacterCodes[CharacterCodes["lessThan"] = 60] = "lessThan";
        CharacterCodes[CharacterCodes["minus"] = 45] = "minus";
        CharacterCodes[CharacterCodes["openBrace"] = 123] = "openBrace";
        CharacterCodes[CharacterCodes["openBracket"] = 91] = "openBracket";
        CharacterCodes[CharacterCodes["openParen"] = 40] = "openParen";
        CharacterCodes[CharacterCodes["percent"] = 37] = "percent";
        CharacterCodes[CharacterCodes["plus"] = 43] = "plus";
        CharacterCodes[CharacterCodes["question"] = 63] = "question";
        CharacterCodes[CharacterCodes["semicolon"] = 59] = "semicolon";
        CharacterCodes[CharacterCodes["singleQuote"] = 39] = "singleQuote";
        CharacterCodes[CharacterCodes["slash"] = 47] = "slash";
        CharacterCodes[CharacterCodes["tilde"] = 126] = "tilde";
        CharacterCodes[CharacterCodes["backspace"] = 8] = "backspace";
        CharacterCodes[CharacterCodes["formFeed"] = 12] = "formFeed";
        CharacterCodes[CharacterCodes["byteOrderMark"] = 65279] = "byteOrderMark";
        CharacterCodes[CharacterCodes["tab"] = 9] = "tab";
        CharacterCodes[CharacterCodes["verticalTab"] = 11] = "verticalTab";
    })(ts.CharacterCodes || (ts.CharacterCodes = {}));
    var CharacterCodes = ts.CharacterCodes;
})(ts || (ts = {}));
//# sourceMappingURL=types.js.map