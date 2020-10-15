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
  const apiSettingId = oasKey.split(':')[1];

  const apiVersion = core.getInput('api-version');
  const apiFilePath = core.getInput('oas-file-path');

  let baseFile = apiFilePath;

  if (!baseFile) {
    const files = await globPromise('**/{swagger,oas,openapi}.{json,yaml,yml}', { dot: true });
    if (!files.length)
      throw core.setFailed(
        'Unable to locate a OpenAPI/Swagger file. Try specifying the path via the `oas-file-path` option in your workflow file!'
      );
    baseFile = files[0];
    console.log(`Found spec file: ${baseFile}`);
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
        const innerMessage = e.errors && e.errors[0] && e.errors[0].message;
        const outerMessage = e.name ? `${e.name}: ${e.message}` : e.message;
        throw core.setFailed(`There was an error validating your OAS file.\n\n${innerMessage || outerMessage || e}`);
      }

      oas.bundle(function (err, schema) {
        if (!schema['x-si-base']) {
          // TODO: Put this back
          /*
        console.log("We couldn't find a Swagger file.".red);
        console.log(`Don't worry, it's easy to get started! Run ${'oas init'.yellow} to get started.`);
        process.exit(1);
        */
        }

        schema['x-github-repo'] = process.env.GITHUB_REPOSITORY;
        schema['x-github-sha'] = process.env.GITHUB_SHA;

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
            'x-readme-version': apiVersion || schema.info.version, // apiVersion,
            'x-readme-source': 'github',
          },
          auth: { user: readmeKey },
          resolveWithFullResponse: true,
        };

        // TODO: Validate it here?

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
              let errorOut = err.message;
              try {
                errorOut = JSON.parse(err.error).description;
              } catch (e) {
                // Should we do something here?
              }

              if (errorOut.match(/no version/i)) {
                // TODO: This is brittle; I'll fix it in the API tomorrrow then come back here
                errorOut +=
                  "\n\nBy default, we use the version in your OAS file, however this version isn't on ReadMe.\n\nTo override it, add `api-version: 'v1.0.0'` to your GitHub Action, or add this version in ReadMe!";
              }

              core.setFailed(errorOut);
            }
          }
        );
      });
    })
    .catch(err => {
      core.setFailed(`There was an error finding or loading your OAS file.\n\n${err.message || err}`);
    });
}

run();
