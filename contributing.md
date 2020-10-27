# How to run it locally

Run `npm run demo` to attempt to mimic the GitHub server. It's not perfect, but it's way easier than getting `act` set up.

You'll need to move `demo/.secrets_EXAMPLE` to `demo/.secrets` and add your API keys in there.

## Building A Release

Once your updates are in `master` and you've tagged a new release, you'll also need to update the major version tag (e.g. `v2`) so it points to your changes. To do this, run the following commands (while on `master`):

```bash
# Retrieves latest tags from the repository
git fetch

# Updates the major version tag (v2) to point to v2.x.x
git tag -f -a v2 -m "v2.x.x"

# Pushes tags to repository
git push -f --tags