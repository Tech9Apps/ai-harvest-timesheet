# Current Task
Setting up and implementing testing infrastructure for the application.

## Progress
1. ✓ Set up basic test environment
2. ✓ Identified critical test paths
3. ✓ Prepared test structure for core services
4. ✓ Documented test scenarios
5. [ ] Implementing core service tests:
   - [ ] Repository management service
   - [ ] Git service
   - [ ] Harvest API service
   - [ ] Storage service
   - [ ] Distribution service

## Current Status
Basic test environment has been set up and critical test paths have been identified. Moving forward with implementing tests for core services.

## Next Steps
1. [ ] Core Service Tests:
   - [ ] Write unit tests for repository management
   - [ ] Add tests for Git operations
   - [ ] Implement Harvest API service tests
   - [ ] Add storage service tests
   - [ ] Test distribution service functionality

2. [ ] Integration Tests:
   - [ ] Test repository and Git integration
   - [ ] Test Harvest API integration
   - [ ] Test time entry creation workflow
   - [ ] Test hour distribution scenarios

3. [ ] Component Tests:
   - [ ] Test UI components
   - [ ] Test loading states
   - [ ] Test error handling
   - [ ] Test user interactions

# Lessons
1. Environment Variables:
   - Use `import.meta.env` instead of `process.env` in Vite applications
   - Prefix environment variables with `VITE_` for client-side access
   - Create type definitions for environment variables in `env.d.ts`

2. TypeScript Configuration:
   - Install necessary type definitions (@types/react, @types/node)
   - Create proper interfaces for all data structures
   - Use type assertions carefully with external APIs

3. React Best Practices:
   - Implement proper error boundaries
   - Use proper state management for complex data
   - Implement loading states for async operations
   - Use context for shared state like loading indicators

4. Electron-Vite:
   - Follow proper security practices for IPC communication
   - Handle file system operations carefully
   - Implement proper error handling for native operations

5. Git Integration:
   - Validate repositories before operations
   - Handle different branch name formats
   - Process commit history efficiently
   - Use proper date formats for git log commands
   - Check directory existence before initializing git

6. UI/UX:
   - Implement proper form validation
   - Show loading states during async operations
   - Provide clear error messages
   - Use consistent styling with Material UI theme
   - Use progress indicators for better user feedback
   - Disable interactive elements during loading
   - Add helpful instructions and examples for user input

7. Loading States:
   - Use a centralized loading context for managing multiple loading states
   - Show appropriate loading indicators for each operation
   - Disable relevant UI elements during loading
   - Provide visual feedback for long-running operations
   - Handle errors gracefully during loading states

8. Data Persistence:
   - Use namespaced keys for localStorage
   - Implement proper error handling for storage operations
   - Create dedicated service for data persistence
   - Keep storage logic separate from UI components

9. Date Handling:
   - Use date-fns for consistent date manipulation
   - Always consider timezone implications
   - Use startOfDay and endOfDay for accurate date ranges
   - Implement proper date validation and constraints
   - Provide intuitive date selection UI
   - Keep default behavior (today) easily accessible
   - Handle date range changes efficiently

10. Component Organization:
    - Create reusable components for common patterns
    - Keep state management close to where it's needed
    - Use proper prop types for component interfaces
    - Implement clear component boundaries
    - Handle loading and error states consistently
    - Provide meaningful default values

11. Error Handling Best Practices:
    - Implement custom error classes for different scenarios
    - Use type-safe error handling
    - Provide user-friendly error messages
    - Add proper error recovery mechanisms
    - Implement graceful fallbacks
    - Log errors for debugging
    - Handle async operation errors properly

12. Testing Considerations:
    - Plan test coverage for critical paths
    - Test error scenarios thoroughly
    - Mock external dependencies
    - Test async operations properly
    - Validate user interactions
    - Test edge cases and error conditions
    - Ensure proper cleanup after tests

13. Electron Builder Configuration:
   - Avoid using spaces in artifactName patterns to prevent duplicate builds
   - Use explicit naming patterns instead of variables when file names need to be consistent
   - Use lowercase and hyphens for artifact names to maintain consistency
   - Be careful with ${productName} variable as it can cause unexpected behavior with spaces

# Questions to Ask
1. Should we implement user preferences for work hours (currently fixed at 8 hours)?
2. How should we handle commits that span multiple days?
3. Should we implement a preview feature before syncing time entries?
4. What should be the minimum Git commit information required for a valid time entry?
5. Should we add more date range presets (e.g., This Week, Last Week)?
6. How should we handle timezone differences between Git commits and Harvest entries?

# Current Task
Implementing error handling and user feedback for hour adjustments.

## Progress
1. ✓ Fixed TypeScript issues
2. ✓ Added notifications for hour redistribution
3. ✓ Improved error message clarity
4. ✓ Enhanced loading state feedback
5. ✓ Added data persistence error handling:
   - Added custom error classes for storage operations
   - Implemented storage availability checks
   - Added quota exceeded handling
   - Added invalid data handling
   - Added user-friendly error messages
   - Implemented fallback values for read operations
   - Added proper error propagation

## Current Status
Data persistence error handling has been implemented with comprehensive error types and user-friendly messages.

## Next Steps
1. [ ] Add error handling for remaining edge cases:
   - [x] Invalid number inputs (negative/zero hours)
   - [x] Missing repository preferences
   - [x] Data persistence errors
   - [ ] Network failures

2. [ ] Add user feedback:
   - [x] Success messages for hour updates
   - [x] Warning messages for validation failures
   - [x] Notifications for hour redistribution
   - [x] Improved error message clarity
   - [x] Loading state feedback
   - [x] Storage error messages

3. [ ] Testing:
   - [ ] Manual hour editing
   - [ ] Hour validation with different preferences
   - [ ] Hour redistribution scenarios
   - [ ] Warning system functionality
   - [ ] Storage error scenarios

# Lessons
1. Storage Error Handling:
   - Always check storage availability before operations
   - Use custom error types for different failure scenarios
   - Provide fallback values for read operations
   - Show user-friendly error messages
   - Log detailed errors for debugging
   - Handle quota exceeded scenarios gracefully
   - Validate data integrity on read operations

2. User Feedback:
   - Show immediate response to user actions
   - Provide context for automated changes
   - Use appropriate message duration
   - Position notifications consistently
   - Clear existing messages before showing new ones
   - Show specific error guidance for different scenarios

3. Async Operations:
   - Track loading states separately for different operations
   - Handle errors appropriately with try-catch blocks
   - Clean up loading states in finally blocks
   - Provide meaningful error messages
   - Disable relevant UI elements during operations

4. Data Persistence:
   - Always validate data before saving
   - Provide meaningful defaults for missing data
   - Handle storage quota limits gracefully
   - Implement proper error recovery
   - Keep storage operations atomic
   - Log errors for debugging
   - Use type-safe storage operations

## Floating-Point Comparisons
When comparing floating-point numbers (like hours in time tracking), it's important to use a small tolerance value (epsilon) rather than direct equality comparison. This helps avoid issues with floating-point precision in JavaScript. For example, when comparing if total hours exceed a limit:

```typescript
const HOURS_COMPARISON_TOLERANCE = 0.001; // 3.6 seconds tolerance
// Instead of: if (totalHours > limit)
if ((totalHours - limit) > HOURS_COMPARISON_TOLERANCE)
```

This prevents false positives when values are technically equal but differ by tiny amounts due to floating-point arithmetic.

# Current Focus
Cleaning up remaining TypeScript issues:
1. ✓ Fixed missing extractTicketNumber property
2. ✓ Cleaned up unused imports in TimeEntryPreview
3. ✓ Added error/success message display
4. [ ] Need to clean up remaining files:
   - [ ] DateRangeSelector.tsx
   - [ ] RepositorySettings.tsx
   - [ ] electron/main.ts
   - [ ] PreferencesContext.tsx

# Current Task: TimeEntryPreview Visual Improvements [COMPLETED]

## Overview
Enhance the visual appeal of the TimeEntryPreview component without adding new functionality.

## Completed Changes

### 1. Icon Additions ✓
- Repository Section:
  [X] Add `FolderIcon` before repository names

- Time/Date Elements:
  [X] Add `CalendarTodayIcon` for DateRangeSelector
  [X] Add `AccessTimeIcon` for hour displays
  [X] Add `SyncIcon` for the sync button
  [X] Add `RefreshIcon` for the refresh button

- Commit Information:
  [X] Add `CodeIcon` for branch information

### 2. Spacing and Layout ✓
[X] Adjust padding between list items
[X] Add subtle dividers between repository sections
[X] Improve spacing around date selector
[X] Enhance button margins and padding

### 3. Typography and Colors ✓
[X] Use more distinct typography for dates
[X] Enhance commit message readability
[X] Improve hour display prominence
[X] Use consistent color scheme from theme

### 4. Visual Feedback ✓
[X] Add subtle hover effects on interactive elements
[X] Improve focus states for accessibility
[X] Add transition effects for existing interactions

## Final Status
✓ All planned visual improvements have been successfully implemented:
- Added intuitive icons for better visual understanding
- Improved layout with proper spacing and dividers
- Enhanced typography and colors for better readability
- Added hover effects and visual feedback
- Maintained existing functionality while improving UX
- Icons use appropriate colors from theme
- Layout is more organized and visually appealing
- Typography is more readable with proper hierarchy

## Next Steps
Return to TypeScript cleanup task:
[ ] Need to clean up remaining files:
   - [ ] DateRangeSelector.tsx
   - [ ] RepositorySettings.tsx
   - [ ] electron/main.ts
   - [ ] PreferencesContext.tsx

# Current Task: Implement Configurable Branch Parsing Patterns [COMPLETED]

## Overview
Add support for customizable regex patterns to extract ticket numbers and branch titles, with a configurable message format template.

## Requirements ✓
- [X] Single regex pattern with capture groups
- [X] Global preferences setting
- [X] Customizable message format template using named groups
- [X] Preset patterns for common formats
- [X] Live preview and validation

## Implementation Plan ✓
[X] 1. Update Types and Preferences
    - [X] Add BranchParsingPreferences interface
    - [X] Update PreferencesContext
    - [X] Add default preset patterns

[X] 2. Create Pattern Testing Service
    - [X] Implement pattern validation
    - [X] Add sample branch testing
    - [X] Create preview generation

[X] 3. Update UI Components
    - [X] Add new section to Global Preferences Dialog
    - [X] Create pattern selection dropdown
    - [X] Add custom pattern input
    - [X] Implement live preview section
    - [X] Improve preview section height
    - [X] Add formatted pattern description

[X] 4. Modify Git Service
    - [X] Update branch parsing logic
    - [X] Implement new message formatting
    - [X] Add error handling

## Implemented Preset Patterns
1. Feature/Bugfix Format
   - feat/ABC-123-branch-title
   - feature/ABC-123-branch-title
   - bugfix/123-fix-issue

2. Jira Style Format
   - JIRA-123/add-new-feature
   - PROJ-456/fix-login-issue
   - ABC-789/update-docs

3. Type/Ticket Format
   - feature/123/add-login
   - fix/456/resolve-bug
   - chore/789/update-deps

4. Simple Ticket Format
   - 123-add-feature
   - 456-fix-bug
   - 789-update-docs

## Message Template Format
Using named groups that match regex groups:
${ticket} | ${title} | ${message}

## Progress Notes
- Completed types and preferences setup
- Added comprehensive branch parsing service with validation
- Created UI components for pattern configuration
- Added live preview with validation feedback
- Updated Git service to use configurable patterns
- Added fallback behavior for non-matching patterns
- Added multiple preset patterns for different branch naming conventions
- Improved preview section visibility
- Feature implementation complete ✓

## Improvements Made
1. Added multiple preset patterns for different branch naming conventions
2. Improved preview section height for better visibility
3. Added formatted pattern descriptions with bullet points
4. Removed custom pattern option for simplicity
5. Added proper error handling and fallback behavior

# Current Task
Improving the Preferences Dialog UI

## Overview
Reorganize the preferences dialog to improve user experience and maintainability.

## Changes Made
[X] Implemented tabbed layout
[X] Created separate components for each section
  [X] GeneralSettings component
  [X] DistributionSettings component
  [X] BranchParsingSettings component (existing)
[X] Adjusted dialog width for better focus
[X] Improved visual hierarchy

## Benefits
1. Better organization of related settings
2. Less overwhelming interface
3. Focused view of each setting category
4. No need to scroll through all settings at once
5. Clear separation of concerns
6. More maintainable code structure

## Status
✓ Task completed successfully
- Dialog now uses tabs for better organization
- Settings are grouped logically
- Interface is more focused and user-friendly
- Code is more maintainable with separate components

# Lessons
11. UI Organization:
    - Use tabs for complex settings interfaces
    - Group related settings together
    - Keep each view focused and simple
    - Consider user flow and frequency of use
    - Use appropriate sizing for dialogs
    - Maintain visual hierarchy
    - Split complex components into smaller, focused ones
    - Use consistent patterns across similar interfaces

# Next Steps
Return to previous task:
[ ] Need to clean up remaining files:
   - [ ] DateRangeSelector.tsx
   - [ ] RepositorySettings.tsx
   - [ ] electron/main.ts
   - [ ] PreferencesContext.tsx

# Current Task
Maintaining and improving the codebase with focus on error handling and testing.

## Progress
[x] Visual Improvements for TimeEntryPreview
[x] Enhanced error handling for storage operations
[x] Improved user feedback system
[ ] Testing implementation

## Current Status
All core features are implemented and working. Focus is now on testing and error handling improvements.

## Next Steps
1. [ ] Testing Implementation:
   - [ ] Set up testing environment
   - [ ] Write unit tests for core services
   - [ ] Add integration tests
   - [ ] Test error scenarios

2. [ ] Error Handling Improvements:
   - [ ] Add error boundaries
   - [ ] Enhance network error handling
   - [ ] Add comprehensive input validation
   - [ ] Implement graceful fallbacks

# Current Focus
Implementing comprehensive testing:
1. [ ] Set up testing framework
2. [ ] Write tests for core services:
   - [ ] Storage Service
   - [ ] Git Service
   - [ ] Distribution Service
   - [ ] Preferences Service
3. [ ] Add integration tests for main workflows
4. [ ] Test error scenarios and recovery mechanisms

# Current Task: Implement Daily Time Logging Notifications

## Feature Overview
Add simple daily notifications to remind users to log their time, configurable with:
- Notification time
- Weekday-only notifications (no weekends)
- Enable/disable option

## Implementation Plan

### 1. Update Preferences
[X] Add new notification preferences:
   - enableDailyReminder (boolean)
   - reminderTime (string - HH:mm format)
   - Added DEFAULT_NOTIFICATION_PREFERENCES

### 2. Notification System
[X] Core functionality:
   - Schedule notifications for configured time
   - Skip weekends automatically
   - Use native OS notifications
   - Include direct action link to open app

### 3. Technical Components
[X] Backend (electron/main.ts):
   - Added notification scheduler
   - Added IPC communication for preferences
   - Added notification click handler

[X] Frontend:
   - Added notification settings UI in preferences
   - Added time picker component
   - Added enable/disable toggle
   - Added IPC communication

## Status
✓ Task completed successfully
- Notification system implemented
- Settings UI added to preferences
- Weekday-only notifications working
- Click-to-open functionality working

## Next Steps
[ ] Test the notification system:
   - Test enabling/disabling notifications
   - Test changing notification time
   - Test weekend skipping
   - Test click-to-open functionality

# Lessons
12. Notification System:
    - Use native OS notifications for better integration
    - Keep notification messages simple and actionable
    - Provide clear settings UI for configuration
    - Handle weekends and off-hours appropriately
    - Ensure proper cleanup of schedulers
    - Use IPC for communication between main and renderer

# Current Task: Implement Tray Menu Functionality

## Feature Overview
Add system tray functionality to the application with:
- Minimize to tray when closing window
- Quick access to app features
- Status information display

## Implementation Plan

### 1. Core Tray Features
[ ] Basic tray setup:
   - Tray icon implementation
   - Basic menu structure
   - Window show/hide functionality
   - Quit application option

### 2. Status Information
[ ] Add status display:
   - Today's logged hours
   - Last sync status
   - Current repository count

### 3. Quick Actions
[ ] Implement menu actions:
   - Sync time entries
   - Refresh commits
   - Open preferences
   - Show/hide main window

### 4. Window Behavior
[ ] Implement window management:
   - Minimize to tray on window close
   - Show from tray on icon click
   - Proper window state tracking

### 5. Visual Elements
[ ] Design and implement:
   - Tray icon (light/dark modes)
   - Status icons for sync state
   - Tooltip information
   - Menu item organization

## Technical Notes
- Use Electron's Tray and Menu APIs
- Implement proper window state management
- Handle IPC communication for status updates
- Support both light and dark mode tray icons
- Ensure proper cleanup on app quit

## Minimal Scope
- Basic tray icon
- Show/hide window
- Quit application
- Essential status information
- Core quick actions

# Current Task: GitHub Actions Release Asset Management

## Progress
[X] Integrated delete-release-assets-action
   - Replaced custom implementation with specialized action
   - Moved asset deletion before build step for cleaner process
   - Configured to work with both draft and published releases
   - Maintained existing tag name logic
   - Uses proper GitHub token authentication

## Current Status
Successfully integrated and reordered the delete-release-assets-action in the GitHub Actions workflow. The action will now clean up existing assets before the build process begins, ensuring a clean slate for new releases.

## Next Steps
1. [ ] Test the workflow with a manual trigger
2. [ ] Verify asset deletion works as expected
3. [ ] Document the release process in project documentation

# Lessons
13. GitHub Actions:
    - Use specialized actions when available instead of custom scripts
    - Clean up existing assets before starting new builds
    - Maintain consistent tag naming conventions
    - Handle both draft and published releases appropriately
    - Ensure proper token permissions are set
    - Document release processes clearly
    - Order workflow steps logically to prevent conflicts
