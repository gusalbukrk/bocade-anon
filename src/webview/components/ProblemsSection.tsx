import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { problems } from '../../utils/getData.js';

function ProblemsSection({
  problems,
  handleDownloadLinkClick,
}: {
  problems: problems;
  handleDownloadLinkClick: (
    e: React.MouseEvent<HTMLAnchorElement> & { target: HTMLAnchorElement },
  ) => void;
}) {
  return (
    <section id="problems">
      <h2>Problems</h2>
      {problems.length === 0 ? (
        <p>No problems available yet.</p>
      ) : (
        <VSCodeDataGrid>
          <VSCodeDataGridRow rowType="header">
            {['balloon', 'name', 'basename', 'fullname', 'descfile'].map(
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

          {problems.map((problem) => (
            <VSCodeDataGridRow>
              <VSCodeDataGridCell gridColumn="1">
                <img
                  width="20"
                  src={problem.balloon.url}
                  alt={problem.balloon.color}
                  title={problem.balloon.color}
                />
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="2">
                {problem.name}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="3">
                {problem.basename}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="4">
                {problem.fullname}
              </VSCodeDataGridCell>
              <VSCodeDataGridCell gridColumn="5">
                {problem.descfile === null ? (
                  'No description file available'
                ) : (
                  <a
                    href={problem.descfile.url}
                    onClick={handleDownloadLinkClick}
                  >
                    {problem.descfile.name}
                  </a>
                )}
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
          ))}
        </VSCodeDataGrid>
      )}
    </section>
  );
}

export default ProblemsSection;
