const { existsSync } = require('fs');

module.exports = {
  '*.{js,jsx,ts,tsx}': (files) => {
    // deleted 파일은 eslint/prettier 대상에서 제외
    const existing = files.filter((f) => existsSync(f));
    if (existing.length === 0) return [];
    return [`eslint --fix --ignore-pattern '**/webpack*.ts' ${existing.join(' ')}`, `prettier --write ${existing.join(' ')}`];
  },
};
