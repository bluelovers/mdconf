/**
 * Module dependencies.
 */
import * as md from 'marked';
import * as util from 'util';
import { crlf, LF, CRLF, CR, chkcrlf } from 'crlf-normalize';
import * as deepmerge from 'deepmerge-plus';
import * as moment from 'moment';
import * as isPlainObject from 'is-plain-object';

export { isPlainObject, moment, deepmerge }
export { crlf, LF, CRLF, CR }

export const SYMBOL_RAW_DATA = Symbol.for('raw_data');
export const SYMBOL_RAW_VALUE = Symbol.for('raw_value');

export interface IOptionsParse
{
	crlf?: string,
	oldParseApi?: boolean,

	allowBlockquote?: boolean,

	disableKeyToLowerCase?: boolean,

	markedOptions?: md.MarkedOptions,

	filterObjectKey?,
}

export const defaultOptionsParse: IOptionsParse = {
	crlf: LF,
	allowBlockquote: true,

	markedOptions: Object.assign({},
		// @ts-ignore
		md.defaults,
		{
			breaks: true,
		},
	),
};

export interface IObjectParse
{
	[key: string]: any
}

/**
 * Parse the given `str` of markdown.
 *
 * @param {String | Buffer} str
 * @param {Object} options
 * @return {Object}
 * @api public
 */
export function parse(str: string, options?: IOptionsParse): IObjectParse
export function parse(str: Buffer, options?: IOptionsParse): IObjectParse
export function parse(str: string | Buffer, options: IOptionsParse = {}): IObjectParse
{
	{
		let markedOptions = Object.assign({}, defaultOptionsParse.markedOptions, options.markedOptions);

		options = Object.assign({}, defaultOptionsParse, options, {
			markedOptions,
		});
	}

	let source: string = str.toString();
	let eol: string;

	if (1)
	{
		// disable crlf options
		eol = LF;
		source = crlf(source, eol);
	}
	else if (options.crlf)
	{
		eol = options.crlf;
		source = crlf(source, eol);
	}
	else
	{
		let ck = chkcrlf(source);
		eol = ck.lf ? LF : (ck.crlf ? CRLF : CR);
	}

	let lexer = new md.Lexer(options.markedOptions);

	let toks = lexer.lex(source);
	let conf = {};
	let keys = [];
	let depth = 0;
	let inlist = false;

	let paragraph = [];
	let paragraph2 = [];
	let last_tok: md.Token;
	let blockquote_start: boolean;

	let inline_lexer = createInlineLexer(toks, options);

	toks.forEach(function (tok)
	{
		// @ts-ignore
		let val = tok.text;
		let _skip;
		let type = tok.type;

		if (type == 'text' && val.match(/^[a-z]+\:\/\//i))
		{
			let r = inline_lexer.output(val);

			if (val !== r && /<a href=/.test(r))
			{
				// @ts-ignore
				type = 'text2';
			}
		}

		switch (type)
		{
			case 'heading':
				while (depth-- >= tok.depth) keys.pop();
				keys.push(normalize(tok.text, options));
				depth = tok.depth;

				paragraph = [];

				break;
			case 'list_item_start':
				inlist = true;
				break;
			case 'list_item_end':
				inlist = false;
				break;
				// @ts-ignore
			case 'text2':
			case 'text':
				put(conf, keys, tok.text, undefined, undefined, options, {
					type,
				});
				break;
			case 'blockquote_start':
				blockquote_start = true;

				if (options.allowBlockquote)
				{
					paragraph2 = paragraph;
					paragraph = [];
				}
				else
				{
					_skip = true;
				}

				//console.log(tok);
				break;
			case 'blockquote_end':

				if (options.allowBlockquote && blockquote_start && paragraph.length)
				{
					val = paragraph.join(eol);
					val = val.replace(/\s+$/g, '');

					if (!options.oldParseApi)
					{
						val = new RawObject(val, {
							type: 'blockquote',
							text: paragraph,

							paragraph: paragraph2,
						});
					}

					put(conf, keys, val, true, undefined, options);

					paragraph = [];
				}
				else
				{
					_skip = true;
				}

				blockquote_start = false;
				break;
			case 'paragraph':
				paragraph.push(tok.text);
				//console.log(tok);
				break;
			case 'code':
				val = val.replace(/\s+$/g, '');

				if (!options.oldParseApi)
				{
					val = new RawObject(val, tok);
					val.getRawData()['paragraph'] = paragraph;
				}

				put(conf, keys, val, true, undefined, options);
				break;
			case 'table':
				put(conf, keys, null, null, { headers: tok.header, rows: tok.cells }, options);
				break;
			case 'html':
				val = val.replace(/\s+$/g, '');

				if (!options.oldParseApi)
				{
					val = new RawObject(val, tok);
					val.getRawData()['paragraph'] = paragraph;
				}

				put(conf, keys, val, true, undefined, options);
				break;
			default:
				//console.log(tok);

				_skip = true;

				break;
		}

		if (!_skip && !['paragraph'].includes(tok.type))
		{
			paragraph = [];
		}

		last_tok = tok;
	});

	{
		let parent;
		let parent2 = conf;
		let parent3;

		for (let i in keys)
		{
			let k = keys[i];

			if (/^\d+$/.test(k))
			{
				// @ts-ignore
				let kk = keys[i-1];

				// @ts-ignore
				let parent = getobjectbyid(keys.slice(0, i-1), conf);
				// @ts-ignore
				let obj = getobjectbyid(keys.slice(0, i), conf);

				let ok = true;

				for (let j in obj)
				{
					if (!/^\d+$/.test(j))
					{
						ok = false;
						break;
					}
				}

				if (ok)
				{
					parent[kk] = Object.values(obj);
				}
			}

		}
	}

	return conf;
}

export function getobjectbyid(a, conf)
{
	let ret = conf;
	for (let i of a)
	{
		ret = ret[i];
	}
	return ret;
}

/**
 * Add `str` to `obj` with the given `keys`
 * which represents the traversal path.
 *
 * @api private
 */
export function put(obj, keys: string[], str: string, code?: boolean, table?: ITable, options: IOptionsParse = {}, others: {
	type?: string,
} = {})
{
	let target = obj;
	let last;
	let key;

	for (let i = 0; i < keys.length; i++)
	{
		key = keys[i];
		last = target;
		target[key] = target[key] || {};
		target = target[key];
	}

	// code
	if (code)
	{
		if (!Array.isArray(last[key])) last[key] = [];
		last[key].push(str);
		return;
	}

	// table
	if (table)
	{
		if (!Array.isArray(last[key])) last[key] = [];
		for (let ri = 0; ri < table.rows.length; ri++)
		{
			let arrItem = {};
			for (let hi = 0; hi < table.headers.length; hi++)
			{
				arrItem[normalize(table.headers[hi], options)] = table.rows[ri][hi];
			}
			last[key].push(arrItem);
		}
		return;
	}

	let isKey: boolean;
	let i: number = str.indexOf(':');

	if (options.filterObjectKey)
	{
		if (typeof options.filterObjectKey == 'function')
		{
			isKey = options.filterObjectKey(str, obj, others);
		}
		else
		{
			i = str.search(options.filterObjectKey);
			isKey = i != -1;
		}
	}

	// list
	if ((isKey === false || -1 == i || others.type == 'text2'))
	{
		if (!Array.isArray(last[key])) last[key] = [];
		last[key].push(str.trim());
		return;
	}

	// map
	key = normalize(str.slice(0, i), options);
	let val = str.slice(i + 1).trim();
	target[key] = val;
}

/**
 * Normalize `str`.
 */

export function normalize(str: string, options: IOptionsParse = {}): string
{
	let key = str.replace(/\s+/g, ' ');

	if (!options.disableKeyToLowerCase)
	{
		key = key.toLowerCase();
	}

	return key.trim();
}

export function stringify(dataInput, level: number = 1, skip = [], k?): string
{
	let rs1: string[] = [];
	let rs2: string[] = [];

	let isRawObject = RawObject.isRawObject(dataInput);
	let data = dataInput;
	let desc;

	if (isRawObject)
	{
		let rawData = dataInput.getRawData();

		if (rawData.paragraph)
		{
			desc = rawData.paragraph.join(LF.repeat(2));
		}

		data = dataInput.getRawValue();
	}

	//console.log(k);

	if (Array.isArray(data))
	{
		if (k || k === 0)
		{
			rs2.push('#'.repeat(level) + '' + k + LF);

			data.forEach(function (value, index, array)
			{
				let bool = (!RawObject.isRawObject(value) && typeof value == 'object');

				rs2.push(stringify(value, level, [], bool ? index : null));
			})
		}
		else
		{
			data.forEach(function (value, index, array)
			{
				let bool = (!RawObject.isRawObject(value) && typeof value == 'object');

				rs1.push(stringify(value, level, [], bool ? index : null).replace(/\n+$/g, ''));
			});

			//rs1.push('');
		}
	}
	else if (typeof data == 'object')
	{
		if (k || k === 0)
		{
			rs1.push('#'.repeat(level) + ' ' + k + LF);
		}

		for (let k in data)
		{
			if (skip.includes(k))
			{
				continue;
			}

			let isRawObject = RawObject.isRawObject(data[k]);
			let row = isRawObject ? data[k].getRawValue() : data[k];

			if (Array.isArray(row))
			{
				rs2.push('#'.repeat(level) + ' ' + k + LF);
				rs2.push(stringify(row, level + 1));
			}
			else if (isPlainObject(row))
			{
				rs2.push('#'.repeat(level) + ' ' + k + LF);
				rs2.push(stringify(row, level + 1));
			}
			else if (moment.isMoment(row))
			{
				rs1.push(`- ${k}: ${row.format()}`);
			}
			else if (isRawObject || typeof row == 'string' && /[\r\n]|^\s/g.test(row))
			{
				let lang: string;
				let val = row;

				val = val.replace(/^[\r\n]+|\s+$/g, '');

				if (isRawObject)
				{
					let rawData = data[k].getRawData() || {};

					if (rawData.type != 'html')
					{
						lang = rawData.lang;

						val = makeCodeBlock(val, lang);
					}
					else
					{
						val = LF + val + LF;
					}
				}
				else
				{
					val = makeCodeBlock(val, lang);
				}

				rs2.push('#'.repeat(level) + ' ' + k + LF);
				rs2.push(val);
			}
			else
			{
				rs1.push(`- ${k}: ${row}`);
			}
		}
	}
	else if (isRawObject || typeof data == 'string' && /[\r\n]|^\s/g.test(data))
	{
		if (k || k === 0)
		{
			rs2.push('#'.repeat(level) + ' ' + k + LF);
		}

		if (desc)
		{
			rs2.push(desc);
		}

		let lang: string;

		let val = data;

		val = val.replace(/^[\r\n]+|\s+$/g, '');

		if (isRawObject)
		{
			let rawData = dataInput.getRawData() || {};
			lang = rawData.lang;

			if (rawData.type != 'html')
			{
				val = makeCodeBlock(val, lang);
			}
			else
			{
				val = LF + val + LF;
			}
		}
		else
		{
			val = makeCodeBlock(val, lang);
		}

		rs2.push(val);
	}
	else
	{
		if (desc)
		{
			rs1.push(desc);
		}

		rs1.push(`- ${ k || k === 0 ? k + ': ' : '' }${data}`);
	}

	let out = (rs1.concat([''].concat(rs2)).join(LF)).replace(/^\n+/g, '');

	if (level == 1)
	{
		out = out.replace(/^\n+|\s+$/g, '') + LF;
	}

	return out;
}

export function makeCodeBlock(value, lang?: string)
{
	return `\n\`\`\`${lang || ''}\n${value}\n\`\`\`\n`;
}

export class RawObject
{
	constructor(source, raw?)
	{
		if (raw)
		{
			this[SYMBOL_RAW_DATA] = raw;
		}

		this[SYMBOL_RAW_VALUE] = source;
	}

	inspect()
	{
		let pad = this[SYMBOL_RAW_DATA] && this[SYMBOL_RAW_DATA].type;

		return 'Raw' + this.getTypeof().replace(/^[a-z]/, function (s)
		{
			return s.toUpperCase();
		}) + `(${util.inspect(this.getRawValue())}${pad ? ', ' + pad : ''})`
	}

	toJSON()
	{
		return this.toString();
	}

	toString()
	{
		return this[SYMBOL_RAW_VALUE].toString();
	}

	getTypeof()
	{
		return Array.isArray(this[SYMBOL_RAW_VALUE]) ? 'array' : typeof this[SYMBOL_RAW_VALUE];
	}

	getRawData()
	{
		return this[SYMBOL_RAW_DATA];
	}

	getRawValue()
	{
		return this[SYMBOL_RAW_VALUE];
	}

	static isRawObject(v: object)
	{
		return (v instanceof RawObject);
	}

	/**
	 * will remove hidden data and get source data
	 *
	 * @param {RawObject} data
	 */
	static removeRawData(data: RawObject)
	static removeRawData(data)
	static removeRawData(data)
	{
		if (this.isRawObject(data))
		{
			data = data.getRawValue();
		}

		if (typeof data == 'object')
		{
			for (let i in data)
			{
				data[i] = this.removeRawData(data[i]);
			}
		}

		return data;
	}

}

export interface ITable
{
	headers: string[],
	rows,
}

import * as self from './core';

export default self;

export function createInlineLexer(toks: md.TokensList, options: IOptionsParse)
{
	let opts = Object.assign({}, defaultOptionsParse.markedOptions, options.markedOptions);

	// @ts-ignore
	let inline = new md.InlineLexer(toks.links, opts);

	return inline;
}