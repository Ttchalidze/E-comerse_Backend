#!/bin/bash

# Step 1: Compile TypeScript to JavaScript
echo "Compiling TypeScript..."
tsc

# Step 2: Copy necessary files to a build directory
echo "Copying required files to build folder..."

# Create a 'build' folder if it doesn't exist
mkdir -p build

# Copy the dist folder (compiled code)
cp -r dist/ build/dist/

# Copy static assets (if any)
#cp -r src/assets/ build/assets/

# Copy package.json and package-lock.json for dependency installation
cp package.json package-lock.json build/

# Step 3: Include any other configuration or environment files, if needed
# For example, .env file
 cp .env build/

echo "Build process completed. Ready for upload to S3."cloud 
