const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');
const fs = require('fs');

async function run() {
  try {
    const readmeKey = core.getInput('readme-api-key', { required: true });
    const apiFilePath = core.getInput('api-file-path', { required: true });
    const token = core.getInput('repo-token', { required: true });
  
    const client = new github.GitHub(token);

    const apiFile = await client.repos.getContents({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: apiFilePath,
    });

    fs.writeFileSync('file.json', new Buffer(apiFile.data.content, 'base64').toString('ascii'));

    const options = {
      formData: {
        spec: fs.createReadStream(path.resolve(process.cwd(), 'file.json')),
      },
      headers: {
        'x-readme-version': 1.0,
        'x-readme-source': 'github',
      },
      auth: { user: readmeKey },
      resolveWithFullResponse: true,
    };

    return request.post('https://dash.readme.io/api/v1/api-specification', options).then(console.log, console.log);
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
