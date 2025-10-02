# run-ask.ps1 (param version)
param([Parameter(Mandatory)][string]$prompt)

$body = @{ prompt = $prompt } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/ask" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
