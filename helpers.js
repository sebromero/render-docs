import fs from "fs"
import path from "path"

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

// Find the corresponding implementation file for a header file
const findImplementationFile = (file) => {
    const filename = path.parse(file).name
    const extension = path.extname(file)
    if(extension !== ".h") return null

    const folder = path.dirname(file)
    const implementationFile = path.join(folder, `${filename}.cpp`)
    
    if(!fs.existsSync(implementationFile)) return null
    return implementationFile    
}

export { createDirectories, cleanDirectory, findImplementationFile }
