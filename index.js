import moxygen from "moxygen";

const TARGET_FOLDER = "./build/md"
const TARGET_FILE = TARGET_FOLDER + "/api.md"
const TEMPLATES_FOLDER = "./templates/cpp"
const INPUT_FOLDER = "./build/xml/"

const options = {
    quiet: true,                /** Do not output anything to the console **/
    // htmlAnchors: true,          /** Generate HTML anchors for output **/
    directory: INPUT_FOLDER,            /** Location of the doxygen files **/
    output: TARGET_FILE,           /** Output file **/
    groups: false,              /** Output doxygen groups separately **/
    noindex: false,             /** Disable generation of the index. Does not work with `groups` option **/
    anchors: true,              /** Generate anchors for internal links **/
    language: 'cpp',            /** Programming language **/
    templates: TEMPLATES_FOLDER,     /** Templates directory **/
    pages: false,               /** Output doxygen pages separately **/
    classes: false,             /** Output doxygen classes separately **/
};

moxygen.run(options);