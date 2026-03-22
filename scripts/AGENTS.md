## Scripts folder

This folder contains Docker start/stop scripts by OS:

- macOS: `start_mac.sh`, `stop_mac.sh`
- Linux: `start_linux.sh`, `stop_linux.sh`
- Windows PowerShell: `start_windows.ps1`, `stop_windows.ps1`

All start scripts run `docker compose up -d --build` from the repository root.  
All stop scripts run `docker compose down` from the repository root.
