#!/usr/bin/env node
"use strict";
// $ node examples simple
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = (0, tslib_1.__importDefault)(require("fs"));
const path_1 = (0, tslib_1.__importDefault)(require("path"));
const __1 = require("..");
let file = path_1.default.resolve(process.argv[2] + '.md');
let str = fs_1.default.readFileSync(file, 'utf8');
console.log(JSON.stringify((0, __1.parse)(str), null, 2));
//# sourceMappingURL=index.js.map