# Current Task
Create an Electron-Vite with React application for automating time logging in Harvest based on Git commit history.

## Project Analysis
The project requires building a desktop application that will:
1. Allow users to manage local Git repositories
2. Integrate with Harvest API for time tracking
3. Process Git commit history
4. Create time entries in Harvest based on commits
5. Provide a user-friendly interface with Material UI and dark theme

## Technical Stack
- Electron-Vite with React for the desktop application
- TypeScript for type safety
- Simple-git for Git operations
- Axios for API calls
- LowDB for local data storage
- dotenv for environment variables
- Material UI for components
- Node-keytar for secure token storage

## Implementation Progress
[x] 1. Project Setup
    [x] Initialize Electron-Vite with React project
    [x] Configure TypeScript
    [x] Set up project structure
    [x] Add required dependencies
    [x] Configure Material UI with dark theme

[x] 2. Core Features Implementation
    [x] Repository Management
        [x] Add single repository with validation
        [x] Store repository settings
        [x] Git repository validation logic
        [x] Improve repository path input with helper text
    [x] Harvest API Integration
        [x] Token input UI
        [x] Secure token storage
        [x] Project/Task fetching from user assignments
    [x] Git Integration
        [x] Commit history processing
        [x] Time calculation logic
        [x] Custom date range selection
        [x] Flexible commit filtering
    [x] Time Entry Creation
        [x] Preview interface
        [x] Sync functionality
        [x] Error handling

[x] 3. User Interface
    [x] Material UI setup with dark theme
    [x] Repository management UI
    [x] Token input and management UI
    [x] Project/Task selection UI
    [x] Time entry preview UI
        [x] Date range selector component
        [x] Today/Custom range toggle
        [x] Date validation and constraints
    [x] Sync button and status
    [x] Error messages and notifications
    [x] Loading states and progress indicators

[ ] 4. Testing & Documentation
    [ ] Basic testing setup
    [x] User documentation
    [x] Code documentation

## Next Steps
1. Set up testing environment
2. Implement error boundary
3. Add input validation
4. Add more comprehensive error handling

# Lessons Learned
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
