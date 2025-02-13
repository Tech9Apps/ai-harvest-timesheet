# Installation Guide

## Introduction

Harvest Timesheet is a desktop application that automates time tracking in Harvest based on your Git commit history. Key features include:

- Automatically creates time entries in Harvest from your Git commits
- Distributes work hours across your daily commits
- Supports custom time allocation through webhooks
- Extracts ticket numbers from branch names for better organization
- Works with multiple repositories and Harvest projects
- Preserves your commit messages as time entry descriptions
- Enables/disables repositories without losing configuration

This tool is perfect for developers who want to maintain accurate time records without the interruption of manual time entry.

## macOS Installation

When installing the Harvest Timesheet on macOS, you might encounter security warnings because the application is not signed with an Apple developer certificate. Here's how to safely install and run the application:

### First-time Installation

1. Download the latest version of Harvest Timesheet (`.dmg` file)
2. Double-click the `.dmg` file to mount it
3. Drag the application to your Applications folder
4. When you first try to open the application, you may see a security warning:
   > "Harvest Timesheet" cannot be opened because the developer cannot be verified.

### Bypassing the Security Warning

There are two ways to run the application:

#### Method 1: Using System Preferences (Recommended)
1. Click the Apple menu (🍎) and select "System Settings"
2. Go to "Privacy & Security"
3. Scroll down to the "Security" section
4. Look for the message about Harvest Timesheet being blocked
5. Click "Open Anyway"
6. In the confirmation dialog, click "Open"

#### Method 2: Using Finder
1. Locate the application in Finder
2. Right-click (or Control-click) on the application
3. Select "Open" from the context menu
4. Click "Open" in the security dialog that appears

### Important Notes

- You only need to follow these steps once. After allowing the application to run for the first time, you can open it normally.
- These security measures are part of macOS's Gatekeeper feature, which helps protect your system from potentially harmful software.
- The application is safe to use; the warning appears because we haven't purchased an Apple Developer Certificate.
- If you're uncomfortable bypassing the security warning, you can build the application from source code available in our repository.

## After Installation

Once installed and opened:
1. The application will ask for your Harvest credentials
2. Follow the in-app instructions to set up your repositories and Harvest project mappings
3. Configure your repositories:
   - Add repository paths
   - Set up Harvest project and task mappings
   - Enable/disable repositories as needed
   - Configure optional webhooks
4. You're ready to start tracking time based on your Git commits!

## Managing Repositories

### Adding Repositories
1. Click "Add Repository"
2. Enter the full path to your Git repository
3. Configure Harvest project and task
4. The repository will be enabled by default

### Enabling/Disabling Repositories
- Use the toggle switch next to each repository to enable/disable it
- Disabled repositories:
  - Are grayed out in the UI
  - Won't be included in commit fetching
  - Won't be included in time entry syncing
  - Maintain their configuration for when re-enabled
- Enable/disable is useful for:
  - Temporarily excluding repositories from time tracking
  - Managing multiple projects without removing configuration
  - Focusing on specific repositories during busy periods

## Need Help?

If you encounter any issues during installation:
- Check our GitHub repository's Issues section
- Contact our support team
- Join our community discussion 