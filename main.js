const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');
const swaggerInline = require('swagger-inline');
const OAS = require('oas-normalize');

async function run() {
  console.log("Trying some stuff...");
  console.log(process.env.GITHUB_REPOSITORY);
  console.log(process.env);

  let oasKey;

  try {
    oasKey = core.getInput('readme-oas-key', { required: true });
  } catch (e) {
    core.setFailed(
      'You need to set your key in secrets!\n\nIn the repo, go to Settings > Secrets and add README_OAS_KEY. You can get the value from your ReadMe account.',
    );
  }

  const readmeKey = oasKey.split(':')[0];
  const apiSettingId = oasKey.split(':')[1];

  /*
  const apiFilePath = core.getInput('api-file-path', { required: true });
  const apiSettingId = core.getInput('readme-api-id', { required: true });
  const apiVersion = core.getInput('readme-api-version', { required: true });
  */

  var base = 'swagger.yaml'; // TODO! fix this;
  swaggerInline('**/*', {
    format: '.json',
    metadata: true,
    base,
  }).then(generatedSwaggerString => {
    const oas = new OAS(generatedSwaggerString);

    oas.bundle(function (err, schema) {
      if (!schema['x-si-base']) {
        // TODO: Put this back
        /*
        console.log("We couldn't find a Swagger file.".red);
        console.log(`Don't worry, it's easy to get started! Run ${'oas init'.yellow} to get started.`);
        process.exit(1);
        */
      }

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
          // TODO! Put back in variable
          'x-readme-version': schema.info.version, // apiVersion,
          'x-readme-source': 'github',
        },
        auth: { user: readmeKey },
        resolveWithFullResponse: true,
      };

      // TODO: Validate it here?

      return request
        .put(
          `https://dash.readme.io/api/v1/api-specification/${apiSettingId}`,
          options,
        )
        .then(
          () => {
            return 'Success!';
          },
          err => {
            if (err.statusCode === 503) {
              core.setFailed(
                'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file for help!',
              );
            } else {
              let errorOut = err.message;
              try {
                errorOut = JSON.parse(err.error).description;
              } catch (e) {}

              if (errorOut.match(/no version/i)) {
                // TODO: This is brittle; I'll fix it in the API tomorrrow then come back here
                errorOut +=
                  "\n\nBy default, we use the version in your OAS file, however this version isn't on ReadMe.\n\nTo override it, add `api-version: 'v1.0.0'` to your GitHub Action. Or, add this version in ReadMe!";
              }

              core.setFailed(errorOut);
            }
          },
        );
    });
  }).catch((err) => {
    core.setFailed("There was an error finding or loading your OAS file.\n\n" + (err.message || err));
  });

  /*
  return;
  try {
    const readmeKey = core.getInput('readme-api-key', { required: true });
    const apiFilePath = core.getInput('api-file-path', { required: true });
    const apiSettingId = core.getInput('readme-api-id', { required: true });
    const apiVersion = core.getInput('readme-api-version', { required: true });
    //const token = core.getInput('repo-token', { required: true });

    const client = new github.GitHub(token);

    const apiFile = await client.repos.getContents({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: apiFilePath,
      ref: github.context.ref,
    });

    fs.writeFileSync(
      'file.json',
      Buffer.from(apiFile.data.content, 'base64').toString('utf8'),
    );

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

    return request
      .put(
        `https://dash.readme.io/api/v1/api-specification/${apiSettingId}`,
        options,
      )
      .then(
        () => {
          'Success!';
        },
        err => {
          if (err.statusCode === 503) {
            core.setFailed(
              'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file for help!',
            );
          } else {
            core.setFailed(err.message);
          }
        },
      );
  } catch (error) {
    core.setFailed(error.message);
  }
  */
}

run();
