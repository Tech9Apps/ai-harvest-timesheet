# Installation Guide

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
3. You're ready to start tracking time based on your Git commits!

## Need Help?

If you encounter any issues during installation:
- Check our GitHub repository's Issues section
- Contact our support team
- Join our community discussion 