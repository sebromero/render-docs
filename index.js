#!/usr/bin/env node

import moxygen from "moxygen";
import assign from "object-assign";
import { program } from "commander";
import fs from "fs";
import DoxygenRunner from "./doxygen-runner.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";
import IssueResolver from "./issue-resolver.js";
import { createDirectories } from "./helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENAI_API_KEY_ENV_VAR = "OPENAI_API_KEY"
const TEMPLATES_FOLDER = path.join(__dirname, "templates/cpp")
const PROGRAMMING_LANGUAGE = "cpp"
const XML_FOLDER = "./build/xml/"
const MOXYGEN_LOGFILE = "./moxygen.log"

// Extract the command version from the package.json file
const version = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version;

program
  .name('render-docs')
  .description('CLI tool to generate markdown documentation from C++ code using Doxygen')
  .version(version)
  .usage('[options] <sourc folder> <target folder>')

program.argument('<source>', 'Source folder containing the .h files')
program.argument('[target]', 'Target folder or file for the markdown documentation')
program.option('-e, --exclude <string>', 'Pattern for excluding files (e.g. "*/test/*")')
program.option('-c, --include-cpp', 'Process .cpp files when rendering the documentation.')
program.option('-a, --access-level <string>', 'Minimum access level to be considered (public, private)', "public")
program.option('-f, --fail-on-warnings', 'Fail when undocumented code is found', false)
program.option('-d, --debug', 'Enable debugging mode with additional output.', false)
program.option('-r, --resolve-issues [api-key]', 'Automatically fix issues in the documentation', false)

if (process.argv.length < 2) {
    program.help();
}
program.parse(process.argv);

const commandArguments = program.args
const sourceFolder = commandArguments[0]
const outputFile = commandArguments[1]
const commandOptions = program.opts()
const includeCppFiles = commandOptions.includeCpp
const outputXML = outputFile !== undefined

let fileExtensions = ["*.h"]
if (includeCppFiles) {
    fileExtensions.push("*.cpp")
}

const doxygenOptions = {
    "outputXML": outputXML,
    "xmlFolder": XML_FOLDER,
    "sourceFolder": sourceFolder,
    "fileExtensions": fileExtensions,
    "exclude": commandOptions.exclude,
    "accessLevel": commandOptions.accessLevel,
    "debug": commandOptions.debug
}

const doxygenRunner = new DoxygenRunner(doxygenOptions)
let validationMessages = await doxygenRunner.run()

if(validationMessages.length > 0 && commandOptions.resolveIssues){
    console.log("👀 Issues in the documentation were found:")
    for (const message of validationMessages) {
        console.warn(`😬 ${message}`)
    }

    console.log("🔨 Trying to resolve issues ...")
    const apiKey = typeof commandOptions.resolveIssues === "string" ? commandOptions.resolveIssues : process.env[OPENAI_API_KEY_ENV_VAR]
    const resolver = new IssueResolver(validationMessages, apiKey)
    await resolver.resolve()
    validationMessages = await doxygenRunner.run()
    if(validationMessages.length > 0){
        console.warn("🙈 Remaining issues in the documentation were found. Please check the output.")
    }
}

if(validationMessages.length > 0){
    for (const message of validationMessages) {
        console.warn(`😬 ${message}`)
    }

    if(commandOptions.failOnWarnings){
        console.error("❌ Issues in the documentation were found. Exiting.")
        process.exit(1)
    }
}

// The configuration options for moxygen
const moxygenOptions = {
    quiet: true,                /** Do not output anything to the console **/
    anchors: false,             /** Don't generate markdown anchors for internal links **/
    htmlAnchors: true,          /** Generate HTML anchors for output **/
    directory: XML_FOLDER,            /** Location of the doxygen files **/
    output: outputFile,           /** Output file **/
    language: PROGRAMMING_LANGUAGE,            /** Programming language **/
    templates: TEMPLATES_FOLDER,     /** Templates directory **/
    relativePaths: true,
    accessLevel: commandOptions.accessLevel,
    logfile: commandOptions.debug ? MOXYGEN_LOGFILE : undefined
};

// Apply default options where necessary
const finalMoxygenOptions = assign({}, moxygen.defaultOptions, {
    directory: moxygenOptions.directory,
    output: moxygenOptions.output,
    anchors: moxygenOptions.anchors,
    htmlAnchors: moxygenOptions.htmlAnchors,
    language: moxygenOptions.language,
    relativePaths: moxygenOptions.relativePaths,
    templates: moxygenOptions.templates,
    accessLevel: moxygenOptions.accessLevel,
    quiet: moxygenOptions.quiet,
    logfile: moxygenOptions.logfile
});

if(outputXML){
    // Check if output path exists. If not, create it.
    if(outputFile){
        const outputFolder = path.dirname(outputFile)
        if(commandOptions.debug) console.log(`🔧 Creating output directory ${outputFolder} ...`)
        createDirectories([outputFolder])
    }
    
    moxygen.logger.init(finalMoxygenOptions);
    console.log("🔨 Generating markdown documentation...")
    moxygen.run(finalMoxygenOptions);
}

console.log("✅ Done")