/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 751:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("glob");


/***/ }),

/***/ 509:
/***/ ((module) => {

module.exports = eval("require")("js-yaml");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 837:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(751)
const yaml = __nccwpck_require__(509)
const fs = (__nccwpck_require__(147).promises)
const util = __nccwpck_require__(837)
const glob = util.promisify(__nccwpck_require__(105))
const path = __nccwpck_require__(17)

const actionOpts = {
  'template-file': core.getInput('template-file') || '.github/dependabot.template.yml',
  'follow-symbolic-links': core.getInput('follow-symbolic-links') === 'true',
  // eslint-disable-next-line no-template-curly-in-string
  'file-header': core.getInput('file-header') || '# This file is generated from ${template-file}'
}

const globOpts = {
  root: process.cwd(),
  mark: true,
  matchBase: true,
  nomount: true,
  follow: actionOpts['follow-symbolic-links']
}

function parseStringTemplate (str, obj) {
  const parts = str.split(/\$\{(?!\d)[\wæøåÆØÅ-]*\}/)
  const args = str.match(/[^{}]+(?=})/g) || []
  const parameters = args.map(argument => obj[argument] || (obj[argument] === undefined ? '' : obj[argument]))
  return String.raw({ raw: parts }, ...parameters)
}

// Lazy deep clone. Not great, but works for this purpose.
const clone = obj => JSON.parse(JSON.stringify(obj))

async function run () {
  const template = yaml.load(await fs.readFile(actionOpts['template-file'], 'utf8'))
  const newUpdates = []

  for (const entry of template.updates) {
    core.info(`Processing entry ${entry.directory} for ecosystem ${entry['package-ecosystem']}`)
    const baseUpdate = clone(entry)
    const matchingFiles = await glob(entry.directory, globOpts)
    core.info(`Found ${matchingFiles.length} files matching ${entry.directory}`)
    const matchingDirs = new Set(matchingFiles.map(file => path.dirname(file)))
    core.info(`Found ${matchingDirs.size} directories matching ${entry.directory}`)

    for (const dir of matchingDirs) {
      core.info(`Creating entry for ${dir} with ecosystem ${entry['package-ecosystem']}`)
      const newUpdate = clone(baseUpdate)
      newUpdate.directory = dir
      newUpdates.push(newUpdate)
    }
  }

  core.info(`Here's the final config (JSON): ${JSON.stringify(newUpdates)}`)
  template.updates = newUpdates
  core.info('Writing config to .github/dependabot.yml')
  const finalString = parseStringTemplate(actionOpts['file-header'], actionOpts) + '\n' + yaml.dump(template)
  core.info(finalString)
  await fs.writeFile('.github/dependabot.yml', finalString)
}

run().catch(error => {
  console.log(error)
  core.setFailed(error.message)
})

})();

module.exports = __webpack_exports__;
/******/ })()
;