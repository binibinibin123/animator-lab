param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$OpenCodeArgs
)

$ErrorActionPreference = "Stop"
$env:UV_THREADPOOL_SIZE = "1"
$env:OPENSSL_THREADS = "1"

$envFiles = @(
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local"
)

function Hide-EnvFiles {
    foreach ($file in $envFiles) {
        $backup = "$file.ocbak"
        if ((Test-Path -LiteralPath $file) -and -not (Test-Path -LiteralPath $backup)) {
            Move-Item -LiteralPath $file -Destination $backup -Force
        }
    }
}

function Restore-One([string]$file) {
    $backup = "$file.ocbak"

    for ($i = 0; $i -lt 20; $i++) {
        if (Test-Path -LiteralPath $file) {
            if (Test-Path -LiteralPath $backup) {
                Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue
            }
            return
        }

        if (-not (Test-Path -LiteralPath $backup)) {
            return
        }

        try {
            Move-Item -LiteralPath $backup -Destination $file -Force
            return
        }
        catch {
            Start-Sleep -Milliseconds 250
        }
    }
}

function Restore-EnvFiles {
    foreach ($file in $envFiles) {
        Restore-One -file $file
    }
}

try {
    Restore-EnvFiles

    while ($true) {
        Hide-EnvFiles

        & cmd.exe /c opencode @OpenCodeArgs
        $code = $LASTEXITCODE

        Restore-EnvFiles

        if ($code -eq 0) {
            exit 0
        }

        Write-Host "[opencode exited $code, retrying...]"
        Start-Sleep -Seconds 1
    }
}
finally {
    Restore-EnvFiles
}
