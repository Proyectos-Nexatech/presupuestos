$headers = @{
    "Authorization" = "Bearer sbp_cb0a24fd025dc0eda7e2df84c943fad9c119b7f9"
    "Content-Type"  = "application/json"
}

$files = @(
    "supabase/migrations/0008_mano_obra_update.sql",
    "supabase/migrations/0009_rename_mano_obra_tota.sql",
    "supabase/migrations/0010_add_turno_mano_obra.sql"
)

foreach ($f in $files) {
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
}
