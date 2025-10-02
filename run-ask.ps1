# run-ask.ps1
$body = @{ prompt = "Top states and services vs goods for last quarter. Add trial CTA." } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "https://tm-growth-agent-66fe2a6fa7dc.herokuapp.com/ask" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
