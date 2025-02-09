# Harvest Time Tracker

An Electron application that automates time logging in Harvest based on Git commit history.

## Features

- Add and manage local Git repositories
- Associate repositories with Harvest projects and tasks
- Automatically track time based on commit history
- Preview time entries before syncing to Harvest
- Dark theme UI with Material Design

## Prerequisites

- Node.js 14 or higher
- npm 6 or higher
- A Harvest account with API access

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-harvest-timesheet
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Harvest credentials:
```
VITE_HARVEST_ACCESS_TOKEN=your_harvest_access_token
VITE_HARVEST_ACCOUNT_ID=your_harvest_account_id
```

To get your Harvest credentials:
1. Go to https://id.getharvest.com/developers
2. Create a new personal access token
3. Note down your access token and account ID

## Development

Start the development server:
```bash
npm run dev
```

## Building

Build the application:
```bash
npm run build
```

## Usage

1. Launch the application
2. Add your Git repositories and associate them with Harvest projects and tasks
3. The application will fetch today's commits
4. Preview the time entries before syncing
5. Click "Sync to Harvest" to create the time entries

## Features

- Repository Management:
  - Add local Git repositories
  - Associate repositories with Harvest projects and tasks
  - Validate Git repositories
  
- Time Tracking:
  - Fetch today's commits
  - Calculate hours based on commit count
  - Preview time entries before syncing
  
- Harvest Integration:
  - Fetch projects and tasks
  - Create time entries
  - Secure API token storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 