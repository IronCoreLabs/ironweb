const fs = require("fs");
const path = require("path");
const ts = require("typescript");

/**
 * Specifiers of every `require(...)` call in an emitted CommonJS file. Parsed rather than matched so the word
 * appearing in a comment or a string literal is not mistaken for an import.
 * @param {string} file
 * @returns {string[]}
 */
function requiredSpecifiers(file) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.ES2015, false, ts.ScriptKind.JS);
    const specifiers = [];
    const visit = (node) => {
        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "require" &&
            node.arguments.length === 1 &&
            ts.isStringLiteralLike(node.arguments[0])
        ) {
            specifiers.push(node.arguments[0].text);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return specifiers;
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string}
 */
function resolveRelative(fromFile, specifier) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    const resolved = [`${base}.js`, path.join(base, "index.js")].find((candidate) => fs.existsSync(candidate));
    if (resolved === undefined) {
        throw new Error(`${fromFile} requires ${specifier}, which does not exist in the build output.`);
    }
    return resolved;
}

/**
 * Packages reachable from the shim's entry point, each mapped to the files requiring it.
 *
 * Reading the build output rather than `src` is what keeps this honest: tsc has already elided type-only imports
 * using real type information, and reachability from the entry point already excludes the frame and test trees. So
 * none of that is reproduced here, and none of it can drift from what actually ships.
 * @param {string} entryFile
 * @returns {Map<string, string[]>}
 */
function runtimePackages(entryFile) {
    const packages = new Map();
    const visited = new Set();
    const queue = [path.resolve(entryFile)];
    while (queue.length > 0) {
        const file = queue.pop();
        if (visited.has(file)) {
            continue;
        }
        visited.add(file);
        for (const specifier of requiredSpecifiers(file)) {
            if (specifier.startsWith(".")) {
                queue.push(resolveRelative(file, specifier));
            } else {
                //A scoped package's import path can go deeper than the package name, e.g. "@scope/pkg/sub".
                const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
                packages.set(packageName, (packages.get(packageName) || []).concat(path.relative(path.dirname(entryFile), file)));
            }
        }
    }
    return packages;
}

/**
 * `dependencies` for the published shim: every package the built shim requires at runtime, as a caret range on the
 * root package.json pin. Throws if the shim requires a package the root does not pin.
 * @param {string} entryFile
 * @param {Record<string, string>} rootDependencies
 * @returns {Record<string, string>}
 */
function shimDependencies(entryFile, rootDependencies) {
    const dependencies = {};
    const missing = new Map();
    for (const [packageName, files] of runtimePackages(entryFile)) {
        const pin = rootDependencies[packageName];
        if (pin) {
            dependencies[packageName] = /^\d/.test(pin) ? `^${pin}` : pin;
        } else {
            missing.set(packageName, files);
        }
    }
    if (missing.size > 0) {
        const detail = Array.from(missing.entries())
            .map(([packageName, files]) => `${packageName} (${files.join(", ")})`)
            .join("; ");
        throw new Error(`Shim requires packages that are not in the root package.json dependencies: ${detail}`);
    }
    return Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)));
}

module.exports = {shimDependencies};
