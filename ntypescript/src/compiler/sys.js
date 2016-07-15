/// <reference path="core.ts"/>
var ts;
(function (ts) {
    ts.sys = (function () {
        function getWScriptSystem() {
            var fso = new ActiveXObject("Scripting.FileSystemObject");
            var fileStream = new ActiveXObject("ADODB.Stream");
            fileStream.Type = 2 /*text*/;
            var binaryStream = new ActiveXObject("ADODB.Stream");
            binaryStream.Type = 1 /*binary*/;
            var args = [];
            for (var i = 0; i < WScript.Arguments.length; i++) {
                args[i] = WScript.Arguments.Item(i);
            }
            function readFile(fileName, encoding) {
                if (!fso.FileExists(fileName)) {
                    return undefined;
                }
                fileStream.Open();
                try {
                    if (encoding) {
                        fileStream.Charset = encoding;
                        fileStream.LoadFromFile(fileName);
                    }
                    else {
                        // Load file and read the first two bytes into a string with no interpretation
                        fileStream.Charset = "x-ansi";
                        fileStream.LoadFromFile(fileName);
                        var bom = fileStream.ReadText(2) || "";
                        // Position must be at 0 before encoding can be changed
                        fileStream.Position = 0;
                        // [0xFF,0xFE] and [0xFE,0xFF] mean utf-16 (little or big endian), otherwise default to utf-8
                        fileStream.Charset = bom.length >= 2 && (bom.charCodeAt(0) === 0xFF && bom.charCodeAt(1) === 0xFE || bom.charCodeAt(0) === 0xFE && bom.charCodeAt(1) === 0xFF) ? "unicode" : "utf-8";
                    }
                    // ReadText method always strips byte order mark from resulting string
                    return fileStream.ReadText();
                }
                catch (e) {
                    throw e;
                }
                finally {
                    fileStream.Close();
                }
            }
            function writeFile(fileName, data, writeByteOrderMark) {
                fileStream.Open();
                binaryStream.Open();
                try {
                    // Write characters in UTF-8 encoding
                    fileStream.Charset = "utf-8";
                    fileStream.WriteText(data);
                    // If we don't want the BOM, then skip it by setting the starting location to 3 (size of BOM).
                    // If not, start from position 0, as the BOM will be added automatically when charset==utf8.
                    if (writeByteOrderMark) {
                        fileStream.Position = 0;
                    }
                    else {
                        fileStream.Position = 3;
                    }
                    fileStream.CopyTo(binaryStream);
                    binaryStream.SaveToFile(fileName, 2 /*overwrite*/);
                }
                finally {
                    binaryStream.Close();
                    fileStream.Close();
                }
            }
            function getCanonicalPath(path) {
                return path.toLowerCase();
            }
            function getNames(collection) {
                var result = [];
                for (var e = new Enumerator(collection); !e.atEnd(); e.moveNext()) {
                    result.push(e.item().Name);
                }
                return result.sort();
            }
            function readDirectory(path, extension, exclude) {
                var result = [];
                exclude = ts.map(exclude, function (s) { return getCanonicalPath(ts.combinePaths(path, s)); });
                visitDirectory(path);
                return result;
                function visitDirectory(path) {
                    var folder = fso.GetFolder(path || ".");
                    var files = getNames(folder.files);
                    for (var _i = 0; _i < files.length; _i++) {
                        var current = files[_i];
                        var name_1 = ts.combinePaths(path, current);
                        if ((!extension || ts.fileExtensionIs(name_1, extension)) && !ts.contains(exclude, getCanonicalPath(name_1))) {
                            result.push(name_1);
                        }
                    }
                    var subfolders = getNames(folder.subfolders);
                    for (var _a = 0; _a < subfolders.length; _a++) {
                        var current = subfolders[_a];
                        var name_2 = ts.combinePaths(path, current);
                        if (!ts.contains(exclude, getCanonicalPath(name_2))) {
                            visitDirectory(name_2);
                        }
                    }
                }
            }
            return {
                args: args,
                newLine: "\r\n",
                useCaseSensitiveFileNames: false,
                write: function (s) {
                    WScript.StdOut.Write(s);
                },
                readFile: readFile,
                writeFile: writeFile,
                resolvePath: function (path) {
                    return fso.GetAbsolutePathName(path);
                },
                fileExists: function (path) {
                    return fso.FileExists(path);
                },
                directoryExists: function (path) {
                    return fso.FolderExists(path);
                },
                createDirectory: function (directoryName) {
                    if (!this.directoryExists(directoryName)) {
                        fso.CreateFolder(directoryName);
                    }
                },
                getExecutingFilePath: function () {
                    return WScript.ScriptFullName;
                },
                getCurrentDirectory: function () {
                    return new ActiveXObject("WScript.Shell").CurrentDirectory;
                },
                readDirectory: readDirectory,
                exit: function (exitCode) {
                    try {
                        WScript.Quit(exitCode);
                    }
                    catch (e) {
                    }
                }
            };
        }
        function getNodeSystem() {
            var _fs = require("fs");
            var _path = require("path");
            var _os = require("os");
            var platform = _os.platform();
            // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
            var useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin";
            function readFile(fileName, encoding) {
                if (!_fs.existsSync(fileName)) {
                    return undefined;
                }
                var buffer = _fs.readFileSync(fileName);
                var len = buffer.length;
                if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                    // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
                    // flip all byte pairs and treat as little endian.
                    len &= ~1;
                    for (var i = 0; i < len; i += 2) {
                        var temp = buffer[i];
                        buffer[i] = buffer[i + 1];
                        buffer[i + 1] = temp;
                    }
                    return buffer.toString("utf16le", 2);
                }
                if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                    // Little endian UTF-16 byte order mark detected
                    return buffer.toString("utf16le", 2);
                }
                if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                    // UTF-8 byte order mark detected
                    return buffer.toString("utf8", 3);
                }
                // Default is UTF-8 with no byte order mark
                return buffer.toString("utf8");
            }
            function writeFile(fileName, data, writeByteOrderMark) {
                // If a BOM is required, emit one
                if (writeByteOrderMark) {
                    data = "\uFEFF" + data;
                }
                _fs.writeFileSync(fileName, data, "utf8");
            }
            function getCanonicalPath(path) {
                return useCaseSensitiveFileNames ? path.toLowerCase() : path;
            }
            function readDirectory(path, extension, exclude) {
                var result = [];
                exclude = ts.map(exclude, function (s) { return getCanonicalPath(ts.combinePaths(path, s)); });
                visitDirectory(path);
                return result;
                function visitDirectory(path) {
                    var files = _fs.readdirSync(path || ".").sort();
                    var directories = [];
                    for (var _i = 0; _i < files.length; _i++) {
                        var current = files[_i];
                        var name_3 = ts.combinePaths(path, current);
                        if (!ts.contains(exclude, getCanonicalPath(name_3))) {
                            var stat = _fs.statSync(name_3);
                            if (stat.isFile()) {
                                if (!extension || ts.fileExtensionIs(name_3, extension)) {
                                    result.push(name_3);
                                }
                            }
                            else if (stat.isDirectory()) {
                                directories.push(name_3);
                            }
                        }
                    }
                    for (var _a = 0; _a < directories.length; _a++) {
                        var current = directories[_a];
                        visitDirectory(current);
                    }
                }
            }
            return {
                args: process.argv.slice(2),
                newLine: _os.EOL,
                useCaseSensitiveFileNames: useCaseSensitiveFileNames,
                write: function (s) {
                    var buffer = new Buffer(s, "utf8");
                    var offset = 0;
                    var toWrite = buffer.length;
                    var written = 0;
                    // 1 is a standard descriptor for stdout
                    while ((written = _fs.writeSync(1, buffer, offset, toWrite)) < toWrite) {
                        offset += written;
                        toWrite -= written;
                    }
                },
                readFile: readFile,
                writeFile: writeFile,
                watchFile: function (fileName, callback) {
                    // watchFile polls a file every 250ms, picking up file notifications.
                    _fs.watchFile(fileName, { persistent: true, interval: 250 }, fileChanged);
                    return {
                        close: function () { _fs.unwatchFile(fileName, fileChanged); }
                    };
                    function fileChanged(curr, prev) {
                        if (+curr.mtime <= +prev.mtime) {
                            return;
                        }
                        callback(fileName);
                    }
                },
                resolvePath: function (path) {
                    return _path.resolve(path);
                },
                fileExists: function (path) {
                    return _fs.existsSync(path);
                },
                directoryExists: function (path) {
                    return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
                },
                createDirectory: function (directoryName) {
                    if (!this.directoryExists(directoryName)) {
                        _fs.mkdirSync(directoryName);
                    }
                },
                getExecutingFilePath: function () {
                    return __filename;
                },
                getCurrentDirectory: function () {
                    return process.cwd();
                },
                readDirectory: readDirectory,
                getMemoryUsage: function () {
                    if (global.gc) {
                        global.gc();
                    }
                    return process.memoryUsage().heapUsed;
                },
                exit: function (exitCode) {
                    process.exit(exitCode);
                }
            };
        }
        if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
            return getWScriptSystem();
        }
        else if (typeof process !== "undefined" && process.nextTick && !process.browser && typeof require !== "undefined") {
            // process and process.nextTick checks if current environment is node-like
            // process.browser check excludes webpack and browserify
            return getNodeSystem();
        }
        else {
            return undefined; // Unsupported host
        }
    })();
})(ts || (ts = {}));
//# sourceMappingURL=sys.js.map