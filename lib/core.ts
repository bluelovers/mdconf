/**
 * Created by user on 2020/1/15.
 */

import { Token, Tokens, InlineLexer, TokensList } from 'marked';
import { ITokenText2, RawObject, IRawObjectDataPlus } from './RawObject';
import { IOptionsParse, defaultOptionsParse } from '../core';

export function getobjectbyid<T extends unknown>(a: string[], conf: object): T
{
	let ret = conf as any;
	for (let i of a)
	{
		ret = ret[i];
	}
	return ret;
}

export interface ITable
{
	headers: Tokens.Table["header"],
	rows: Tokens.Table["cells"],
}

/**
 * Add `str` to `obj` with the given `keys`
 * which represents the traversal path.
 *
 * @api private
 */
export function put(obj,
	keys: string[],
	str: string,
	code?: boolean,
	table?: ITable,
	options: IOptionsParse = {},
	others: {
		type?: (Token | ITokenText2)["type"],
	} = {},
)
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
			let arrItem = {} as Record<string, string>;
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

export function makeCodeBlock(value, lang?: Tokens.Code["lang"])
{
	return `\n\`\`\`${lang || ''}\n${value}\n\`\`\`\n`;
}

export function createInlineLexer(toks: TokensList, options: IOptionsParse)
{
	let opts = Object.assign({}, defaultOptionsParse.markedOptions, options.markedOptions);

	// @ts-ignore
	let inline = new InlineLexer(toks.links, opts);

	return inline;
}
