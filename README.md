# Personal File Organizer

A local Windows desktop app for browsing personal folders, reviewing suggested
file moves, and checking possible deletion candidates. Files are moved only
after approval; confirmed deletions go to the Windows Recycle Bin.

## Requirements

- Windows
- Node.js and npm

## Run the app

From PowerShell in the project directory:

```powershell
npm install
npm start
```

The app opens in an Electron window. It scans the current user's Documents,
Downloads, Desktop, Pictures, Music, and Videos folders. There is no Express
server or browser URL.

## Run tests

```powershell
npm test
```

The test suite uses temporary fixtures and does not modify personal files.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
