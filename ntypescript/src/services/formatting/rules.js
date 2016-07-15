///<reference path='references.ts' />
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var Rules = (function () {
            function Rules() {
                ///
                /// Common Rules
                ///
                // Leave comments alone
                this.IgnoreBeforeComment = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.Comments), formatting.RuleOperation.create1(formatting.RuleAction.Ignore));
                this.IgnoreAfterLineComment = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.SingleLineCommentTrivia, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create1(formatting.RuleAction.Ignore));
                // Space after keyword but not before ; or : or ?
                this.NoSpaceBeforeSemicolon = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.SemicolonToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeColon = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.ColonToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeQuestionMark = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.QuestionToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), formatting.RuleAction.Delete));
                this.SpaceAfterColon = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.ColonToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterQuestionMarkInConditionalOperator = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.QuestionToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsConditionalOperatorContext), formatting.RuleAction.Space));
                this.NoSpaceAfterQuestionMark = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.QuestionToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.SpaceAfterSemicolon = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.SemicolonToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                // Space after }.
                this.SpaceAfterCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.CloseBraceToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsAfterCodeBlockContext), formatting.RuleAction.Space));
                // Special case for (}, else) and (}, while) since else & while tokens are not part of the tree which makes SpaceAfterCloseBrace rule not applied
                this.SpaceBetweenCloseBraceAndElse = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.ElseKeyword), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.SpaceBetweenCloseBraceAndWhile = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.WhileKeyword), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.NoSpaceAfterCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.CloseBraceToken, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.CommaToken, ts.SyntaxKind.SemicolonToken])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // No space for dot
                this.NoSpaceBeforeDot = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.DotToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterDot = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.DotToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // No space before and after indexer
                this.NoSpaceBeforeOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.OpenBracketToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.CloseBracketToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBeforeBlockInFunctionDeclarationContext), formatting.RuleAction.Delete));
                // Place a space before open brace in a function declaration
                this.FunctionOpenBraceLeftTokenRange = formatting.Shared.TokenRange.AnyIncludingMultilineComments;
                this.SpaceBeforeOpenBraceInFunction = new formatting.Rule(formatting.RuleDescriptor.create2(this.FunctionOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext, Rules.IsBeforeBlockContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), formatting.RuleAction.Space), formatting.RuleFlags.CanDeleteNewLines);
                // Place a space before open brace in a TypeScript declaration that has braces as children (class, module, enum, etc)
                this.TypeScriptOpenBraceLeftTokenRange = formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.MultiLineCommentTrivia, ts.SyntaxKind.ClassKeyword]);
                this.SpaceBeforeOpenBraceInTypeScriptDeclWithBlock = new formatting.Rule(formatting.RuleDescriptor.create2(this.TypeScriptOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsTypeScriptDeclWithBlockContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), formatting.RuleAction.Space), formatting.RuleFlags.CanDeleteNewLines);
                // Place a space before open brace in a control flow construct
                this.ControlOpenBraceLeftTokenRange = formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.MultiLineCommentTrivia, ts.SyntaxKind.DoKeyword, ts.SyntaxKind.TryKeyword, ts.SyntaxKind.FinallyKeyword, ts.SyntaxKind.ElseKeyword]);
                this.SpaceBeforeOpenBraceInControl = new formatting.Rule(formatting.RuleDescriptor.create2(this.ControlOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), formatting.RuleAction.Space), formatting.RuleFlags.CanDeleteNewLines);
                // Insert a space after { and before } in single-line contexts, but remove space from empty object literals {}.
                this.SpaceAfterOpenBrace = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenBraceToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSingleLineBlockContext), formatting.RuleAction.Space));
                this.SpaceBeforeCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CloseBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSingleLineBlockContext), formatting.RuleAction.Space));
                this.NoSpaceBetweenEmptyBraceBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.CloseBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsObjectContext), formatting.RuleAction.Delete));
                // Insert new line after { and before } in multi-line contexts.
                this.NewLineAfterOpenBraceInBlockContext = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenBraceToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsMultilineBlockContext), formatting.RuleAction.NewLine));
                // For functions and control block place } on a new line    [multi-line rule]
                this.NewLineBeforeCloseBraceInBlockContext = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.AnyIncludingMultilineComments, ts.SyntaxKind.CloseBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsMultilineBlockContext), formatting.RuleAction.NewLine));
                // Special handling of unary operators.
                // Prefix operators generally shouldn't have a space between
                // them and their target unary expression.
                this.NoSpaceAfterUnaryPrefixOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.UnaryPrefixOperators, formatting.Shared.TokenRange.UnaryPrefixExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterUnaryPreincrementOperator = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.PlusPlusToken, formatting.Shared.TokenRange.UnaryPreincrementExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterUnaryPredecrementOperator = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.MinusMinusToken, formatting.Shared.TokenRange.UnaryPredecrementExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeUnaryPostincrementOperator = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.UnaryPostincrementExpressions, ts.SyntaxKind.PlusPlusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeUnaryPostdecrementOperator = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.UnaryPostdecrementExpressions, ts.SyntaxKind.MinusMinusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // More unary operator special-casing.
                // DevDiv 181814:  Be careful when removing leading whitespace
                // around unary operators.  Examples:
                //      1 - -2  --X-->  1--2
                //      a + ++b --X-->  a+++b
                this.SpaceAfterPostincrementWhenFollowedByAdd = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.PlusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterAddWhenFollowedByUnaryPlus = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.PlusToken, ts.SyntaxKind.PlusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterAddWhenFollowedByPreincrement = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.PlusToken, ts.SyntaxKind.PlusPlusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterPostdecrementWhenFollowedBySubtract = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.MinusMinusToken, ts.SyntaxKind.MinusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterSubtractWhenFollowedByUnaryMinus = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.MinusToken, ts.SyntaxKind.MinusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterSubtractWhenFollowedByPredecrement = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.MinusToken, ts.SyntaxKind.MinusMinusToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.NoSpaceBeforeComma = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CommaToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.SpaceAfterCertainKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.VarKeyword, ts.SyntaxKind.ThrowKeyword, ts.SyntaxKind.NewKeyword, ts.SyntaxKind.DeleteKeyword, ts.SyntaxKind.ReturnKeyword, ts.SyntaxKind.TypeOfKeyword, ts.SyntaxKind.AwaitKeyword]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.SpaceAfterLetConstInVariableDeclaration = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.LetKeyword, ts.SyntaxKind.ConstKeyword]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsStartOfVariableDeclarationList), formatting.RuleAction.Space));
                this.NoSpaceBeforeOpenParenInFuncCall = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsFunctionCallOrNewContext, Rules.IsPreviousTokenNotComma), formatting.RuleAction.Delete));
                this.SpaceAfterFunctionInFuncDecl = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.FunctionKeyword, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), formatting.RuleAction.Space));
                this.NoSpaceBeforeOpenParenInFuncDecl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsFunctionDeclContext), formatting.RuleAction.Delete));
                this.SpaceAfterVoidOperator = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.VoidKeyword, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsVoidOpContext), formatting.RuleAction.Space));
                this.NoSpaceBetweenReturnAndSemicolon = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.ReturnKeyword, ts.SyntaxKind.SemicolonToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Add a space between statements. All keywords except (do,else,case) has open/close parens after them.
                // So, we have a rule to add a space for [),Any], [do,Any], [else,Any], and [case,Any]
                this.SpaceBetweenStatements = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.DoKeyword, ts.SyntaxKind.ElseKeyword, ts.SyntaxKind.CaseKeyword]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotForContext), formatting.RuleAction.Space));
                // This low-pri rule takes care of "try {" and "finally {" in case the rule SpaceBeforeOpenBraceInControl didn't execute on FormatOnEnter.
                this.SpaceAfterTryFinally = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.TryKeyword, ts.SyntaxKind.FinallyKeyword]), ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                //      get x() {}
                //      set x(val) {}
                this.SpaceAfterGetSetInMember = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.GetKeyword, ts.SyntaxKind.SetKeyword]), ts.SyntaxKind.Identifier), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), formatting.RuleAction.Space));
                // Special case for binary operators (that are keywords). For these we have to add a space and shouldn't follow any user options.
                this.SpaceBeforeBinaryKeywordOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryKeywordOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterBinaryKeywordOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryKeywordOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                // TypeScript-specific higher priority rules
                // Treat constructor as an identifier in a function declaration, and remove spaces between constructor and following left parentheses
                this.NoSpaceAfterConstructor = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.ConstructorKeyword, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Use of module as a function call. e.g.: import m2 = module("m2");
                this.NoSpaceAfterModuleImport = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.ModuleKeyword, ts.SyntaxKind.RequireKeyword]), ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Add a space around certain TypeScript keywords
                this.SpaceAfterCertainTypeScriptKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.AbstractKeyword, ts.SyntaxKind.ClassKeyword, ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.DefaultKeyword, ts.SyntaxKind.EnumKeyword, ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.ExtendsKeyword, ts.SyntaxKind.GetKeyword, ts.SyntaxKind.ImplementsKeyword, ts.SyntaxKind.ImportKeyword, ts.SyntaxKind.InterfaceKeyword, ts.SyntaxKind.ModuleKeyword, ts.SyntaxKind.NamespaceKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.SetKeyword, ts.SyntaxKind.StaticKeyword, ts.SyntaxKind.TypeKeyword]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.SpaceBeforeCertainTypeScriptKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.ExtendsKeyword, ts.SyntaxKind.ImplementsKeyword])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                // Treat string literals in module names as identifiers, and add a space between the literal and the opening Brace braces, e.g.: module "m2" {
                this.SpaceAfterModuleName = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.StringLiteral, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsModuleDeclContext), formatting.RuleAction.Space));
                // Lambda expressions
                this.SpaceAfterArrow = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.EqualsGreaterThanToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                // Optional parameters and let args
                this.NoSpaceAfterEllipsis = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.DotDotDotToken, ts.SyntaxKind.Identifier), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterOptionalParameters = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.QuestionToken, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.CommaToken])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), formatting.RuleAction.Delete));
                // generics and type assertions
                this.NoSpaceBeforeOpenAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.TypeNames, ts.SyntaxKind.LessThanToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), formatting.RuleAction.Delete));
                this.NoSpaceBetweenCloseParenAndAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.LessThanToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterOpenAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.LessThanToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeCloseAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.GreaterThanToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterCloseAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.GreaterThanToken, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.CommaToken])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterTypeAssertion = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.GreaterThanToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeAssertionContext), formatting.RuleAction.Delete));
                // Remove spaces in empty interface literals. e.g.: x: {}
                this.NoSpaceBetweenEmptyInterfaceBraceBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.CloseBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsObjectTypeContext), formatting.RuleAction.Delete));
                // decorators
                this.SpaceBeforeAt = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.AtToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.NoSpaceAfterAt = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.AtToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.SpaceAfterDecorator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.AbstractKeyword, ts.SyntaxKind.Identifier, ts.SyntaxKind.ExportKeyword, ts.SyntaxKind.DefaultKeyword, ts.SyntaxKind.ClassKeyword, ts.SyntaxKind.StaticKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.GetKeyword, ts.SyntaxKind.SetKeyword, ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.AsteriskToken])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsEndOfDecoratorContextOnSameLine), formatting.RuleAction.Space));
                this.NoSpaceBetweenFunctionKeywordAndStar = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.FunctionKeyword, ts.SyntaxKind.AsteriskToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclarationOrFunctionExpressionContext), formatting.RuleAction.Delete));
                this.SpaceAfterStarInGeneratorDeclaration = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.AsteriskToken, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.Identifier, ts.SyntaxKind.OpenParenToken])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclarationOrFunctionExpressionContext), formatting.RuleAction.Space));
                this.NoSpaceBetweenYieldKeywordAndStar = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.YieldKeyword, ts.SyntaxKind.AsteriskToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsYieldOrYieldStarWithOperand), formatting.RuleAction.Delete));
                this.SpaceBetweenYieldOrYieldStarAndOperand = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.YieldKeyword, ts.SyntaxKind.AsteriskToken]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsYieldOrYieldStarWithOperand), formatting.RuleAction.Space));
                // Async-await
                this.SpaceBetweenAsyncAndFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.AsyncKeyword, ts.SyntaxKind.FunctionKeyword), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                // template string
                this.SpaceBetweenTagAndTemplateString = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.Identifier, formatting.Shared.TokenRange.FromTokens([ts.SyntaxKind.NoSubstitutionTemplateLiteral, ts.SyntaxKind.TemplateHead])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                // These rules are higher in priority than user-configurable rules.
                this.HighPriorityCommonRules =
                    [
                        this.IgnoreBeforeComment, this.IgnoreAfterLineComment,
                        this.NoSpaceBeforeColon, this.SpaceAfterColon, this.NoSpaceBeforeQuestionMark, this.SpaceAfterQuestionMarkInConditionalOperator,
                        this.NoSpaceAfterQuestionMark,
                        this.NoSpaceBeforeDot, this.NoSpaceAfterDot,
                        this.NoSpaceAfterUnaryPrefixOperator,
                        this.NoSpaceAfterUnaryPreincrementOperator, this.NoSpaceAfterUnaryPredecrementOperator,
                        this.NoSpaceBeforeUnaryPostincrementOperator, this.NoSpaceBeforeUnaryPostdecrementOperator,
                        this.SpaceAfterPostincrementWhenFollowedByAdd,
                        this.SpaceAfterAddWhenFollowedByUnaryPlus, this.SpaceAfterAddWhenFollowedByPreincrement,
                        this.SpaceAfterPostdecrementWhenFollowedBySubtract,
                        this.SpaceAfterSubtractWhenFollowedByUnaryMinus, this.SpaceAfterSubtractWhenFollowedByPredecrement,
                        this.NoSpaceAfterCloseBrace,
                        this.SpaceAfterOpenBrace, this.SpaceBeforeCloseBrace, this.NewLineBeforeCloseBraceInBlockContext,
                        this.SpaceAfterCloseBrace, this.SpaceBetweenCloseBraceAndElse, this.SpaceBetweenCloseBraceAndWhile, this.NoSpaceBetweenEmptyBraceBrackets,
                        this.NoSpaceBetweenFunctionKeywordAndStar, this.SpaceAfterStarInGeneratorDeclaration,
                        this.SpaceAfterFunctionInFuncDecl, this.NewLineAfterOpenBraceInBlockContext, this.SpaceAfterGetSetInMember,
                        this.NoSpaceBetweenYieldKeywordAndStar, this.SpaceBetweenYieldOrYieldStarAndOperand,
                        this.NoSpaceBetweenReturnAndSemicolon,
                        this.SpaceAfterCertainKeywords,
                        this.SpaceAfterLetConstInVariableDeclaration,
                        this.NoSpaceBeforeOpenParenInFuncCall,
                        this.SpaceBeforeBinaryKeywordOperator, this.SpaceAfterBinaryKeywordOperator,
                        this.SpaceAfterVoidOperator,
                        this.SpaceBetweenAsyncAndFunctionKeyword,
                        this.SpaceBetweenTagAndTemplateString,
                        // TypeScript-specific rules
                        this.NoSpaceAfterConstructor, this.NoSpaceAfterModuleImport,
                        this.SpaceAfterCertainTypeScriptKeywords, this.SpaceBeforeCertainTypeScriptKeywords,
                        this.SpaceAfterModuleName,
                        this.SpaceAfterArrow,
                        this.NoSpaceAfterEllipsis,
                        this.NoSpaceAfterOptionalParameters,
                        this.NoSpaceBetweenEmptyInterfaceBraceBrackets,
                        this.NoSpaceBeforeOpenAngularBracket,
                        this.NoSpaceBetweenCloseParenAndAngularBracket,
                        this.NoSpaceAfterOpenAngularBracket,
                        this.NoSpaceBeforeCloseAngularBracket,
                        this.NoSpaceAfterCloseAngularBracket,
                        this.NoSpaceAfterTypeAssertion,
                        this.SpaceBeforeAt,
                        this.NoSpaceAfterAt,
                        this.SpaceAfterDecorator,
                    ];
                // These rules are lower in priority than user-configurable rules.
                this.LowPriorityCommonRules =
                    [
                        this.NoSpaceBeforeSemicolon,
                        this.SpaceBeforeOpenBraceInControl, this.SpaceBeforeOpenBraceInFunction, this.SpaceBeforeOpenBraceInTypeScriptDeclWithBlock,
                        this.NoSpaceBeforeComma,
                        this.NoSpaceBeforeOpenBracket,
                        this.NoSpaceAfterCloseBracket,
                        this.SpaceAfterSemicolon,
                        this.NoSpaceBeforeOpenParenInFuncDecl,
                        this.SpaceBetweenStatements, this.SpaceAfterTryFinally
                    ];
                ///
                /// Rules controlled by user options
                ///
                // Insert space after comma delimiter
                this.SpaceAfterComma = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.CommaToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.NoSpaceAfterComma = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.CommaToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Insert space before and after binary operators
                this.SpaceBeforeBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.SpaceAfterBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Space));
                this.NoSpaceBeforeBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), formatting.RuleAction.Delete));
                // Insert space after keywords in control flow statements
                this.SpaceAfterKeywordInControl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Keywords, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext), formatting.RuleAction.Space));
                this.NoSpaceAfterKeywordInControl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Keywords, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext), formatting.RuleAction.Delete));
                // Open Brace braces after function
                //TypeScript: Function can have return types, which can be made of tons of different token kinds
                this.NewLineBeforeOpenBraceInFunction = new formatting.Rule(formatting.RuleDescriptor.create2(this.FunctionOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext, Rules.IsBeforeMultilineBlockContext), formatting.RuleAction.NewLine), formatting.RuleFlags.CanDeleteNewLines);
                // Open Brace braces after TypeScript module/class/interface
                this.NewLineBeforeOpenBraceInTypeScriptDeclWithBlock = new formatting.Rule(formatting.RuleDescriptor.create2(this.TypeScriptOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsTypeScriptDeclWithBlockContext, Rules.IsBeforeMultilineBlockContext), formatting.RuleAction.NewLine), formatting.RuleFlags.CanDeleteNewLines);
                // Open Brace braces after control block
                this.NewLineBeforeOpenBraceInControl = new formatting.Rule(formatting.RuleDescriptor.create2(this.ControlOpenBraceLeftTokenRange, ts.SyntaxKind.OpenBraceToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext, Rules.IsBeforeMultilineBlockContext), formatting.RuleAction.NewLine), formatting.RuleFlags.CanDeleteNewLines);
                // Insert space after semicolon in for statement
                this.SpaceAfterSemicolonInFor = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.SemicolonToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsForContext), formatting.RuleAction.Space));
                this.NoSpaceAfterSemicolonInFor = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.SemicolonToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsForContext), formatting.RuleAction.Delete));
                // Insert space after opening and before closing nonempty parenthesis
                this.SpaceAfterOpenParen = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenParenToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.SpaceBeforeCloseParen = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CloseParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.NoSpaceBetweenParens = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.CloseParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterOpenParen = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenParenToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeCloseParen = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CloseParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Insert space after opening and before closing nonempty brackets
                this.SpaceAfterOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenBracketToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.SpaceBeforeCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CloseBracketToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Space));
                this.NoSpaceBetweenBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.CloseBracketToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceAfterOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create3(ts.SyntaxKind.OpenBracketToken, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                this.NoSpaceBeforeCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, ts.SyntaxKind.CloseBracketToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), formatting.RuleAction.Delete));
                // Insert space after function keyword for anonymous functions
                this.SpaceAfterAnonymousFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.FunctionKeyword, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), formatting.RuleAction.Space));
                this.NoSpaceAfterAnonymousFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(ts.SyntaxKind.FunctionKeyword, ts.SyntaxKind.OpenParenToken), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), formatting.RuleAction.Delete));
            }
            Rules.prototype.getRuleName = function (rule) {
                var o = this;
                for (var name_1 in o) {
                    if (o[name_1] === rule) {
                        return name_1;
                    }
                }
                throw new Error("Unknown rule");
            };
            ///
            /// Contexts
            ///
            Rules.IsForContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.ForStatement;
            };
            Rules.IsNotForContext = function (context) {
                return !Rules.IsForContext(context);
            };
            Rules.IsBinaryOpContext = function (context) {
                switch (context.contextNode.kind) {
                    case ts.SyntaxKind.BinaryExpression:
                    case ts.SyntaxKind.ConditionalExpression:
                    case ts.SyntaxKind.AsExpression:
                    case ts.SyntaxKind.TypePredicate:
                    case ts.SyntaxKind.UnionType:
                    case ts.SyntaxKind.IntersectionType:
                        return true;
                    // equals in binding elements: function foo([[x, y] = [1, 2]])
                    case ts.SyntaxKind.BindingElement:
                    // equals in type X = ...
                    case ts.SyntaxKind.TypeAliasDeclaration:
                    // equal in import a = module('a');
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                    // equal in let a = 0;
                    case ts.SyntaxKind.VariableDeclaration:
                    // equal in p = 0;
                    case ts.SyntaxKind.Parameter:
                    case ts.SyntaxKind.EnumMember:
                    case ts.SyntaxKind.PropertyDeclaration:
                    case ts.SyntaxKind.PropertySignature:
                        return context.currentTokenSpan.kind === ts.SyntaxKind.EqualsToken || context.nextTokenSpan.kind === ts.SyntaxKind.EqualsToken;
                    // "in" keyword in for (let x in []) { }
                    case ts.SyntaxKind.ForInStatement:
                        return context.currentTokenSpan.kind === ts.SyntaxKind.InKeyword || context.nextTokenSpan.kind === ts.SyntaxKind.InKeyword;
                    // Technically, "of" is not a binary operator, but format it the same way as "in"
                    case ts.SyntaxKind.ForOfStatement:
                        return context.currentTokenSpan.kind === ts.SyntaxKind.OfKeyword || context.nextTokenSpan.kind === ts.SyntaxKind.OfKeyword;
                }
                return false;
            };
            Rules.IsNotBinaryOpContext = function (context) {
                return !Rules.IsBinaryOpContext(context);
            };
            Rules.IsConditionalOperatorContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.ConditionalExpression;
            };
            Rules.IsSameLineTokenOrBeforeMultilineBlockContext = function (context) {
                //// This check is mainly used inside SpaceBeforeOpenBraceInControl and SpaceBeforeOpenBraceInFunction.
                ////
                //// Ex: 
                //// if (1)     { ....
                ////      * ) and { are on the same line so apply the rule. Here we don't care whether it's same or multi block context
                ////
                //// Ex: 
                //// if (1)
                //// { ... }
                ////      * ) and { are on differnet lines. We only need to format if the block is multiline context. So in this case we don't format.
                ////
                //// Ex:
                //// if (1) 
                //// { ...
                //// }
                ////      * ) and { are on differnet lines. We only need to format if the block is multiline context. So in this case we format.
                return context.TokensAreOnSameLine() || Rules.IsBeforeMultilineBlockContext(context);
            };
            // This check is done before an open brace in a control construct, a function, or a typescript block declaration
            Rules.IsBeforeMultilineBlockContext = function (context) {
                return Rules.IsBeforeBlockContext(context) && !(context.NextNodeAllOnSameLine() || context.NextNodeBlockIsOnOneLine());
            };
            Rules.IsMultilineBlockContext = function (context) {
                return Rules.IsBlockContext(context) && !(context.ContextNodeAllOnSameLine() || context.ContextNodeBlockIsOnOneLine());
            };
            Rules.IsSingleLineBlockContext = function (context) {
                return Rules.IsBlockContext(context) && (context.ContextNodeAllOnSameLine() || context.ContextNodeBlockIsOnOneLine());
            };
            Rules.IsBlockContext = function (context) {
                return Rules.NodeIsBlockContext(context.contextNode);
            };
            Rules.IsBeforeBlockContext = function (context) {
                return Rules.NodeIsBlockContext(context.nextTokenParent);
            };
            // IMPORTANT!!! This method must return true ONLY for nodes with open and close braces as immediate children
            Rules.NodeIsBlockContext = function (node) {
                if (Rules.NodeIsTypeScriptDeclWithBlockContext(node)) {
                    // This means we are in a context that looks like a block to the user, but in the grammar is actually not a node (it's a class, module, enum, object type literal, etc).
                    return true;
                }
                switch (node.kind) {
                    case ts.SyntaxKind.Block:
                    case ts.SyntaxKind.CaseBlock:
                    case ts.SyntaxKind.ObjectLiteralExpression:
                    case ts.SyntaxKind.ModuleBlock:
                        return true;
                }
                return false;
            };
            Rules.IsFunctionDeclContext = function (context) {
                switch (context.contextNode.kind) {
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                    //case SyntaxKind.MemberFunctionDeclaration:
                    case ts.SyntaxKind.GetAccessor:
                    case ts.SyntaxKind.SetAccessor:
                    ///case SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.Constructor:
                    case ts.SyntaxKind.ArrowFunction:
                    //case SyntaxKind.ConstructorDeclaration:
                    //case SyntaxKind.SimpleArrowFunctionExpression:
                    //case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case ts.SyntaxKind.InterfaceDeclaration:
                        return true;
                }
                return false;
            };
            Rules.IsFunctionDeclarationOrFunctionExpressionContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.FunctionDeclaration || context.contextNode.kind === ts.SyntaxKind.FunctionExpression;
            };
            Rules.IsTypeScriptDeclWithBlockContext = function (context) {
                return Rules.NodeIsTypeScriptDeclWithBlockContext(context.contextNode);
            };
            Rules.NodeIsTypeScriptDeclWithBlockContext = function (node) {
                switch (node.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ClassExpression:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.TypeLiteral:
                    case ts.SyntaxKind.ModuleDeclaration:
                        return true;
                }
                return false;
            };
            Rules.IsAfterCodeBlockContext = function (context) {
                switch (context.currentTokenParent.kind) {
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ModuleDeclaration:
                    case ts.SyntaxKind.EnumDeclaration:
                    case ts.SyntaxKind.Block:
                    case ts.SyntaxKind.CatchClause:
                    case ts.SyntaxKind.ModuleBlock:
                    case ts.SyntaxKind.SwitchStatement:
                        return true;
                }
                return false;
            };
            Rules.IsControlDeclContext = function (context) {
                switch (context.contextNode.kind) {
                    case ts.SyntaxKind.IfStatement:
                    case ts.SyntaxKind.SwitchStatement:
                    case ts.SyntaxKind.ForStatement:
                    case ts.SyntaxKind.ForInStatement:
                    case ts.SyntaxKind.ForOfStatement:
                    case ts.SyntaxKind.WhileStatement:
                    case ts.SyntaxKind.TryStatement:
                    case ts.SyntaxKind.DoStatement:
                    case ts.SyntaxKind.WithStatement:
                    // TODO
                    // case SyntaxKind.ElseClause:
                    case ts.SyntaxKind.CatchClause:
                        return true;
                    default:
                        return false;
                }
            };
            Rules.IsObjectContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.ObjectLiteralExpression;
            };
            Rules.IsFunctionCallContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.CallExpression;
            };
            Rules.IsNewContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.NewExpression;
            };
            Rules.IsFunctionCallOrNewContext = function (context) {
                return Rules.IsFunctionCallContext(context) || Rules.IsNewContext(context);
            };
            Rules.IsPreviousTokenNotComma = function (context) {
                return context.currentTokenSpan.kind !== ts.SyntaxKind.CommaToken;
            };
            Rules.IsSameLineTokenContext = function (context) {
                return context.TokensAreOnSameLine();
            };
            Rules.IsNotBeforeBlockInFunctionDeclarationContext = function (context) {
                return !Rules.IsFunctionDeclContext(context) && !Rules.IsBeforeBlockContext(context);
            };
            Rules.IsEndOfDecoratorContextOnSameLine = function (context) {
                return context.TokensAreOnSameLine() &&
                    context.contextNode.decorators &&
                    Rules.NodeIsInDecoratorContext(context.currentTokenParent) &&
                    !Rules.NodeIsInDecoratorContext(context.nextTokenParent);
            };
            Rules.NodeIsInDecoratorContext = function (node) {
                while (ts.isExpression(node)) {
                    node = node.parent;
                }
                return node.kind === ts.SyntaxKind.Decorator;
            };
            Rules.IsStartOfVariableDeclarationList = function (context) {
                return context.currentTokenParent.kind === ts.SyntaxKind.VariableDeclarationList &&
                    context.currentTokenParent.getStart(context.sourceFile) === context.currentTokenSpan.pos;
            };
            Rules.IsNotFormatOnEnter = function (context) {
                return context.formattingRequestKind !== formatting.FormattingRequestKind.FormatOnEnter;
            };
            Rules.IsModuleDeclContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.ModuleDeclaration;
            };
            Rules.IsObjectTypeContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.TypeLiteral; // && context.contextNode.parent.kind !== SyntaxKind.InterfaceDeclaration;
            };
            Rules.IsTypeArgumentOrParameterOrAssertion = function (token, parent) {
                if (token.kind !== ts.SyntaxKind.LessThanToken && token.kind !== ts.SyntaxKind.GreaterThanToken) {
                    return false;
                }
                switch (parent.kind) {
                    case ts.SyntaxKind.TypeReference:
                    case ts.SyntaxKind.TypeAssertionExpression:
                    case ts.SyntaxKind.ClassDeclaration:
                    case ts.SyntaxKind.ClassExpression:
                    case ts.SyntaxKind.InterfaceDeclaration:
                    case ts.SyntaxKind.FunctionDeclaration:
                    case ts.SyntaxKind.FunctionExpression:
                    case ts.SyntaxKind.ArrowFunction:
                    case ts.SyntaxKind.MethodDeclaration:
                    case ts.SyntaxKind.MethodSignature:
                    case ts.SyntaxKind.CallSignature:
                    case ts.SyntaxKind.ConstructSignature:
                    case ts.SyntaxKind.CallExpression:
                    case ts.SyntaxKind.NewExpression:
                    case ts.SyntaxKind.ExpressionWithTypeArguments:
                        return true;
                    default:
                        return false;
                }
            };
            Rules.IsTypeArgumentOrParameterOrAssertionContext = function (context) {
                return Rules.IsTypeArgumentOrParameterOrAssertion(context.currentTokenSpan, context.currentTokenParent) ||
                    Rules.IsTypeArgumentOrParameterOrAssertion(context.nextTokenSpan, context.nextTokenParent);
            };
            Rules.IsTypeAssertionContext = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.TypeAssertionExpression;
            };
            Rules.IsVoidOpContext = function (context) {
                return context.currentTokenSpan.kind === ts.SyntaxKind.VoidKeyword && context.currentTokenParent.kind === ts.SyntaxKind.VoidExpression;
            };
            Rules.IsYieldOrYieldStarWithOperand = function (context) {
                return context.contextNode.kind === ts.SyntaxKind.YieldExpression && context.contextNode.expression !== undefined;
            };
            return Rules;
        })();
        formatting.Rules = Rules;
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
//# sourceMappingURL=rules.js.map