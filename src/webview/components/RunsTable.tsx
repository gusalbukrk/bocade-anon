import React, { useRef } from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeButton,
} from '@vscode/webview-ui-toolkit/react';

import { allowedProgrammingLanguages, runs } from '../../utils/getData.js';

function RunsTable({
  runs,
  problemsNames,
  allowedProgrammingLanguages,
  handleDownloadLinkClick,
  vscode,
}: {
  runs: runs;
  problemsNames: string[];
  allowedProgrammingLanguages: allowedProgrammingLanguages;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string>();

  function handleFileUploadButtonClick() {
    if (fileInputRef.current !== null) {
      // when user exits the file dialog without choosing a file, file input value is set to empty
      // however, input change event isn't triggered; thus, selectedFileName isn't updated
      //
      // preemptively reset both input value and selectedFileName right before opening file dialog
      fileInputRef.current.value = '';
      setSelectedFileName(undefined);

      fileInputRef.current.click();
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFileName(e.target.files?.[0].name);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const problem = form
      .querySelector('#problemsDropdown')
      ?.getAttribute('current-value');
    const language = form
      .querySelector('#languagesDropdown')
      ?.getAttribute('current-value');

    // getting file path from input file isn't possible in browsers, but it is in Electron
    // https://github.com/electron/electron/blob/main/docs/api/file-object.md
    // however, `File.path` is deprecated and `webUtils.getPathForFile` should be used instead
    // https://www.electronjs.org/docs/latest/api/web-utils#webutilsgetpathforfilefile
    // however, it's a export from `electron` module, which doesn't run on client-side code
    // alternatives for when `File.path` gets removed:
    // (1) pass `file.text()` to extension and let it create a temporary new file in the filesystem
    // (2) explore if it's possible to use `window.showOpenDialog` to pick a file
    // (https://code.visualstudio.com/api/references/vscode-api#window.showOpenDialog)
    const file = form.querySelector<HTMLInputElement>('input[type="file"]')
      ?.files?.[0] as File & { path: string };
    const filePath = file.path;
    const fileType = file.type;

    vscode.postMessage({
      command: 'runs-submit',
      problem,
      language,
      file: { path: filePath, type: fileType },
    });
  }

  return (
    <>
      <VSCodeDataGrid>
        <VSCodeDataGridRow
          rowType="header"
          style={{ textTransform: 'capitalize' }}
        >
          {['run', 'time', 'problem', 'language', 'answer', 'file'].map(
            (column, i) => (
              <VSCodeDataGridCell
                cellType="columnheader"
                gridColumn={(i + 1).toString()}
              >
                {column}
              </VSCodeDataGridCell>
            ),
          )}
        </VSCodeDataGridRow>

        {runs.map((run) => (
          <VSCodeDataGridRow>
            <VSCodeDataGridCell gridColumn="1">{run.run}</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="2">{run.time}</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="3">
              {run.problem}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="4">
              {run.language}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="5">{run.answer}</VSCodeDataGridCell>
            <VSCodeDataGridCell gridColumn="6">
              <a href={run.file.href ?? ''} onClick={handleDownloadLinkClick}>
                {run.file.name}
              </a>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
        ))}
      </VSCodeDataGrid>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="problemsDropdown">Problem:</label>
          <VSCodeDropdown id="problemsDropdown">
            <VSCodeOption value="-1">--</VSCodeOption>
            {problemsNames.map((problem, i) => (
              <VSCodeOption value={(i + 1).toString()}>{problem}</VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        <div>
          <label htmlFor="languagesDropdown">Language:</label>
          <VSCodeDropdown id="languagesDropdown">
            {allowedProgrammingLanguages.map((language) => (
              <VSCodeOption value={language.id ?? ''}>
                {language.name}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>

        {/* there's no input type file in toolkit
        https://github.com/microsoft/vscode-webview-ui-toolkit/issues/254 */}
        <input
          type="file"
          name="sourcefile"
          id="sourcefile"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <VSCodeButton
          style={{ width: '120px' }}
          onClick={handleFileUploadButtonClick}
        >
          Choose file
          <span className="codicon codicon-add"></span>
        </VSCodeButton>

        <span>{selectedFileName ?? 'No file chosen.'}</span>

        <VSCodeButton type="submit">Submit</VSCodeButton>
      </form>
    </>
  );
}

export default RunsTable;
