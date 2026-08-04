import path from 'path';

const config = {
  paths:          ['tests/cucumber/features/**/*.feature'],
  require:        ['tests/cucumber/hooks/hooks.ts', 'tests/cucumber/step-definitions/**/*.steps.ts'],
  requireModule:  ['ts-node/register', 'tsconfig-paths/register'],
  format: [
    'progress-bar',
    `json:tests/reports/cucumber-report.json`,
    `html:tests/reports/cucumber-report.html`,
    'allure-cucumberjs/reporter',
  ],
  formatOptions: {
    resultsDir: 'tests/reports/allure-results',
  },
  worldParameters: {},
  parallel: 1,
  retry: 1,
};

export default config;
