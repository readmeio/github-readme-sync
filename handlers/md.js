const path = require('path');
const core = require('@actions/core');
const _ = require('lodash');
const glob = require('glob');
const promisify = require('util').promisify;
const {
  handleReadmeIoError,
  getDocBySlug,
  getCategoryBySlug,
  updateDocBySlug,
  createDoc,
} = require('../helpers/readmeio');
const fs = require('fs');
const { isEmpty } = require('lodash');

const globPromise = promisify(glob);

const processMdFile = async (filePath, { apiVersion, readmeApiKey }) => {
  core.info(`Processing ${filePath}`);
  const data = fs.readFileSync(filePath, 'utf8');
  // We assume that the title is on the first line and starts with a #
  const title = _.last(_.split(_.first(_.split(data, '\n')), '#'));
  const docSlug = path.basename(filePath, '.md');
  const categorySlug = _.last(_.split(path.dirname(filePath), '/'));

  const options = {
    headers: {
      'x-readme-version': apiVersion,
      'x-readme-source': 'github',
    },
    auth: { username: readmeApiKey },
  };

  let categoryId;
  try {
    const category = await getCategoryBySlug(categorySlug, options);
    categoryId = category.data._id;
  } catch (err) {
    core.error(`Error received from ReadMe API: ${err}`);
  }

  if (isEmpty(categoryId)) {
    return core.warning(`Category ${categorySlug} not found, please create it in Readme.io first`);
  }

  let docExists = true;
  try {
    await getDocBySlug(docSlug, options);
  } catch (err) {
    docExists = false;
  }

  const docParams = {
    title,
    body: data,
    category: categoryId,
  };

  if (docExists) {
    core.info(`Doc ${docSlug} existing. Updating...`);
    return updateDocBySlug(docSlug, docParams, options);
  }
  core.info(`Doc ${docSlug} not existing. Creating...`);
  return createDoc(docParams, options);
};

module.exports = async ({ apiVersion, docsPath, readmeApiKey }) => {
  if (_.isEmpty(docsPath)) {
    return core.setFailed('When using type `md`, make sure that the field `docs-path` is filled');
  }

  const files = await globPromise(`${docsPath}/**/*.md`);
  core.info(`${files.length} file match(es) found: ${files.toString()}`);

  return Promise.all(_.map(files, file => processMdFile(file, { apiVersion, readmeApiKey }).catch(handleReadmeIoError)))
    .then(() => core.setOutput('status', 'success'))
    .catch(err => core.setFailed(err));
};
