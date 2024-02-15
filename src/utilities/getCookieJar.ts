import * as vscode from 'vscode';
import jsdom, { JSDOM } from 'jsdom';
import sha256 from 'crypto-js/sha256.js';

type cookieJarObj = ReturnType<jsdom.CookieJar['toJSON']>;

/** if there's a stored cookie jar and it's valid, return it
(valid means user is already logged with it or it can be used to log in);
otherwise, generate new cookie jar, log using it, store it and return it */
async function getCookieJar(
  globalState: vscode.Memento,
): Promise<jsdom.CookieJar> {
  const storedCookieJarObj = globalState.get<cookieJarObj>('cookieJar');

  if (storedCookieJarObj !== undefined) {
    const storedCookieJar = convertCookieJarObjToCookieJar(storedCookieJarObj);

    const teamIndexPageHtml = (
      await getPageJSDOM(
        'http://161.35.239.203/boca/team/index.php',
        storedCookieJar,
      )
    ).serialize();

    if (isLogged(teamIndexPageHtml)) {
      console.log('user is already logged in with stored cookie jar');
      return storedCookieJar;
    }

    const loginSuccessful = await logIn(storedCookieJarObj, storedCookieJar);

    if (loginSuccessful) {
      console.log('user logged in using stored cookie jar');
      return storedCookieJar;
    }

    // only known circumstance in which next code line is reached
    // is if PHPSESSID cookie is somehow set to undefined
    console.log('stored cookie jar is invalid');
  }

  // this page HTTP response has 2 Set-Cookie headers: PHPSESSID and biscoitobocabombonera
  const newCookieJar = (await getPageJSDOM('http://161.35.239.203/boca'))
    .cookieJar;

  const newCookieJarObj = newCookieJar.toJSON();

  const loginSuccessful = await logIn(newCookieJarObj, newCookieJar);

  if (!loginSuccessful) {
    throw new Error('login with newly created cookie jar failed');
  }

  globalState.update('cookieJar', newCookieJarObj);

  console.log('newly created/stored cookie jar was used to log in');
  return newCookieJar;
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
  console.log(JSON.stringify(cookieJar.toJSON()));
}

async function logIn(cookieJarObj: cookieJarObj, cookieJar: jsdom.CookieJar) {
  const hashedPassword = sha256(
    sha256('pass').toString() +
      getCookieFromCookieJarObj(cookieJarObj, 'PHPSESSID'),
  ).toString();

  const loginPageHtml = (
    await getPageJSDOM(
      `http://161.35.239.203/boca/index.php?name=team1&password=${hashedPassword}`,
      cookieJar,
    )
  ).serialize();

  const loginSuccessful = loginPageHtml.includes(
    "document.location='team/index.php'",
  );

  return loginSuccessful;
}

export async function logOut(globalState: vscode.Memento) {
  const cookieJar = await getCookieJar(globalState);

  // if BOCA index page is hit by logged user, it logs out
  // BOCA's own submit button is simply a link to this page
  await getPageJSDOM('http://161.35.239.203/boca/index.php', cookieJar);

  globalState.update('cookieJar', undefined);
}

async function getPageJSDOM(url: string, cookieJar?: jsdom.CookieJar) {
  return await JSDOM.fromURL(url, { cookieJar });
}

export default getCookieJar;
export { printCookieJar };
