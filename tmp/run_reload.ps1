$headers = @{
    "Authorization" = "Bearer sbp_cb0a24fd025dc0eda7e2df84c943fad9c119b7f9"
    "Content-Type"  = "application/json"
}

$f = "tmp/reload_schema.sql"
Write-Output "Running $f"
$sql = Get-Content $f -Raw
$body = @{ query = $sql } | ConvertTo-Json
try {
    $result = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/ymmkvryfinvqewodmeuw/database/query" -Headers $headers -Body $body
    Write-Output "Success for $f"
}
catch {
    Write-Output "Error running $f"
    $reader = new-object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Output $responseBody
}
