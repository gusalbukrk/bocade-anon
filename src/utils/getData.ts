import * as vscode from 'vscode';
import { getPageJSDOM } from '../utils/navigate';
import getCredentials from './getCredentials';

type problems = Awaited<ReturnType<typeof getProblems>>;
type runs = Awaited<ReturnType<typeof getRuns>>;
type clarifications = Awaited<ReturnType<typeof getClarifications>>;
type score = Awaited<ReturnType<typeof getScore>>;

async function getProblems(secrets: vscode.SecretStorage) {
  const problemsPageJSDOM = await getPageJSDOM('team/problem.php', secrets);

  const problemsTableRows = [
    ...problemsPageJSDOM.window.document.querySelectorAll(
      'table:nth-of-type(3) tr',
    ),
  ];

  // problems table will always have at least one row
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/problem.php#L54
  if (problemsTableRows.length === 1) {
    return [];
  }

  const ip = (await getCredentials(secrets)).ip;

  const problems = problemsTableRows.slice(1).map((tr) => {
    const tds = tr.querySelectorAll('td');

    const balloon = tds[0].querySelector('img')?.getAttribute('src');
    const descfileHref = tds[3].querySelector('a')?.getAttribute('href');

    return {
      name: tds[0].textContent?.trim(),
      balloon: typeof balloon === 'string' ? `http://${ip}${balloon}` : balloon,
      color: tds[0].querySelector('img')?.getAttribute('alt'),
      basename: tds[1].textContent?.trim(),
      fullname: tds[2].textContent?.trim(),
      descfile: {
        name: tds[3].querySelector('a')?.textContent,
        href:
          typeof descfileHref === 'string'
            ? `http://${ip}/boca${descfileHref.replace(/^\.{2,}/, '')}`
            : descfileHref,
      },
    };
  });

  return problems;
}

async function getRuns(secrets: vscode.SecretStorage) {
  const runsPageJSDOM = await getPageJSDOM('team/run.php', secrets);

  const runsTableRows = [
    ...runsPageJSDOM.window.document.querySelectorAll(
      'table:nth-of-type(3) tr',
    ),
  ];

  // runs table will always have at least one row
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/run.php#L321
  if (runsTableRows.length === 1) {
    return [];
  }

  const ip = (await getCredentials(secrets)).ip;

  const runs = runsTableRows.slice(1).map((tr) => {
    const tds = tr.querySelectorAll('td');

    const fileHref = tds[5].querySelector('a')?.getAttribute('href');

    return {
      run: tds[0].textContent,
      time: tds[1].textContent,
      problem: tds[2].textContent,
      language: tds[3].textContent,
      answer: tds[4].textContent?.trim(), // it has trailing space when is 'YES'
      file: {
        name: tds[5].querySelector('a')?.textContent?.trim(),
        href:
          typeof fileHref === 'string'
            ? `http://${ip}/boca${fileHref.replace(/^\.{2,}/, '')}`
            : fileHref,
      },
    };
  });

  return runs;
}

async function getClarifications(secrets: vscode.SecretStorage) {
  const clarificationsPageJSDOM = await getPageJSDOM('team/clar.php', secrets);

  const clarificationsTableRows = [
    ...clarificationsPageJSDOM.window.document.querySelectorAll(
      'table:nth-of-type(3) tr',
    ),
  ];

  // clarifications table will always have at least one row
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/clar.php#L35
  if (clarificationsTableRows.length === 1) {
    return [];
  }

  const clarifications = clarificationsTableRows.slice(1).map((tr) => {
    const tds = tr.querySelectorAll('td');

    return {
      time: tds[0].textContent,
      problem: tds[1].textContent,
      question: tds[2].querySelector('textarea')?.textContent,
      answer: tds[3].querySelector('textarea')?.textContent,
    };
  });

  return clarifications;
}

async function getScore(secrets: vscode.SecretStorage) {
  const scorePageJSDOM = await getPageJSDOM('team/score.php', secrets);

  const scoreTableRows = [
    ...scorePageJSDOM.window.document.querySelectorAll(
      'table:nth-of-type(3) tr',
    ),
  ];

  // https://github.com/cassiopc/boca/blob/master/src/scoretable.php
  if (scoreTableRows.length === 1) {
    return [];
  }

  const ip = (await getCredentials(secrets)).ip;

  const score = scoreTableRows.slice(1).map((tr) => {
    const tds = [...tr.querySelectorAll('td')];

    return {
      position: tds[0].textContent,
      usersite: tds[1].textContent,
      name: tds[2].textContent,
      problems: tds.slice(3, tds.length - 1).map((problem) => {
        const text = problem.textContent?.trim(); // will be empty if team hasn't solved the problem
        const img = problem.querySelector('img');

        return {
          text,
          ...(text !== undefined && text.length > 0
            ? {
                balloon: `http://${ip}${img?.getAttribute('src') ?? ''}`,
                color: img?.getAttribute('alt')?.replace(/:$/, ''),
              }
            : { balloon: undefined, color: undefined }),
        };
      }),
      total: tds[tds.length - 1].textContent,
    };
  });

  return score;
}

export {
  problems,
  getProblems,
  runs,
  getRuns,
  clarifications,
  getClarifications,
  score,
  getScore,
};
