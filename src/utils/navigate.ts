import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import * as vscode from 'vscode';
import jsdom, { JSDOM } from 'jsdom';
import sha256 from 'crypto-js/sha256.js';

import getCredentials, { credentials } from './getCredentials';

type cookieJarObj = ReturnType<jsdom.CookieJar['toJSON']>;
type errorObject = { message: string };

/**
 * Navigate to a page in BOCA web dashboard which requires authentication and return its JSDOM.
 *
 * Details: if there's a stored cookie jar and it's valid, return page in `pagePath` (valid means
 * user already authenticated in BOCA with it or it was successfully used to authenticate just now);
 * else, generate new cookie jar, authenticate it in BOCA, store it and return page in `pagePath`;
 * also, handles calls with `pagePath` set to index/login page as a request for logging out
 * (in BOCA web dashboard, log out is triggered by visiting index page when user is logged in),
 * assuming navigation to index page is request for logging out is possible because this function
 * is never used to get index page JSDOM because it has no relevant data (only a login form)
 *
 * @param pagePath relative to `http://${credentials.ip}/boca/`
 */
async function getPageJsdom(
  pagePath: string,
  secrets: vscode.SecretStorage,
): Promise<JSDOM> {
  const credentials = await getCredentials(secrets, false);

  if (credentials === null) {
    console.log('no credentials stored');

    // if there're no credentials stored, there should also not be a stored cookie jar
    await secrets.delete('cookieJar');

    return new JSDOM();
  }

  const url = generateBocaUrl(credentials.ip, pagePath);

  const storedCookieJarStr = await secrets.get('cookieJar');

  if (storedCookieJarStr !== undefined) {
    const storedCookieJarObj = JSON.parse(storedCookieJarStr) as cookieJarObj;
    const storedCookieJar = convertCookieJarObjToCookieJar(storedCookieJarObj);

    const pageJsdom = await JSDOM.fromURL(url, { cookieJar: storedCookieJar });

    if (isLogoutPath(pagePath)) {
      // in BOCA web dashboard, log out is triggered by visiting index page when user is logged in
      // in the extension, it's also necessary to clear stored data
      await secrets.delete('credentials');
      await secrets.delete('cookieJar');

      console.log(
        `user ${isAuthenticatedInBoca(pageJsdom.serialize()) ? 'was' : "wasn't"} logged in with stored cookie jar`,
      );

      console.log('user logged out successfully');
      return pageJsdom;
    }

    if (isAuthenticatedInBoca(pageJsdom.serialize())) {
      console.log('user is already logged in with stored cookie jar');
      return pageJsdom;
    }

    const authenticated = await authenticateInBoca(
      credentials,
      getCookieFromCookieJarObj(storedCookieJarObj, 'PHPSESSID') as string,
      storedCookieJar,
    );

    if (authenticated) {
      console.log('user logged in using stored cookie jar');
      return await JSDOM.fromURL(url, { cookieJar: storedCookieJar });
    }

    // only known circumstance in which next code line is reached
    // is if PHPSESSID cookie is somehow set to undefined
    console.log('tried to logging in with stored cookie jar, but failed');
  }

  if (isLogoutPath(pagePath)) {
    console.log(
      "logout not needed, user is not logged in and there's no stored cookie jar",
    );

    return new JSDOM();
  }

  // visit BOCA index page (`boca/index.php`) because its HTTP response has
  // 2 Set-Cookie headers: PHPSESSID and biscoitobocabombonera
  const newCookieJar = (
    await JSDOM.fromURL(generateBocaUrl(credentials.ip, 'index.php'))
  ).cookieJar;

  const newCookieJarObj = newCookieJar.toJSON();

  const authenticated = await authenticateInBoca(
    credentials,
    getCookieFromCookieJarObj(newCookieJarObj, 'PHPSESSID') as string,
    newCookieJar,
  );

  if (!authenticated) {
    throw new Error('login with newly created cookie jar failed');
  }

  await secrets.store('cookieJar', JSON.stringify(newCookieJarObj));

  console.log('newly created/stored cookie jar was used to log in');
  return await JSDOM.fromURL(url, { cookieJar: newCookieJar });
}

/**
 * download files from BOCA such as PDFs (from problems page)
 * and source code files (from runs page)
 */
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
          if (!isAuthenticatedInBoca(responseHtml)) {
            console.log("tried to download a file, but user isn't logged in");

            // navigate to a page which requires authentication
            // as a consequence, user will get logged in
            await getPageJsdom('team/index.php', secrets);

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

/**
 * login is composed by 3 steps: (1) validate credentials, (2) store credentials in `SecretStorage`
 * and (3) use `getPageJsdom()` to navigate to a page which requires authentication to trigger
 * BOCA authentication and storage of newly generated cookie jar
 */
async function logIn(
  credentials: credentials,
  secrets: vscode.SecretStorage,
  // not using an Error, because it's not a JSON serializable object
  // which is a requirement for `vscode.postMessage`
): Promise<errorObject | null> {
  console.log(
    `checking if credentials are valid: ${JSON.stringify(credentials)}`,
  );

  // assure old credentials don't interfere with new credentials validation
  await logOut(secrets);

  if (
    credentials === undefined ||
    credentials === null ||
    Object.values(credentials).some((c) => c === '')
  ) {
    return { message: 'All fields are required.' };
  }

  let html;
  try {
    // jsdom's `fromURL` doesn't have a timeout option (https://github.com/jsdom/jsdom/issues/2824)
    html = await (
      await fetch(generateBocaUrl(credentials.ip, 'index.php'), {
        signal: AbortSignal.timeout(5000), // will error if request takes longer than 5s
      })
    ).text();
  } catch (e) {
    return { message: 'IP is unreachable.' };
  }

  const dom = new JSDOM(html);
  const isBocaIndexPage =
    /^BOCA Online Contest Administrator boca-[.0-9]+ - Login$/.test(
      dom.window.document.title,
    );

  if (!isBocaIndexPage) {
    return { message: "IP doesn't point to a BOCA server." };
  }

  await secrets.store('credentials', JSON.stringify(credentials));

  try {
    // getPageJsdom explicitly throws error if login fails (although, it's also possible
    // it throws other errors); in any case, if it throws, it means credentials are invalid
    await getPageJsdom('team/index.php', secrets);
  } catch (e: unknown) {
    await secrets.delete('credentials');
    return { message: 'Invalid credentials.' };
  }

  console.log(
    `credetials saved to secrets, expiration date set to ${new Date(credentials.expireAt).toString()}`,
  );

  return null;
}

/**
 * navigate to BOCA index page (triggering logout
 * if user is logged in) and clear extension stored data
 */
async function logOut(secrets: vscode.SecretStorage) {
  return await getPageJsdom('index.php', secrets);
}

/**
 * submit form to a BOCA page
 */
async function submitForm(
  secrets: vscode.SecretStorage,
  pagePath: string,
  body: FormData,
) {
  const headers = new Headers();
  headers.append('Cookie', await getCookieString(secrets));

  const res = await fetch(
    generateBocaUrl((await getCredentials(secrets)).ip, pagePath),
    {
      method: 'POST',
      body,
      headers,
    },
  );

  return await res.text();
}

function generateBocaUrl(ip: string, pagePath: string) {
  return `http://${ip}/boca/${pagePath}`;
}

/**
 * Get cookie string from storage; if it's not stored, navigate to a page which requires
 * authentication to trigger BOCA authentication and storage of newly generated cookie jar
 */
async function getCookieString(secrets: vscode.SecretStorage) {
  let cookieJarStr = await secrets.get('cookieJar');
  let cookieJarObj =
    cookieJarStr !== undefined
      ? (JSON.parse(cookieJarStr) as cookieJarObj)
      : undefined;

  if (cookieJarObj === undefined) {
    // navigate to a page which requires authentication
    // as a consequence, user will get logged in
    await getPageJsdom('team/index.php', secrets);

    cookieJarStr = await secrets.get('cookieJar');

    if (cookieJarStr === undefined) {
      throw new Error('no cookie jar stored');
    }

    cookieJarObj = JSON.parse(cookieJarStr) as cookieJarObj;
  }

  const cookieJar = convertCookieJarObjToCookieJar(cookieJarObj);

  const cookieString = cookieJar.getCookieStringSync(
    generateBocaUrl((await getCredentials(secrets)).ip, ''),
  );

  return cookieString;
}

function isAuthenticatedInBoca(pageHtml: string) {
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

/**
 * hit BOCA login URL with the suitable query parameters
 */
async function authenticateInBoca(
  credentials: NonNullable<credentials>,
  phpsessid: string,
  cookieJar: jsdom.CookieJar,
) {
  const hashedPassword = sha256(
    sha256(credentials.password).toString() + phpsessid,
  ).toString();

  const loginPageHtml = (
    await JSDOM.fromURL(
      `${generateBocaUrl(credentials.ip, 'index.php')}?name=${credentials.username}&password=${hashedPassword}`,
      { cookieJar },
    )
  ).serialize();

  const authenticationSuccessful = loginPageHtml.includes(
    "document.location='team/index.php'",
  );

  return authenticationSuccessful;
}

/**
 *
 * @param path relative to `http://${credentials.ip}/boca/`
 */
function isLogoutPath(path: string) {
  return path === '' || path === 'index.php';
}

export { logIn, logOut, getPageJsdom, download, submitForm };
