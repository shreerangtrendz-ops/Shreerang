# FRP Tunnel Setup — Shreerang Trendz

This connects your local Tally Prime to the dashboard at shreerangtrendz.com.

## The Problem
The Windows Service method (sc create frpc) fails with Error 1053 on many machines.
Use the batch file method instead — it is simpler and more reliable.

## Quick Fix (Do This Now)

### Step 1 — Run the batch file
1. Download `START_TALLY_TUNNEL.bat` from this folder
2. Right-click → **Run as Administrator**
3. A minimized CMD window will open — this is the tunnel
4. Wait for the message: `start proxy success`

### Step 2 — Enable Tally HTTP Server
1. Open **Tally Prime** (must stay open)
2. Press **F12** → **Advanced Configuration**
3. Set **"Enable Tally.ERP 9 as HTTP Server"** → **Yes**
4. Set **Port Number** → **9000**
5. Press **Ctrl+A** to save
6. Restart Tally Prime

### Step 3 — Test
- Go to your dashboard → Tally Sync page
- Click **Pull Purchase Bills** — you should see records load

## Make It Auto-Start on Windows Boot

Open Task Scheduler and create a new task:
- **Trigger**: At startup
- **Action**: Start a program
- **Program**: `C:\frp_0.58.1_windows_amd64\frpc.exe`
- **Arguments**: `-c C:\frp_0.58.1_windows_amd64\frpc.toml`
- **Start in**: `C:\frp_0.58.1_windows_amd64`
- Check: **Run with highest privileges**
- Check: **Run whether user is logged on or not**

## frpc.toml Config
```toml
serverAddr = "72.61.249.86"
serverPort = 7000

[[proxies]]
name = "tally"
type = "http"
localIP = "127.0.0.1"
localPort = 9000
customDomains = ["tally.shreerangtrendz.com"]
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `connect refused on 9000` | Enable HTTP server in Tally F12 |
| `dial tcp refused` | Tally Prime is closed — open it |
| `login to server failed` | Check frps is running on KVM VPS |
| `StartService FAILED 1053` | Use batch file, not sc create |
