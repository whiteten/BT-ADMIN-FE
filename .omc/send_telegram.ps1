param([string]$Message = "test")
$token = "8369777088:AAG-C55J5Tlu4sOsyMcZBgGIjpRne0y1-Ns"
$chatId = "7692669596"
$uri = "https://api.telegram.org/bot$token/sendMessage"
$body = @{ chat_id = $chatId; text = $Message } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json; charset=utf-8"
