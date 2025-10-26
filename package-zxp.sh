#!/bin/bash

# ExprOne ZXP Packaging Script
# Version: 0.9.0 Beta

set -e

echo "🚀 Building ExprOne v0.9.0 Beta ZXP Package..."

# Configuration
EXTENSION_NAME="ExprOne"
VERSION="0.9.0"
CERT_FILE="./certs/sheena-exprone.p12"
OUTPUT_DIR="./distribute"
OUTPUT_FILE="${OUTPUT_DIR}/${EXTENSION_NAME}-${VERSION}-beta.zxp"

# Temporary build directory
BUILD_DIR="./__build_temp"

# Check if certificate exists
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Certificate not found: $CERT_FILE"
    exit 1
fi

# Check if ZXPSignCmd is installed
if ! command -v ZXPSignCmd &> /dev/null; then
    echo "❌ ZXPSignCmd is not installed"
    echo "Please install it from: https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCmdーb"
    exit 1
fi

# Prompt for certificate password
echo ""
echo "📝 Please enter the certificate password:"
read -s CERT_PASSWORD
echo ""

if [ -z "$CERT_PASSWORD" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Clean up previous build
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Create build directory
echo "📦 Creating build directory..."
mkdir -p "$BUILD_DIR"

# Copy necessary files to build directory
echo "📋 Copying extension files..."

# Copy required directories and files
cp -r CSXS "$BUILD_DIR/"
cp -r js "$BUILD_DIR/"
cp -r jsx "$BUILD_DIR/"
cp -r css "$BUILD_DIR/"
cp -r lib "$BUILD_DIR/"
cp -r assets "$BUILD_DIR/"
cp index.html "$BUILD_DIR/"
cp .debug "$BUILD_DIR/" 2>/dev/null || true

# Remove unnecessary files from build
echo "🧹 Removing unnecessary files..."
find "$BUILD_DIR" -name ".DS_Store" -delete
find "$BUILD_DIR" -name "*.log" -delete
find "$BUILD_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Create ZXP package
echo "🔐 Signing and packaging ZXP..."
ZXPSignCmd -sign "$BUILD_DIR" "$OUTPUT_FILE" "$CERT_FILE" "$CERT_PASSWORD" -tsa http://timestamp.digicert.com

# Check if ZXP was created successfully
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo ""
    echo "✅ ZXP package created successfully!"
    echo "📦 Output: $OUTPUT_FILE"
    echo "📏 Size: $FILE_SIZE"
    echo ""
else
    echo "❌ Failed to create ZXP package"
    exit 1
fi

# Clean up build directory
echo "🧹 Cleaning up..."
rm -rf "$BUILD_DIR"

echo "🎉 Build complete!"
echo ""
echo "📦 Package: $OUTPUT_FILE"
echo "🚀 Ready for distribution!"
