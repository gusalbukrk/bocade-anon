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

      {score.map((team) => (
        <VSCodeDataGridRow>
          <VSCodeDataGridCell gridColumn="1">
            {team.position}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="2">
            {team.usersite}
          </VSCodeDataGridCell>
          <VSCodeDataGridCell gridColumn="3">{team.name}</VSCodeDataGridCell>
          {team.problems.map((problem, i) => (
            <VSCodeDataGridCell gridColumn={(4 + i).toString()}>
              {problem === null ? (
                ''
              ) : typeof problem === 'string' ? (
                problem
              ) : (
                <>
                  <img src={problem.balloon} alt={problem.color} width="18" />
                  <span>{problem.text}</span>
                </>
              )}
            </VSCodeDataGridCell>
          ))}
          <VSCodeDataGridCell
            gridColumn={(4 + team.problems.length).toString()}
          >
            {team.total}
          </VSCodeDataGridCell>
        </VSCodeDataGridRow>
      ))}
    </VSCodeDataGrid>
  );
}

export default ClarificationsTable;
