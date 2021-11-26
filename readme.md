# ReadMe GitHub Sync

A GitHub action for syncing to ReadMe!

View the full docs for setup here: [https://docs.readme.com/docs/automatically-sync-api-specification-with-github](https://docs.readme.com/docs/automatically-sync-api-specification-with-github)

## Examples

### To upload OpenAPI

```yaml
name: Sync to ReadMe

on:
  push:
    branches:
      - master

jobs:
  oas:
    name: OAS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Upload OpenAPI docs
        uses: ./
        with:
          api-version: 'v1.0.0'
          readme-oas-key: ${{ secrets.README_OAS_KEY }}
          type: oas

```

### To upload Markdown docs

```yaml
name: Sync to ReadMe

on:
  push:
    branches:
      - master

jobs:
  markdown:
    name: Markdown
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Upload Markdown docs
        uses: ./
        with:
          # Make sure that there are subfolders for each category slug
          # You can find your categories at https://dash.readme.com/project/<project-slug>/v1.0/docs/getting-started
          # Or by API here: https://docs.readme.com/reference/getcategories
          docs-path: demo/docs
          readme-oas-key: ${{ secrets.README_OAS_KEY }}
          type: md
```
