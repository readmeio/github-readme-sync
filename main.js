const core = require('@actions/core');
const github = require('@actions/github');

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

    console.log(apiFile);
  
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
