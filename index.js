const https = require('https'); // use http instead if site to download doesn't have https

const url = 'https://gusalbukrk.com';

const request = https.get(url, function (response) {
  if (response.statusCode === 200) {
    let responseBody = '';

    response.on('data', (chunk) => {
      responseBody += chunk;
    });

    response.on('end', async () => {
      console.log(responseBody);
    });
  } else {
    throw new Error(
      `Failed to get file. Response code: ${response.statusCode}.`,
    );
  }
});
