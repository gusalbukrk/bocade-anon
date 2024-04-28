import React from 'react';
import { VSCodeButton, VSCodeTextArea } from '@vscode/webview-ui-toolkit/react';

import { generateWarning } from '../shared.js';
import { testCases } from '../../shared.js';

function calcRows(str: string) {
  return (str.match(/\n/g) ?? []).length + 1;
}

const TestCase = ({
  index,
  testCases,
  warning,
  setTestCasesAndWarning,
  expanded,
  setExpanded,
}: {
  index: number;
  testCases: testCases;
  warning: string | undefined;
  setTestCasesAndWarning: (
    testCases: testCases,
    warning: undefined | string,
  ) => void;
  expanded: boolean[];
  setExpanded: React.Dispatch<React.SetStateAction<boolean[]>>;
}) => {
  const isPassing =
    testCases[index].error === '' &&
    testCases[index].expectedOutput === testCases[index].output;

  function handleTextAreaInput(e: Event | React.FormEvent<HTMLElement>) {
    const textarea = e.target as HTMLTextAreaElement;
    const prop = textarea.dataset.prop as 'input' | 'expectedOutput';

    const newTestCases = [...testCases];
    newTestCases[index][prop] = textarea.value;
    setTestCasesAndWarning(newTestCases, undefined);
  }

  function handleDeleteButtonClick(e: Event | React.FormEvent<HTMLElement>) {
    // delete button is inside the summary element, so prevent the details element from toggling
    e.preventDefault();
    e.stopPropagation();

    const newTestCases = testCases.filter((tc, i) => i !== index);

    setTestCasesAndWarning(
      newTestCases,
      warning === undefined ? undefined : generateWarning(newTestCases),
    );
    setExpanded(expanded.filter((e, i) => i !== index));
  }

  // how to control a details element with React
  // https://github.com/facebook/react/issues/15486#issuecomment-873516817
  function handleDetailsToggle(e: Event | React.FormEvent<HTMLElement>) {
    e.preventDefault();

    const newExpanded = [...expanded];
    newExpanded[index] = !newExpanded[index];
    setExpanded(newExpanded);
  }

  return (
    <article
      className={warning === undefined ? '' : isPassing ? 'pass' : 'fail'}
    >
      <details open={expanded[index]}>
        <summary onClick={handleDetailsToggle}>
          <div>
            <h4>
              Test Case {index + 1}
              {warning !== undefined && (
                <span
                  className={
                    isPassing
                      ? 'codicon codicon-check'
                      : 'codicon codicon-close'
                  }
                ></span>
              )}
            </h4>
            <VSCodeButton
              appearance="icon"
              title={`Delete test case ${index + 1}`}
              onClick={handleDeleteButtonClick}
            >
              <span className={'codicon codicon-trash'}></span>
            </VSCodeButton>
          </div>
        </summary>
        <div>
          <VSCodeTextArea
            data-prop="input"
            value={testCases[index].input}
            rows={calcRows(testCases[index].input)}
            onInput={handleTextAreaInput}
          >
            Input
          </VSCodeTextArea>
        </div>
        <div>
          <VSCodeTextArea
            data-prop="expectedOutput"
            value={testCases[index].expectedOutput}
            rows={calcRows(testCases[index].expectedOutput)}
            onInput={handleTextAreaInput}
          >
            Expected Output
          </VSCodeTextArea>
        </div>
        {warning !== undefined && (
          <>
            <div>
              <p>Output</p>
              {/* when using pre-wrap (and any other value for white-space other than pre)
              end-of-line spaces aren't preserved https://stackoverflow.com/q/43492826
              by appending a newline, we can make sure that (1) in non-empty outputs, there'll
              be 2 trailing newlines and therefore one will be preserved (2) in empty outputs,
              output will have the height of one line */}
              <div>{testCases[index].output + '\n'}</div>
            </div>
            <div>
              {testCases[index].error !== '' && (
                <>
                  <p>Error</p>
                  <div>{testCases[index].error}</div>
                </>
              )}
            </div>
          </>
        )}
      </details>
    </article>
  );
};

export default TestCase;
