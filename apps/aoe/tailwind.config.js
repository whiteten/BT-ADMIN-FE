const { join } = require('path');
const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const TailwindConfig = require('../../libs/shared-ui/tailwind.config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...TailwindConfig,
  content: [...TailwindConfig.content, join(__dirname, '{src,pages,components,app}/**/*!(*.stories|*.spec).{js,jsx,ts,tsx,html}'), ...createGlobPatternsForDependencies(__dirname)],
};
