const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('test');

  try {
    const readmeKey = core.getInput('readme-api-key', { required: true });
    const apiFilePath = core.getInput('api-file-path', { required: true });
    const apiSettingId = core.getInput('readme-api-id', { required: true });
    const apiVersion = core.getInput('readme-api-version', { required: true });
    const token = core.getInput('repo-token', { required: true });

    const client = new github.GitHub(token);

    const apiFile = await client.repos.getContents({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: apiFilePath,
      ref: github.context.ref,
    });

    fs.writeFileSync('file.json', Buffer.from(apiFile.data.content, 'base64').toString('utf8'));

    const options = {
      formData: {
        spec: fs.createReadStream(path.resolve(process.cwd(), 'file.json')),
      },
      headers: {
        'x-readme-version': apiVersion,
        'x-readme-source': 'github',
      },
      auth: { user: readmeKey },
      resolveWithFullResponse: true,
    };

    return request.put(`https://dash.readme.io/api/v1/api-specification/${apiSettingId}`, options).then(() => {
      'Success!'
    }, (err) => {
      if (err.statusCode === 503) {
        core.setFailed('Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file for help!')
      } else {
        core.setFailed(err.message);
      }
    });

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
