/// <reference path="sys.ts" />
/// <reference path="parser.ts" />
/// <reference path="emitter.ts" />
/// <reference path="core.ts" />
var ts;
(function (ts) {
    /* @internal */ ts.programTime = 0;
    /* @internal */ ts.emitTime = 0;
    /* @internal */ ts.ioReadTime = 0;
    /* @internal */ ts.ioWriteTime = 0;
    /** The version of the TypeScript compiler release */
    var emptyArray = [];
    ts.version = "1.7.0";
    function findConfigFile(searchPath) {
        var fileName = "tsconfig.json";
        while (true) {
            if (ts.sys.fileExists(fileName)) {
                return fileName;
            }
            var parentPath = ts.getDirectoryPath(searchPath);
            if (parentPath === searchPath) {
                break;
            }
            searchPath = parentPath;
            fileName = "../" + fileName;
        }
        return undefined;
    }
    ts.findConfigFile = findConfigFile;
    function resolveTripleslashReference(moduleName, containingFile) {
        var basePath = ts.getDirectoryPath(containingFile);
        var referencedFileName = ts.isRootedDiskPath(moduleName) ? moduleName : ts.combinePaths(basePath, moduleName);
        return ts.normalizePath(referencedFileName);
    }
    ts.resolveTripleslashReference = resolveTripleslashReference;
    function resolveModuleName(moduleName, containingFile, compilerOptions, host) {
        var moduleResolution = compilerOptions.moduleResolution !== undefined
            ? compilerOptions.moduleResolution
            : compilerOptions.module === ts.ModuleKind.CommonJS ? ts.ModuleResolutionKind.NodeJs : ts.ModuleResolutionKind.Classic;
        switch (moduleResolution) {
            case ts.ModuleResolutionKind.NodeJs: return nodeModuleNameResolver(moduleName, containingFile, host);
            case ts.ModuleResolutionKind.Classic: return classicNameResolver(moduleName, containingFile, compilerOptions, host);
        }
    }
    ts.resolveModuleName = resolveModuleName;
    function nodeModuleNameResolver(moduleName, containingFile, host) {
        var containingDirectory = ts.getDirectoryPath(containingFile);
        if (ts.getRootLength(moduleName) !== 0 || nameStartsWithDotSlashOrDotDotSlash(moduleName)) {
            var failedLookupLocations = [];
            var candidate = ts.normalizePath(ts.combinePaths(containingDirectory, moduleName));
            var resolvedFileName = loadNodeModuleFromFile(candidate, /* loadOnlyDts */ false, failedLookupLocations, host);
            if (resolvedFileName) {
                return { resolvedModule: { resolvedFileName: resolvedFileName }, failedLookupLocations: failedLookupLocations };
            }
            resolvedFileName = loadNodeModuleFromDirectory(candidate, /* loadOnlyDts */ false, failedLookupLocations, host);
            return resolvedFileName
                ? { resolvedModule: { resolvedFileName: resolvedFileName }, failedLookupLocations: failedLookupLocations }
                : { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
        }
        else {
            return loadModuleFromNodeModules(moduleName, containingDirectory, host);
        }
    }
    ts.nodeModuleNameResolver = nodeModuleNameResolver;
    function loadNodeModuleFromFile(candidate, loadOnlyDts, failedLookupLocation, host) {
        if (loadOnlyDts) {
            return tryLoad(".d.ts");
        }
        else {
            return ts.forEach(ts.supportedExtensions, tryLoad);
        }
        function tryLoad(ext) {
            var fileName = ts.fileExtensionIs(candidate, ext) ? candidate : candidate + ext;
            if (host.fileExists(fileName)) {
                return fileName;
            }
            else {
                failedLookupLocation.push(fileName);
                return undefined;
            }
        }
    }
    function loadNodeModuleFromDirectory(candidate, loadOnlyDts, failedLookupLocation, host) {
        var packageJsonPath = ts.combinePaths(candidate, "package.json");
        if (host.fileExists(packageJsonPath)) {
            var jsonContent;
            try {
                var jsonText = host.readFile(packageJsonPath);
                jsonContent = jsonText ? JSON.parse(jsonText) : { typings: undefined };
            }
            catch (e) {
                // gracefully handle if readFile fails or returns not JSON 
                jsonContent = { typings: undefined };
            }
            if (jsonContent.typings) {
                var result = loadNodeModuleFromFile(ts.normalizePath(ts.combinePaths(candidate, jsonContent.typings)), loadOnlyDts, failedLookupLocation, host);
                if (result) {
                    return result;
                }
            }
        }
        else {
            // record package json as one of failed lookup locations - in the future if this file will appear it will invalidate resolution results
            failedLookupLocation.push(packageJsonPath);
        }
        return loadNodeModuleFromFile(ts.combinePaths(candidate, "index"), loadOnlyDts, failedLookupLocation, host);
    }
    function loadModuleFromNodeModules(moduleName, directory, host) {
        var failedLookupLocations = [];
        directory = ts.normalizeSlashes(directory);
        while (true) {
            var baseName = ts.getBaseFileName(directory);
            if (baseName !== "node_modules") {
                var nodeModulesFolder = ts.combinePaths(directory, "node_modules");
                var candidate = ts.normalizePath(ts.combinePaths(nodeModulesFolder, moduleName));
                var result = loadNodeModuleFromFile(candidate, /* loadOnlyDts */ true, failedLookupLocations, host);
                if (result) {
                    return { resolvedModule: { resolvedFileName: result, isExternalLibraryImport: true }, failedLookupLocations: failedLookupLocations };
                }
                result = loadNodeModuleFromDirectory(candidate, /* loadOnlyDts */ true, failedLookupLocations, host);
                if (result) {
                    return { resolvedModule: { resolvedFileName: result, isExternalLibraryImport: true }, failedLookupLocations: failedLookupLocations };
                }
            }
            var parentPath = ts.getDirectoryPath(directory);
            if (parentPath === directory) {
                break;
            }
            directory = parentPath;
        }
        return { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
    }
    function nameStartsWithDotSlashOrDotDotSlash(name) {
        var i = name.lastIndexOf("./", 1);
        return i === 0 || (i === 1 && name.charCodeAt(0) === ts.CharacterCodes.dot);
    }
    function classicNameResolver(moduleName, containingFile, compilerOptions, host) {
        // module names that contain '!' are used to reference resources and are not resolved to actual files on disk
        if (moduleName.indexOf('!') != -1) {
            return { resolvedModule: undefined, failedLookupLocations: [] };
        }
        var searchPath = ts.getDirectoryPath(containingFile);
        var searchName;
        var failedLookupLocations = [];
        var referencedSourceFile;
        while (true) {
            searchName = ts.normalizePath(ts.combinePaths(searchPath, moduleName));
            referencedSourceFile = ts.forEach(ts.supportedExtensions, function (extension) {
                if (extension === ".tsx" && !compilerOptions.jsx) {
                    // resolve .tsx files only if jsx support is enabled 
                    // 'logical not' handles both undefined and None cases
                    return undefined;
                }
                var candidate = searchName + extension;
                if (host.fileExists(candidate)) {
                    return candidate;
                }
                else {
                    failedLookupLocations.push(candidate);
                }
            });
            if (referencedSourceFile) {
                break;
            }
            var parentPath = ts.getDirectoryPath(searchPath);
            if (parentPath === searchPath) {
                break;
            }
            searchPath = parentPath;
        }
        return referencedSourceFile
            ? { resolvedModule: { resolvedFileName: referencedSourceFile }, failedLookupLocations: failedLookupLocations }
            : { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
    }
    ts.classicNameResolver = classicNameResolver;
    /* @internal */
    ts.defaultInitCompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES3,
        noImplicitAny: false,
        outDir: "built",
        rootDir: ".",
        sourceMap: false
    };
    function createCompilerHost(options, setParentNodes) {
        var currentDirectory;
        var existingDirectories = {};
        function getCanonicalFileName(fileName) {
            // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
            // otherwise use toLowerCase as a canonical form.
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        // returned by CScript sys environment
        var unsupportedFileEncodingErrorCode = -2147024809;
        function getSourceFile(fileName, languageVersion, onError) {
            var text;
            try {
                var start = new Date().getTime();
                text = ts.sys.readFile(fileName, options.charset);
                ts.ioReadTime += new Date().getTime() - start;
            }
            catch (e) {
                if (onError) {
                    onError(e.number === unsupportedFileEncodingErrorCode
                        ? ts.createCompilerDiagnostic(ts.Diagnostics.Unsupported_file_encoding).messageText
                        : e.message);
                }
                text = "";
            }
            return text !== undefined ? ts.createSourceFile(fileName, text, languageVersion, options /* [ConcreteTypeScript] */, setParentNodes) : undefined;
        }
        function directoryExists(directoryPath) {
            if (ts.hasProperty(existingDirectories, directoryPath)) {
                return true;
            }
            if (ts.sys.directoryExists(directoryPath)) {
                existingDirectories[directoryPath] = true;
                return true;
            }
            return false;
        }
        function ensureDirectoriesExist(directoryPath) {
            if (directoryPath.length > ts.getRootLength(directoryPath) && !directoryExists(directoryPath)) {
                var parentDirectory = ts.getDirectoryPath(directoryPath);
                ensureDirectoriesExist(parentDirectory);
                ts.sys.createDirectory(directoryPath);
            }
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            try {
                var start = new Date().getTime();
                ensureDirectoriesExist(ts.getDirectoryPath(ts.normalizePath(fileName)));
                ts.sys.writeFile(fileName, data, writeByteOrderMark);
                ts.ioWriteTime += new Date().getTime() - start;
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }
        var newLine = ts.getNewLineCharacter(options);
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function (options) { return ts.combinePaths(ts.getDirectoryPath(ts.normalizePath(ts.sys.getExecutingFilePath())), ts.getDefaultLibFileName(options)); },
            writeFile: writeFile,
            getCurrentDirectory: function () { return currentDirectory || (currentDirectory = ts.sys.getCurrentDirectory()); },
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return newLine; },
            fileExists: function (fileName) { return ts.sys.fileExists(fileName); },
            readFile: function (fileName) { return ts.sys.readFile(fileName); }
        };
    }
    ts.createCompilerHost = createCompilerHost;
    function getPreEmitDiagnostics(program, sourceFile, cancellationToken) {
        var diagnostics = program.getOptionsDiagnostics(cancellationToken).concat(program.getSyntacticDiagnostics(sourceFile, cancellationToken), program.getGlobalDiagnostics(cancellationToken), program.getSemanticDiagnostics(sourceFile, cancellationToken));
        if (program.getCompilerOptions().declaration) {
            diagnostics.concat(program.getDeclarationDiagnostics(sourceFile, cancellationToken));
        }
        return ts.sortAndDeduplicateDiagnostics(diagnostics);
    }
    ts.getPreEmitDiagnostics = getPreEmitDiagnostics;
    function flattenDiagnosticMessageText(messageText, newLine) {
        if (typeof messageText === "string") {
            return messageText;
        }
        else {
            var diagnosticChain = messageText;
            var result = "";
            var indent = 0;
            while (diagnosticChain) {
                if (indent) {
                    result += newLine;
                    for (var i = 0; i < indent; i++) {
                        result += "  ";
                    }
                }
                result += diagnosticChain.messageText;
                indent++;
                diagnosticChain = diagnosticChain.next;
            }
            return result;
        }
    }
    ts.flattenDiagnosticMessageText = flattenDiagnosticMessageText;
    function createProgram(rootNames, options, host, oldProgram) {
        var program;
        var files = [];
        ts.Parser.concreteTypeScriptHackSetCompilerOptions(options);
        var fileProcessingDiagnostics = ts.createDiagnosticCollection();
        var programDiagnostics = ts.createDiagnosticCollection();
        var commonSourceDirectory;
        var diagnosticsProducingTypeChecker;
        var noDiagnosticsTypeChecker;
        var classifiableNames;
        var skipDefaultLib = options.noLib;
        var start = new Date().getTime();
        host = host || createCompilerHost(options);
        var resolveModuleNamesWorker = host.resolveModuleNames
            ? (function (moduleNames, containingFile) { return host.resolveModuleNames(moduleNames, containingFile); })
            : (function (moduleNames, containingFile) { return ts.map(moduleNames, function (moduleName) { return resolveModuleName(moduleName, containingFile, options, host).resolvedModule; }); });
        var filesByName = ts.createFileMap(function (fileName) { return host.getCanonicalFileName(fileName); });
        if (oldProgram) {
            // check properties that can affect structure of the program or module resolution strategy
            // if any of these properties has changed - structure cannot be reused
            var oldOptions = oldProgram.getCompilerOptions();
            if ((oldOptions.module !== options.module) ||
                (oldOptions.noResolve !== options.noResolve) ||
                (oldOptions.target !== options.target) ||
                (oldOptions.noLib !== options.noLib) ||
                (oldOptions.jsx !== options.jsx)) {
                oldProgram = undefined;
            }
        }
        if (!tryReuseStructureFromOldProgram()) {
            ts.forEach(rootNames, function (name) { return processRootFile(name, false); });
            // Do not process the default library if:
            //  - The '--noLib' flag is used.
            //  - A 'no-default-lib' reference comment is encountered in
            //      processing the root files.
            if (!skipDefaultLib) {
                processRootFile(host.getDefaultLibFileName(options), true);
            }
        }
        verifyCompilerOptions();
        // unconditionally set oldProgram to undefined to prevent it from being captured in closure
        oldProgram = undefined;
        ts.programTime += new Date().getTime() - start;
        program = {
            getRootFileNames: function () { return rootNames; },
            getSourceFile: getSourceFile,
            getSourceFiles: function () { return files; },
            getCompilerOptions: function () { return options; },
            getSyntacticDiagnostics: getSyntacticDiagnostics,
            getOptionsDiagnostics: getOptionsDiagnostics,
            getGlobalDiagnostics: getGlobalDiagnostics,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getDeclarationDiagnostics: getDeclarationDiagnostics,
            getTypeChecker: getTypeChecker,
            getClassifiableNames: getClassifiableNames,
            getDiagnosticsProducingTypeChecker: getDiagnosticsProducingTypeChecker,
            getCommonSourceDirectory: function () { return commonSourceDirectory; },
            emit: emit,
            getCurrentDirectory: function () { return host.getCurrentDirectory(); },
            getNodeCount: function () { return getDiagnosticsProducingTypeChecker().getNodeCount(); },
            getIdentifierCount: function () { return getDiagnosticsProducingTypeChecker().getIdentifierCount(); },
            getSymbolCount: function () { return getDiagnosticsProducingTypeChecker().getSymbolCount(); },
            getTypeCount: function () { return getDiagnosticsProducingTypeChecker().getTypeCount(); },
            getFileProcessingDiagnostics: function () { return fileProcessingDiagnostics; }
        };
        return program;
        function getClassifiableNames() {
            if (!classifiableNames) {
                // Initialize a checker so that all our files are bound.
                getTypeChecker();
                classifiableNames = {};
                for (var _i = 0; _i < files.length; _i++) {
                    var sourceFile = files[_i];
                    ts.copyMap(sourceFile.classifiableNames, classifiableNames);
                }
            }
            return classifiableNames;
        }
        function tryReuseStructureFromOldProgram() {
            if (!oldProgram) {
                return false;
            }
            ts.Debug.assert(!oldProgram.structureIsReused);
            // there is an old program, check if we can reuse its structure
            var oldRootNames = oldProgram.getRootFileNames();
            if (!ts.arrayIsEqualTo(oldRootNames, rootNames)) {
                return false;
            }
            // check if program source files has changed in the way that can affect structure of the program
            var newSourceFiles = [];
            var modifiedSourceFiles = [];
            for (var _i = 0, _a = oldProgram.getSourceFiles(); _i < _a.length; _i++) {
                var oldSourceFile = _a[_i];
                var newSourceFile = host.getSourceFile(oldSourceFile.fileName, options.target);
                if (!newSourceFile) {
                    return false;
                }
                if (oldSourceFile !== newSourceFile) {
                    if (oldSourceFile.hasNoDefaultLib !== newSourceFile.hasNoDefaultLib) {
                        // value of no-default-lib has changed
                        // this will affect if default library is injected into the list of files
                        return false;
                    }
                    // check tripleslash references
                    if (!ts.arrayIsEqualTo(oldSourceFile.referencedFiles, newSourceFile.referencedFiles, fileReferenceIsEqualTo)) {
                        // tripleslash references has changed
                        return false;
                    }
                    // check imports
                    collectExternalModuleReferences(newSourceFile);
                    if (!ts.arrayIsEqualTo(oldSourceFile.imports, newSourceFile.imports, moduleNameIsEqualTo)) {
                        // imports has changed
                        return false;
                    }
                    if (resolveModuleNamesWorker) {
                        var moduleNames = ts.map(newSourceFile.imports, function (name) { return name.text; });
                        var resolutions = resolveModuleNamesWorker(moduleNames, newSourceFile.fileName);
                        // ensure that module resolution results are still correct
                        for (var i = 0; i < moduleNames.length; ++i) {
                            var newResolution = resolutions[i];
                            var oldResolution = ts.getResolvedModule(oldSourceFile, moduleNames[i]);
                            var resolutionChanged = oldResolution
                                ? !newResolution ||
                                    oldResolution.resolvedFileName !== newResolution.resolvedFileName ||
                                    !!oldResolution.isExternalLibraryImport !== !!newResolution.isExternalLibraryImport
                                : newResolution;
                            if (resolutionChanged) {
                                return false;
                            }
                        }
                    }
                    // pass the cache of module resolutions from the old source file
                    newSourceFile.resolvedModules = oldSourceFile.resolvedModules;
                    modifiedSourceFiles.push(newSourceFile);
                }
                else {
                    // file has no changes - use it as is
                    newSourceFile = oldSourceFile;
                }
                // if file has passed all checks it should be safe to reuse it
                newSourceFiles.push(newSourceFile);
            }
            // update fileName -> file mapping
            for (var _b = 0; _b < newSourceFiles.length; _b++) {
                var file = newSourceFiles[_b];
                filesByName.set(file.fileName, file);
            }
            files = newSourceFiles;
            fileProcessingDiagnostics = oldProgram.getFileProcessingDiagnostics();
            for (var _c = 0; _c < modifiedSourceFiles.length; _c++) {
                var modifiedFile = modifiedSourceFiles[_c];
                fileProcessingDiagnostics.reattachFileDiagnostics(modifiedFile);
            }
            oldProgram.structureIsReused = true;
            return true;
        }
        function getEmitHost(writeFileCallback) {
            return {
                getCanonicalFileName: function (fileName) { return host.getCanonicalFileName(fileName); },
                getCommonSourceDirectory: program.getCommonSourceDirectory,
                getCompilerOptions: program.getCompilerOptions,
                getCurrentDirectory: function () { return host.getCurrentDirectory(); },
                getNewLine: function () { return host.getNewLine(); },
                getSourceFile: program.getSourceFile,
                getSourceFiles: program.getSourceFiles,
                writeFile: writeFileCallback || (function (fileName, data, writeByteOrderMark, onError) { return host.writeFile(fileName, data, writeByteOrderMark, onError); })
            };
        }
        function getDiagnosticsProducingTypeChecker() {
            return diagnosticsProducingTypeChecker || (diagnosticsProducingTypeChecker = ts.createTypeChecker(program, /*produceDiagnostics:*/ true));
        }
        function getTypeChecker() {
            return noDiagnosticsTypeChecker || (noDiagnosticsTypeChecker = ts.createTypeChecker(program, /*produceDiagnostics:*/ false));
        }
        function emit(sourceFile, writeFileCallback, cancellationToken) {
            var _this = this;
            return runWithCancellationToken(function () { return emitWorker(_this, sourceFile, writeFileCallback, cancellationToken); });
        }
        function emitWorker(program, sourceFile, writeFileCallback, cancellationToken) {
            // If the noEmitOnError flag is set, then check if we have any errors so far.  If so,
            // immediately bail out.  Note that we pass 'undefined' for 'sourceFile' so that we
            // get any preEmit diagnostics, not just the ones
            if (options.noEmitOnError && getPreEmitDiagnostics(program, /*sourceFile:*/ undefined, cancellationToken).length > 0) {
                return { diagnostics: [], sourceMaps: undefined, emitSkipped: true };
            }
            // Create the emit resolver outside of the "emitTime" tracking code below.  That way
            // any cost associated with it (like type checking) are appropriate associated with
            // the type-checking counter.
            //
            // If the -out option is specified, we should not pass the source file to getEmitResolver.
            // This is because in the -out scenario all files need to be emitted, and therefore all
            // files need to be type checked. And the way to specify that all files need to be type
            // checked is to not pass the file to getEmitResolver.
            var emitResolver = getDiagnosticsProducingTypeChecker().getEmitResolver((options.outFile || options.out) ? undefined : sourceFile);
            var start = new Date().getTime();
            var emitResult = ts.emitFiles(emitResolver, getEmitHost(writeFileCallback), sourceFile);
            ts.emitTime += new Date().getTime() - start;
            return emitResult;
        }
        function getSourceFile(fileName) {
            return filesByName.get(fileName);
        }
        function getDiagnosticsHelper(sourceFile, getDiagnostics, cancellationToken) {
            if (sourceFile) {
                return getDiagnostics(sourceFile, cancellationToken);
            }
            var allDiagnostics = [];
            ts.forEach(program.getSourceFiles(), function (sourceFile) {
                if (cancellationToken) {
                    cancellationToken.throwIfCancellationRequested();
                }
                ts.addRange(allDiagnostics, getDiagnostics(sourceFile, cancellationToken));
            });
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function getSyntacticDiagnostics(sourceFile, cancellationToken) {
            return getDiagnosticsHelper(sourceFile, getSyntacticDiagnosticsForFile, cancellationToken);
        }
        function getSemanticDiagnostics(sourceFile, cancellationToken) {
            return getDiagnosticsHelper(sourceFile, getSemanticDiagnosticsForFile, cancellationToken);
        }
        function getDeclarationDiagnostics(sourceFile, cancellationToken) {
            return getDiagnosticsHelper(sourceFile, getDeclarationDiagnosticsForFile, cancellationToken);
        }
        function getSyntacticDiagnosticsForFile(sourceFile, cancellationToken) {
            return sourceFile.parseDiagnostics;
        }
        function runWithCancellationToken(func) {
            try {
                return func();
            }
            catch (e) {
                if (e instanceof ts.OperationCanceledException) {
                    // We were canceled while performing the operation.  Because our type checker
                    // might be a bad state, we need to throw it away.
                    //
                    // Note: we are overly agressive here.  We do not actually *have* to throw away
                    // the "noDiagnosticsTypeChecker".  However, for simplicity, i'd like to keep
                    // the lifetimes of these two TypeCheckers the same.  Also, we generally only
                    // cancel when the user has made a change anyways.  And, in that case, we (the
                    // program instance) will get thrown away anyways.  So trying to keep one of
                    // these type checkers alive doesn't serve much purpose.
                    noDiagnosticsTypeChecker = undefined;
                    diagnosticsProducingTypeChecker = undefined;
                }
                throw e;
            }
        }
        function getSemanticDiagnosticsForFile(sourceFile, cancellationToken) {
            return runWithCancellationToken(function () {
                var typeChecker = getDiagnosticsProducingTypeChecker();
                ts.Debug.assert(!!sourceFile.bindDiagnostics);
                var bindDiagnostics = sourceFile.bindDiagnostics;
                var checkDiagnostics = typeChecker.getDiagnostics(sourceFile, cancellationToken);
                var fileProcessingDiagnosticsInFile = fileProcessingDiagnostics.getDiagnostics(sourceFile.fileName);
                var programDiagnosticsInFile = programDiagnostics.getDiagnostics(sourceFile.fileName);
                return bindDiagnostics.concat(checkDiagnostics).concat(fileProcessingDiagnosticsInFile).concat(programDiagnosticsInFile);
            });
        }
        function getDeclarationDiagnosticsForFile(sourceFile, cancellationToken) {
            return runWithCancellationToken(function () {
                if (!ts.isDeclarationFile(sourceFile)) {
                    var resolver = getDiagnosticsProducingTypeChecker().getEmitResolver(sourceFile, cancellationToken);
                    // Don't actually write any files since we're just getting diagnostics.
                    var writeFile_1 = function () { };
                    return ts.getDeclarationDiagnostics(getEmitHost(writeFile_1), resolver, sourceFile);
                }
            });
        }
        function getOptionsDiagnostics() {
            var allDiagnostics = [];
            ts.addRange(allDiagnostics, fileProcessingDiagnostics.getGlobalDiagnostics());
            ts.addRange(allDiagnostics, programDiagnostics.getGlobalDiagnostics());
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function getGlobalDiagnostics() {
            var allDiagnostics = [];
            ts.addRange(allDiagnostics, getDiagnosticsProducingTypeChecker().getGlobalDiagnostics());
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function hasExtension(fileName) {
            return ts.getBaseFileName(fileName).indexOf(".") >= 0;
        }
        function processRootFile(fileName, isDefaultLib) {
            processSourceFile(ts.normalizePath(fileName), isDefaultLib);
        }
        function fileReferenceIsEqualTo(a, b) {
            return a.fileName === b.fileName;
        }
        function moduleNameIsEqualTo(a, b) {
            return a.text === b.text;
        }
        function collectExternalModuleReferences(file) {
            if (file.imports) {
                return;
            }
            var imports;
            for (var _i = 0, _a = file.statements; _i < _a.length; _i++) {
                var node = _a[_i];
                switch (node.kind) {
                    case ts.SyntaxKind.ImportDeclaration:
                    case ts.SyntaxKind.ImportEqualsDeclaration:
                    case ts.SyntaxKind.ExportDeclaration:
                        var moduleNameExpr = ts.getExternalModuleName(node);
                        if (!moduleNameExpr || moduleNameExpr.kind !== ts.SyntaxKind.StringLiteral) {
                            break;
                        }
                        if (!moduleNameExpr.text) {
                            break;
                        }
                        (imports || (imports = [])).push(moduleNameExpr);
                        break;
                    case ts.SyntaxKind.ModuleDeclaration:
                        if (node.name.kind === ts.SyntaxKind.StringLiteral && (node.flags & ts.NodeFlags.Ambient || ts.isDeclarationFile(file))) {
                            // TypeScript 1.0 spec (April 2014): 12.1.6
                            // An AmbientExternalModuleDeclaration declares an external module. 
                            // This type of declaration is permitted only in the global module.
                            // The StringLiteral must specify a top - level external module name.
                            // Relative external module names are not permitted
                            ts.forEachChild(node.body, function (node) {
                                if (ts.isExternalModuleImportEqualsDeclaration(node) &&
                                    ts.getExternalModuleImportEqualsDeclarationExpression(node).kind === ts.SyntaxKind.StringLiteral) {
                                    var moduleName = ts.getExternalModuleImportEqualsDeclarationExpression(node);
                                    // TypeScript 1.0 spec (April 2014): 12.1.6
                                    // An ExternalImportDeclaration in anAmbientExternalModuleDeclaration may reference other external modules 
                                    // only through top - level external module names. Relative external module names are not permitted.
                                    if (moduleName) {
                                        (imports || (imports = [])).push(moduleName);
                                    }
                                }
                            });
                        }
                        break;
                }
            }
            file.imports = imports || emptyArray;
        }
        function processSourceFile(fileName, isDefaultLib, refFile, refPos, refEnd) {
            var diagnosticArgument;
            var diagnostic;
            if (hasExtension(fileName)) {
                if (!options.allowNonTsExtensions && !ts.forEach(ts.supportedExtensions, function (extension) { return ts.fileExtensionIs(host.getCanonicalFileName(fileName), extension); })) {
                    diagnostic = ts.Diagnostics.File_0_has_unsupported_extension_The_only_supported_extensions_are_1;
                    diagnosticArgument = [fileName, "'" + ts.supportedExtensions.join("', '") + "'"];
                }
                else if (!findSourceFile(fileName, isDefaultLib, refFile, refPos, refEnd)) {
                    diagnostic = ts.Diagnostics.File_0_not_found;
                    diagnosticArgument = [fileName];
                }
                else if (refFile && host.getCanonicalFileName(fileName) === host.getCanonicalFileName(refFile.fileName)) {
                    diagnostic = ts.Diagnostics.A_file_cannot_have_a_reference_to_itself;
                    diagnosticArgument = [fileName];
                }
            }
            else {
                var nonTsFile = options.allowNonTsExtensions && findSourceFile(fileName, isDefaultLib, refFile, refPos, refEnd);
                if (!nonTsFile) {
                    if (options.allowNonTsExtensions) {
                        diagnostic = ts.Diagnostics.File_0_not_found;
                        diagnosticArgument = [fileName];
                    }
                    else if (!ts.forEach(ts.supportedExtensions, function (extension) { return findSourceFile(fileName + extension, isDefaultLib, refFile, refPos, refEnd); })) {
                        diagnostic = ts.Diagnostics.File_0_not_found;
                        fileName += ".ts";
                        diagnosticArgument = [fileName];
                    }
                }
            }
            if (diagnostic) {
                if (refFile !== undefined && refEnd !== undefined && refPos !== undefined) {
                    fileProcessingDiagnostics.add(ts.createFileDiagnostic.apply(void 0, [refFile, refPos, refEnd - refPos, diagnostic].concat(diagnosticArgument)));
                }
                else {
                    fileProcessingDiagnostics.add(ts.createCompilerDiagnostic.apply(void 0, [diagnostic].concat(diagnosticArgument)));
                }
            }
        }
        // Get source file from normalized fileName
        function findSourceFile(fileName, isDefaultLib, refFile, refPos, refEnd) {
            var canonicalName = host.getCanonicalFileName(ts.normalizeSlashes(fileName));
            if (filesByName.contains(canonicalName)) {
                // We've already looked for this file, use cached result
                return getSourceFileFromCache(fileName, canonicalName, /*useAbsolutePath*/ false);
            }
            else {
                var normalizedAbsolutePath = ts.getNormalizedAbsolutePath(fileName, host.getCurrentDirectory());
                var canonicalAbsolutePath = host.getCanonicalFileName(normalizedAbsolutePath);
                if (filesByName.contains(canonicalAbsolutePath)) {
                    return getSourceFileFromCache(normalizedAbsolutePath, canonicalAbsolutePath, /*useAbsolutePath*/ true);
                }
                // We haven't looked for this file, do so now and cache result
                var file = host.getSourceFile(fileName, options.target, function (hostErrorMessage) {
                    if (refFile !== undefined && refPos !== undefined && refEnd !== undefined) {
                        fileProcessingDiagnostics.add(ts.createFileDiagnostic(refFile, refPos, refEnd - refPos, ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, hostErrorMessage));
                    }
                    else {
                        fileProcessingDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, hostErrorMessage));
                    }
                });
                filesByName.set(canonicalName, file);
                if (file) {
                    skipDefaultLib = skipDefaultLib || file.hasNoDefaultLib;
                    // Set the source file for normalized absolute path
                    filesByName.set(canonicalAbsolutePath, file);
                    var basePath = ts.getDirectoryPath(fileName);
                    if (!options.noResolve) {
                        processReferencedFiles(file, basePath);
                    }
                    // always process imported modules to record module name resolutions
                    processImportedModules(file, basePath);
                    if (isDefaultLib) {
                        file.isDefaultLib = true;
                        files.unshift(file);
                    }
                    else {
                        files.push(file);
                    }
                }
                return file;
            }
            function getSourceFileFromCache(fileName, canonicalName, useAbsolutePath) {
                var file = filesByName.get(canonicalName);
                if (file && host.useCaseSensitiveFileNames()) {
                    var sourceFileName = useAbsolutePath ? ts.getNormalizedAbsolutePath(file.fileName, host.getCurrentDirectory()) : file.fileName;
                    if (canonicalName !== sourceFileName) {
                        if (refFile !== undefined && refPos !== undefined && refEnd !== undefined) {
                            fileProcessingDiagnostics.add(ts.createFileDiagnostic(refFile, refPos, refEnd - refPos, ts.Diagnostics.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, sourceFileName));
                        }
                        else {
                            fileProcessingDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, sourceFileName));
                        }
                    }
                }
                return file;
            }
        }
        function processReferencedFiles(file, basePath) {
            ts.forEach(file.referencedFiles, function (ref) {
                var referencedFileName = resolveTripleslashReference(ref.fileName, file.fileName);
                processSourceFile(referencedFileName, /* isDefaultLib */ false, file, ref.pos, ref.end);
            });
        }
        function processImportedModules(file, basePath) {
            collectExternalModuleReferences(file);
            if (file.imports.length) {
                file.resolvedModules = {};
                var moduleNames = ts.map(file.imports, function (name) { return name.text; });
                var resolutions = resolveModuleNamesWorker(moduleNames, file.fileName);
                for (var i = 0; i < file.imports.length; ++i) {
                    var resolution = resolutions[i];
                    ts.setResolvedModule(file, moduleNames[i], resolution);
                    if (resolution && !options.noResolve) {
                        var importedFile = findModuleSourceFile(resolution.resolvedFileName, file.imports[i]);
                        if (importedFile && resolution.isExternalLibraryImport) {
                            if (!ts.isExternalModule(importedFile)) {
                                var start_1 = ts.getTokenPosOfNode(file.imports[i], file);
                                fileProcessingDiagnostics.add(ts.createFileDiagnostic(file, start_1, file.imports[i].end - start_1, ts.Diagnostics.Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_the_package_definition, importedFile.fileName));
                            }
                            else if (!ts.fileExtensionIs(importedFile.fileName, ".d.ts")) {
                                var start_2 = ts.getTokenPosOfNode(file.imports[i], file);
                                fileProcessingDiagnostics.add(ts.createFileDiagnostic(file, start_2, file.imports[i].end - start_2, ts.Diagnostics.Exported_external_package_typings_can_only_be_in_d_ts_files_Please_contact_the_package_author_to_update_the_package_definition));
                            }
                            else if (importedFile.referencedFiles.length) {
                                var firstRef = importedFile.referencedFiles[0];
                                fileProcessingDiagnostics.add(ts.createFileDiagnostic(importedFile, firstRef.pos, firstRef.end - firstRef.pos, ts.Diagnostics.Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_package_author_to_update_the_package_definition));
                            }
                        }
                    }
                }
            }
            else {
                // no imports - drop cached module resolutions
                file.resolvedModules = undefined;
            }
            return;
            function findModuleSourceFile(fileName, nameLiteral) {
                return findSourceFile(fileName, /* isDefaultLib */ false, file, ts.skipTrivia(file.text, nameLiteral.pos), nameLiteral.end);
            }
        }
        function computeCommonSourceDirectory(sourceFiles) {
            var commonPathComponents;
            var currentDirectory = host.getCurrentDirectory();
            ts.forEach(files, function (sourceFile) {
                // Each file contributes into common source file path
                if (ts.isDeclarationFile(sourceFile)) {
                    return;
                }
                var sourcePathComponents = ts.getNormalizedPathComponents(sourceFile.fileName, currentDirectory);
                sourcePathComponents.pop(); // The base file name is not part of the common directory path
                if (!commonPathComponents) {
                    // first file
                    commonPathComponents = sourcePathComponents;
                    return;
                }
                for (var i = 0, n = Math.min(commonPathComponents.length, sourcePathComponents.length); i < n; i++) {
                    if (commonPathComponents[i] !== sourcePathComponents[i]) {
                        if (i === 0) {
                            programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_find_the_common_subdirectory_path_for_the_input_files));
                            return;
                        }
                        // New common path found that is 0 -> i-1
                        commonPathComponents.length = i;
                        break;
                    }
                }
                // If the sourcePathComponents was shorter than the commonPathComponents, truncate to the sourcePathComponents
                if (sourcePathComponents.length < commonPathComponents.length) {
                    commonPathComponents.length = sourcePathComponents.length;
                }
            });
            return ts.getNormalizedPathFromPathComponents(commonPathComponents);
        }
        function checkSourceFilesBelongToPath(sourceFiles, rootDirectory) {
            var allFilesBelongToPath = true;
            if (sourceFiles) {
                var currentDirectory = host.getCurrentDirectory();
                var absoluteRootDirectoryPath = host.getCanonicalFileName(ts.getNormalizedAbsolutePath(rootDirectory, currentDirectory));
                for (var _i = 0; _i < sourceFiles.length; _i++) {
                    var sourceFile = sourceFiles[_i];
                    if (!ts.isDeclarationFile(sourceFile)) {
                        var absoluteSourceFilePath = host.getCanonicalFileName(ts.getNormalizedAbsolutePath(sourceFile.fileName, currentDirectory));
                        if (absoluteSourceFilePath.indexOf(absoluteRootDirectoryPath) !== 0) {
                            programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files, sourceFile.fileName, options.rootDir));
                            allFilesBelongToPath = false;
                        }
                    }
                }
            }
            return allFilesBelongToPath;
        }
        function verifyCompilerOptions() {
            if (options.isolatedModules) {
                if (options.declaration) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "declaration", "isolatedModules"));
                }
                if (options.noEmitOnError) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmitOnError", "isolatedModules"));
                }
                if (options.out) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "out", "isolatedModules"));
                }
                if (options.outFile) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "outFile", "isolatedModules"));
                }
            }
            if (options.inlineSourceMap) {
                if (options.sourceMap) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "sourceMap", "inlineSourceMap"));
                }
                if (options.mapRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "mapRoot", "inlineSourceMap"));
                }
                if (options.sourceRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "sourceRoot", "inlineSourceMap"));
                }
            }
            if (options.inlineSources) {
                if (!options.sourceMap && !options.inlineSourceMap) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_inlineSources_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided));
                }
            }
            if (options.out && options.outFile) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "out", "outFile"));
            }
            if (!options.sourceMap && (options.mapRoot || options.sourceRoot)) {
                // Error to specify --mapRoot or --sourceRoot without mapSourceFiles
                if (options.mapRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "mapRoot", "sourceMap"));
                }
                if (options.sourceRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "sourceRoot", "sourceMap"));
                }
                return;
            }
            var languageVersion = options.target || ts.ScriptTarget.ES3;
            var outFile = options.outFile || options.out;
            var firstExternalModuleSourceFile = ts.forEach(files, function (f) { return ts.isExternalModule(f) ? f : undefined; });
            if (options.isolatedModules) {
                if (!options.module && languageVersion < ts.ScriptTarget.ES6) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES6_or_higher));
                }
                var firstNonExternalModuleSourceFile = ts.forEach(files, function (f) { return !ts.isExternalModule(f) && !ts.isDeclarationFile(f) ? f : undefined; });
                if (firstNonExternalModuleSourceFile) {
                    var span = ts.getErrorSpanForNode(firstNonExternalModuleSourceFile, firstNonExternalModuleSourceFile);
                    programDiagnostics.add(ts.createFileDiagnostic(firstNonExternalModuleSourceFile, span.start, span.length, ts.Diagnostics.Cannot_compile_namespaces_when_the_isolatedModules_flag_is_provided));
                }
            }
            else if (firstExternalModuleSourceFile && languageVersion < ts.ScriptTarget.ES6 && !options.module) {
                // We cannot use createDiagnosticFromNode because nodes do not have parents yet
                var span = ts.getErrorSpanForNode(firstExternalModuleSourceFile, firstExternalModuleSourceFile.externalModuleIndicator);
                programDiagnostics.add(ts.createFileDiagnostic(firstExternalModuleSourceFile, span.start, span.length, ts.Diagnostics.Cannot_compile_modules_unless_the_module_flag_is_provided));
            }
            // Cannot specify module gen target when in es6 or above
            if (options.module && languageVersion >= ts.ScriptTarget.ES6) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_compile_modules_into_commonjs_amd_system_or_umd_when_targeting_ES6_or_higher));
            }
            // there has to be common source directory if user specified --outdir || --sourceRoot
            // if user specified --mapRoot, there needs to be common source directory if there would be multiple files being emitted
            if (options.outDir ||
                options.sourceRoot ||
                (options.mapRoot &&
                    (!outFile || firstExternalModuleSourceFile !== undefined))) {
                if (options.rootDir && checkSourceFilesBelongToPath(files, options.rootDir)) {
                    // If a rootDir is specified and is valid use it as the commonSourceDirectory
                    commonSourceDirectory = ts.getNormalizedAbsolutePath(options.rootDir, host.getCurrentDirectory());
                }
                else {
                    // Compute the commonSourceDirectory from the input files
                    commonSourceDirectory = computeCommonSourceDirectory(files);
                }
                if (commonSourceDirectory && commonSourceDirectory[commonSourceDirectory.length - 1] !== ts.directorySeparator) {
                    // Make sure directory path ends with directory separator so this string can directly
                    // used to replace with "" to get the relative path of the source file and the relative path doesn't
                    // start with / making it rooted path
                    commonSourceDirectory += ts.directorySeparator;
                }
            }
            if (options.noEmit) {
                if (options.out) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "out"));
                }
                if (options.outFile) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "outFile"));
                }
                if (options.outDir) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "outDir"));
                }
                if (options.declaration) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "declaration"));
                }
            }
            if (options.emitDecoratorMetadata &&
                !options.experimentalDecorators) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "emitDecoratorMetadata", "experimentalDecorators"));
            }
            if (options.experimentalAsyncFunctions &&
                options.target !== ts.ScriptTarget.ES6) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_experimentalAsyncFunctions_cannot_be_specified_when_targeting_ES5_or_lower));
            }
        }
    }
    ts.createProgram = createProgram;
})(ts || (ts = {}));
//# sourceMappingURL=program.js.map