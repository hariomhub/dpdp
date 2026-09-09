// Launches the cloud-scanner Python service (FastAPI/Prowler) for local dev.
// It isn't a node workspace, so turbo doesn't manage it — this fills that gap
// when running `npm run dev` from the repo root.
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const serviceDir = path.join(__dirname, '..', 'services', 'cloud-scanner')
const isWindows = process.platform === 'win32'
const venvBin = path.join(serviceDir, '.venv', isWindows ? 'Scripts' : 'bin')
const python = path.join(venvBin, isWindows ? 'python.exe' : 'python')

if (!fs.existsSync(python)) {
  console.error(
    `[cloud-scanner] venv not found at ${venvBin}. Set it up with:\n` +
      `  cd services/cloud-scanner && python -m venv .venv && ` +
      `${isWindows ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate'} && ` +
      `pip install -r requirements.txt`
  )
  process.exit(1)
}

// Matches CLOUD_SCANNER_URL in apps/tenant-api/.env and apps/admin-api/.env.
const port = process.env.CLOUD_SCANNER_PORT || '8090'

const child = spawn(
  python,
  ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', port],
  { cwd: serviceDir, stdio: 'inherit' }
)

child.on('exit', (code) => process.exit(code ?? 0))
