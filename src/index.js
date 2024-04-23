const core = require('@actions/core')
const yaml = require('js-yaml')
const fs = require('fs').promises
const util = require('util')
const globModule = require('glob')
const glob = util.promisify(globModule.glob)
const path = require('path')

const actionOpts = {
  'template-file': core.getInput('template-file') || '.github/dependabot.template.yml',
  'follow-symbolic-links': core.getInput('follow-symbolic-links') === 'true',
  // eslint-disable-next-line no-template-curly-in-string
  'file-header': core.getInput('file-header') || '# This file is generated from ${template-file}'
}

const globOpts = {
  mark: true,
  matchBase: true,
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
