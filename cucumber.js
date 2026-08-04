const path = require('path');

process.env.TS_NODE_PROJECT = path.join(__dirname, 'tests/tsconfig.json');
process.env.TSCONFIG_PATHS_TSCONFIG = path.join(__dirname, 'tests/tsconfig.json');

const config = {
  paths:         ['tests/cucumber/features/**/*.feature'],
  require:       [
    'tests/cucumber/hooks/hooks.ts',
    'tests/cucumber/step-definitions/**/*.steps.ts',
  ],
  requireModule: ['ts-node/register', 'tsconfig-paths/register'],
  format: [
    'progress-bar',
    'json:tests/reports/cucumber-report.json',
    'html:tests/reports/cucumber-report.html',
  ],
  worldParameters: {},
  parallel: 1,
  retry: 1,
};

module.exports = config;
