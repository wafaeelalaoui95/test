# Settle any traveler payout that is owed, right now.
#
# The same sweep Vercel runs hourly — this just triggers it without waiting for
# the next hour. Useful after clearing a reversed transfer, or to check that a
# traveler who has finished payout setup gets paid.
#
# Usage, from the repo root:
#
#   1. Copy CRON_SECRET from Vercel (Settings -> Environment Variables)
#   2. ./scripts/settle-now.ps1
#
# Or pass it explicitly:  ./scripts/settle-now.ps1 -Secret "..."
#
# Exists because pasting the full curl line into this terminal kept mangling
# it — a full-width @ one time, a truncated URL the next.

param(
  [string]$Secret = (Get-Clipboard),
  [string]$Site = "https://jibly.io"
)

$Secret = $Secret.Trim()

if ($Secret.Length -lt 20) {
  Write-Host "That doesn't look like the secret (length $($Secret.Length))." -ForegroundColor Yellow
  Write-Host "Copy CRON_SECRET from Vercel first, then run this again."
  exit 1
}

$url = "$Site/api/cron/settle-payouts"
Write-Host "Calling $url ..." -ForegroundColor Cyan

try {
  $r = Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $Secret" }
  Write-Host ""
  Write-Host "travelers owed : $($r.travelers)"
  Write-Host "payable now    : $($r.payable)"
  Write-Host "waiting on setup: $($r.waitingOnSetup)"
  Write-Host "transfers sent : $($r.sent)"
  Write-Host "failed         : $($r.failed)"
  if ($r.failed -gt 0) {
    Write-Host ""
    Write-Host "Some transfers were refused by Stripe. Check Vercel logs for [payout]." -ForegroundColor Yellow
  }
} catch {
  Write-Host ""
  Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "401 means the secret does not match the one Vercel holds."
}
