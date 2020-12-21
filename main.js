/* eslint-disable no-param-reassign */
const core = require('@actions/core');
const request = require('request-promise-native');
const glob = require('glob');
const swaggerInline = require('swagger-inline');
const OAS = require('oas-normalize');
const promisify = require('util').promisify;

const globPromise = promisify(glob);

async function run() {
  let oasKey;
  let readmeKey;
  let apiSettingId;

  try {
    oasKey = core.getInput('readme-oas-key', { required: true });
    readmeKey = oasKey.split(':')[0];
    apiSettingId = oasKey.split(':')[1];
  } catch (e) {
    return core.setFailed(
      'You need to set your key in secrets!\n\nIn the repo, go to Settings > Secrets and add README_OAS_KEY. You can get the value from your ReadMe account.'
    );
  }

  if (!readmeKey || !apiSettingId)
    return core.setFailed(
      'Invalid input in `readme-oas-key`. Check out our docs for information on this value: https://docs.readme.com/docs/automatically-sync-api-specification-with-github'
    );

  core.setSecret(readmeKey);
  core.setSecret(apiSettingId);

  core.debug(`readmeKey (split from \`readme-oas-key\`): ${readmeKey}`);
  core.debug(`apiSettingId (split from \`readme-oas-key\`): ${apiSettingId}`);

  const apiVersion = core.getInput('api-version');
  core.debug(`apiVersion (from \`api-version\` input): ${apiVersion}`);
  const apiFilePath = core.getInput('oas-file-path');
  core.debug(`apiFilePath (from \`oas-file-path\` input): ${apiFilePath}`);

  let baseFile = apiFilePath;

  if (!baseFile) {
    const files = await globPromise('**/{swagger,oas,openapi}.{json,yaml,yml}', { dot: true });
    core.debug(`${files.length} file match(es) found: ${files.toString()}`);
    if (!files.length)
      throw core.setFailed(
        'Unable to locate a OpenAPI/Swagger file. Try specifying the path via the `oas-file-path` option in your workflow file!'
      );
    baseFile = files[0];
    core.info(`OpenAPI/Swagger file found: ${baseFile}`);
  }

  return swaggerInline('**/*', {
    format: '.json',
    metadata: true,
    base: baseFile,
    ignoreErrors: true,
  })
    .then(async generatedSwaggerString => {
      const oas = new OAS(generatedSwaggerString);
      oas.bundle(function (err, schema) {
        if (err) return core.setFailed(`Error bundling your file: ${err.message}`);
        schema['x-github-repo'] = process.env.GITHUB_REPOSITORY;
        core.debug(`\`x-github-repo\`: ${schema['x-github-repo']}`);
        schema['x-github-sha'] = process.env.GITHUB_SHA;
        core.debug(`\`x-github-sha\`: ${schema['x-github-sha']}`);

        const version = apiVersion || schema.info.version;
        core.debug(`Version passed into \`x-readme-version\` header: ${version}`);

        const options = {
          formData: {
            spec: {
              value: JSON.stringify(schema),
              options: {
                filename: 'swagger.json',
                contentType: 'application/json',
              },
            },
          },
          headers: {
            'x-readme-version': version,
            'x-readme-source': 'github',
          },
          auth: { user: readmeKey },
          resolveWithFullResponse: true,
        };

        return request.put(`http://dash.readme.local:3000/api/v1/api-specification/${apiSettingId}`, options).then(
          () => {
            return 'Success!';
          },
          err => {
            if (err.statusCode === 503) {
              core.setFailed(
                'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file and debug logs for help!\n\nInfo: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting'
              );
            } else {
              core.debug(`Error received from ReadMe API: ${err}`);
              let errorOut = err.message;
              let errorObj;
              try {
                errorObj = JSON.parse(err.error);
                if (errorObj.message) {
                  errorOut = errorObj.message;
                  if (errorObj.suggestion) errorOut = `${errorOut}\n\n${errorObj.suggestion}`;
                }
              } catch (e) {
                core.debug(`Error parsing error object: ${e}`);
                throw core.setFailed(
                  'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file and debug logs for help!\n\nInfo: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting'
                );
              }

              if (errorObj.error && errorObj.error === 'SPEC_VERSION_NOTFOUND') {
                errorOut += `\n\nYou can specify this override by adding \`api-version: 'v1.0.0'\` to your GitHub Action (or by creating version '${version}' in ReadMe!)`;
                errorOut += `\n\nDocs: https://docs.readme.com/docs/versions`;
              }

              if (errorObj.error && errorObj.error === 'SPEC_ID_DUPLICATE') {
                const match = errorOut.match(/(?<=(something like )).{24}/);
                if (match) {
                  const newId = match[0];
                  errorOut += `\n\nJust set \`readme-oas-key\` to \`YOUR_README_API_KEY:${newId}\`!`;
                } else
                  errorOut += `\n\nThe spec ID is located in the second half of the \`readme-oas-key\` after the colon separator.`;
              }

              if (errorObj.error && errorObj.error === 'INTERNAL_ERROR') {
                errorOut += `\n\nWe'll be able to solve the problem faster if you include a copy your debug logs! Info: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting`;
              }

              core.setFailed(errorOut);
            }
          }
        );
      });
    })
    .catch(err => {
      core.setFailed(`There was an error finding or loading your OpenAPI/Swagger file.\n\n${err && err.message}`);
    });
}

run();
