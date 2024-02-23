import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { score } from '../../utils/getData.js';

function ClarificationsTable({
  problemsNames,
  score,
}: {
  problemsNames: string[];
  score: score;
}) {
  return (
    <VSCodeDataGrid>
      <VSCodeDataGridRow
        rowType="header"
        style={{ textTransform: 'capitalize' }}
      >
        {['#', 'user/site', 'name', ...problemsNames, 'total'].map(
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

      {score.map((s) => (
        <VSCodeDataGridRow>
          <VSCodeDataGridCell gridColumn="1">{s.position}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="2">{s.usersite}</VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="3">{s.name}</VSCodeDataGridCell>
          {s.problems.map((problem, i) => (
            <VSCodeDataGridCell gridColumn={(4 + i).toString()}>
              {problem.text === '' ? (
                ''
              ) : (
                <>
                  <img
                    src={problem.balloon ?? ''}
                    alt={problem.color ?? ''}
                    width="18"
                  />
                  <span>{problem.text}</span>
                </>
              )}
            </VSCodeDataGridCell>
          ))}
          <VSCodeDataGridCell gridColumn={(4 + s.problems.length).toString()}>
            {s.total}
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      ))}
    </VSCodeDataGrid>
  );
}

export default ClarificationsTable;
