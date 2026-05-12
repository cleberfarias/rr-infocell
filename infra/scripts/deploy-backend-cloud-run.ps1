param(
  [string]$ProjectId = "rr-infocell",
  [string]$Service = "rr-infocell-api",
  [string]$Region = "southamerica-east1",
  [Parameter(Mandatory = $true)]
  [string]$CorsOrigin
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backendPath = Join-Path $repoRoot "backend"
$envVars = "NODE_ENV=production,FIREBASE_PROJECT_ID=$ProjectId,CORS_ORIGIN=$CorsOrigin"

gcloud run deploy $Service `
  --project $ProjectId `
  --region $Region `
  --source $backendPath `
  --allow-unauthenticated `
  --set-env-vars $envVars `
  --quiet
