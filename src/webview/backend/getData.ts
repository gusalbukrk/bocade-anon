import * as vscode from 'vscode';
import jsdom from 'jsdom';
import { getPageJsdom } from './navigate';
import getCredentials from './getCredentials';

async function getProblems(secrets: vscode.SecretStorage) {
  const problemsPageJsdom = await getPageJsdom('team/problem.php', secrets);

  const problemsTableRows = [
    ...problemsPageJsdom.window.document.querySelectorAll(
      // problem table always have at least 1 row (header row) which mustn't be included in return
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/problem.php#L54
      'table:nth-of-type(3) tr:not(:first-child)',
    ),
  ];

  const ip = (await getCredentials(secrets)).ip;

  const problems = problemsTableRows.map((tr) => {
    const tds = tr.querySelectorAll('td');

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    // `.getAttribute()` only returns null if attribute does not exist on element, if attribute
    // exists, returns string (empty string if attribute has no value)
    return {
      name: tds[0].textContent!.trim(),
      balloon: {
        // there'll always be a balloon img, even if admin didn't specified a color code
        // for the problem (in this case, balloon is transparent)
        url: `http://${ip}${tds[0].querySelector('img')!.getAttribute('src')!}`,
        // balloon img will always have an alt attribute
        // (although it'll be empty if admin din't specified the color name)
        color: tds[0].querySelector('img')!.getAttribute('alt')!,
      },
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
              url: `http://${ip}/boca${tds[3]
                .querySelector('a')!
                .getAttribute('href')!
                .replace(/^\.{2,}/, '')}`,
            },
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });

  return problems;
}

function getRuns(runsPageJsdom: jsdom.JSDOM, ip: string) {
  const runsTableRows = [
    ...runsPageJsdom.window.document.querySelectorAll(
      // runs table always have at least 1 row (header row) which mustn't be included in return
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/run.php#L321
      'table:nth-of-type(3) tr:not(:first-child)',
    ),
  ];

  const runs = runsTableRows.map((tr) => {
    const tds = tr.querySelectorAll('td');

    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const answerText = tds[4].textContent!.trim(); // it has trailing space when is 'YES'
    const answerImg = tds[4].querySelector('img')!;
    //
    // `.textContent` only returns null in rare cases, usually return is a string (may be empty);
    // `.getAttribute()` only returns null if attribute does not exist on element, if attribute
    // exists, it returns a string (empty string if attribute has no value)
    return {
      run: tds[0].textContent!,
      time: tds[1].textContent!,
      problem: tds[2].textContent!,
      language: tds[3].textContent!,
      answer: {
        text: answerText,
        balloon:
          answerText !== 'YES'
            ? null
            : {
                url: `http://${ip}${answerImg.getAttribute('src')!}`,
                color: answerImg.getAttribute('alt')!,
              },
      },
      sourcefile: {
        name: tds[5].querySelector('a')!.textContent!.trim(),
        url: `http://${ip}/boca${tds[5]
          .querySelector('a')!
          .getAttribute('href')!
          .replace(/^\.{2,}/, '')}`,
      },
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });

  return runs;
}

function getContestRemainingTime(pageJsdom: jsdom.JSDOM) {
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/fcontest.php#L1375
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const timeLeft = pageJsdom.window.document
    .querySelector('table:first-of-type tr td:nth-of-type(3)')!
    .textContent!.trim();

  return timeLeft;
}

function getAllowedProgrammingLanguages(runsPageJsdom: jsdom.JSDOM) {
  const runsFormLanguageOptions = [
    ...runsPageJsdom.window.document.querySelectorAll<HTMLOptionElement>(
      // first select option is the default one and it has no valid value (i.e. -1)
      'form select[name="language"] option:not(:first-child)',
    ),
  ];

  const allowedProgrammingLanguages = runsFormLanguageOptions.map((option) => {
    return {
      id: option.value,
      name: option.text,
    };
  });

  return allowedProgrammingLanguages;
}

/**
 * problemnumber isn't printed in problems pages
 * https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/problem.php#L64
 * it's only printed in the runs and clarifications forms
 */
function getProblemsIds(runsPageJsdom: jsdom.JSDOM) {
  const runsFormProblemsOptions = [
    ...runsPageJsdom.window.document.querySelectorAll<HTMLOptionElement>(
      // first select option is the default one and it has no valid value (i.e. -1)
      'form select[name="problem"] option:not(:first-child)',
    ),
  ];

  const problemsIds = runsFormProblemsOptions.map((option) => ({
    id: option.value,
    name: option.text,
  }));

  return problemsIds;
}

/**
 * get all relevant data from `team/run.php` page
 */
async function getRunsData(secrets: vscode.SecretStorage) {
  const runsPageJsdom = await getPageJsdom('team/run.php', secrets);

  return {
    contestRemainingTime: getContestRemainingTime(runsPageJsdom),
    runs: getRuns(runsPageJsdom, (await getCredentials(secrets)).ip),
    allowedProgrammingLanguages: getAllowedProgrammingLanguages(runsPageJsdom),
    problemsIds: getProblemsIds(runsPageJsdom),
  };
}

async function getClarifications(secrets: vscode.SecretStorage) {
  const clarificationsPageJsdom = await getPageJsdom('team/clar.php', secrets);

  const clarificationsTableRows = [
    ...clarificationsPageJsdom.window.document.querySelectorAll(
      // clarifications table always have at least 1 row (header row) which mustn't be included in return
      // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/team/clar.php#L35
      'table:nth-of-type(3) tr:not(:first-child)',
    ),
  ];

  const clarifications = clarificationsTableRows.map((tr) => {
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
  const scorePageJsdom = await getPageJsdom('team/score.php', secrets);

  const scoreTableRows = [
    ...scorePageJsdom.window.document.querySelectorAll(
      'table:nth-of-type(3) tr:not(:first-child)',
    ),
  ];

  const ip = (await getCredentials(secrets)).ip;

  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/scoretable.php#L320
  // https://github.com/cassiopc/boca/blob/d712c818ac131caf357363ffc52517d6f56fe754/src/fscore.php#L305
  // score table will never be empty, it'll have at least 2 lines: a header and (at least) a team
  // because as long there're teams registered in a competition (and they've logged in), they'll
  // show up in the score table even if they haven't solved any problem or even if scoreboard is frozen
  const score = scoreTableRows.map((tr) => {
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
          balloon: {
            url: `http://${ip}${img.getAttribute('src')}`,
            color: img.getAttribute('alt')!.replace(/:$/, ''),
          },
        };
      }),
      // even if team hasn't scored, textContent won't be empty (will contain '0 (0)')
      total: tds[tds.length - 1].textContent!,
    };
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
  });

  return score;
}

type problems = Awaited<ReturnType<typeof getProblems>>;
type runs = Awaited<ReturnType<typeof getRunsData>>['runs'];
type clarifications = Awaited<ReturnType<typeof getClarifications>>;
type score = Awaited<ReturnType<typeof getScore>>;
type allowedProgrammingLanguages = Awaited<
  ReturnType<typeof getRunsData>
>['allowedProgrammingLanguages'];
type problemsIds = Awaited<ReturnType<typeof getRunsData>>['problemsIds'];

export {
  problems,
  getProblems,
  runs,
  allowedProgrammingLanguages,
  problemsIds,
  getRunsData,
  clarifications,
  getClarifications,
  score,
  getScore,
};
