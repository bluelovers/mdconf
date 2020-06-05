import fs from 'fs-extra';
import path from 'path';
import FastGlob from '@bluelovers/fast-glob';

const TEST_CASES_DIRECTORY = path.join(__dirname, 'cases');



export function getTestCasesSync()
{
	const directories = FastGlob.sync<string>([
		'**/*.md',
	], {
		cwd: TEST_CASES_DIRECTORY,
	})

	const testCases: {
		json: any,
		md: string,
		testName: string,
	}[] = [];

	for (let i = 0; i < directories.length; i++)
	{
		const filename = directories[i];

		if (filename.indexOf('.json') !== -1) continue;

		if (filename.indexOf('.md') !== -1)
		{
			const testName = filename.slice(0, filename.lastIndexOf('.'));
			const jsonFile = fs.readJSONSync(
				resolveTestCaseFile(testName + '.json'),
			);
			const markdownFile = fs.readFileSync(
				resolveTestCaseFile(filename), 'utf-8',
			);
			testCases.push({ json: jsonFile, md: markdownFile, testName });
		}
	}

	return testCases;
}

/**
 * Returns all the test cases in the directory
 * asynchronously as an array of different attributes of testCase
 */
export async function getTestCases()
{
	const directories = await fs.readdir(TEST_CASES_DIRECTORY);
	const testCases: {
		json: any,
		md: string,
		testName: string,
	}[] = [];

	for (let i = 0; i < directories.length; i++)
	{
		const filename = directories[i];

		if (filename.indexOf('.json') !== -1) continue;

		if (filename.indexOf('.md') !== -1)
		{
			const testName = filename.slice(0, filename.lastIndexOf('.'));
			const jsonFile = await fs.readJSON(
				resolveTestCaseFile(testName + '.json'),
			);
			const markdownFile = await fs.readFile(
				resolveTestCaseFile(filename), 'utf-8',
			);
			testCases.push({ json: jsonFile, md: markdownFile, testName });
		}
	}

	return testCases;
}

export function resolveTestCaseFile(filename: string)
{
	return path.resolve(TEST_CASES_DIRECTORY, filename);
}

