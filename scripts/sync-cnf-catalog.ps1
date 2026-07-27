$ErrorActionPreference = "Stop"
$url = "https://open.canada.ca/data/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109/resource/019f2a90-e3a9-489d-b6e1-f74f4ba1d006/download/cnf_fcen_all-files-data_2026.zip"
$zip = Join-Path $env:TEMP "cnf_2026.zip"
$directory = Join-Path $env:TEMP "cnf_2026"
Invoke-WebRequest -Uri $url -OutFile $zip
if (Test-Path $directory) { Remove-Item -LiteralPath $directory -Recurse -Force }
Expand-Archive -LiteralPath $zip -DestinationPath $directory
docker exec supabase_db_nutrition-tracker sh -c "rm -rf /tmp/cnf_2026 && mkdir -p /tmp/cnf_2026"
if ($LASTEXITCODE -ne 0) { throw "Unable to prepare the local catalog directory" }
docker cp (Join-Path $directory "Food_Name.csv") "supabase_db_nutrition-tracker:/tmp/cnf_2026/Food_Name.csv"
if ($LASTEXITCODE -ne 0) { throw "Unable to copy the food catalog" }
docker cp (Join-Path $directory "Nutrient_Amount.csv") "supabase_db_nutrition-tracker:/tmp/cnf_2026/Nutrient_Amount.csv"
if ($LASTEXITCODE -ne 0) { throw "Unable to copy nutrient amounts" }
docker cp (Join-Path $PSScriptRoot "import-cnf-catalog.sql") "supabase_db_nutrition-tracker:/tmp/import-cnf-catalog.sql"
if ($LASTEXITCODE -ne 0) { throw "Unable to copy the catalog importer" }
docker exec supabase_db_nutrition-tracker psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/import-cnf-catalog.sql
if ($LASTEXITCODE -ne 0) { throw "Health Canada catalog import failed" }
