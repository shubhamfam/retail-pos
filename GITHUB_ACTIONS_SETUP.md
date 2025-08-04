# GitHub Actions Setup for Cross-Platform Builds

This guide will help you set up GitHub Actions to automatically build your Tauri POS application for macOS, Windows, and Linux.

## 📋 Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **GitHub Account**: You need a GitHub account with repository access
3. **Repository Permissions**: The repository needs to allow GitHub Actions

## 🚀 Setup Steps

### Step 1: Push Your Code to GitHub

If you haven't already, push your project to GitHub:

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit with Tauri POS app"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Enable GitHub Actions

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. Click **New workflow**
4. Choose **set up a workflow yourself**
5. Delete the default content and paste one of the workflow files below

### Step 3: Choose Your Workflow

#### Option A: Simple Workflow (Recommended)
Use the `build-simple.yml` file I created. This builds each platform separately and is easier to debug.

#### Option B: Matrix Workflow
Use the `build.yml` file for more complex matrix builds.

### Step 4: Commit and Push

```bash
git add .github/workflows/
git commit -m "Add GitHub Actions workflow for cross-platform builds"
git push
```

## 🔧 Workflow Files

### Simple Workflow (Recommended)
Located at: `.github/workflows/build-simple.yml`

**Features:**
- ✅ Separate jobs for each platform
- ✅ Easy to debug and maintain
- ✅ Automatic releases on main branch
- ✅ Artifact uploads for each platform

### Matrix Workflow
Located at: `.github/workflows/build.yml`

**Features:**
- ✅ More complex matrix strategy
- ✅ Builds multiple targets per platform
- ✅ More efficient resource usage

## 📦 What Gets Built

### macOS
- **`.app` bundle** - Native macOS application
- **`.dmg` installer** - Disk image for easy installation

### Windows
- **`.exe` executable** - Windows executable
- **`.msi` installer** - Microsoft Installer package
- **`.nsis` installer** - NSIS installer package

### Linux
- **`.AppImage`** - Portable Linux application
- **`.deb` package** - Debian/Ubuntu package

## 🎯 How It Works

1. **Trigger**: Workflow runs on push to main/master branch
2. **Build**: Each platform builds in parallel
3. **Upload**: Build artifacts are uploaded to GitHub
4. **Release**: Automatic GitHub release is created (on main branch only)

## 📱 Accessing Your Builds

### Method 1: GitHub Releases
1. Go to your repository
2. Click **Releases** in the right sidebar
3. Download the latest release files

### Method 2: Actions Artifacts
1. Go to **Actions** tab
2. Click on a completed workflow run
3. Scroll down to **Artifacts**
4. Download the platform-specific artifacts

## 🔑 License System Integration

The builds include your complete license system:
- ✅ 15-day trial period
- ✅ Hidden license keys
- ✅ Contact support message
- ✅ Database integration

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Fails on Windows**
   - Ensure all dependencies are properly specified
   - Check that Tauri configuration is correct

2. **Node.js Version Issues**
   - The workflow uses Node.js 18
   - Update if you need a different version

3. **Rust Toolchain Issues**
   - The workflow installs the stable Rust toolchain
   - All necessary targets are automatically added

### Debug Steps:

1. **Check Workflow Logs**
   - Go to Actions tab
   - Click on failed workflow
   - Check the specific job that failed

2. **Test Locally First**
   - Ensure your app builds locally
   - Fix any local build issues before pushing

3. **Check Dependencies**
   - Ensure all npm packages are in package.json
   - Verify Rust dependencies in Cargo.toml

## 🎉 Success Indicators

When everything works correctly, you'll see:

1. ✅ **Green checkmarks** on all platform builds
2. 📦 **Artifacts** available for download
3. 🏷️ **GitHub Release** created automatically
4. 📱 **Multi-platform builds** ready for distribution

## 📞 Support

If you encounter issues:

1. Check the GitHub Actions logs for specific error messages
2. Ensure your repository has the correct permissions
3. Verify that all dependencies are properly specified
4. Test builds locally before pushing to GitHub

## 🚀 Next Steps

Once your builds are working:

1. **Distribute**: Share the GitHub release links with users
2. **Monitor**: Watch for build failures and fix issues
3. **Update**: Push new commits to trigger new builds
4. **Scale**: Consider adding more platforms or build configurations

Your cross-platform POS application will now automatically build for all major platforms! 🎉 