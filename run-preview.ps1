# run-preview.ps1
# ----------------
# This script will trigger the Growth Agent pipeline step by step.

Write-Host "Step 1: PLAN..."
$planBody = @{
  goal   = "Leads for trials/reports"
  focus  = @("Safes","AC","Electronics")
  states = @("MH","DL","GJ")
} | ConvertTo-Json

$response = Invoke-RestMethod -Method POST `
  -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/plan" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $planBody
$response | ConvertTo-Json -Depth 5 | Write-Output

Write-Host "`nStep 2: GENERATE..."
Invoke-RestMethod -Method POST -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/generate"

Write-Host "`nStep 3: QUEUE..."
Invoke-RestMethod -Method POST -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/queue"

Write-Host "`nStep 4: PUBLISH (Preview mode will schedule drafts if PREVIEW_ONLY=1)..."
Invoke-RestMethod -Method POST -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/publish"

Write-Host "`n✅ All steps completed."
