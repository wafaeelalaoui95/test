# Generate a fresh CRON_SECRET and put it straight on the clipboard.
#
# Never prints the value: a secret that reaches the screen ends up in
# scrollback, and from there in a screenshot. Both have already happened once.
#
# Usage:
#
#   1. ./scripts/new-cron-secret.ps1
#   2. Paste into Vercel -> Settings -> Environment Variables -> CRON_SECRET
#      (tick Production, Preview and Development)
#   3. Redeploy — a variable only reaches a deployment made after it was set
#   4. ./scripts/settle-now.ps1   (the clipboard still holds it)

$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Set-Clipboard $secret

Write-Host ""
Write-Host "New secret copied to the clipboard ($($secret.Length) characters)." -ForegroundColor Green
Write-Host "It is deliberately not shown here."
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Vercel -> Settings -> Environment Variables -> CRON_SECRET -> paste"
Write-Host "  2. Tick Production, Preview, Development"
Write-Host "  3. Redeploy"
Write-Host "  4. ./scripts/settle-now.ps1"
