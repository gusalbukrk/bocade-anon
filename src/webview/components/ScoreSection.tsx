import React from 'react';
import {
  VSCodeDataGrid,
  VSCodeDataGridRow,
  VSCodeDataGridCell,
} from '@vscode/webview-ui-toolkit/react';

import { score } from '../../utils/getData.js';

function ScoreSection({
  problemsNames,
  score,
}: {
  problemsNames: string[];
  score: score;
}) {
  return (
    <section id="score">
      <h2>Score</h2>
      <VSCodeDataGrid>
        <VSCodeDataGridRow rowType="header">
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
                    <img
                      src={problem.balloon.url}
                      alt={problem.balloon.color}
                      title={problem.balloon.color}
                      width="18"
                    />
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
    </section>
  );
}

export default ScoreSection;
