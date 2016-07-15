/* @internal */
var ts;
(function (ts) {
    // Note(cyrusn): this enum is ordered from strongest match type to weakest match type.
    (function (PatternMatchKind) {
        PatternMatchKind[PatternMatchKind["exact"] = 0] = "exact";
        PatternMatchKind[PatternMatchKind["prefix"] = 1] = "prefix";
        PatternMatchKind[PatternMatchKind["substring"] = 2] = "substring";
        PatternMatchKind[PatternMatchKind["camelCase"] = 3] = "camelCase";
    })(ts.PatternMatchKind || (ts.PatternMatchKind = {}));
    var PatternMatchKind = ts.PatternMatchKind;
    function createPatternMatch(kind, punctuationStripped, isCaseSensitive, camelCaseWeight) {
        return {
            kind: kind,
            punctuationStripped: punctuationStripped,
            isCaseSensitive: isCaseSensitive,
            camelCaseWeight: camelCaseWeight
        };
    }
    function createPatternMatcher(pattern) {
        // We'll often see the same candidate string many times when searching (For example, when
        // we see the name of a module that is used everywhere, or the name of an overload).  As 
        // such, we cache the information we compute about the candidate for the life of this 
        // pattern matcher so we don't have to compute it multiple times.
        var stringToWordSpans = {};
        pattern = pattern.trim();
        var fullPatternSegment = createSegment(pattern);
        var dotSeparatedSegments = pattern.split(".").map(function (p) { return createSegment(p.trim()); });
        var invalidPattern = dotSeparatedSegments.length === 0 || ts.forEach(dotSeparatedSegments, segmentIsInvalid);
        return {
            getMatches: getMatches,
            getMatchesForLastSegmentOfPattern: getMatchesForLastSegmentOfPattern,
            patternContainsDots: dotSeparatedSegments.length > 1
        };
        // Quick checks so we can bail out when asked to match a candidate.
        function skipMatch(candidate) {
            return invalidPattern || !candidate;
        }
        function getMatchesForLastSegmentOfPattern(candidate) {
            if (skipMatch(candidate)) {
                return undefined;
            }
            return matchSegment(candidate, ts.lastOrUndefined(dotSeparatedSegments));
        }
        function getMatches(candidateContainers, candidate) {
            if (skipMatch(candidate)) {
                return undefined;
            }
            // First, check that the last part of the dot separated pattern matches the name of the
            // candidate.  If not, then there's no point in proceeding and doing the more
            // expensive work.
            var candidateMatch = matchSegment(candidate, ts.lastOrUndefined(dotSeparatedSegments));
            if (!candidateMatch) {
                return undefined;
            }
            candidateContainers = candidateContainers || [];
            // -1 because the last part was checked against the name, and only the rest
            // of the parts are checked against the container.
            if (dotSeparatedSegments.length - 1 > candidateContainers.length) {
                // There weren't enough container parts to match against the pattern parts.
                // So this definitely doesn't match.
                return undefined;
            }
            // So far so good.  Now break up the container for the candidate and check if all
            // the dotted parts match up correctly.
            var totalMatch = candidateMatch;
            for (var i = dotSeparatedSegments.length - 2, j = candidateContainers.length - 1; i >= 0; i--, j--) {
                var segment = dotSeparatedSegments[i];
                var containerName = candidateContainers[j];
                var containerMatch = matchSegment(containerName, segment);
                if (!containerMatch) {
                    // This container didn't match the pattern piece.  So there's no match at all.
                    return undefined;
                }
                ts.addRange(totalMatch, containerMatch);
            }
            // Success, this symbol's full name matched against the dotted name the user was asking
            // about.
            return totalMatch;
        }
        function getWordSpans(word) {
            if (!ts.hasProperty(stringToWordSpans, word)) {
                stringToWordSpans[word] = breakIntoWordSpans(word);
            }
            return stringToWordSpans[word];
        }
        function matchTextChunk(candidate, chunk, punctuationStripped) {
            var index = indexOfIgnoringCase(candidate, chunk.textLowerCase);
            if (index === 0) {
                if (chunk.text.length === candidate.length) {
                    // a) Check if the part matches the candidate entirely, in an case insensitive or
                    //    sensitive manner.  If it does, return that there was an exact match.
                    return createPatternMatch(PatternMatchKind.exact, punctuationStripped, /*isCaseSensitive:*/ candidate === chunk.text);
                }
                else {
                    // b) Check if the part is a prefix of the candidate, in a case insensitive or sensitive
                    //    manner.  If it does, return that there was a prefix match.
                    return createPatternMatch(PatternMatchKind.prefix, punctuationStripped, /*isCaseSensitive:*/ startsWith(candidate, chunk.text));
                }
            }
            var isLowercase = chunk.isLowerCase;
            if (isLowercase) {
                if (index > 0) {
                    // c) If the part is entirely lowercase, then check if it is contained anywhere in the
                    //    candidate in a case insensitive manner.  If so, return that there was a substring
                    //    match. 
                    //
                    //    Note: We only have a substring match if the lowercase part is prefix match of some
                    //    word part. That way we don't match something like 'Class' when the user types 'a'.
                    //    But we would match 'FooAttribute' (since 'Attribute' starts with 'a').
                    var wordSpans = getWordSpans(candidate);
                    for (var _i = 0; _i < wordSpans.length; _i++) {
                        var span = wordSpans[_i];
                        if (partStartsWith(candidate, span, chunk.text, /*ignoreCase:*/ true)) {
                            return createPatternMatch(PatternMatchKind.substring, punctuationStripped, 
                            /*isCaseSensitive:*/ partStartsWith(candidate, span, chunk.text, /*ignoreCase:*/ false));
                        }
                    }
                }
            }
            else {
                // d) If the part was not entirely lowercase, then check if it is contained in the
                //    candidate in a case *sensitive* manner. If so, return that there was a substring
                //    match.
                if (candidate.indexOf(chunk.text) > 0) {
                    return createPatternMatch(PatternMatchKind.substring, punctuationStripped, /*isCaseSensitive:*/ true);
                }
            }
            if (!isLowercase) {
                // e) If the part was not entirely lowercase, then attempt a camel cased match as well.
                if (chunk.characterSpans.length > 0) {
                    var candidateParts = getWordSpans(candidate);
                    var camelCaseWeight = tryCamelCaseMatch(candidate, candidateParts, chunk, /*ignoreCase:*/ false);
                    if (camelCaseWeight !== undefined) {
                        return createPatternMatch(PatternMatchKind.camelCase, punctuationStripped, /*isCaseSensitive:*/ true, /*camelCaseWeight:*/ camelCaseWeight);
                    }
                    camelCaseWeight = tryCamelCaseMatch(candidate, candidateParts, chunk, /*ignoreCase:*/ true);
                    if (camelCaseWeight !== undefined) {
                        return createPatternMatch(PatternMatchKind.camelCase, punctuationStripped, /*isCaseSensitive:*/ false, /*camelCaseWeight:*/ camelCaseWeight);
                    }
                }
            }
            if (isLowercase) {
                // f) Is the pattern a substring of the candidate starting on one of the candidate's word boundaries?
                // We could check every character boundary start of the candidate for the pattern. However, that's
                // an m * n operation in the wost case. Instead, find the first instance of the pattern 
                // substring, and see if it starts on a capital letter. It seems unlikely that the user will try to 
                // filter the list based on a substring that starts on a capital letter and also with a lowercase one.
                // (Pattern: fogbar, Candidate: quuxfogbarFogBar).
                if (chunk.text.length < candidate.length) {
                    if (index > 0 && isUpperCaseLetter(candidate.charCodeAt(index))) {
                        return createPatternMatch(PatternMatchKind.substring, punctuationStripped, /*isCaseSensitive:*/ false);
                    }
                }
            }
            return undefined;
        }
        function containsSpaceOrAsterisk(text) {
            for (var i = 0; i < text.length; i++) {
                var ch = text.charCodeAt(i);
                if (ch === ts.CharacterCodes.space || ch === ts.CharacterCodes.asterisk) {
                    return true;
                }
            }
            return false;
        }
        function matchSegment(candidate, segment) {
            // First check if the segment matches as is.  This is also useful if the segment contains
            // characters we would normally strip when splitting into parts that we also may want to
            // match in the candidate.  For example if the segment is "@int" and the candidate is
            // "@int", then that will show up as an exact match here.
            //
            // Note: if the segment contains a space or an asterisk then we must assume that it's a
            // multi-word segment.
            if (!containsSpaceOrAsterisk(segment.totalTextChunk.text)) {
                var match = matchTextChunk(candidate, segment.totalTextChunk, /*punctuationStripped:*/ false);
                if (match) {
                    return [match];
                }
            }
            // The logic for pattern matching is now as follows:
            //
            // 1) Break the segment passed in into words.  Breaking is rather simple and a
            //    good way to think about it that if gives you all the individual alphanumeric words
            //    of the pattern.
            //
            // 2) For each word try to match the word against the candidate value.
            //
            // 3) Matching is as follows:
            //
            //   a) Check if the word matches the candidate entirely, in an case insensitive or
            //    sensitive manner.  If it does, return that there was an exact match.
            //
            //   b) Check if the word is a prefix of the candidate, in a case insensitive or
            //      sensitive manner.  If it does, return that there was a prefix match.
            //
            //   c) If the word is entirely lowercase, then check if it is contained anywhere in the
            //      candidate in a case insensitive manner.  If so, return that there was a substring
            //      match. 
            //
            //      Note: We only have a substring match if the lowercase part is prefix match of
            //      some word part. That way we don't match something like 'Class' when the user
            //      types 'a'. But we would match 'FooAttribute' (since 'Attribute' starts with
            //      'a').
            //
            //   d) If the word was not entirely lowercase, then check if it is contained in the
            //      candidate in a case *sensitive* manner. If so, return that there was a substring
            //      match.
            //
            //   e) If the word was not entirely lowercase, then attempt a camel cased match as
            //      well.
            //
            //   f) The word is all lower case. Is it a case insensitive substring of the candidate starting 
            //      on a part boundary of the candidate?
            //
            // Only if all words have some sort of match is the pattern considered matched.
            var subWordTextChunks = segment.subWordTextChunks;
            var matches = undefined;
            for (var _i = 0; _i < subWordTextChunks.length; _i++) {
                var subWordTextChunk = subWordTextChunks[_i];
                // Try to match the candidate with this word
                var result = matchTextChunk(candidate, subWordTextChunk, /*punctuationStripped:*/ true);
                if (!result) {
                    return undefined;
                }
                matches = matches || [];
                matches.push(result);
            }
            return matches;
        }
        function partStartsWith(candidate, candidateSpan, pattern, ignoreCase, patternSpan) {
            var patternPartStart = patternSpan ? patternSpan.start : 0;
            var patternPartLength = patternSpan ? patternSpan.length : pattern.length;
            if (patternPartLength > candidateSpan.length) {
                // Pattern part is longer than the candidate part. There can never be a match.
                return false;
            }
            if (ignoreCase) {
                for (var i = 0; i < patternPartLength; i++) {
                    var ch1 = pattern.charCodeAt(patternPartStart + i);
                    var ch2 = candidate.charCodeAt(candidateSpan.start + i);
                    if (toLowerCase(ch1) !== toLowerCase(ch2)) {
                        return false;
                    }
                }
            }
            else {
                for (var i = 0; i < patternPartLength; i++) {
                    var ch1 = pattern.charCodeAt(patternPartStart + i);
                    var ch2 = candidate.charCodeAt(candidateSpan.start + i);
                    if (ch1 !== ch2) {
                        return false;
                    }
                }
            }
            return true;
        }
        function tryCamelCaseMatch(candidate, candidateParts, chunk, ignoreCase) {
            var chunkCharacterSpans = chunk.characterSpans;
            // Note: we may have more pattern parts than candidate parts.  This is because multiple
            // pattern parts may match a candidate part.  For example "SiUI" against "SimpleUI".
            // We'll have 3 pattern parts Si/U/I against two candidate parts Simple/UI.  However, U
            // and I will both match in UI. 
            var currentCandidate = 0;
            var currentChunkSpan = 0;
            var firstMatch = undefined;
            var contiguous = undefined;
            while (true) {
                // Let's consider our termination cases
                if (currentChunkSpan === chunkCharacterSpans.length) {
                    // We did match! We shall assign a weight to this
                    var weight = 0;
                    // Was this contiguous?
                    if (contiguous) {
                        weight += 1;
                    }
                    // Did we start at the beginning of the candidate?
                    if (firstMatch === 0) {
                        weight += 2;
                    }
                    return weight;
                }
                else if (currentCandidate === candidateParts.length) {
                    // No match, since we still have more of the pattern to hit
                    return undefined;
                }
                var candidatePart = candidateParts[currentCandidate];
                var gotOneMatchThisCandidate = false;
                // Consider the case of matching SiUI against SimpleUIElement. The candidate parts
                // will be Simple/UI/Element, and the pattern parts will be Si/U/I.  We'll match 'Si'
                // against 'Simple' first.  Then we'll match 'U' against 'UI'. However, we want to
                // still keep matching pattern parts against that candidate part. 
                for (; currentChunkSpan < chunkCharacterSpans.length; currentChunkSpan++) {
                    var chunkCharacterSpan = chunkCharacterSpans[currentChunkSpan];
                    if (gotOneMatchThisCandidate) {
                        // We've already gotten one pattern part match in this candidate.  We will
                        // only continue trying to consumer pattern parts if the last part and this
                        // part are both upper case.  
                        if (!isUpperCaseLetter(chunk.text.charCodeAt(chunkCharacterSpans[currentChunkSpan - 1].start)) ||
                            !isUpperCaseLetter(chunk.text.charCodeAt(chunkCharacterSpans[currentChunkSpan].start))) {
                            break;
                        }
                    }
                    if (!partStartsWith(candidate, candidatePart, chunk.text, ignoreCase, chunkCharacterSpan)) {
                        break;
                    }
                    gotOneMatchThisCandidate = true;
                    firstMatch = firstMatch === undefined ? currentCandidate : firstMatch;
                    // If we were contiguous, then keep that value.  If we weren't, then keep that
                    // value.  If we don't know, then set the value to 'true' as an initial match is
                    // obviously contiguous.
                    contiguous = contiguous === undefined ? true : contiguous;
                    candidatePart = ts.createTextSpan(candidatePart.start + chunkCharacterSpan.length, candidatePart.length - chunkCharacterSpan.length);
                }
                // Check if we matched anything at all.  If we didn't, then we need to unset the
                // contiguous bit if we currently had it set.
                // If we haven't set the bit yet, then that means we haven't matched anything so
                // far, and we don't want to change that.
                if (!gotOneMatchThisCandidate && contiguous !== undefined) {
                    contiguous = false;
                }
                // Move onto the next candidate.
                currentCandidate++;
            }
        }
    }
    ts.createPatternMatcher = createPatternMatcher;
    // Helper function to compare two matches to determine which is better.  Matches are first
    // ordered by kind (so all prefix matches always beat all substring matches).  Then, if the
    // match is a camel case match, the relative weights of the match are used to determine 
    // which is better (with a greater weight being better).  Then if the match is of the same 
    // type, then a case sensitive match is considered better than an insensitive one. 
    function patternMatchCompareTo(match1, match2) {
        return compareType(match1, match2) ||
            compareCamelCase(match1, match2) ||
            compareCase(match1, match2) ||
            comparePunctuation(match1, match2);
    }
    function comparePunctuation(result1, result2) {
        // Consider a match to be better if it was successful without stripping punctuation
        // versus a match that had to strip punctuation to succeed.
        if (result1.punctuationStripped !== result2.punctuationStripped) {
            return result1.punctuationStripped ? 1 : -1;
        }
        return 0;
    }
    function compareCase(result1, result2) {
        if (result1.isCaseSensitive !== result2.isCaseSensitive) {
            return result1.isCaseSensitive ? -1 : 1;
        }
        return 0;
    }
    function compareType(result1, result2) {
        return result1.kind - result2.kind;
    }
    function compareCamelCase(result1, result2) {
        if (result1.kind === PatternMatchKind.camelCase && result2.kind === PatternMatchKind.camelCase) {
            // Swap the values here.  If result1 has a higher weight, then we want it to come
            // first.
            return result2.camelCaseWeight - result1.camelCaseWeight;
        }
        return 0;
    }
    function createSegment(text) {
        return {
            totalTextChunk: createTextChunk(text),
            subWordTextChunks: breakPatternIntoTextChunks(text)
        };
    }
    // A segment is considered invalid if we couldn't find any words in it.
    function segmentIsInvalid(segment) {
        return segment.subWordTextChunks.length === 0;
    }
    function isUpperCaseLetter(ch) {
        // Fast check for the ascii range.
        if (ch >= ts.CharacterCodes.A && ch <= ts.CharacterCodes.Z) {
            return true;
        }
        if (ch < ts.CharacterCodes.maxAsciiCharacter || !ts.isUnicodeIdentifierStart(ch, ts.ScriptTarget.Latest)) {
            return false;
        }
        // TODO: find a way to determine this for any unicode characters in a 
        // non-allocating manner.
        var str = String.fromCharCode(ch);
        return str === str.toUpperCase();
    }
    function isLowerCaseLetter(ch) {
        // Fast check for the ascii range.
        if (ch >= ts.CharacterCodes.a && ch <= ts.CharacterCodes.z) {
            return true;
        }
        if (ch < ts.CharacterCodes.maxAsciiCharacter || !ts.isUnicodeIdentifierStart(ch, ts.ScriptTarget.Latest)) {
            return false;
        }
        // TODO: find a way to determine this for any unicode characters in a 
        // non-allocating manner.
        var str = String.fromCharCode(ch);
        return str === str.toLowerCase();
    }
    function containsUpperCaseLetter(string) {
        for (var i = 0, n = string.length; i < n; i++) {
            if (isUpperCaseLetter(string.charCodeAt(i))) {
                return true;
            }
        }
        return false;
    }
    function startsWith(string, search) {
        for (var i = 0, n = search.length; i < n; i++) {
            if (string.charCodeAt(i) !== search.charCodeAt(i)) {
                return false;
            }
        }
        return true;
    }
    // Assumes 'value' is already lowercase.
    function indexOfIgnoringCase(string, value) {
        for (var i = 0, n = string.length - value.length; i <= n; i++) {
            if (startsWithIgnoringCase(string, value, i)) {
                return i;
            }
        }
        return -1;
    }
    // Assumes 'value' is already lowercase.
    function startsWithIgnoringCase(string, value, start) {
        for (var i = 0, n = value.length; i < n; i++) {
            var ch1 = toLowerCase(string.charCodeAt(i + start));
            var ch2 = value.charCodeAt(i);
            if (ch1 !== ch2) {
                return false;
            }
        }
        return true;
    }
    function toLowerCase(ch) {
        // Fast convert for the ascii range.
        if (ch >= ts.CharacterCodes.A && ch <= ts.CharacterCodes.Z) {
            return ts.CharacterCodes.a + (ch - ts.CharacterCodes.A);
        }
        if (ch < ts.CharacterCodes.maxAsciiCharacter) {
            return ch;
        }
        // TODO: find a way to compute this for any unicode characters in a 
        // non-allocating manner.
        return String.fromCharCode(ch).toLowerCase().charCodeAt(0);
    }
    function isDigit(ch) {
        // TODO(cyrusn): Find a way to support this for unicode digits.
        return ch >= ts.CharacterCodes._0 && ch <= ts.CharacterCodes._9;
    }
    function isWordChar(ch) {
        return isUpperCaseLetter(ch) || isLowerCaseLetter(ch) || isDigit(ch) || ch === ts.CharacterCodes._ || ch === ts.CharacterCodes.$;
    }
    function breakPatternIntoTextChunks(pattern) {
        var result = [];
        var wordStart = 0;
        var wordLength = 0;
        for (var i = 0; i < pattern.length; i++) {
            var ch = pattern.charCodeAt(i);
            if (isWordChar(ch)) {
                if (wordLength++ === 0) {
                    wordStart = i;
                }
            }
            else {
                if (wordLength > 0) {
                    result.push(createTextChunk(pattern.substr(wordStart, wordLength)));
                    wordLength = 0;
                }
            }
        }
        if (wordLength > 0) {
            result.push(createTextChunk(pattern.substr(wordStart, wordLength)));
        }
        return result;
    }
    function createTextChunk(text) {
        var textLowerCase = text.toLowerCase();
        return {
            text: text,
            textLowerCase: textLowerCase,
            isLowerCase: text === textLowerCase,
            characterSpans: breakIntoCharacterSpans(text)
        };
    }
    /* @internal */ function breakIntoCharacterSpans(identifier) {
        return breakIntoSpans(identifier, /*word:*/ false);
    }
    ts.breakIntoCharacterSpans = breakIntoCharacterSpans;
    /* @internal */ function breakIntoWordSpans(identifier) {
        return breakIntoSpans(identifier, /*word:*/ true);
    }
    ts.breakIntoWordSpans = breakIntoWordSpans;
    function breakIntoSpans(identifier, word) {
        var result = [];
        var wordStart = 0;
        for (var i = 1, n = identifier.length; i < n; i++) {
            var lastIsDigit = isDigit(identifier.charCodeAt(i - 1));
            var currentIsDigit = isDigit(identifier.charCodeAt(i));
            var hasTransitionFromLowerToUpper = transitionFromLowerToUpper(identifier, word, i);
            var hasTransitionFromUpperToLower = transitionFromUpperToLower(identifier, word, i, wordStart);
            if (charIsPunctuation(identifier.charCodeAt(i - 1)) ||
                charIsPunctuation(identifier.charCodeAt(i)) ||
                lastIsDigit !== currentIsDigit ||
                hasTransitionFromLowerToUpper ||
                hasTransitionFromUpperToLower) {
                if (!isAllPunctuation(identifier, wordStart, i)) {
                    result.push(ts.createTextSpan(wordStart, i - wordStart));
                }
                wordStart = i;
            }
        }
        if (!isAllPunctuation(identifier, wordStart, identifier.length)) {
            result.push(ts.createTextSpan(wordStart, identifier.length - wordStart));
        }
        return result;
    }
    function charIsPunctuation(ch) {
        switch (ch) {
            case ts.CharacterCodes.exclamation:
            case ts.CharacterCodes.doubleQuote:
            case ts.CharacterCodes.hash:
            case ts.CharacterCodes.percent:
            case ts.CharacterCodes.ampersand:
            case ts.CharacterCodes.singleQuote:
            case ts.CharacterCodes.openParen:
            case ts.CharacterCodes.closeParen:
            case ts.CharacterCodes.asterisk:
            case ts.CharacterCodes.comma:
            case ts.CharacterCodes.minus:
            case ts.CharacterCodes.dot:
            case ts.CharacterCodes.slash:
            case ts.CharacterCodes.colon:
            case ts.CharacterCodes.semicolon:
            case ts.CharacterCodes.question:
            case ts.CharacterCodes.at:
            case ts.CharacterCodes.openBracket:
            case ts.CharacterCodes.backslash:
            case ts.CharacterCodes.closeBracket:
            case ts.CharacterCodes._:
            case ts.CharacterCodes.openBrace:
            case ts.CharacterCodes.closeBrace:
                return true;
        }
        return false;
    }
    function isAllPunctuation(identifier, start, end) {
        for (var i = start; i < end; i++) {
            var ch = identifier.charCodeAt(i);
            // We don't consider _ or $ as punctuation as there may be things with that name.
            if (!charIsPunctuation(ch) || ch === ts.CharacterCodes._ || ch === ts.CharacterCodes.$) {
                return false;
            }
        }
        return true;
    }
    function transitionFromUpperToLower(identifier, word, index, wordStart) {
        if (word) {
            // Cases this supports:
            // 1) IDisposable -> I, Disposable
            // 2) UIElement -> UI, Element
            // 3) HTMLDocument -> HTML, Document
            //
            // etc.
            if (index !== wordStart &&
                index + 1 < identifier.length) {
                var currentIsUpper = isUpperCaseLetter(identifier.charCodeAt(index));
                var nextIsLower = isLowerCaseLetter(identifier.charCodeAt(index + 1));
                if (currentIsUpper && nextIsLower) {
                    // We have a transition from an upper to a lower letter here.  But we only
                    // want to break if all the letters that preceded are uppercase.  i.e. if we
                    // have "Foo" we don't want to break that into "F, oo".  But if we have
                    // "IFoo" or "UIFoo", then we want to break that into "I, Foo" and "UI,
                    // Foo".  i.e. the last uppercase letter belongs to the lowercase letters
                    // that follows.  Note: this will make the following not split properly:
                    // "HELLOthere".  However, these sorts of names do not show up in .Net
                    // programs.
                    for (var i = wordStart; i < index; i++) {
                        if (!isUpperCaseLetter(identifier.charCodeAt(i))) {
                            return false;
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }
    function transitionFromLowerToUpper(identifier, word, index) {
        var lastIsUpper = isUpperCaseLetter(identifier.charCodeAt(index - 1));
        var currentIsUpper = isUpperCaseLetter(identifier.charCodeAt(index));
        // See if the casing indicates we're starting a new word. Note: if we're breaking on
        // words, then just seeing an upper case character isn't enough.  Instead, it has to
        // be uppercase and the previous character can't be uppercase. 
        //
        // For example, breaking "AddMetadata" on words would make: Add Metadata
        //
        // on characters would be: A dd M etadata
        //
        // Break "AM" on words would be: AM
        //
        // on characters would be: A M
        //
        // We break the search string on characters.  But we break the symbol name on words.
        var transition = word
            ? (currentIsUpper && !lastIsUpper)
            : currentIsUpper;
        return transition;
    }
})(ts || (ts = {}));
//# sourceMappingURL=patternMatcher.js.map