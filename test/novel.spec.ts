import * as fs from 'fs-extra';
import { readFile } from 'fs-extra';
import novelInfo from '../index';
import { join } from 'path';

test(`novel`, async () =>
{

	let actual = await readFile(join(__dirname, './res/README.md')).then(function (buf)
	{
		return novelInfo.parse(buf, {
			//chk: false
		});
	});

	expect(actual).toMatchSnapshot();
	expect(novelInfo.stringify(actual)).toMatchSnapshot();

});
