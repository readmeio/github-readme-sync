// This isn't the best way to do it, the best way would likely be with `act`.
// But it's so hard to get setup, so this will hack together an 80% solution.
// Things that work by running this script aren't guarenteed to work on GitHub!

// I'd like to actually read the YAML file, but including a YAML parser is
// really heavy and we check in /node_modules.

const core = require('@actions/core');
const fs = require('fs');
const { exec } = require('child_process');

function loadSecrets() {
  let secrets;
  try {
    secrets = fs.readFileSync('./demo/.secrets').toString();
  } catch (e) {
    console.log(
      'ERROR! You need a `debug/.secrets` file! Copy `debug/.secrets_EXAMPLE`, and add your API key from ReadMe to it'
    );
    process.exit(0);
  }

  secrets.split('\n').forEach(secret => {
    if (secret.match(/=/)) {
      const s = secret.split('=');

      // https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L69
      core.exportVariable(`INPUT_${s[0].replace(/ /g, '_').toUpperCase()}`, s[1]);
    }
  });
}

loadSecrets();

const go = exec('node ../main', { cwd: './demo' });

go.stdout.on('data', function (data) {
  if (data.toString().match(/::error::/)) {
    // This is a core.setFailed error!
    console.log(`🚨 ${data.toString().replace(/::error::/, '')}`);
    process.exit(0);
  }

  console.log(`📝: ${data.toString()}`);
});

go.stderr.on('data', function (data) {
  console.log(`🚨: ${data.toString()}`);
});

go.on('exit', function (code) {
  console.log(`✅ Exited the program! (${code.toString()})`);
});
