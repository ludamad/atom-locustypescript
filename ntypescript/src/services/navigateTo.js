/* @internal */
var ts;
(function (ts) {
    var NavigateTo;
    (function (NavigateTo) {
        function getNavigateToItems(program, cancellationToken, searchValue, maxResultCount) {
            var patternMatcher = ts.createPatternMatcher(searchValue);
            var rawItems = [];
            // Search the declarations in all files and output matched NavigateToItem into array of NavigateToItem[] 
            ts.forEach(program.getSourceFiles(), function (sourceFile) {
                cancellationToken.throwIfCancellationRequested();
                var nameToDeclarations = sourceFile.getNamedDeclarations();
                for (var name_1 in nameToDeclarations) {
                    var declarations = ts.getProperty(nameToDeclarations, name_1);
                    if (declarations) {
                        // First do a quick check to see if the name of the declaration matches the 
                        // last portion of the (possibly) dotted name they're searching for.
                        var matches = patternMatcher.getMatchesForLastSegmentOfPattern(name_1);
                        if (!matches) {
                            continue;
                        }
                        for (var _i = 0; _i < declarations.length; _i++) {
                            var declaration = declarations[_i];
                            // It was a match!  If the pattern has dots in it, then also see if the 
                            // declaration container matches as well.
                            if (patternMatcher.patternContainsDots) {
                                var containers = getContainers(declaration);
                                if (!containers) {
                                    return undefined;
                                }
                                matches = patternMatcher.getMatches(containers, name_1);
                                if (!matches) {
                                    continue;
                                }
                            }
                            var fileName = sourceFile.fileName;
                            var matchKind = bestMatchKind(matches);
                            rawItems.push({ name: name_1, fileName: fileName, matchKind: matchKind, isCaseSensitive: allMatchesAreCaseSensitive(matches), declaration: declaration });
                        }
                    }
                }
            });
            rawItems.sort(compareNavigateToItems);
            if (maxResultCount !== undefined) {
                rawItems = rawItems.slice(0, maxResultCount);
            }
            var items = ts.map(rawItems, createNavigateToItem);
            return items;
            function allMatchesAreCaseSensitive(matches) {
                ts.Debug.assert(matches.length > 0);
                // This is a case sensitive match, only if all the submatches were case sensitive.
                for (var _i = 0; _i < matches.length; _i++) {
                    var match = matches[_i];
                    if (!match.isCaseSensitive) {
                        return false;
                    }
                }
                return true;
            }
            function getTextOfIdentifierOrLiteral(node) {
                if (node) {
                    if (node.kind === ts.SyntaxKind.Identifier ||
                        node.kind === ts.SyntaxKind.StringLiteral ||
                        node.kind === ts.SyntaxKind.NumericLiteral) {
                        return node.text;
                    }
                }
                return undefined;
            }
            function tryAddSingleDeclarationName(declaration, containers) {
                if (declaration && declaration.name) {
                    var text = getTextOfIdentifierOrLiteral(declaration.name);
                    if (text !== undefined) {
                        containers.unshift(text);
                    }
                    else if (declaration.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                        return tryAddComputedPropertyName(declaration.name.expression, containers, /*includeLastPortion:*/ true);
                    }
                    else {
                        // Don't know how to add this.
                        return false;
                    }
                }
                return true;
            }
            // Only added the names of computed properties if they're simple dotted expressions, like:
            //
            //      [X.Y.Z]() { }
            function tryAddComputedPropertyName(expression, containers, includeLastPortion) {
                var text = getTextOfIdentifierOrLiteral(expression);
                if (text !== undefined) {
                    if (includeLastPortion) {
                        containers.unshift(text);
                    }
                    return true;
                }
                if (expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    var propertyAccess = expression;
                    if (includeLastPortion) {
                        containers.unshift(propertyAccess.name.text);
                    }
                    return tryAddComputedPropertyName(propertyAccess.expression, containers, /*includeLastPortion:*/ true);
                }
                return false;
            }
            function getContainers(declaration) {
                var containers = [];
                // First, if we started with a computed property name, then add all but the last
                // portion into the container array.
                if (declaration.name.kind === ts.SyntaxKind.ComputedPropertyName) {
                    if (!tryAddComputedPropertyName(declaration.name.expression, containers, /*includeLastPortion:*/ false)) {
                        return undefined;
                    }
                }
                // Now, walk up our containers, adding all their names to the container array.
                declaration = ts.getContainerNode(declaration);
                while (declaration) {
                    if (!tryAddSingleDeclarationName(declaration, containers)) {
                        return undefined;
                    }
                    declaration = ts.getContainerNode(declaration);
                }
                return containers;
            }
            function bestMatchKind(matches) {
                ts.Debug.assert(matches.length > 0);
                var bestMatchKind = ts.PatternMatchKind.camelCase;
                for (var _i = 0; _i < matches.length; _i++) {
                    var match = matches[_i];
                    var kind = match.kind;
                    if (kind < bestMatchKind) {
                        bestMatchKind = kind;
                    }
                }
                return bestMatchKind;
            }
            // This means "compare in a case insensitive manner."
            var baseSensitivity = { sensitivity: "base" };
            function compareNavigateToItems(i1, i2) {
                // TODO(cyrusn): get the gamut of comparisons that VS already uses here.
                // Right now we just sort by kind first, and then by name of the item.
                // We first sort case insensitively.  So "Aaa" will come before "bar".
                // Then we sort case sensitively, so "aaa" will come before "Aaa".
                return i1.matchKind - i2.matchKind ||
                    i1.name.localeCompare(i2.name, undefined, baseSensitivity) ||
                    i1.name.localeCompare(i2.name);
            }
            function createNavigateToItem(rawItem) {
                var declaration = rawItem.declaration;
                var container = ts.getContainerNode(declaration);
                return {
                    name: rawItem.name,
                    kind: ts.getNodeKind(declaration),
                    kindModifiers: ts.getNodeModifiers(declaration),
                    matchKind: ts.PatternMatchKind[rawItem.matchKind],
                    isCaseSensitive: rawItem.isCaseSensitive,
                    fileName: rawItem.fileName,
                    textSpan: ts.createTextSpanFromBounds(declaration.getStart(), declaration.getEnd()),
                    // TODO(jfreeman): What should be the containerName when the container has a computed name?
                    containerName: container && container.name ? container.name.text : "",
                    containerKind: container && container.name ? ts.getNodeKind(container) : ""
                };
            }
        }
        NavigateTo.getNavigateToItems = getNavigateToItems;
    })(NavigateTo = ts.NavigateTo || (ts.NavigateTo = {}));
})(ts || (ts = {}));
//# sourceMappingURL=navigateTo.js.map