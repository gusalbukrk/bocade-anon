import React, { useEffect, useState } from 'react';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { Result } from 'compile-run';

import TestCase from './TestCase.js';
import { generateWarning } from '../shared.js';
import { sourceCodeExtensions, testCases } from '../../shared.js';

type ranMessage = {
  command: 'ran';
  results: Result[];
};

type extractedMessage = {
  command: 'extracted';
  testCasesArr: [string, string][];
};

type currentTabChangedMessage = {
  command: 'currentTabChanged';
  currentTabLabel: string | undefined;
};

const isAnyDetailsExpanded = (expanded: boolean[]) => expanded.some((e) => e);

const TestCases = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  // warning is undefined when there're no test cases, tests cases haven't been run or
  // test cases have been changed since last run (i.e. new test case has been added or
  // a test case input or expected output has been updated)
  const [warning, setWarningBase] = useState<string>();

  const [testCases, setTestCasesBase] = useState<testCases>([]);
  const setTestCasesAndWarning = (
    newTestCases: testCases,
    warning: undefined | string,
  ) => {
    setTestCasesBase(newTestCases);
    setWarningBase(warning);
  };

  const [expanded, setExpanded] = useState<boolean[]>([]);

  const [currentTabLabel, setCurrentTabLabel] = useState<string | undefined>();
  const isCurrentTabPdf = () => currentTabLabel?.split('.').at(-1) === 'pdf';
  const isCurrentTabSourceCodeFile = () =>
    (sourceCodeExtensions as unknown as string[]).includes(
      currentTabLabel?.split('.').at(-1) ?? '',
    );

  // code execution or PDF extraction is in progress
  const [isInProgress, setIsInProgress] = useState(false);

  useEffect(() => {
    window.addEventListener('message', messageEventHandler);

    return () => {
      window.removeEventListener('message', messageEventHandler);
    };
  }, [testCases]);

  function messageEventHandler(event: MessageEvent) {
    const message = event.data as
      | ranMessage
      | extractedMessage
      | currentTabChangedMessage;

    if (message.command === 'ran') {
      const newTestCases = [...testCases];

      message.results.forEach((result, i) => {
        newTestCases[i].output = result.stdout.replace(/\r\n/g, '\n');

        if (result.errorType !== undefined) {
          let type: string;

          switch (result.errorType) {
            case 'compile-time':
              type = 'Compilation error';
              break;
            case 'run-time':
              type = 'Runtime error';
              break;
            case 'pre-compile-time':
              type = 'Pre-compilation error';
              break;
            case 'run-timeout':
              type = 'Runtime timeout';
          }

          newTestCases[i].error =
            `${type.toUpperCase()} ${result.stderr.replace(/\r\n/g, '\n')}`;
        } else {
          newTestCases[i].error = '';
        }
      });

      setTestCasesAndWarning(newTestCases, generateWarning(newTestCases));
      setIsInProgress(false);
    } else if (message.command === 'extracted') {
      const newTestCases = [...testCases];
      const newExpanded = [...expanded];

      message.testCasesArr.forEach((tc) => {
        newTestCases.push({
          // before code execution, compile-run library appends `\r\n` to input
          // https://github.com/vibhor1997a/compile-run/blob/72b9655d25b514e0b3bf72bbb33323cefa3fbb0c/lib/sdtin-write.ts#L14
          //
          // must append `\n` otherwise error when running python code that takes a string as input
          // `input()` expects `\n` as trailing newline
          // as such, `\r` would be treated as part of the string
          input: tc[0] + '\n',

          expectedOutput: tc[1] + '\n',
          output: '',
          error: '',
        });
        newExpanded.push(true);
      });

      setTestCasesAndWarning(newTestCases, undefined);
      setExpanded(newExpanded);
      setIsInProgress(false);
    } else {
      setCurrentTabLabel(message.currentTabLabel);
    }
  }

  function handleRunButtonClick() {
    setIsInProgress(true);
    vscode.postMessage({
      command: 'run',
      testCases,
    });
  }

  function handleCreateTestCaseButtonClick() {
    setTestCasesAndWarning(
      [
        ...testCases,
        {
          input: '',
          expectedOutput: '',
          output: '',
          error: '',
        },
      ],
      undefined,
    );
    setExpanded([...expanded, true]);
  }

  function handleToggleAllButtonClick() {
    const e = !isAnyDetailsExpanded(expanded);
    setExpanded(expanded.map(() => e));
  }

  function handleExtractButtonClick() {
    setIsInProgress(true);
    vscode.postMessage({
      command: 'extract',
    });
  }

  function handleClearButtonClick() {
    setTestCasesAndWarning([], undefined);
    setExpanded([]);
  }

  return (
    <main>
      {testCases.length === 0 ? (
        <p id="empty">No test cases yet.</p>
      ) : (
        testCases.map((tc, i) => (
          <TestCase
            index={i}
            testCases={testCases}
            setTestCasesAndWarning={setTestCasesAndWarning}
            warning={warning}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        ))
      )}

      <section id="buttons">
        <div>
          {testCases.length > 0 && (
            <VSCodeButton
              appearance="secondary"
              onClick={handleToggleAllButtonClick}
              title={`${isAnyDetailsExpanded(expanded) ? 'Collapse' : 'Expand'} all test cases`}
            >
              {isAnyDetailsExpanded(expanded) ? (
                <>
                  Collapse
                  <span
                    slot="start"
                    className="codicon codicon-chevron-up"
                  ></span>
                </>
              ) : (
                <>
                  Expand
                  <span
                    slot="start"
                    className="codicon codicon-chevron-down"
                  ></span>
                </>
              )}
            </VSCodeButton>
          )}
          <VSCodeButton
            appearance="secondary"
            onClick={handleCreateTestCaseButtonClick}
            title="Create a new test case"
          >
            Create
            <span slot="start" className="codicon codicon-add"></span>
          </VSCodeButton>
          {testCases.length > 0 && (
            <VSCodeButton
              appearance="secondary"
              onClick={handleClearButtonClick}
              title="Delete all test cases"
            >
              Clear
              <span slot="start" className="codicon codicon-trash"></span>
            </VSCodeButton>
          )}
        </div>

        <div>
          <VSCodeButton
            onClick={handleExtractButtonClick}
            title={
              isCurrentTabPdf()
                ? `Extract test cases from ${currentTabLabel}`
                : "It's only possible to extract test cases from a PDF file"
            }
            disabled={isInProgress || !isCurrentTabPdf()}
          >
            Extract
            <span slot="start" className="codicon codicon-gather"></span>
          </VSCodeButton>
          <VSCodeButton
            onClick={handleRunButtonClick}
            title={
              isCurrentTabSourceCodeFile()
                ? testCases.length > 0
                  ? `Run ${currentTabLabel} against test cases`
                  : 'No test cases to run'
                : "It's only possible to run test cases against a source code file"
            }
            disabled={
              isInProgress ||
              !isCurrentTabSourceCodeFile() ||
              testCases.length === 0
            }
          >
            Run
            <span slot="start" className="codicon codicon-run-all"></span>
          </VSCodeButton>
        </div>
      </section>

      <p id="warning">{warning}</p>
    </main>
  );
};

export default TestCases;
