# AI Harvest Timesheet

[![GitHub all releases](https://img.shields.io/github/downloads/surajadsul/ai-harvest-timesheet/total?color=brightgreen&label=Downloads)](https://github.com/Tech9Apps/ai-harvest-timesheet/releases)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/surajadsul/ai-harvest-timesheet?label=Latest%20Release)](https://github.com/Tech9Apps/ai-harvest-timesheet/releases/latest)
[![GitHub License](https://img.shields.io/github/Tech9Apps/surajadsul/ai-harvest-timesheet)](LICENSE)

An Electron application that automates time logging in Harvest based on Git commit history. Perfect for developers who want to maintain accurate time records without manual time entry.

## Key Features

- 🔄 **Automatic Time Tracking**: Convert Git commits to Harvest time entries
- 📊 **Smart Hour Distribution**: Intelligent hour allocation across commits
- 🎯 **Repository Management**: Enable/disable repositories with persistent settings
- 🔗 **Harvest Integration**: Seamless sync with Harvest projects and tasks
- 🎨 **Modern UI**: Material Design with dark theme and intuitive layout
- 🔧 **Customizable**: Flexible webhook support for message formatting
- 🔍 **Branch Pattern Recognition**: Smart branch parsing with preset patterns
- ⚙️ **Advanced Preferences**: Organized settings with tabbed interface
- 🛡️ **Enhanced Error Handling**: Robust error recovery and clear feedback
- 🕒 **Flexible Time Management**: Manual adjustments with automatic redistribution
- 📱 **Responsive Design**: Optimized layout with proper visual hierarchy
- 🔔 **Rich Notifications**: Clear feedback for all operations

## Core Features

- 🕒 **Flexible Time Distribution**
  - Automatic hour distribution based on commit size, time, or equal distribution
  - Manual hour adjustments with automatic redistribution
  - Configurable daily hours enforcement (1-20 hours, default: 8)
  - Cross-repository hour distribution support
  - Precise hour calculations with floating-point tolerance
  - Repository-specific hour preferences

- 🔄 **Smart Git Integration**
  - Automatic commit history processing
  - Branch-based commit filtering
  - Configurable date ranges
  - Multiple repository support
  - Customizable branch parsing patterns
  - Ticket number extraction

- 🎯 **Harvest Integration**
  - Secure API token storage
  - Project and task synchronization
  - Bulk time entry creation
  - External issue tracking support
  - Custom notes formatting

- 💾 **Data Management**
  - Local repository settings storage
  - Persistent user preferences
  - Secure credential management
  - Error-resilient storage operations

- 🎨 **User Interface**
  - Material UI with dark theme
  - Interactive time entry preview
  - Real-time hour validation
  - Visual feedback for all operations
  - Loading states and progress indicators
  - Intuitive repository management

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
3. Configure global preferences (optional)
   - Set default working hours
   - Choose branch parsing pattern
   - Configure distribution settings

### 2. Repository Management

#### Adding Repositories
1. Click "Add Repository"
2. Enter the full path to your Git repository
3. Click "Add"
4. Configure repository settings:
   - Select Harvest project
   - Select task
   - Optional: Configure webhook URL
   - Optional: Set repository-specific preferences

#### Managing Repositories
- **Enable/Disable**: Toggle switch for repository activity
- **Settings**: Configure repository-specific options
- **Remove**: Delete repository from application

#### Visual Indicators
- 🟢 Enabled: Full opacity, active border
- ⚫ Disabled: Grayed out, inactive border
- ✓ Configured: Settings complete indicator
- ⚠️ Warning: Configuration issues
- ❌ Error: Connection/access problems

### 3. Time Entry Management

#### Date Selection
- Quick selections:
  - Today (default)
  - Yesterday
  - Custom range
- Date validation and constraints
- Visual calendar interface

#### Time Entry Preview
- Commit details with formatted messages
- Branch information with ticket numbers
- Editable hour allocations
- Total hours display
- Distribution indicators
- Loading states for operations

#### Hour Management
- Manual hour adjustments
- Automatic redistribution
- Cross-repository distribution
- Hour constraints enforcement
- Visual feedback for changes

### 4. Global Preferences

Access via "Preferences" button in three organized sections:

#### General Settings
- Default working hours
- Auto-redistribution options
- Cross-repository settings
- UI preferences
- Notification settings

#### Branch Parsing Settings
- Preset patterns available:
  1. Feature/Bugfix: `feat/ABC-123-branch-title`
  2. Jira Style: `JIRA-123/add-new-feature`
  3. Type/Ticket: `feature/123/add-login`
  4. Simple Ticket: `123-add-feature`
- Live pattern preview
- Message template customization
- Fallback behavior configuration

#### Distribution Settings
- Hour distribution logic
- Default daily hours
- Cross-repository options
- Rounding preferences
- Minimum time allocations

## Advanced Features

### Webhook Integration

Customize commit processing with webhook integration:

#### Capabilities
- Custom message formatting
- Dynamic hour allocation
- Ticket system integration
- Metadata processing
- Error handling and fallbacks

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

### Branch Pattern Recognition

Intelligent branch parsing system:

#### Pattern Features
- Automatic ticket extraction
- Multiple format support
- Template customization
- Live preview validation
- Error handling
- Fallback processing

#### Supported Formats
1. **Feature/Bugfix Format**
   - `feat/ABC-123-branch-title`
   - `feature/ABC-123-branch-title`
   - `bugfix/123-fix-issue`

2. **Jira Style Format**
   - `JIRA-123/add-new-feature`
   - `PROJ-456/fix-login-issue`
   - `ABC-789/update-docs`

3. **Type/Ticket Format**
   - `feature/123/add-login`
   - `fix/456/resolve-bug`
   - `chore/789/update-deps`

4. **Simple Ticket Format**
   - `123-add-feature`
   - `456-fix-bug`
   - `789-update-docs`

### Error Handling System

Comprehensive error management:

#### Storage Operations
- Availability verification
- Quota management
- Data recovery
- Fallback values
- Error reporting

#### Network Operations
- Connection management
- Timeout handling
- Retry logic
- Offline support
- Status reporting

#### User Interactions
- Input validation
- Error feedback
- Recovery guidance
- Constraint enforcement
- Status notifications

## Troubleshooting

Common issues and solutions:

1. **Repository Issues**
   - Invalid path: Verify full repository path
   - Access denied: Check file permissions
   - Git errors: Verify Git installation
   - Branch errors: Check branch name format

2. **Harvest Integration**
   - Authentication: Verify credentials
   - Project access: Check project permissions
   - Task selection: Verify task availability
   - Sync failures: Check network connection

3. **Time Entry Issues**
   - Missing commits: Check repository status
   - Hour distribution: Verify preferences
   - Sync errors: Check Harvest connection
   - Pattern matching: Verify branch format

4. **Performance Issues**
   - Slow loading: Check repository size
   - UI lag: Reduce date range
   - Memory usage: Close unused repositories
   - Network delays: Check connection speed

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT](LICENSE)
