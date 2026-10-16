# Generate the MARKETING_SECRET the weekly marketing drafts use to read
# /api/marketing/routes, and set it on this machine.
#
# Like new-cron-secret.ps1, it never prints the value.
#
# Usage:
#
#   1. ./scripts/new-marketing-secret.ps1
#      -> stores it as the user env var JIBLY_MARKETING_SECRET (read by the
#         scheduled task) and copies it to the clipboard
#   2. Paste into Vercel -> Settings -> Environment Variables -> MARKETING_SECRET
#      (Production is enough)
#   3. Redeploy — a variable only reaches a deployment made after it was set
#   4. Restart the Claude app so the scheduled task sees the new env var

$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

[Environment]::SetEnvironmentVariable('JIBLY_MARKETING_SECRET', $secret, 'User')
Set-Clipboard $secret

Write-Host ""
Write-Host "New marketing secret saved as JIBLY_MARKETING_SECRET and copied to the clipboard." -ForegroundColor Green
Write-Host "It is deliberately not shown here."
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Vercel -> Settings -> Environment Variables -> MARKETING_SECRET -> paste"
Write-Host "  2. Redeploy"
Write-Host "  3. Restart the Claude app"
