# AI Harvest Timesheet

An Electron application that automates time logging in Harvest based on Git commit history. Perfect for developers who want to maintain accurate time records without manual time entry.

## Key Features

- 🔄 **Automatic Time Tracking**: Convert Git commits to Harvest time entries
- 📊 **Smart Hour Distribution**: Automatically distribute hours across commits
- 🎯 **Repository Management**: Enable/disable repositories without losing settings
- 🔗 **Harvest Integration**: Direct sync with your Harvest projects
- 🎨 **Modern UI**: Dark theme with Material Design
- 🔧 **Customizable**: Webhook support for message formatting

## Installation

Download the latest version from the [Releases](releases) page:
- macOS: `AI-Harvest-Timesheet-Mac-{version}-Installer.dmg`

For detailed installation instructions, see our [Installation Guide](docs/installation_guide.md).

## Quick Start Guide

### 1. First-Time Setup

1. Launch the application
2. Enter your Harvest credentials
   - Get them from [Harvest Developer Tools](https://id.getharvest.com/developers)
   - Create a new Personal Access Token
   - Note down your Account ID and Token

### 2. Adding Repositories

1. Click "Add Repository"
2. Enter the full path to your Git repository
3. Click "Add"
4. Configure repository settings:
   - Select Harvest project
   - Select task
   - Optional: Configure webhook URL

### 3. Managing Repositories

- **Enable/Disable**: Use the toggle switch to control repository activity
- **Settings**: Click the ⚙️ icon to modify repository settings
- **Remove**: Click the 🗑️ icon to remove a repository

Visual Indicators:
- 🟢 Enabled repositories: Full opacity, green border
- ⚫ Disabled repositories: Grayed out, disabled border
- ✓ Configured repositories: Green checkmark when Harvest settings are complete

### 4. Time Entry Preview

1. Select date range:
   - Today (default)
   - Custom date range
2. Review commits and calculated hours
3. Adjust hours if needed:
   - Click on hours to edit
   - Hours are automatically redistributed
   - Manual adjustments are highlighted

### 5. Syncing to Harvest

1. Review time entries
2. Click "Sync to Harvest"
3. Confirm the sync
4. Wait for completion notification

### 6. Global Preferences

Access via "Time Preferences" button:
- Enforce 8-hour day
- Auto-redistribute hours
- Cross-repository distribution

## Advanced Features

### Webhook Integration

The webhook integration allows you to customize commit message formatting and specify custom hours for commits. This is useful for:
- Integrating with ticket systems
- Formatting commit messages according to your team's standards
- Setting specific hours for commits based on external data
- Automating time allocation based on commit metadata

#### Webhook Configuration
1. In repository settings, provide a webhook URL
2. The webhook will receive POST requests with commit data
3. Return formatted messages and optional custom hours
4. All communication is in JSON format

#### Request Format
```json
{
  "request": {
    "repositoryName": "my-project",
    "branchName": "123-feature-branch",
    "commits": [
      {
        "hash": "abc123",
        "message": "Add new feature",
        "date": "2024-03-14T10:30:00Z"
      }
    ]
  }
}
```

#### Expected Response Format
```json
{
  "repositoryName": "my-project",
  "branchName": "123-feature-branch",
  "commits": [
    {
      "hash": "abc123",
      "message": "Add new feature",
      "date": "2024-03-14T10:30:00Z",
      "formattedMessage": "PROJ-123: Add new feature - Implementation complete",
      "hours": 2.5
    }
  ]
}
```

#### Response Fields
- `formattedMessage`: (Optional) Custom formatted message for the time entry
- `hours`: (Optional) Custom hours for the commit (overrides automatic distribution)

#### Error Handling
- If the webhook fails, original commit messages will be used
- If custom hours are not provided, automatic distribution applies
- Network timeouts are handled gracefully
- CORS must be properly configured on the webhook server

#### Example Use Cases
1. **Ticket System Integration**
   - Extract ticket numbers from branch names
   - Fetch ticket details from your issue tracker
   - Include ticket summaries in time entries

2. **Custom Time Allocation**
   - Set specific hours based on commit tags
   - Allocate time based on file changes
   - Apply team-specific time allocation rules

3. **Message Standardization**
   - Enforce consistent message formats
   - Add project prefixes
   - Include additional context from external systems

### Hour Distribution Logic

- **Standard Mode**: Hours divided equally among commits
- **Cross-Repository Mode**: Hours distributed across all repositories
- **Manual Adjustments**: Preserved during redistribution

## Troubleshooting

Common issues and solutions:

1. **Repository Not Found**
   - Ensure the path is correct
   - Check repository permissions
   - Verify Git installation

2. **Harvest Sync Failed**
   - Check your internet connection
   - Verify Harvest credentials
   - Ensure project/task selections are valid

3. **No Commits Showing**
   - Check if repository is enabled
   - Verify date range
   - Ensure commits exist for the selected period

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT](LICENSE)
