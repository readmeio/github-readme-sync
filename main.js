const core = require('@actions/core');
const _ = require('lodash');
const { handleOasFile, handleMdFile } = require('./handlers');

async function run() {
  const apiVersion = core.getInput('api-version');
  core.debug(`apiVersion (from config 'api-version'): ${apiVersion}`);

  const docsPath = core.getInput('docs-path');
  core.debug(`docsPath (from config 'docs-path'): ${docsPath}`);

  const oasFilePath = core.getInput('oas-file-path');
  core.debug(`oasFilePath (from config 'oas-file-path'): ${oasFilePath}`);

  const readmeOasKey = core.getInput('readme-oas-key', { required: true });
  core.debug(`readmeOasKey (from config 'readme-oas-key'): ${readmeOasKey}`);

  const type = core.getInput('type');
  core.debug(`type (from config 'type'): ${type}`);

  const splittedKey = _.split(readmeOasKey, ':');
  const readmeApiKey = _.first(splittedKey);
  const apiSettingId = _.last(splittedKey);

  if (_.isEmpty(readmeApiKey) || _.isEmpty(apiSettingId)) {
    return core.setFailed(
      `You need to set your key in secrets!

In the repo, go to Settings > Secrets and add README_OAS_KEY. You can get the value from your ReadMe account.

Check out our docs for information on this value: https://docs.readme.com/docs/automatically-sync-api-specification-with-github`
    );
  }

  const options = {
    apiVersion,
    docsPath,
    oasFilePath,
    readmeOasKey,
    readmeApiKey,
    apiSettingId,
  };
  switch (type) {
    case 'oas':
      return handleOasFile(options);
    case 'md':
      return handleMdFile(options);
    default:
      return core.setFailed(`Unknown type: ${type}`);
  }
}

run();
