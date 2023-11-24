import moxygen from "moxygen";
import assign from "object-assign";
import { program } from "commander";
import fs from "fs";
import doxygen from "doxygen";

const TEMPLATES_FOLDER = "./templates/cpp"
const XML_FOLDER = "./build/xml/"
const PROGRAMMING_LANGUAGE = "cpp"
const DOXYGEN_FILE_PATH = "./doxygen.config"
const ACCESS_LEVEL = "public"
const DEBUG = false

const createDirectories = (dirs) => {
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }
}

// Deletes all files and subdirectories in the given directory
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

const version = JSON.parse(fs.readFileSync('package.json')).version;

program
  .name('render-docs')
  .description('CLI tool to generate markdown documentation from C++ code using Doxygen')
  .version(version)
  .usage('[options] <sourc folder> <target folder>')

program.argument('<source>', 'Source folder containing the .h files')
program.argument('<target>', 'Target folder or file for the markdown documentation')
program.option('-e, --exclude <string>', 'Pattern for excluding files (e.g. "*/test/*")')
program.option('-c, --include-cpp', 'Include .cpp files')
program.parse(process.argv);

if (!program.args.length) {
    program.help();
}

const commandArguments = program.args
const sourceFolder = commandArguments[0]
const outputFile = commandArguments[1]
const commandOptions = program.opts()
const includeCppFiles = commandOptions.includeCpp

let fileExtensions = ["*.h"]
if (includeCppFiles) {
    fileExtensions.push("*.cpp")
}

cleanDirectory("./build")
createDirectories(["./build/md"])

if(!doxygen.isDoxygenExecutableInstalled()) {
    console.log("Doxygen is not installed. Downloading Doxygen...")
    const success = await doxygen.downloadVersion();
    if (!success) {
        console.error("Failed to download Doxygen")
        process.exit(1)
    }
}

// Create doxygen config file. XML output is required for moxygen
const doxyFileOptions = {
    INPUT: sourceFolder,
    RECURSIVE: "YES",
    GENERATE_HTML: "NO",
    GENERATE_LATEX: "NO",
    GENERATE_XML: "YES",
    XML_OUTPUT: XML_FOLDER,
    INCLUDE_FILE_PATTERNS: fileExtensions.join(" "),
    EXCLUDE_PATTERNS: commandOptions.exclude ? commandOptions.exclude : "",
    EXTRACT_PRIVATE: "NO",
    EXTRACT_STATIC: "NO",
    QUIET: DEBUG ? "NO" : "YES",
}

console.log("🔧 Creating Doxygen config file...")
doxygen.createConfig(doxyFileOptions, DOXYGEN_FILE_PATH)
console.log("🔨 Generating XML documentation...")
doxygen.run(DOXYGEN_FILE_PATH)

const moxygenOptions = {
    quiet: true,                /** Do not output anything to the console **/
    anchors: false,             /** Don't generate markdown anchors for internal links **/
    htmlAnchors: true,          /** Generate HTML anchors for output **/
    directory: XML_FOLDER,            /** Location of the doxygen files **/
    output: outputFile,           /** Output file **/
    language: PROGRAMMING_LANGUAGE,            /** Programming language **/
    templates: TEMPLATES_FOLDER,     /** Templates directory **/
    relativePaths: true,
    accessLevel: ACCESS_LEVEL,
    logfile: DEBUG ? "moxygen.log" : undefined
};

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

moxygen.logger.init(finalMoxygenOptions);
console.log("🔨 Generating markdown documentation...")
moxygen.run(finalMoxygenOptions);
console.log("✅ Done")