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

  try {
    oasKey = core.getInput('readme-oas-key', { required: true });
  } catch (e) {
    core.setFailed(
      'You need to set your key in secrets!\n\nIn the repo, go to Settings > Secrets and add README_OAS_KEY. You can get the value from your ReadMe account.'
    );
  }

  const readmeKey = oasKey.split(':')[0];
  core.debug(`readmeKey (split from \`readme-oas-key\`): ${readmeKey}`);
  const apiSettingId = oasKey.split(':')[1];
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

  swaggerInline('**/*', {
    format: '.json',
    metadata: true,
    base: baseFile,
    ignoreErrors: true,
  })
    .then(async generatedSwaggerString => {
      const oas = new OAS(generatedSwaggerString);
      const validate = promisify(oas.validate);
      try {
        await validate.call(oas);
      } catch (e) {
        core.debug(`Error validating spec: ${e}`);
        const innerMessage = e.errors && e.errors[0] && e.errors[0].message;
        const outerMessage = e.name ? `${e.name}: ${e.message}` : e.message;
        throw core.setFailed(`There was an error validating your OAS file.\n\n${innerMessage || outerMessage || e}`);
      }
      core.debug('OpenAPI/Swagger file validated!');

      oas.bundle(function (err, schema) {
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

        return request.put(`https://dash.readme.io/api/v1/api-specification/${apiSettingId}`, options).then(
          () => {
            return 'Success!';
          },
          err => {
            if (err.statusCode === 503) {
              core.setFailed(
                'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file for help!'
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
                  'Error parsing error object. Contact support@readme.io with a copy of your debug logs for help!'
                );
              }

              if (errorObj.error && errorObj.error === 'SPEC_VERSION_NOTFOUND') {
                errorOut += `\n\nYou can specify this override by adding \`api-version: 'v1.0.0'\` to your GitHub Action (or add this version (${version}) in ReadMe!)`;
                errorOut += `\n\nDocs: https://docs.readme.com/docs/versions`;
              }

              if (errorObj.error && errorObj.error === 'SPEC_ID_ALREADY_EXISTS') {
                const match = errorOut.match(/(?<=(recommend )).{24}/);
                if (match) {
                  const newId = match[0];
                  errorOut += `\n\nJust set \`readme-oas-key\` to \`${readmeKey}:${newId}\`!`;
                } else
                  errorOut += `\n\nThe spec ID is located in the second half of the \`readme-oas-key\` after the colon separator.`;
              }

              if (errorObj.error && errorObj.error === 'INTERNAL_ERROR') {
                errorOut += `\n\nBe sure to include a copy of your debug logs! Info: https://github.com/actions/toolkit/blob/master/docs/action-debugging.md#how-to-access-step-debug-logs`;
              }

              core.setFailed(errorOut);
            }
          }
        );
      });
    })
    .catch(err => {
      core.setFailed(`There was an error finding or loading your OpenAPI/Swagger file.\n\n${err.message || err}`);
    });
}

run();
