import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import * as vscode from 'vscode';
import jsdom, { JSDOM } from 'jsdom';
import sha256 from 'crypto-js/sha256.js';

import getCredentials, { credentials } from './getCredentials';

type cookieJarObj = ReturnType<jsdom.CookieJar['toJSON']>;

/** if there's a stored cookie jar and it's valid, return page in given path
(valid means user is already logged with it or it was successfully used to log in just now);
otherwise, generate new cookie jar, log using it, store it and return page in given path;
also, handles calls with path set to index/login page as a request for logging out,
this assumption is possible because this function is never used to navigate to index page
because there's no point in getting the JSDOM of index page (it only has a login form);
logging in is an action performed internally by this function
when it needs to get a page which requires authentication and user isn't yet logged in */
async function getPageJSDOM(
  pagePath: string, // relative to `http://${credentials.ip}/boca/`
  secrets: vscode.SecretStorage,
): Promise<JSDOM> {
  const credentials = await getCredentials(secrets, false);

  if (credentials === null) {
    console.log('no credentials stored');

    // if there're no credentials stored, there should also not be a stored cookie jar
    await secrets.delete('cookieJar');

    return new JSDOM();
  }

  const url = generateBOCAURL(credentials, pagePath);

  const storedCookieJarStr = await secrets.get('cookieJar');

  if (storedCookieJarStr !== undefined) {
    const storedCookieJarObj = JSON.parse(storedCookieJarStr) as cookieJarObj;
    const storedCookieJar = convertCookieJarObjToCookieJar(storedCookieJarObj);

    const pageJSDOM = await JSDOM.fromURL(url, { cookieJar: storedCookieJar });

    if (isLogoutPath(url)) {
      // in BOCA web dashboard, log out is triggered by visiting index page when user is logged in
      // in the extension, it's also necessary to clear stored data
      await secrets.delete('credentials');
      await secrets.delete('cookieJar');

      console.log(
        `user ${isLogged(pageJSDOM.serialize()) ? 'was' : "wasn't"} logged in with stored cookie jar`,
      );

      console.log('user logged out successfully');
      return pageJSDOM;
    }

    if (isLogged(pageJSDOM.serialize())) {
      console.log('user is already logged in with stored cookie jar');
      return pageJSDOM;
    }

    const loginSuccessful = await logIn(
      credentials,
      getCookieFromCookieJarObj(storedCookieJarObj, 'PHPSESSID') as string,
      storedCookieJar,
    );

    if (loginSuccessful) {
      console.log('user logged in using stored cookie jar');
      return await JSDOM.fromURL(url, { cookieJar: storedCookieJar });
    }

    // only known circumstance in which next code line is reached
    // is if PHPSESSID cookie is somehow set to undefined
    console.log('tried to logging in with stored cookie jar, but failed');
  }

  if (isLogoutPath(url)) {
    console.log(
      "logout not needed, user is not logged in and there's no stored cookie jar",
    );

    return new JSDOM();
  }

  // visit BOCA index page (`boca/index.php`) because its HTTP response has
  // 2 Set-Cookie headers: PHPSESSID and biscoitobocabombonera
  const newCookieJar = (
    await JSDOM.fromURL(generateBOCAURL(credentials, 'index.php'))
  ).cookieJar;

  const newCookieJarObj = newCookieJar.toJSON();

  const loginSuccessful = await logIn(
    credentials,
    getCookieFromCookieJarObj(newCookieJarObj, 'PHPSESSID') as string,
    newCookieJar,
  );

  if (!loginSuccessful) {
    throw new Error('login with newly created cookie jar failed');
  }

  await secrets.store('cookieJar', JSON.stringify(newCookieJarObj));

  console.log('newly created/stored cookie jar was used to log in');
  return await JSDOM.fromURL(url, { cookieJar: newCookieJar });
}

async function download(
  url: string,
  pathToSave: string,
  secrets: vscode.SecretStorage,
) {
  http.get(
    url,
    {
      headers: {
        cookie: await getCookieString(secrets),
      },
    },
    function (response) {
      // BOCA team dashboard has download links for 2 types of files,
      // pdfs (at problem.php) and source code files (at run.php)
      // both are sent with content-type 'application/force-download'
      if (response.headers['content-type'] === 'application/force-download') {
        const file = fs.createWriteStream(pathToSave);
        response.pipe(file);

        console.log(
          path.basename(pathToSave) + ' saved to ' + path.dirname(pathToSave),
        );
      } else if (
        response.headers['content-type'] === 'text/html; charset=UTF-8'
      ) {
        let responseHtml = '';
        response.on('data', (chunk) => {
          responseHtml += chunk;
        });

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        response.on('end', async () => {
          if (!isLogged(responseHtml)) {
            console.log("tried to download a file, but user isn't logged in");

            // navigate to a page which requires authentication
            // as a consequence, user will get logged in
            await getPageJSDOM('team/index.php', secrets);

            await download(url, pathToSave, secrets);
          }

          throw new Error(
            `download unsuccessful, maybe there's something wrong with the URL (${url}).`,
          );
        });
      }
    },
  );
}

function generateBOCAURL(credentials: NonNullable<credentials>, path: string) {
  return `http://${credentials.ip}/boca/${path}`;
}

type errorObject = { message: string };
// returns boolean indicating if credentials are valid
async function storeCredentialsIfValid(
  credentials: credentials,
  secrets: vscode.SecretStorage,
): Promise<errorObject | null> {
  console.log(
    `checking if credentials are valid: ${JSON.stringify(credentials)}`,
  );

  if (
    credentials === undefined ||
    credentials === null ||
    Object.values(credentials).some((c) => c === '')
  ) {
    return { message: 'credentials are in an invalid format' };
  }

  let html;
  try {
    // jsdom's `fromURL` doesn't have a timeout option (https://github.com/jsdom/jsdom/issues/2824)
    html = await (
      await fetch(generateBOCAURL(credentials, 'index.php'), {
        signal: AbortSignal.timeout(5000), // will error if request takes longer than 5s
      })
    ).text();
  } catch (e) {
    return { message: 'IP is unreachable' };
  }

  const dom = new JSDOM(html);
  const isBOCAIndexPage =
    /^BOCA Online Contest Administrator boca-[.0-9]+ - Login$/.test(
      dom.window.document.title,
    );

  if (!isBOCAIndexPage) {
    return { message: "IP doesn't point to a BOCA server" };
  }

  await secrets.store('credentials', JSON.stringify(credentials));

  try {
    // getPageJSDOM throws error if login fails; although, it's also possible it throws other errors
    // in any case, if it throws, it means credentials are invalid
    await getPageJSDOM('team/index.php', secrets);
  } catch (e: unknown) {
    await secrets.delete('credentials');
    return { message: 'invalid credentials' };
  }

  return null;
}

async function getCookieString(secrets: vscode.SecretStorage) {
  let cookieJarStr = await secrets.get('cookieJar');
  let cookieJarObj =
    cookieJarStr !== undefined
      ? (JSON.parse(cookieJarStr) as cookieJarObj)
      : undefined;

  if (cookieJarObj === undefined) {
    // navigate to a page which requires authentication
    // as a consequence, user will get logged in
    await getPageJSDOM('team/index.php', secrets);

    cookieJarStr = await secrets.get('cookieJar');

    if (cookieJarStr === undefined) {
      throw new Error('no cookie jar stored');
    }

    cookieJarObj = JSON.parse(cookieJarStr) as cookieJarObj;
  }

  const cookieJar = convertCookieJarObjToCookieJar(cookieJarObj);

  const cookieString = cookieJar.getCookieStringSync(
    generateBOCAURL(await getCredentials(secrets), ''),
  );

  return cookieString;
}

function isLogged(pageHtml: string) {
  return !pageHtml.includes(
    "alert('Session expired. You must log in again.');",
  );
}

function getCookieFromCookieJarObj(
  cookieJarObj: cookieJarObj,
  key: string,
): unknown {
  return cookieJarObj.cookies.find((cookie) => cookie.key === key)?.value;
}

function convertCookieJarObjToCookieJar(cookieJarObj: cookieJarObj) {
  return jsdom.toughCookie.CookieJar.fromJSON(JSON.stringify(cookieJarObj));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printCookieJar(cookieJar: jsdom.CookieJar) {
  const cookieJarObj = cookieJar.toJSON();
  console.log(JSON.stringify(cookieJarObj));
}

async function logIn(
  credentials: NonNullable<credentials>,
  phpsessid: string,
  cookieJar: jsdom.CookieJar,
) {
  const hashedPassword = sha256(
    sha256(credentials.password).toString() + phpsessid,
  ).toString();

  const loginPageHtml = (
    await JSDOM.fromURL(
      `${generateBOCAURL(credentials, 'index.php')}?name=${credentials.username}&password=${hashedPassword}`,
      { cookieJar },
    )
  ).serialize();

  const loginSuccessful = loginPageHtml.includes(
    "document.location='team/index.php'",
  );

  return loginSuccessful;
}

// path is relative to `http://${credentials.ip}/boca/`
// if BOCA index page (which is also the login page) is hit by logged user, it logs out
// BOCA's own submit button is simply a link to this url
function isLogoutPath(path: string) {
  return path === '' || path === 'index.php';
}

/** navigate to BOCA index page (which triggers session logout if user is logged in)
and clear extension stored data */
async function logOut(secrets: vscode.SecretStorage) {
  // see getPageJSDOM comment to understand why a request to index page
  // is assumed to be a request for logging out
  return await getPageJSDOM('index.php', secrets);
}

export { getPageJSDOM, download, storeCredentialsIfValid, logOut };
