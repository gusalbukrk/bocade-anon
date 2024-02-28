import * as vscode from 'vscode';
import { getPageJSDOM } from '../utils/navigate';
import getCredentials from './getCredentials';

type problems = Awaited<ReturnType<typeof getProblems>>;
type runs = Awaited<ReturnType<typeof getRuns>>;
type clarifications = Awaited<ReturnType<typeof getClarifications>>;
type score = Awaited<ReturnType<typeof getScore>>;
type allowedProgrammingLanguages = Awaited<
  ReturnType<typeof getAllowedProgrammingLanguages>
>;

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

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    // `.getAttribute()` only returns null if attribute does not exist on element, if attribute
    // exists, returns string (empty string if attribute has no value)
    return {
      name: tds[0].textContent!.trim(),
      // there'll always be a balloon img, even if admin didn't specified a color code
      // for the problem (in this case, balloon is transparent)
      balloon: `http://${ip}${tds[0].querySelector('img')!.getAttribute('src')!}`,
      // balloon img will always have an alt attribute
      // (although it'll be empty if admin din't specified the color name)
      color: tds[0].querySelector('img')!.getAttribute('alt')!,
      // problems packages must always include a `description/problem.info` file containing
      // both basename and fullname, otherwise the problem won't show up in the teams problems
      // and will show up in the admin problems table with fullname `PROBLEM PACKAGE SEEMS INVALID`
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/fproblem.php#L178
      basename: tds[1].textContent!.trim(),
      fullname: tds[2].textContent!.trim(),
      descfile:
        tds[3].textContent === 'no description file available'
          ? null
          : {
              name: tds[3].querySelector('a')!.textContent!,
              href: `http://${ip}/boca${tds[3]
                .querySelector('a')!
                .getAttribute('href')!
                .replace(/^\.{2,}/, '')}`,
            },
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
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

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    // `.getAttribute()` only returns null if attribute does not exist on element, if attribute
    // exists, it returns a string (empty string if attribute has no value)
    return {
      run: tds[0].textContent!,
      time: tds[1].textContent!,
      problem: tds[2].textContent!,
      language: tds[3].textContent!,
      answer: tds[4].textContent!.trim(), // it has trailing space when is 'YES'
      file: {
        name: tds[5].querySelector('a')!.textContent!.trim(),
        href: `http://${ip}/boca${tds[5]
          .querySelector('a')!
          .getAttribute('href')!
          .replace(/^\.{2,}/, '')}`,
      },
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
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

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    return {
      time: tds[0].textContent!,
      problem: tds[1].textContent!,
      // it's not possible to submit an clarification with empty answer field
      // even if it were, `.textContent` would return an empty string
      question: tds[2].querySelector('textarea')!.textContent!,
      // when answer has not been given yet, content is not empty
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/clar.php#L62
      answer: tds[3].querySelector('textarea')!.textContent!,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
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

  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/scoretable.php#L320
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/fscore.php#L305
  // line of code below not needed because score table will never be empty; as long there're teams
  // registered in a competition (and they've logged in), they'll show up in the score table
  // even if no problem has been solved or scoreboard in frozen (`Stop scoreboard` setting)
  // if (scoreTableRows.length === 1) return [];

  const ip = (await getCredentials(secrets)).ip;

  const score = scoreTableRows.slice(1).map((tr) => {
    const tds = [...tr.querySelectorAll('td')];

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    // `.getAttribute()` only returns null if attribute does not exist on element, if attribute
    // exists, it returns a string (empty string if attribute has no value)
    return {
      position: tds[0].textContent!,
      // usersite.textContent is composed by string `${username}/${site}`
      // users always have a site
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/fcontest.php#L1254
      // but it's possible to have an user which doesn't have an username
      // however, such users cannot log in and only users which have logged in appear in score table
      usersite: tds[1].textContent!,
      // name column contains the user's fullname
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/scoretable.php#L354
      // it's possible for an user to not have a fullname; in this case, textContent is an empty string
      name: tds[2].textContent!,
      problems: tds.slice(3, tds.length - 1).map((problemTd) => {
        // if team has no judged run for the problem, column will be empty
        // (more specifically, `&nbsp;&nbsp;`);
        // if team has judged runs for the problem but none of them have been judged as correct,
        // column will only have a font element (containing `${count}/${time]}`)
        // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/scoretable.php#L395
        // if team has a run judged as correct for the problem, column will have 1 img and 1 font
        // elements as children
        const len = problemTd.children.length;

        if (len === 0) {
          return null;
        }

        const text = problemTd.querySelector('font')!.textContent!;

        if (len === 1) {
          return text;
        }

        const img = problemTd.querySelector('img')!;

        return {
          text,
          balloon: `http://${ip}${img.getAttribute('src')}`,
          color: img.getAttribute('alt')!.replace(/:$/, ''),
        };
      }),
      // even if team hasn't scored, textContent won't be empty (will contain '0 (0)')
      total: tds[tds.length - 1].textContent!,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });

  return score;
}

async function getAllowedProgrammingLanguages(secrets: vscode.SecretStorage) {
  const runPageJSDOM = await getPageJSDOM('team/run.php', secrets);

  const runsFormLanguageOptions = [
    ...runPageJSDOM.window.document.querySelectorAll<HTMLOptionElement>(
      'form select[name="language"] option',
    ),
  ];

  const allowedProgrammingLanguages = runsFormLanguageOptions
    .slice(1)
    .map((option) => {
      return {
        id: option.value,
        name: option.text,
      };
    });

  return allowedProgrammingLanguages;
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
  allowedProgrammingLanguages,
  getAllowedProgrammingLanguages,
};
