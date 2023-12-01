#!/usr/bin/env node

import moxygen from "moxygen";
import assign from "object-assign";
import { program } from "commander";
import fs from "fs";
import doxygen from "doxygen";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_FOLDER = path.join(__dirname, "templates/cpp")
const XML_FOLDER = "./build/xml/"
const PROGRAMMING_LANGUAGE = "cpp"
const DOXYGEN_FILE_PATH = "./doxygen.config"

/**
 * Creates directories if they do not exist.
 * @param {string[]} dirs - An array of directory paths.
 */
const createDirectories = (dirs) => {
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }
}

/**
 * Cleans the specified directory by removing all files and subdirectories recursively.
 * @param {string} dir - The directory path to be cleaned.
 */
const cleanDirectory = (dir) => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
        for (const file of files) {
            const path = dir + "/" + file
            const stat = fs.statSync(path)
            if (stat && stat.isDirectory()) {
                cleanDirectory(path)
                fs.rmdirSync(path)
            } else {
                fs.unlinkSync(path)
            }
        }
    }
}

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

if(outputXML){
    cleanDirectory("./build")
    createDirectories(["./build"])
}

// Check if output path exists. If not, create it.
if(outputFile){
    const outputFolder = path.dirname(outputFile)
    createDirectories([outputFolder])
}

if(!doxygen.isDoxygenExecutableInstalled()) {
    console.log(`Doxygen is not installed. Downloading ...`)
    const success = await doxygen.downloadVersion();
    if (!success) {
        console.error("Failed to download Doxygen")
        process.exit(1)
    }
}

// The configuration options for Doxygen
const doxyFileOptions = {
    INPUT: sourceFolder,
    RECURSIVE: "YES",
    GENERATE_HTML: "NO",
    GENERATE_LATEX: "NO",
    GENERATE_XML: outputXML ? "YES" : "NO", // XML output is required for moxygen
    XML_OUTPUT: XML_FOLDER,
    CASE_SENSE_NAMES: "NO", // Creates case insensitive links compatible with GitHub
    INCLUDE_FILE_PATTERNS: fileExtensions.join(" "),
    EXCLUDE_PATTERNS: commandOptions.exclude ? commandOptions.exclude : "",
    EXTRACT_PRIVATE: commandOptions.accessLevel === "private" ? "YES" : "NO",
    EXTRACT_STATIC: "NO",
    QUIET: commandOptions.debug ? "NO" : "YES",
    WARN_NO_PARAMDOC: "YES", // Warn if a parameter is not documented
    WARN_AS_ERROR: commandOptions.failOnWarnings ? "FAIL_ON_WARNINGS" : "NO", // Treat warnings as errors. Continues if warnings are found.
}

if(commandOptions.debug) console.log(`🔧 Creating Doxygen config file ${DOXYGEN_FILE_PATH} ...`)
doxygen.createConfig(doxyFileOptions, DOXYGEN_FILE_PATH)

try {
    if(commandOptions.debug) console.log("🏃 Running Doxygen ...")
    if(doxyFileOptions.GENERATE_XML === "YES") {
        console.log(`🔨 Generating XML documentation at ${XML_FOLDER} ...`)
    }
    doxygen.run(DOXYGEN_FILE_PATH)
} catch (error) {
    // Replace all "\n  " with " " to meld the error messages into one line        
    let errorMessages = error.stderr.toString().replace(/\n  /g, " ").split("\n")

    // Filter out empty messages and allow only warnings related to documentation issues
    const filteredMessages = errorMessages.filter(message => {
        const warningMessageRegex = /^(?:[^:\n]+):(?:\d+): warning: (?:.+)$/
        return message.match(warningMessageRegex)
    })

    if(commandOptions.debug){
        // Print messages that were not filtered out and are not empty
        const remainingMessages = errorMessages.filter(message => {
            return !filteredMessages.includes(message) && message !== ""
        })
        for (const message of remainingMessages) {
            console.warn(`🤔 ${message}`)
        }
    }

    if(filteredMessages.length > 0 && commandOptions.failOnWarnings) {
        console.error("❌ Issues in the documentation were found.")
        for (const message of filteredMessages) {
            console.warn(`😬 ${message}`)
        }
        process.exit(1)
    }
}

if(outputXML){
    const xmlFiles = fs.readdirSync(XML_FOLDER)
    if (xmlFiles.length === 0) {
        console.error(`❌ No XML files found in ${XML_FOLDER}.`)
        process.exit(1)
    } else if(commandOptions.debug){
        console.log(`✅ Found ${xmlFiles.length} XML files.`)
        for (const file of xmlFiles) {
            console.log(`📄 ${file}`)
        }
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
    logfile: commandOptions.debug ? "moxygen.log" : undefined
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
    moxygen.logger.init(finalMoxygenOptions);
    console.log("🔨 Generating markdown documentation...")
    moxygen.run(finalMoxygenOptions);
}

console.log("✅ Done")