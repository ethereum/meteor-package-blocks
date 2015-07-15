Package.describe({
  name: 'ethereum:blocks',
  summary: 'Provides informations about the current and last 50 blocks',
  version: '0.1.1',
  git: 'http://github.com/ethereum/meteor-package-blocks'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.use('underscore', 'client');
  api.use('mongo', 'client');
  api.use('tracker', 'client');

  api.use('frozeman:persistent-minimongo@0.1.3', 'client');
  api.use('ethereum:web3@0.8.1', 'client');

  api.export(['Blocks', 'web3'], 'client'); // we need to expose web3.js, so that the app, can re-use this one, instead of having two instances

  api.addFiles('blocks.js', 'client');
});

// Package.onTest(function(api) {
//   api.use('tinytest');
//   api.use('ethereum:blocks');
//   api.addFiles('blocks-tests.js');
// });

