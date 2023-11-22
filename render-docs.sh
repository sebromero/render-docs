#!/bin/bash

TARGET_FOLDER="./build/md"
TEMPLATES_FOLDER="./templates/cpp"
INPUT_FOLDER="./build/xml/"
SOURCE_FILES_PATH=$1
# Get target file from second argument or use default
TARGET_FILE=${2:-"$TARGET_FOLDER/api.md"}

# Install npm dependencies if node_modules does not exist
if [ ! -d "node_modules" ]; then
    npm install
fi

# Check if moxygen is installed by checking the version, redirecting stdout to /dev/null and checking the return code
npx moxygen -V > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ moxygen is installed"
else
    node node_modules/doxygen/bin/nodeDoxygen.js  --download
fi

# Check if source files path is provided
if [ -z "$SOURCE_FILES_PATH" ]; then
    echo "❌ No source files path provided"
    exit 1
fi

# Clear contents of source folder
echo "🧹 Clearing source folder ./source ..."
mkdir -p ./source
rm -rf ./source/*

# Symlinking all .h files in ~/Source to ./source
echo "🔗 Symlinking source files from $SOURCE_FILES_PATH to ./source ..."
find $SOURCE_FILES_PATH -name "*.h" -exec ln -s {} ./source \;

# Clearing contents of build folder
echo "🧹 Clearing build folder ./build ..."
mkdir -p ./build
rm -rf ./build/*

echo "📚 Generating XML documentation..."
npx doxygen #same as: node node_modules/doxygen/bin/nodeDoxygen.js
mkdir -p $TARGET_FOLDER

# Clear contents of target folder
echo "🧹 Clearing target folder $TARGET_FOLDER ..."
rm -rf $TARGET_FOLDER/*

echo "📚 Converting documentation to Markdown..."

# 🐛 Anchors are always generated even if --anchors is not specified
npx moxygen --html-anchors --quiet --templates $TEMPLATES_FOLDER --classes --relative-paths --output ./build/md/api-%s.md $INPUT_FOLDER
# npx moxygen --html-anchors --access-level public --quiet --templates $TEMPLATES_FOLDER --output $TARGET_FILE $INPUT_FOLDER

# Example: ./render-docs.sh /Users/sebastianhunkeler/Repositories/arduino-libraries/Arduino_UnifiedStorage/src