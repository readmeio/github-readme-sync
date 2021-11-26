const core = require('@actions/core');
const _ = require('lodash');
const glob = require('glob');
const promisify = require('util').promisify;
const { updateApiSpecifications, handleReadmeIoError } = require('../helpers/readmeio');
const swaggerInline = require('swagger-inline');
const OAS = require('oas-normalize');

const globPromise = promisify(glob);

module.exports = async ({ apiVersion, oasFilePath, readmeApiKey, apiSettingId }) => {
  let baseFile;

  if (_.isEmpty(oasFilePath)) {
    const files = await globPromise('**/{swagger,oas,openapi}.{json,yaml,yml}', { dot: true });
    core.debug(`${files.length} file match(es) found: ${files.toString()}`);

    if (!files.length)
      throw core.setFailed(
        'Unable to locate a OpenAPI/Swagger file. Try specifying the path via the `oas-file-path` option in your workflow file!'
      );
    baseFile = _.first(files);
    core.info(`OpenAPI/Swagger file found: ${baseFile}`);
  } else {
    baseFile = oasFilePath;
  }

  const generatedSwaggerString = await swaggerInline('**/*', {
    format: '.json',
    metadata: true,
    base: baseFile,
    ignoreErrors: true,
  });

  const oas = new OAS(generatedSwaggerString);
  oas.bundle(function (err, schema) {
    const newSchema = { ...schema };
    if (err) return core.setFailed(`Error bundling your file: ${err.message}`);
    newSchema['x-github-repo'] = process.env.GITHUB_REPOSITORY;
    core.debug(`\`x-github-repo\`: ${newSchema['x-github-repo']}`);
    newSchema['x-github-sha'] = process.env.GITHUB_SHA;
    core.debug(`\`x-github-sha\`: ${newSchema['x-github-sha']}`);

    const version = apiVersion || newSchema.info.version;
    core.debug(`Version passed into \`x-readme-version\` header: ${version}`);

    const params = {
      spec: JSON.stringify(newSchema),
    };

    const options = {
      headers: {
        'x-readme-version': version,
        'x-readme-source': 'github',
      },
      auth: { username: readmeApiKey },
    };

    return updateApiSpecifications(apiSettingId, params, options).catch(handleReadmeIoError);
  });
};
