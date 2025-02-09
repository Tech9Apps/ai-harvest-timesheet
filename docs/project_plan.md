# Project Requirement Document: Harvest Time Tracking via Commit History

## Objective

Create an application that automates time logging in Harvest based on Git commit history. The application will fetch the commit history from user-provided local repositories, associate commits with a predefined project and task in Harvest, and create time entries via the Harvest API.

## Functional Requirements

### 1. Repository Management

- The user should be able to add local repository paths to the application.
- For each repository, the user can assign:
  - A Harvest Project ID.
  - A Harvest Task ID.
- Only repositories with assigned Project IDs and Task IDs will be processed for time tracking.
- The application should save the Project ID and Task ID associated with each repository for future use.
- The application should support bulk assignment of Project IDs and Task IDs for multiple repositories.

### 2. Harvest API Integration

- **Harvest API Token Management**:
  - The user will provide a Harvest API access token.
  - The token will be securely stored for API calls.
- **Fetch Project and Task Assignments**:
  - Use the Harvest API endpoint `https://api.harvestapp.com/v2/users/me/project_assignments` to fetch and display available projects and tasks.
  - The user should be able to select a project and task from this list to associate with a repository.

### 3. Commit History Processing

- The application will fetch the commit history for repositories with assigned Project and Task IDs.
- Process commits only for the current day.
- Generate time entry descriptions based on the following format:
  - **Branch Name Format**: `[Ticket ID] | [Branch Name] | [Commit Message]`
  - Example: If the branch name is `606-podcast` and the commit message is `Fixed podcast playback bug`, the time entry will be: `606 | podcast | Fixed podcast playback bug`.

### 4. Sync Button

- Provide a "Sync" button in the application.
- On clicking the Sync button:
  - Fetch commit history for the current day.
  - For each commit, create a time entry in Harvest using the Harvest API.
- Time entries should only be created for repositories with assigned Project and Task IDs.

### 5. Time Entry Creation

- Use the Harvest API to create time entries for commits:
  - Endpoint: `POST /v2/time_entries`
  - Required fields for the API:
    - `project_id`: Harvest Project ID associated with the repository.
    - `task_id`: Harvest Task ID associated with the repository.
    - `spent_date`: The date of the commit (only for the current day).
    - `notes`: The generated time entry description based on the commit.
    - `hours`: Divide 8 hours equally across all commits for the day. For example, if there are 8 commits in a day, each commit will be assigned 1 hour. If there are 4 commits, each will be assigned 2 hours.

### 6. Error Handling

- Display an error if:
  - The Harvest API access token is invalid.
  - No Project or Task ID is assigned to a repository.
  - The user tries to sync commits for a repository without valid assignments.

## Non-Functional Requirements

- **Secure Storage**:
  - The Harvest API access token should be securely encrypted and stored.
- **User Interface**:
  - Minimalistic and user-friendly UI for managing repositories, selecting projects and tasks, and syncing time entries.
- **Performance**:
  - Efficient processing of commit history to ensure minimal delays during sync.

## Technical Requirements

- **Programming Language**: JavaScript/TypeScript
- **Framework**: Electron-Vite with React for cross-platform desktop applications. [text](https://electron-vite.github.io/)
- **Libraries**:
  - `simple-git` or `nodegit`: To fetch commit history from local repositories.
  - `axios`: For making API calls to Harvest.
  - `lowdb`: For storing repository paths and their associated Project/Task IDs in a lightweight JSON-based database.
  - `dotenv`: For secure storage of the Harvest API token.
- **Authentication**:
  - Use OAuth 2.0 for Harvest API access token.
- **Deployment**:
  - The application should be packaged as a cross-platform desktop app using Electron.

## User Flow

1. **Add Repository**:
   - User adds a local repository path.
   - Assigns a Harvest Project ID and Task ID to the repository.
2. **Fetch Projects and Tasks**:
   - The application fetches available projects and tasks from the Harvest API.
   - User selects the appropriate project and task.
3. **Sync Time Entries**:
   - User clicks the Sync button.
   - The application processes commit history for the current day.
   - Divides 8 hours equally across all commits for the day.
   - Creates time entries in Harvest using the Harvest API.

## Open Questions

1. Should the application allow users to manually override the default time division (e.g., adjust how 8 hours are distributed)?
2. Are there any specific constraints on storing the API token (e.g., environment variables vs encrypted local storage)?
3. Should the application handle different time zones for commit timestamps?
4. Are there specific logging or reporting requirements for tracking sync errors or successful entries?

---

Let me know if any clarifications or additional requirements are needed!

