#!/usr/bin/env node
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var dotenv = require('dotenv');
var fs = require('fs');
var path = require('path');
var projectRoot = path.resolve(__dirname, '..');
var jsonDir = path.join(projectRoot, 'resources', 'json');
dotenv.config();
//check if important things exist
if (!process.env.API_KEY) {
    console.warn('Hinweis: API_KEY not found in Environment');
}
if (!fs.existsSync(jsonDir)) {
    console.error("JSON watch directory does not exist: ".concat(jsonDir));
    process.exit(1);
}
// debounce map
var recent = new Map();
function shouldEmit(key) {
    var now = Date.now();
    var last = recent.get(key) || 0;
    if (now - last < 200)
        return false;
    recent.set(key, now);
    if (recent.size > 1000) {
        recent.forEach(function (v, k) {
            if (now - v > 1000)
                recent.delete(k);
        });
    }
    return true;
}
function postJsonToApi(jsonPath_1) {
    return __awaiter(this, arguments, void 0, function (jsonPath, attempt) {
        var content, parsed, maxAttempts, res, delay, ex_1, ex_2;
        var _a;
        if (attempt === void 0) { attempt = 1; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, , 6]);
                    content = fs.readFileSync(jsonPath, 'utf8');
                    parsed = void 0;
                    try {
                        parsed = JSON.parse(content);
                    }
                    catch (ex) {
                        if (attempt <= 5) {
                            // file might be still being written; retry shortly
                            setTimeout(function () { return postJsonToApi(jsonPath, attempt + 1); }, 200);
                            return [2 /*return*/];
                        }
                        console.error('parse-error | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + (ex instanceof Error ? ex.message : String(ex)));
                        return [2 /*return*/];
                    }
                    // require ingredients
                    if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
                        console.warn('skipped | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + 'No Ingredients');
                        return [2 /*return*/];
                    }
                    maxAttempts = 5;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch('http://localhost:3000/api/import-cocktail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'API_KEY': (_a = process.env.API_KEY) !== null && _a !== void 0 ? _a : '' },
                            body: JSON.stringify(parsed),
                        })];
                case 2:
                    res = _b.sent();
                    res.json();
                    //try again if not succesfull
                    if (res.status != 201 && attempt <= maxAttempts) {
                        console.error('fetch-error | API: import-cocktail | message: |' + res);
                        delay = 200 * Math.pow(2, attempt);
                        setTimeout(function () { return postJsonToApi(jsonPath, attempt + 1); }, delay);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    ex_1 = _b.sent();
                    console.error('fetch-error | API: import-cocktail | message: |' + (ex_1 instanceof Error ? ex_1.message : String(ex_1)));
                    return [3 /*break*/, 4];
                case 4: return [3 /*break*/, 6];
                case 5:
                    ex_2 = _b.sent();
                    console.error('error | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + (ex_2 instanceof Error ? ex_2.message : String(ex_2)));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function postRemoveToApi(jsonPath_1) {
    return __awaiter(this, arguments, void 0, function (jsonPath, attempt) {
        var base, name, maxAttempts, res, delay, ex_3;
        var _a;
        if (attempt === void 0) { attempt = 1; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    base = path.basename(jsonPath);
                    name = base.replace(/\.json$/i, '');
                    maxAttempts = 5;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch('http://localhost:3000/api/remove-cocktail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'API_KEY': (_a = process.env.API_KEY) !== null && _a !== void 0 ? _a : '' },
                            body: JSON.stringify({ name: name }),
                        })];
                case 2:
                    res = _b.sent();
                    res.json();
                    //try again if not succesfull
                    if (res.status != 200 && attempt <= maxAttempts) {
                        console.error('fetch-error | API: remove-cocktail | message: |' + res);
                        delay = 200 * Math.pow(2, attempt);
                        setTimeout(function () { return postRemoveToApi(jsonPath, attempt + 1); }, delay);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    ex_3 = _b.sent();
                    console.error('fetch-error | API: remove-cocktail | message: |' + (ex_3 instanceof Error ? ex_3.message : String(ex_3)));
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// On startup, try to post all existing JSON files
function initialPostAll() {
    fs.readdir(jsonDir, function (err, files) {
        if (err)
            return;
        files.filter(function (f) { return f.toLowerCase().endsWith('.json'); }).forEach(function (f) {
            var full = path.join(jsonDir, f);
            postJsonToApi(full);
        });
    });
}
// wait for services and then start the watcher
function waitForService(apiAddress, attempt) {
    var _this = this;
    if (attempt === void 0) { attempt = 1; }
    var timeoutMs = 2000;
    return new Promise(function (resolve) {
        var tryOnce = function () { return __awaiter(_this, void 0, void 0, function () {
            var controller, timer, res, err_1, delay;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        controller = new AbortController();
                        timer = setTimeout(function () { return controller.abort(); }, timeoutMs);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fetch(apiAddress, { method: 'OPTIONS', signal: controller.signal })];
                    case 2:
                        res = _a.sent();
                        clearTimeout(timer);
                        console.log('service ready');
                        resolve(undefined);
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        clearTimeout(timer);
                        console.log('service error: ' + (err_1 && err_1.message ? err_1.message : String(err_1)));
                        delay = Math.min(10000, 200 * Math.pow(2, Math.max(0, attempt - 1)));
                        setTimeout(function () {
                            attempt++;
                            tryOnce();
                        }, delay);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        tryOnce();
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("waiting for import API to be availible");
                    return [4 /*yield*/, waitForService('http://localhost:3000/api/import-api')];
                case 1:
                    _a.sent();
                    console.log("waiting for remove API to be availible");
                    return [4 /*yield*/, waitForService('http://localhost:3000/api/remove-api')];
                case 2:
                    _a.sent();
                    // start processing files and watching
                    initialPostAll();
                    fs.watch(jsonDir, { recursive: true }, function (eventType, filename) {
                        var rel = filename;
                        if (!rel.toLowerCase().endsWith('.json'))
                            return;
                        if (!shouldEmit("".concat(eventType, ":").concat(rel)))
                            return;
                        var full = path.join(jsonDir, rel);
                        fs.stat(full, function (err, stats) {
                            if (err) {
                                if (err.code === 'ENOENT') {
                                    console.error('removed | path: ' + path.relative(projectRoot, full));
                                    // attempt to notify API to remove the cocktail corresponding to this file
                                    try {
                                        postRemoveToApi(full);
                                    }
                                    catch (ex) {
                                        console.error('error | path: ' + path.relative(projectRoot, full) + ' | message: |' + (ex instanceof Error ? ex.message : String(ex)));
                                    }
                                }
                                return;
                            }
                            if (stats.isFile()) {
                                // delay a bit to avoid reading a file mid-write
                                setTimeout(function () { return postJsonToApi(full); }, 200);
                            }
                        });
                    });
                    console.log("Watching JSON resources at: ".concat(jsonDir));
                    return [2 /*return*/];
            }
        });
    });
}
run();
