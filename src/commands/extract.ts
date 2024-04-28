import * as vscode from 'vscode';
import * as runner from 'compile-run';

import TestCasesWebviewViewProvider from '../view/backend/TestCasesWebviewViewProvider';

const splitInChunksOfTwo = (arr: string[]) =>
  arr.reduce<unknown[][]>((acc, cur, index) => {
    const chunkIndex = Math.floor(index / 2);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (acc[chunkIndex] === undefined) {
      acc.push([]);
    }
    acc[chunkIndex].push(cur);

    return acc;
  }, []) as [string, string][];

const inputRegexBase = /^((exemplos? de |sample )?(entradas?|inputs?))/i;
const outputRegexBase = /^((exemplos? de |sample )?(sa(í|´ı)das?|outputs?))/i;
const inputRowRegex = new RegExp(
  `${inputRegexBase.source}$`,
  inputRegexBase.flags,
);
const outputRowRegex = new RegExp(
  `${outputRegexBase.source}$`,
  outputRegexBase.flags,
);
const inputAtStartRegex = new RegExp(
  `${inputRegexBase.source}( [0-9]+)?\\n`,
  inputRegexBase.flags,
);
const outputAtStartRegex = new RegExp(
  `${outputRegexBase.source}( [0-9]+)?\\n`,
  outputRegexBase.flags,
);

// headers are rows or substrings that're not part of the input/output data
// but instead describe it as such
const removeHeaders = (testCases: [string, string][]) => {
  // remove header rows, e.g. `[ ["Exemplos de Entrada", "Exemplos de Saída"], ... ]`
  const headerRowsRemoved = testCases.filter(([input, output]) => {
    return !inputRowRegex.test(input) || !outputRowRegex.test(output);
  });

  // remove header substrings at the start of input and output
  // e.g.: `[ ["Sample input 1\n1 5\n5 3 2 1 4", "Sample output 1\n5"], ... ]`
  const headerSubstringsRemoved = headerRowsRemoved.map(([input, output]) => {
    return [
      input.replace(inputAtStartRegex, ''),
      output.replace(outputAtStartRegex, ''),
    ];
  });

  return headerSubstringsRemoved;
};

const extract = async (testCasesProvider: TestCasesWebviewViewProvider) => {
  type pdfInput = {
    uri: {
      fsPath: string;
    };
    viewType: 'pdf.preview';
  };

  const input = vscode.window.tabGroups.activeTabGroup.activeTab
    ?.input as Record<string, unknown>;

  if (input.viewType !== 'pdf.preview') {
    return;
  }

  const path = (input as pdfInput).uri.fsPath.replace(/\\/g, '\\\\');

  const result = await runner.python.runSource(
    `import pdfplumber

pdf = pdfplumber.open('${path}')

t = []

for page in pdf.pages:
	t += page.extract_tables()

print(t)`,
    {
      executionPath: 'python3',
    },
  );

  console.log('extraction result:', result);

  const testCasesArr = removeHeaders(
    splitInChunksOfTwo(
      // line breaks in the middle of the stdout are represented by a `\\n`
      // also, stdout always ends with a unescaped `\n`
      (JSON.parse(result.stdout.replaceAll("'", '"')) as unknown[]).flat(
        Infinity,
      ) as string[],
    ),
  );

  await testCasesProvider.getView()?.webview.postMessage({
    command: 'extracted',
    testCasesArr,
  });
};

export default extract;
