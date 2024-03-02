import React, { Component, useEffect } from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
  VSCodeButton,
  VSCodeTextArea,
  VSCodeDropdown,
  VSCodeOption,
} from '@vscode/webview-ui-toolkit/react';

import { clarifications, problemsIds } from '../../utils/getData.js';

function ClarificationsTable({
  clarifications,
  problemsIds,
  vscode,
}: {
  clarifications: clarifications;
  problemsIds: problemsIds;
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) {
  const [warning, setWarning] = React.useState('');
  const timeoutIDRef = React.useRef<NodeJS.Timeout>();

  // refs typing doesn't includes all available properties out-of-the-box
  // https://github.com/microsoft/fast/issues/6909
  const problemsDropdownRef = React.useRef<
    Component<typeof VSCodeDropdown> & HTMLElement
  >(null);
  const questionTextAreaRef = React.useRef<
    Component<typeof VSCodeDropdown> & HTMLElement
  >(null);

  useEffect(() => {
    window.addEventListener('message', (e) => {
      const message = e.data as { command: string };
      if (message.command === 'clarifications-submitted') {
        setWarning('Clarification submitted successfully.');
        timeoutIDRef.current = setTimeout(() => {
          setWarning('');
        }, 10000);
      }
    });
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (timeoutIDRef.current !== undefined) {
      clearTimeout(timeoutIDRef.current);
    }
    setWarning('');

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const problem = problemsDropdownRef.current!.getAttribute('current-value')!;
    const question =
      questionTextAreaRef.current!.getAttribute('current-value')!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (question === '') {
      setWarning('Question field cannot be empty.');
      timeoutIDRef.current = setTimeout(() => {
        setWarning('');
      }, 10000);

      return;
    }

    vscode.postMessage({
      command: 'clarifications-submit',
      problem,
      question,
    });
  }

  return (
    <>
      {clarifications.length === 0 ? (
        <p>No clarifications available.</p>
      ) : (
        <VSCodeDataGrid>
          <VSCodeDataGridRow
            rowType="header"
            style={{ textTransform: 'capitalize' }}
          >
            {['time', 'problem', 'question', 'answer'].map((column, i) => (
              <VSCodeDataGridCell
                cellType="columnheader"
                gridColumn={(i + 1).toString()}
              >
                {column}
              </VSCodeDataGridCell>
            ))}
          </VSCodeDataGridRow>

          {clarifications.map((clarification) => (
            <VSCodeDataGridRow>
              <VSCodeDataGridCell gridColumn="1">
                {clarification.time}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="2">
                {clarification.problem}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="3">
                {clarification.question}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="4">
                {clarification.answer}
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="problemsDropdown">Problem:</label>
          <VSCodeDropdown id="problemsDropdown" ref={problemsDropdownRef}>
            <VSCodeOption value="0">General</VSCodeOption>
            {problemsIds.map((problem) => (
              <VSCodeOption value={problem.id}>{problem.name}</VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        <VSCodeTextArea ref={questionTextAreaRef}>Question</VSCodeTextArea>

        <VSCodeButton type="submit">Submit</VSCodeButton>
      </form>

      <p>{warning}</p>
    </>
  );

  return;
}

export default ClarificationsTable;
