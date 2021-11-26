const core = require('@actions/core');
const axios = require('axios');
const { isUndefined } = require('lodash');

const baseUrl = 'https://dash.readme.com/api/v1/';

const updateApiSpecifications = (apiSettingId, params, options) =>
  axios.put(`${baseUrl}/api-specification/${apiSettingId}`, params, options);

const getDocBySlug = (slug, options) => axios.get(`${baseUrl}/docs/${slug}`, options);

const updateDocBySlug = (slug, params, options) => axios.put(`${baseUrl}/docs/${slug}`, params, options);

const createDoc = (params, options) => axios.post(`${baseUrl}/docs`, params, options);

const getCategoryBySlug = (slug, options) => axios.get(`${baseUrl}/categories/${slug}`, options);

const handleReadmeIoError = err => {
  if (isUndefined(err.response)) {
    return core.setFailed(err.message);
  }
  if (err.response.status === 503) {
    return core.setFailed(
      'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file and core.debug logs for help!\n\nInfo: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting'
    );
  }
  core.error(`Error received from ReadMe API: ${err}`);
  let errorOut = err.message;
  const errorObj = err.response.data;
  try {
    if (errorObj.message) {
      errorOut = errorObj.message;
      if (errorObj.suggestion) errorOut = `${errorOut}\n\n${errorObj.suggestion}`;
    }
  } catch (e) {
    core.debug(`Error parsing object: ${e}`);
    throw core.setFailed(
      'Uh oh! There was an unexpected error uploading your file. Contact support@readme.io with a copy of your file and core.debug logs for help!\n\nInfo: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting'
    );
  }

  if (errorObj.error && errorObj.error === 'SPEC_VERSION_NOTFOUND') {
    errorOut += `\n\nYou can specify this override by adding \`api-version: 'v1.0.0'\` to your GitHub Action (or by creating your config version in ReadMe!)`;
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
    errorOut += `\n\nWe'll be able to solve the problem faster if you include a copy your core.debug logs! Info: https://docs.readme.com/docs/automatically-sync-api-specification-with-github#troubleshooting`;
  }

  return core.setFailed(errorOut);
};

module.exports = {
  createDoc,
  getCategoryBySlug,
  getDocBySlug,
  handleReadmeIoError,
  updateApiSpecifications,
  updateDocBySlug,
};
