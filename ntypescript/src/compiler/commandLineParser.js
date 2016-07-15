/// <reference path="sys.ts"/>
/// <reference path="types.ts"/>
/// <reference path="core.ts"/>
/// <reference path="scanner.ts"/>
var ts;
(function (ts) {
    /* @internal */
    ts.optionDeclarations = [
        {
            name: "charset",
            type: "string"
        },
        {
            name: "declaration",
            shortName: "d",
            type: "boolean",
            description: ts.Diagnostics.Generates_corresponding_d_ts_file
        },
        {
            name: "diagnostics",
            type: "boolean"
        },
        {
            name: "emitBOM",
            type: "boolean"
        },
        {
            name: "help",
            shortName: "h",
            type: "boolean",
            description: ts.Diagnostics.Print_this_message
        },
        {
            name: "init",
            type: "boolean",
            description: ts.Diagnostics.Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file
        },
        {
            name: "inlineSourceMap",
            type: "boolean"
        },
        {
            name: "inlineSources",
            type: "boolean"
        },
        {
            name: "jsx",
            type: {
                "preserve": ts.JsxEmit.Preserve,
                "react": ts.JsxEmit.React
            },
            paramType: ts.Diagnostics.KIND,
            description: ts.Diagnostics.Specify_JSX_code_generation_Colon_preserve_or_react,
            error: ts.Diagnostics.Argument_for_jsx_must_be_preserve_or_react
        },
        {
            name: "listFiles",
            type: "boolean"
        },
        {
            name: "locale",
            type: "string"
        },
        {
            name: "mapRoot",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "module",
            shortName: "m",
            type: {
                "commonjs": ts.ModuleKind.CommonJS,
                "amd": ts.ModuleKind.AMD,
                "system": ts.ModuleKind.System,
                "umd": ts.ModuleKind.UMD
            },
            description: ts.Diagnostics.Specify_module_code_generation_Colon_commonjs_amd_system_or_umd,
            paramType: ts.Diagnostics.KIND,
            error: ts.Diagnostics.Argument_for_module_option_must_be_commonjs_amd_system_or_umd
        },
        {
            name: "newLine",
            type: {
                "crlf": ts.NewLineKind.CarriageReturnLineFeed,
                "lf": ts.NewLineKind.LineFeed
            },
            description: ts.Diagnostics.Specifies_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix,
            paramType: ts.Diagnostics.NEWLINE,
            error: ts.Diagnostics.Argument_for_newLine_option_must_be_CRLF_or_LF
        },
        {
            name: "noEmit",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_outputs
        },
        {
            name: "noEmitHelpers",
            type: "boolean"
        },
        {
            name: "noEmitOnError",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_outputs_if_any_errors_were_reported
        },
        {
            name: "noImplicitAny",
            type: "boolean",
            description: ts.Diagnostics.Raise_error_on_expressions_and_declarations_with_an_implied_any_type
        },
        {
            name: "noLib",
            type: "boolean"
        },
        {
            name: "noResolve",
            type: "boolean"
        },
        {
            name: "skipDefaultLibCheck",
            type: "boolean"
        },
        {
            name: "out",
            type: "string",
            isFilePath: false,
            // for correct behaviour, please use outFile
            paramType: ts.Diagnostics.FILE
        },
        {
            name: "outFile",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Concatenate_and_emit_output_to_single_file,
            paramType: ts.Diagnostics.FILE
        },
        {
            name: "outDir",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Redirect_output_structure_to_the_directory,
            paramType: ts.Diagnostics.DIRECTORY
        },
        {
            name: "preserveConstEnums",
            type: "boolean",
            description: ts.Diagnostics.Do_not_erase_const_enum_declarations_in_generated_code
        },
        {
            name: "project",
            shortName: "p",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Compile_the_project_in_the_given_directory,
            paramType: ts.Diagnostics.DIRECTORY
        },
        {
            name: "removeComments",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_comments_to_output
        },
        {
            name: "rootDir",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "isolatedModules",
            type: "boolean"
        },
        {
            name: "sourceMap",
            type: "boolean",
            description: ts.Diagnostics.Generates_corresponding_map_file
        },
        {
            name: "sourceRoot",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "suppressExcessPropertyErrors",
            type: "boolean",
            description: ts.Diagnostics.Suppress_excess_property_checks_for_object_literals,
            experimental: true
        },
        {
            name: "suppressImplicitAnyIndexErrors",
            type: "boolean",
            description: ts.Diagnostics.Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures
        },
        {
            name: "stripInternal",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_declarations_for_code_that_has_an_internal_annotation,
            experimental: true
        },
        {
            name: "target",
            shortName: "t",
            type: { "es3": ts.ScriptTarget.ES3, "es5": ts.ScriptTarget.ES5, "es6": ts.ScriptTarget.ES6 },
            description: ts.Diagnostics.Specify_ECMAScript_target_version_Colon_ES3_default_ES5_or_ES6_experimental,
            paramType: ts.Diagnostics.VERSION,
            error: ts.Diagnostics.Argument_for_target_option_must_be_ES3_ES5_or_ES6
        },
        {
            name: "version",
            shortName: "v",
            type: "boolean",
            description: ts.Diagnostics.Print_the_compiler_s_version
        },
        {
            name: "watch",
            shortName: "w",
            type: "boolean",
            description: ts.Diagnostics.Watch_input_files
        },
        {
            name: "experimentalAsyncFunctions",
            type: "boolean",
            description: ts.Diagnostics.Enables_experimental_support_for_ES7_async_functions
        },
        {
            name: "experimentalDecorators",
            type: "boolean",
            description: ts.Diagnostics.Enables_experimental_support_for_ES7_decorators
        },
        {
            name: "emitDecoratorMetadata",
            type: "boolean",
            experimental: true,
            description: ts.Diagnostics.Enables_experimental_support_for_emitting_type_metadata_for_decorators
        },
        {
            name: "moduleResolution",
            type: {
                "node": ts.ModuleResolutionKind.NodeJs,
                "classic": ts.ModuleResolutionKind.Classic
            },
            description: ts.Diagnostics.Specifies_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6,
            error: ts.Diagnostics.Argument_for_moduleResolution_option_must_be_node_or_classic
        }
    ];
    var optionNameMapCache;
    /* @internal */
    function getOptionNameMap() {
        if (optionNameMapCache) {
            return optionNameMapCache;
        }
        var optionNameMap = {};
        var shortOptionNames = {};
        ts.forEach(ts.optionDeclarations, function (option) {
            optionNameMap[option.name.toLowerCase()] = option;
            if (option.shortName) {
                shortOptionNames[option.shortName] = option.name;
            }
        });
        optionNameMapCache = { optionNameMap: optionNameMap, shortOptionNames: shortOptionNames };
        return optionNameMapCache;
    }
    ts.getOptionNameMap = getOptionNameMap;
    function parseCommandLine(commandLine, readFile) {
        var options = {};
        var fileNames = [];
        var errors = [];
        var _a = getOptionNameMap(), optionNameMap = _a.optionNameMap, shortOptionNames = _a.shortOptionNames;
        parseStrings(commandLine);
        return {
            options: options,
            fileNames: fileNames,
            errors: errors
        };
        function parseStrings(args) {
            var i = 0;
            while (i < args.length) {
                var s = args[i++];
                if (s.charCodeAt(0) === ts.CharacterCodes.at) {
                    parseResponseFile(s.slice(1));
                }
                else if (s.charCodeAt(0) === ts.CharacterCodes.minus) {
                    s = s.slice(s.charCodeAt(1) === ts.CharacterCodes.minus ? 2 : 1).toLowerCase();
                    // Try to translate short option names to their full equivalents.
                    if (ts.hasProperty(shortOptionNames, s)) {
                        s = shortOptionNames[s];
                    }
                    if (ts.hasProperty(optionNameMap, s)) {
                        var opt = optionNameMap[s];
                        // Check to see if no argument was provided (e.g. "--locale" is the last command-line argument).
                        if (!args[i] && opt.type !== "boolean") {
                            errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_expects_an_argument, opt.name));
                        }
                        switch (opt.type) {
                            case "number":
                                options[opt.name] = parseInt(args[i++]);
                                break;
                            case "boolean":
                                options[opt.name] = true;
                                break;
                            case "string":
                                options[opt.name] = args[i++] || "";
                                break;
                            // If not a primitive, the possible types are specified in what is effectively a map of options.
                            default:
                                var map_1 = opt.type;
                                var key = (args[i++] || "").toLowerCase();
                                if (ts.hasProperty(map_1, key)) {
                                    options[opt.name] = map_1[key];
                                }
                                else {
                                    errors.push(ts.createCompilerDiagnostic(opt.error));
                                }
                        }
                    }
                    else {
                        errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, s));
                    }
                }
                else {
                    fileNames.push(s);
                }
            }
        }
        function parseResponseFile(fileName) {
            var text = readFile ? readFile(fileName) : ts.sys.readFile(fileName);
            if (!text) {
                errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.File_0_not_found, fileName));
                return;
            }
            var args = [];
            var pos = 0;
            while (true) {
                while (pos < text.length && text.charCodeAt(pos) <= ts.CharacterCodes.space)
                    pos++;
                if (pos >= text.length)
                    break;
                var start = pos;
                if (text.charCodeAt(start) === ts.CharacterCodes.doubleQuote) {
                    pos++;
                    while (pos < text.length && text.charCodeAt(pos) !== ts.CharacterCodes.doubleQuote)
                        pos++;
                    if (pos < text.length) {
                        args.push(text.substring(start + 1, pos));
                        pos++;
                    }
                    else {
                        errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unterminated_quoted_string_in_response_file_0, fileName));
                    }
                }
                else {
                    while (text.charCodeAt(pos) > ts.CharacterCodes.space)
                        pos++;
                    args.push(text.substring(start, pos));
                }
            }
            parseStrings(args);
        }
    }
    ts.parseCommandLine = parseCommandLine;
    /**
      * Read tsconfig.json file
      * @param fileName The path to the config file
      */
    function readConfigFile(fileName, readFile) {
        var text = "";
        try {
            text = readFile(fileName);
        }
        catch (e) {
            return { error: ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, e.message) };
        }
        return parseConfigFileText(fileName, text);
    }
    ts.readConfigFile = readConfigFile;
    /**
      * Parse the text of the tsconfig.json file
      * @param fileName The path to the config file
      * @param jsonText The text of the config file
      */
    function parseConfigFileText(fileName, jsonText) {
        try {
            return { config: /\S/.test(jsonText) ? JSON.parse(jsonText) : {} };
        }
        catch (e) {
            return { error: ts.createCompilerDiagnostic(ts.Diagnostics.Failed_to_parse_file_0_Colon_1, fileName, e.message) };
        }
    }
    ts.parseConfigFileText = parseConfigFileText;
    /**
      * Parse the contents of a config file (tsconfig.json).
      * @param json The contents of the config file to parse
      * @param basePath A root directory to resolve relative path entries in the config
      *    file to. e.g. outDir
      */
    function parseConfigFile(json, host, basePath) {
        var errors = [];
        return {
            options: getCompilerOptions(),
            fileNames: getFileNames(),
            errors: errors
        };
        function getCompilerOptions() {
            var options = {};
            var optionNameMap = {};
            ts.forEach(ts.optionDeclarations, function (option) {
                optionNameMap[option.name] = option;
            });
            var jsonOptions = json["compilerOptions"];
            if (jsonOptions) {
                for (var id in jsonOptions) {
                    if (ts.hasProperty(optionNameMap, id)) {
                        var opt = optionNameMap[id];
                        var optType = opt.type;
                        var value = jsonOptions[id];
                        var expectedType = typeof optType === "string" ? optType : "string";
                        if (typeof value === expectedType) {
                            if (typeof optType !== "string") {
                                var key = value.toLowerCase();
                                if (ts.hasProperty(optType, key)) {
                                    value = optType[key];
                                }
                                else {
                                    errors.push(ts.createCompilerDiagnostic(opt.error));
                                    value = 0;
                                }
                            }
                            if (opt.isFilePath) {
                                value = ts.normalizePath(ts.combinePaths(basePath, value));
                            }
                            options[opt.name] = value;
                        }
                        else {
                            errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_requires_a_value_of_type_1, id, expectedType));
                        }
                    }
                    else {
                        errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, id));
                    }
                }
            }
            return options;
        }
        function getFileNames() {
            var fileNames = [];
            if (ts.hasProperty(json, "files")) {
                if (json["files"] instanceof Array) {
                    fileNames = ts.map(json["files"], function (s) { return ts.combinePaths(basePath, s); });
                }
                else {
                    errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_requires_a_value_of_type_1, "files", "Array"));
                }
            }
            else {
                var exclude = json["exclude"] instanceof Array ? ts.map(json["exclude"], ts.normalizeSlashes) : undefined;
                var sysFiles = host.readDirectory(basePath, ".ts", exclude).concat(host.readDirectory(basePath, ".tsx", exclude));
                for (var i = 0; i < sysFiles.length; i++) {
                    var name_1 = sysFiles[i];
                    if (ts.fileExtensionIs(name_1, ".d.ts")) {
                        var baseName = name_1.substr(0, name_1.length - ".d.ts".length);
                        if (!ts.contains(sysFiles, baseName + ".tsx") && !ts.contains(sysFiles, baseName + ".ts")) {
                            fileNames.push(name_1);
                        }
                    }
                    else if (ts.fileExtensionIs(name_1, ".ts")) {
                        if (!ts.contains(sysFiles, name_1 + "x")) {
                            fileNames.push(name_1);
                        }
                    }
                    else {
                        fileNames.push(name_1);
                    }
                }
            }
            return fileNames;
        }
    }
    ts.parseConfigFile = parseConfigFile;
})(ts || (ts = {}));
//# sourceMappingURL=commandLineParser.js.map