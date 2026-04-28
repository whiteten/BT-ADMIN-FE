const fs = require('fs');
const path = require('path');

const RESOLVE_EXTS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

const findProjectRoot = (filename) => {
  let dir = path.dirname(filename);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'project.json'))) return dir;
    dir = path.dirname(dir);
  }
  return path.dirname(filename);
};

const resolveImportPath = (filename, importPath) => {
  if (!importPath.startsWith('.')) return importPath;
  const baseDir = path.dirname(filename);
  const abs = path.resolve(baseDir, importPath);
  const projectRoot = findProjectRoot(filename);
  for (const ext of RESOLVE_EXTS) {
    const candidate = abs + ext;
    if (fs.existsSync(candidate)) {
      return path.relative(projectRoot, candidate).replace(/\\/g, '/');
    }
  }
  return path.relative(projectRoot, abs + '.tsx').replace(/\\/g, '/');
};

module.exports = function ({ types: t }) {
  const isReactLazyCall = (callee) => {
    if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, { name: 'React' }) && t.isIdentifier(callee.property, { name: 'lazy' })) {
      return true;
    }
    return t.isIdentifier(callee, { name: 'lazy' });
  };

  const extractImportPath = (factoryNode) => {
    // react-compiler가 _cN = () => ... 형태로 감쌀 수 있어서 AssignmentExpression 안쪽까지 풀어야 함
    if (t.isAssignmentExpression(factoryNode)) {
      factoryNode = factoryNode.right;
    }
    if (!t.isArrowFunctionExpression(factoryNode) && !t.isFunctionExpression(factoryNode)) return null;
    let importCall = null;
    if (t.isCallExpression(factoryNode.body) && t.isImport(factoryNode.body.callee)) {
      importCall = factoryNode.body;
    } else if (t.isBlockStatement(factoryNode.body)) {
      for (const stmt of factoryNode.body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument && t.isCallExpression(stmt.argument) && t.isImport(stmt.argument.callee)) {
          importCall = stmt.argument;
          break;
        }
      }
    }
    if (!importCall) return null;
    const arg = importCall.arguments[0];
    return t.isStringLiteral(arg) ? arg.value : null;
  };

  return {
    name: 'lazy-meta',
    visitor: {
      VariableDeclarator(astPath, state) {
        const filename = state.file.opts.filename || '';
        if (!/[\\/]routes\.tsx?$/.test(filename)) return;

        const { node } = astPath;
        if (!t.isIdentifier(node.id) || !node.init) return;
        if (!t.isCallExpression(node.init)) return;
        if (!isReactLazyCall(node.init.callee)) return;

        const importPath = extractImportPath(node.init.arguments[0]);
        if (!importPath) return;

        const componentName = node.id.name;
        const resolvedFile = resolveImportPath(filename, importPath);

        const metaObject = t.objectExpression([
          t.objectProperty(
            t.identifier('__meta'),
            t.objectExpression([t.objectProperty(t.identifier('name'), t.stringLiteral(componentName)), t.objectProperty(t.identifier('file'), t.stringLiteral(resolvedFile))]),
          ),
        ]);

        node.init = t.callExpression(t.memberExpression(t.identifier('Object'), t.identifier('assign')), [node.init, metaObject]);
      },
    },
  };
};
