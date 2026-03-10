$headers = @{
    "Authorization" = "Bearer sbp_cb0a24fd025dc0eda7e2df84c943fad9c119b7f9"
    "Content-Type"  = "application/json"
}

$sql = Get-Content "supabase/migrations/0026_maestro_cargos.sql" -Raw
$body = '{"query":' + ($sql | ConvertTo-Json) + '}'

try {
    $result = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/ymmkvryfinvqewodmeuw/database/query" -Headers $headers -Body $body
    Write-Output "Migration applied successfully"
    $result | ConvertTo-Json
}
catch {
    Write-Output "Error applying migration"
    $reader = new-object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Output $responseBody
}
