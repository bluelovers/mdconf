"use strict";
/**
 * Created by user on 2018/3/24/024.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYMBOL_RAW_DATA = exports.SYMBOL_RAW_VALUE = exports.RawObject = exports.isPlainObject = exports.defaultOptionsParse = exports.stringify = exports.parse = exports.mdconf = void 0;
const tslib_1 = require("tslib");
const core_1 = (0, tslib_1.__importStar)(require("./core"));
exports.mdconf = core_1.default;
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return core_1.parse; } });
Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return core_1.stringify; } });
const is_plain_object_1 = require("is-plain-object");
Object.defineProperty(exports, "isPlainObject", { enumerable: true, get: function () { return is_plain_object_1.isPlainObject; } });
var core_2 = require("./core");
Object.defineProperty(exports, "defaultOptionsParse", { enumerable: true, get: function () { return core_2.defaultOptionsParse; } });
var RawObject_1 = require("./lib/RawObject");
Object.defineProperty(exports, "RawObject", { enumerable: true, get: function () { return RawObject_1.RawObject; } });
Object.defineProperty(exports, "SYMBOL_RAW_VALUE", { enumerable: true, get: function () { return RawObject_1.SYMBOL_RAW_VALUE; } });
Object.defineProperty(exports, "SYMBOL_RAW_DATA", { enumerable: true, get: function () { return RawObject_1.SYMBOL_RAW_DATA; } });
exports.default = exports;
//# sourceMappingURL=index.js.map