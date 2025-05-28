# Next.js Codebase Organization

This document explains how to use the included scripts to analyze and reorganize your Next.js codebase according to best practices.

## Scripts Overview

There are three main scripts to help you analyze and reorganize your codebase:

1. **analyze-codebase.sh**: Analyzes your codebase structure and provides recommendations without making changes
2. **organize-components.sh**: Analyzes components and recommends organization based on client/server component patterns
3. **reorganize-nextjs-project.sh**: Fully reorganizes your project by moving files according to best practices

## Before Running the Scripts

1. Make sure you have backed up your codebase
2. The reorganization script will create its own backup, but it's always good to have an additional copy
3. Review the scripts to understand what changes they will make

## How to Use

### 1. Analysis Only

To analyze your codebase without making changes:

```bash
# Make the script executable
chmod +x analyze-codebase.sh

# Run the analysis
./analyze-codebase.sh
```

This will:

- Check if you're using Pages Router, App Router, or both
- Analyze component distribution (client vs server)
- Check for empty directories
- Find potential redundancies
- Analyze store organization and API routes

### 2. Component Analysis

To analyze components and get recommendations:

```bash
# Make the script executable
chmod +x organize-components.sh

# Run the component analyzer
./organize-components.sh
```

This will:

- Identify client and server components
- Recommend organization based on component type
- Check for client code in server components
- Find potential duplicate components

### 3. Full Reorganization

For a complete reorganization of your codebase:

```bash
# Make the script executable
chmod +x reorganize-nextjs-project.sh

# Run the reorganization script
./reorganize-nextjs-project.sh
```

This will:

1. Create a backup of your codebase
2. Migrate from Pages Router to App Router
3. Organize components based on client/server patterns
4. Clean up empty directories
5. Identify redundant code
6. Check for client code in server components
7. Provide a summary of changes

## Next.js Best Practices Implemented

These scripts implement the following Next.js 13+ best practices:

1. **App Router Migration**: Moving away from Pages Router to App Router
2. **Client/Server Component Separation**: Organizing components based on whether they're client or server components
3. **Component Organization**: Structuring components into UI, client, server, and shared categories
4. **Code Cleanup**: Removing redundant and unused code
5. **Directory Structure**: Following Next.js 13+ recommended directory structure

## After Running the Scripts

After reorganizing your codebase:

1. Run your tests to ensure everything still works
2. Run `next lint` to check for linting issues
3. Run `next build` to make sure the build process completes successfully
4. Manually review any identified issues that require attention

## Script Modifications

If you need to customize the scripts for your specific codebase:

1. The component type detection in `get_component_type()` can be adjusted for your specific patterns
2. The directory structure created can be modified based on your project needs
3. Additional patterns for identifying unused code can be added

## Troubleshooting

If you encounter issues:

1. Check the backup directory for original files
2. Review any error messages in the script output
3. Run the analysis script again to see if issues persist
4. Consider running parts of the reorganization manually if needed

## Next Steps

After organizing your codebase:

1. Update your documentation to reflect the new structure
2. Consider setting up ESLint rules to enforce client/server component patterns
3. Implement proper typing for all components
4. Review and optimize your build configuration
