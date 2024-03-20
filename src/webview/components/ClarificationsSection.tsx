import React, { useEffect, useState, useRef } from 'react';
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
import useWarning from '../hooks/useWarning.js';

function ClarificationsSection({
  clarifications,
  problemsIds,
  vscode,
  setIsReloading,
}: {
  clarifications: clarifications;
  problemsIds: problemsIds;
  vscode: ReturnType<typeof acquireVsCodeApi>;
  setIsReloading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { Warning, setWarning } = useWarning();

  // using refs instead of state in forms fields (i.e. controlled components) because
  // it's a simpler approach (https://stackoverflow.com/a/34622774)
  //
  // refs typing doesn't includes all available properties out-of-the-box
  // https://github.com/microsoft/fast/issues/6909
  const problemsDropdownRef = useRef<
    React.Component<typeof VSCodeDropdown> & HTMLElement
  >(null);
  const questionTextAreaRef = useRef<
    React.Component<typeof VSCodeDropdown> & HTMLElement
  >(null);

  useEffect(() => {
    window.addEventListener('message', (e) => {
      const message = e.data as { command: string };
      if (message.command === 'clarification-submitted') {
        setWarning('Clarification submitted successfully.', false);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        problemsDropdownRef.current!.setAttribute('current-value', '0');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        questionTextAreaRef.current!.setAttribute('current-value', '');

        setIsSubmitting(false);
        setIsReloading(true);
      }
    });
  }, []);

  function handleSubmit() {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const problem = problemsDropdownRef.current!.getAttribute('current-value')!;
    const question = questionTextAreaRef
      .current!.getAttribute('current-value')!
      .trim();
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    if (question === '') {
      setWarning('Question field cannot be empty.', true);
      return;
    }

    setIsSubmitting(true);

    vscode.postMessage({
      command: 'submit-clarification',
      problem,
      question,
    });
  }

  return (
    <section id="clarifications">
      {clarifications.length === 0 ? (
        <p>No clarifications available.</p>
      ) : (
        <VSCodeDataGrid>
          <VSCodeDataGridRow rowType="header">
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
              {/* `white-space-collapse: preserve-breaks;` was explored as an alternative
              to preserve line breaks, however it preserves source code line breaks which
              resulted in table cells having a leading and a trailing blank line*/}
              <VSCodeDataGridCell
                gridColumn="3"
                dangerouslySetInnerHTML={{
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  __html: clarification.question.replace(/\n/g, '</br>'),
                }}
              ></VSCodeDataGridCell>
              <VSCodeDataGridCell
                gridColumn="4"
                dangerouslySetInnerHTML={{
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  __html: clarification.answer.replace(/\n/g, '</br>'),
                }}
              ></VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      )}

      <aside className="form-container">
        <h3>Submit new clarification</h3>

        <form className={isSubmitting ? 'disabled' : ''}>
          <div>
            <label htmlFor="clarificationsProblemsDropdown">Problem</label>
            <VSCodeDropdown
              id="clarificationsProblemsDropdown"
              ref={problemsDropdownRef}
              disabled={isSubmitting}
            >
              <VSCodeOption value="0">General</VSCodeOption>
              {problemsIds.map((problem) => (
                <VSCodeOption value={problem.id}>{problem.name}</VSCodeOption>
              ))}
            </VSCodeDropdown>
          </div>

          <VSCodeTextArea
            ref={questionTextAreaRef}
            rows={5}
            disabled={isSubmitting}
          >
            Question
          </VSCodeTextArea>

          {/* previously, event handler `handleSubmit()` was attached to form's `onSubmit`
        and VSCodeButton had attribute `type` set to `submit`, however this was causing
        2 problems — `enter` key press while editing textarea was triggering submit
        and `enter` key press while focusing on submit button was triggering submit twice — ergo,
        `handleSubmit()` was moved to VSCodeButton's `onClick` */}
          <VSCodeButton onClick={handleSubmit} disabled={isSubmitting}>
            Submit
          </VSCodeButton>
        </form>

        <Warning />
      </aside>
    </section>
  );

  return;
}

export default ClarificationsSection;
