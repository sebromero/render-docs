#!/bin/bash

TARGET_FOLDER="./build/md"
TARGET_FILE="$TARGET_FOLDER/api.md"
TEMPLATES_FOLDER="./templates/cpp"
INPUT_FOLDER="./build/xml/"
SOURCE_FILES=$1

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

# Clear contents of source folder
echo "🧹 Clearing source folder ./source ..."
mkdir -p ./source
rm -rf ./source/*

# Symlinking all .h files in ~/Source to ./source
echo "🔗 Symlinking source files from $SOURCE_FILES to ./source ..."
ln -s $SOURCE_FILES ./source

echo "📚 Generating XML documentation..."
npx doxygen #same as: node node_modules/doxygen/bin/nodeDoxygen.js
mkdir -p $TARGET_FOLDER

# Clear contents of target folder
echo "🧹 Clearing target folder $TARGET_FOLDER ..."
rm -rf $TARGET_FOLDER/*

echo "📚 Converting documentation to Markdown..."

# 🐛 Anchors are always generated even if --anchors is not specified
# npx moxygen --anchors --classes --output ./build/md/api-%s.md $INPUT_FOLDER
npx moxygen --html-anchors --quiet --templates $TEMPLATES_FOLDER --output $TARGET_FILE $INPUT_FOLDER