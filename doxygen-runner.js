import doxygen from "doxygen";
import { createDirectories, cleanDirectory } from "./helpers.js";
import fs from "fs";

const DOXYGEN_FILE_PATH = "./doxygen.config"

class DoxygenRunner {

    constructor(options){
        this.options = options
    }

    async checkInstallation(){
        if(!doxygen.isDoxygenExecutableInstalled()) {
            console.log(`Doxygen is not installed. Downloading ...`)
            const success = await doxygen.downloadVersion();
            if (!success) {
                console.error("Failed to download Doxygen")
                process.exit(1)
            }
        }
    }

    checkXMLOutput(){
        const xmlFiles = fs.readdirSync(this.options.xmlFolder)
        if (xmlFiles.length === 0) {
            console.error(`❌ No XML files found in ${this.options.xmlFolder}.`)
            process.exit(1)
        } else if(this.options.debug){
            console.log(`✅ Found ${xmlFiles.length} XML files.`)
            for (const file of xmlFiles) {
                console.log(`📄 ${file}`)
            }
        }
    }

    prepare(){
        // The configuration options for Doxygen
        const doxyFileOptions = {
            INPUT: this.options.sourceFolder,
            RECURSIVE: "YES",
            GENERATE_HTML: "NO",
            GENERATE_LATEX: "NO",
            GENERATE_XML: this.options.outputXML ? "YES" : "NO", // XML output is required for moxygen
            XML_OUTPUT: this.options.xmlFolder,
            CASE_SENSE_NAMES: "NO", // Creates case insensitive links compatible with GitHub
            INCLUDE_FILE_PATTERNS: this.options.fileExtensions.join(" "),
            EXCLUDE_PATTERNS: this.options.exclude ? this.options.exclude : "",
            EXTRACT_PRIVATE: this.options.accessLevel === "private" ? "YES" : "NO",
            EXTRACT_STATIC: "NO",
            QUIET: this.options.debug ? "NO" : "YES",
            WARN_NO_PARAMDOC: "YES", // Warn if a parameter is not documented
            WARN_AS_ERROR: this.options.failOnWarnings ? "FAIL_ON_WARNINGS" : "NO", // Treat warnings as errors. Continues if warnings are found.
        }

        if(this.options.debug) console.log(`🔧 Creating Doxygen config file ${DOXYGEN_FILE_PATH} ...`)
        doxygen.createConfig(doxyFileOptions, DOXYGEN_FILE_PATH)

        if(this.options.debug) console.log("🏃 Running Doxygen ...")
        if(doxyFileOptions.GENERATE_XML === "YES") {
            cleanDirectory("./build")
            createDirectories(["./build"])
            console.log(`🔨 Generating XML documentation at ${this.options.xmlFolder} ...`)
        }
    }

    extractValidationMessages(error){
        // Replace all "\n  " with " " to meld the error messages into one line        
        let errorMessages = error.stderr.toString().replace(/\n  /g, " ").split("\n")

        // Filter out empty messages and allow only warnings related to documentation issues
        const filteredMessages = errorMessages.filter(message => {
            const warningMessageRegex = /^(?:[^:\n]+):(?:\d+): warning: (?:.+)$/
            return message.match(warningMessageRegex)
        })

        if(this.options.debug){
            // Print messages that were not filtered out and are not empty
            const remainingMessages = errorMessages.filter(message => {
                return !filteredMessages.includes(message) && message !== ""
            })
            for (const message of remainingMessages) {
                console.warn(`🤔 ${message}`)
            }
        }

        return filteredMessages
    }

    async run(){
        let validationMessages = []

        await this.checkInstallation()
        this.prepare()
        try {
            doxygen.run(DOXYGEN_FILE_PATH)
        } catch (error) {
            validationMessages = this.extractValidationMessages(error)
        }

        if(this.options.outputXML){
            this.checkXMLOutput()
        }

        return validationMessages
    }
}

export default DoxygenRunner;