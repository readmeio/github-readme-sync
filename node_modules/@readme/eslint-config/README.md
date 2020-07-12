# @readme/eslint-config

Core coding standards for ReadMe projects.

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.io)

## Installation

You'll need to install [`ESLint`](https://www.npmjs.com/package/eslint) and [`Prettier`](https://www.npmjs.com/package/prettier) into your project. Use this shortcut to install them alongside the config (if using **npm 5+**):

```sh
npx install-peerdeps --dev @readme/eslint-config
```

If you already have `eslint` and `prettier` installed in your project, just run this command to install the config:

```sh
npm install --save @readme/eslint-config
```

## Usage

Create a `.eslintrc` file with the following contents:

```js
{
  "extends": [
    "@readme/eslint-config"
  ]
}
```

## Configs
> **Note:** `@readme/eslint-config/*` subconfigs must be loaded alongside `@readme/eslint-config`, or at least take advantage of a root `.eslintrc` config that has `root` set to `true`.

* `@readme/eslint-config`
* `@readme/eslint-config/react`
* `@readme/eslint-config/testing`

### Prettier
Included in this is our shared Prettier config. You can use it in your application by adding the following to your `package.json`:

```json
"prettier": "@readme/eslint-config/prettier"
```

## Contributing
To assist in cleaner commit logs and a better changelog, all commit messages must be formatted against the https://commitlint.js.org/ standards.

See [@commitlint/config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional) for some more information.
