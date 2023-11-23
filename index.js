import moxygen from "moxygen";
import assign from "object-assign";
import { program } from "commander";
import fs from "fs";
import path from "path";
import doxygen from "doxygen";

const TEMPLATES_FOLDER = "./templates/cpp"
const XML_FOLDER = "./build/xml/"
const SOURCE_SHADOW_FOLDER = "./source"
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

const cleanDirectory = (dir) => {
    // Deletes all files and subdirectories in the given directory
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

const findAllFiles = (dir, fileExtensions, include, exclude) => {
    const files = fs.readdirSync(dir)
    let result = []
    files.forEach(file => {
        const path = dir + "/" + file
        const stat = fs.statSync(path)
        if (stat && stat.isDirectory()) {
            result = result.concat(findAllFilesRecursively(path, include, exclude))
        } else {
            // Get file extension including the dot
            const fileExtension = file.substring(file.lastIndexOf(".")).toLowerCase()
            
            // Only consider files with the given extensions from the fileExtensions array
            if (fileExtensions && !fileExtensions.includes(fileExtension)) {
                return
            }

            if (include && !file.match(include)) {
                return
            }
            if (exclude && file.match(exclude)) {
                return
            }
            result.push(path)
        }
    })
    return result
}

const symlinkFilesTo = (files, target, baseDirectory) => {
    for (const file of files) {
        // The target path should be the base directory + the file path relative to the base directory
        const targetFile = target + "/" + path.relative(baseDirectory, file)
        fs.symlinkSync(file, targetFile)
    }
}

// Get version from package.json without using require
const version = JSON.parse(fs.readFileSync('package.json')).version;

program
  .name('render-docs')
  .description('CLI tool to generate markdown documentation from C++ code using Doxygen')
  .version(version)
  .usage('[options] <sourc folder> <target folder>')

program.argument('<source>', 'Source folder containing the .h files')
program.argument('<target>', 'Target folder or file')
program.option('-I, --include <string>', 'Regex for including files')
program.option('-e, --exclude <string>', 'Regex for excluding files')
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

let fileExtensions = [".h"]
if (includeCppFiles) {
    fileExtensions.push(".cpp")
}

const files = findAllFiles(sourceFolder, fileExtensions , commandOptions.include, commandOptions.exclude)
cleanDirectory(SOURCE_SHADOW_FOLDER)
cleanDirectory("./build")
createDirectories([SOURCE_SHADOW_FOLDER, "./build/md"])
symlinkFilesTo(files, SOURCE_SHADOW_FOLDER, sourceFolder)

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
    INPUT: SOURCE_SHADOW_FOLDER,
    RECURSIVE: "YES",
    GENERATE_HTML: "NO",
    GENERATE_LATEX: "NO",
    GENERATE_XML: "YES",
    XML_OUTPUT: XML_FOLDER,
    INCLUDE_FILE_PATTERNS: "*.h *.cpp",
    EXCLUDE_PATTERNS: "*/test/*",
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