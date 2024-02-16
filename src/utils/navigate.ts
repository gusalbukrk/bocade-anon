import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import * as vscode from 'vscode';
import jsdom, { JSDOM } from 'jsdom';
import sha256 from 'crypto-js/sha256.js';

type cookieJarObj = ReturnType<jsdom.CookieJar['toJSON']>;

/** if there's a stored cookie jar and it's valid, return page in given url
(valid means user is already logged with it or it was successfully used to log in just now);
otherwise, generate new cookie jar, log using it, store it and return page in given url;
also, handles calls with url set to index/login page as a request for logging out,
this assumption is possible because this function is never used to navigate to index page
because there's no point in getting the JSDOM of index page, because it only has a login form;
logging in is an action performed internally by this function
when it needs to get a page which requires authentication and user isn't yet logged in */
async function getPageJSDOM(
  url: string,
  globalState: vscode.Memento,
): Promise<JSDOM> {
  const storedCookieJarObj = globalState.get<cookieJarObj>('cookieJar');

  if (storedCookieJarObj !== undefined) {
    const storedCookieJar = convertCookieJarObjToCookieJar(storedCookieJarObj);

    const pageJSDOM = await JSDOM.fromURL(url, { cookieJar: storedCookieJar });

    if (isLogged(pageJSDOM.serialize())) {
      console.log('user is already logged in with stored cookie jar');

      if (isLogoutUrl(url)) {
        globalState.update('cookieJar', undefined);
        console.log('logged out');
      }

      return pageJSDOM;
    }

    if (isLogoutUrl(url)) {
      console.log(
        'user is not logged in with stored cookie jar, no need to log out',
      );

      globalState.update('cookieJar', undefined);

      return pageJSDOM;
    }

    const loginSuccessful = await logIn(
      getCookieFromCookieJarObj(storedCookieJarObj, 'PHPSESSID'),
      storedCookieJar,
    );

    if (loginSuccessful) {
      console.log('user logged in using stored cookie jar');
      return await JSDOM.fromURL(url, { cookieJar: storedCookieJar });
    }

    // only known circumstance in which next code line is reached
    // is if PHPSESSID cookie is somehow set to undefined
    console.log('stored cookie jar is invalid');
  }

  // this page HTTP response has 2 Set-Cookie headers: PHPSESSID and biscoitobocabombonera
  const newCookieJar = (await JSDOM.fromURL('http://161.35.239.203/boca'))
    .cookieJar;

  const newCookieJarObj = newCookieJar.toJSON();

  const loginSuccessful = await logIn(
    getCookieFromCookieJarObj(newCookieJarObj, 'PHPSESSID'),
    newCookieJar,
  );

  if (!loginSuccessful) {
    throw new Error('login with newly created cookie jar failed');
  }

  globalState.update('cookieJar', newCookieJarObj);

  console.log('newly created/stored cookie jar was used to log in');
  return await JSDOM.fromURL(url, { cookieJar: newCookieJar });
}

async function download(
  url: string,
  pathToSave: string,
  globalState: vscode.Memento,
) {
  const request = http.get(
    url,
    {
      headers: {
        cookie: await getCookieString(globalState),
      },
    },
    function (response) {
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

        response.on('end', async () => {
          if (!isLogged(responseHtml)) {
            console.log("tried to download a file, but user isn't logged in");

            // navigate to a page which requires authentication
            // as a consequence, user will get logged in
            await getPageJSDOM(
              'http://161.35.239.203/boca/team/index.php',
              globalState,
            );

            download(url, pathToSave, globalState);
          }
        });
      }
    },
  );
}

async function getCookieString(globalState: vscode.Memento) {
  let cookieJarObj = globalState.get<cookieJarObj>('cookieJar');

  if (cookieJarObj === undefined) {
    // navigate to a page which requires authentication
    // as a consequence, user will get logged in
    await getPageJSDOM(
      'http://161.35.239.203/boca/team/index.php',
      globalState,
    );

    cookieJarObj = globalState.get<cookieJarObj>('cookieJar')!;
  }

  const cookieJar = convertCookieJarObjToCookieJar(cookieJarObj);

  const cookieString = cookieJar.getCookieStringSync(
    'http://161.35.239.203/boca',
  );

  return cookieString;
}

function isLogged(pageHtml: string) {
  return !pageHtml.includes(
    "alert('Session expired. You must log in again.');",
  );
}

function getCookieFromCookieJarObj(cookieJarObj: cookieJarObj, key: string) {
  return cookieJarObj.cookies.find((cookie) => cookie.key === key)?.value;
}

function convertCookieJarObjToCookieJar(cookieJarObj: cookieJarObj) {
  return jsdom.toughCookie.CookieJar.fromJSON(JSON.stringify(cookieJarObj));
}

function printCookieJar(cookieJar: jsdom.CookieJar) {
  const cookieJarObj = cookieJar.toJSON();
  console.log(JSON.stringify(cookieJarObj));
}

async function logIn(phpsessid: string, cookieJar: jsdom.CookieJar) {
  const hashedPassword = sha256(
    sha256('pass').toString() + phpsessid,
  ).toString();

  const loginPageHtml = (
    await JSDOM.fromURL(
      `http://161.35.239.203/boca/index.php?name=team1&password=${hashedPassword}`,
      { cookieJar },
    )
  ).serialize();

  const loginSuccessful = loginPageHtml.includes(
    "document.location='team/index.php'",
  );

  return loginSuccessful;
}

// if BOCA index page (which is also the login page) is hit by logged user, it logs out
// BOCA's own submit button is simply a link to this url
function isLogoutUrl(url: string) {
  return url === 'http://161.35.239.203/boca/index.php';
}

export { getPageJSDOM, download };
