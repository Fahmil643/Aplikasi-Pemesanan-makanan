# ==============================================================================
# MIE GACOAN DUAL-PORT WEB SERVER (POWERSHELL TCP SOCKET SERVER)
# Port 3000 -> Portal Pemesan (customer.html)
# Port 4000 -> Portal Penjual / Dapur (merchant.html)
# ==============================================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$dataDir = Join-Path $scriptDir "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

$ordersFile = Join-Path $dataDir "orders.json"
$menuFile = Join-Path $dataDir "menu.json"

# Inisialisasi Data jika belum ada
if (-not (Test-Path $ordersFile)) {
    $initialOrders = @(
        @{
            id = "GC-9081";
            customerName = "Budi Santoso";
            orderType = "Dine In";
            tableNumber = "Meja 02";
            paymentMethod = "QRIS";
            status = "Sedang Dimasak";
            createdAt = (Get-Date).AddMinutes(-8).ToString("o");
            items = @(
                @{ name = "Mie Gacoan"; level = 4; qty = 2; price = 11000; notes = "Pangsit dipisah" },
                @{ name = "Udang Keju (3 pcs)"; level = $null; qty = 1; price = 10000; notes = "" },
                @{ name = "Es Gobak Sodor"; level = $null; qty = 2; price = 9000; notes = "Manis sedang" }
            );
            subtotal = 50000;
            tax = 5000;
            total = 55000
        }
    )
    $initialOrders | ConvertTo-Json -Depth 10 | Set-Content -Path $ordersFile -Encoding UTF8
}

function Get-MimeType($filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        default { return "text/plain; charset=utf-8" }
    }
}

function Handle-Client($client, $defaultPage) {
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $writer = New-Object System.IO.BinaryWriter($stream)

        # Read Request Line
        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) {
            $client.Close()
            return
        }

        $parts = $requestLine.Split(" ")
        $method = $parts[0]
        $rawUrl = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        $path = $rawUrl.Split("?")[0]

        # Read Headers
        $headers = @{}
        $contentLength = 0
        while (($line = $reader.ReadLine()) -ne $null -and $line.Trim() -ne "") {
            $hParts = $line.Split(":", 2)
            if ($hParts.Length -eq 2) {
                $hName = $hParts[0].Trim().ToLower()
                $hVal = $hParts[1].Trim()
                $headers[$hName] = $hVal
                if ($hName -eq "content-length") {
                    [int]::TryParse($hVal, [ref]$contentLength) | Out-Null
                }
            }
        }

        # Read Body if POST / PUT / PATCH
        $body = ""
        if ($contentLength -gt 0) {
            $bodyChars = New-Object char[] $contentLength
            $readTotal = 0
            while ($readTotal -lt $contentLength) {
                $r = $reader.Read($bodyChars, $readTotal, $contentLength - $readTotal)
                if ($r -le 0) { break }
                $readTotal += $r
            }
            $body = New-Object string ($bodyChars, 0, $readTotal)
        }

        # Handle CORS Preflight
        if ($method -eq "OPTIONS") {
            $respStr = "HTTP/1.1 200 OK`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nContent-Length: 0`r`n`r`n"
            $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respStr))
            $client.Close()
            return
        }

        # --- REST API ENDPOINTS ---
        if ($path -eq "/api/orders") {
            if ($method -eq "GET") {
                $json = if (Test-Path $ordersFile) { Get-Content $ordersFile -Raw -Encoding UTF8 } else { "[]" }
                $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($jsonBytes.Length)`r`n`r`n"
                $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
                $writer.Write($jsonBytes)
                $client.Close()
                return
            }
            elseif ($method -eq "POST") {
                $newOrder = $body | ConvertFrom-Json
                $currentOrders = if (Test-Path $ordersFile) { (Get-Content $ordersFile -Raw -Encoding UTF8) | ConvertFrom-Json } else { @() }
                if ($null -eq $currentOrders) { $currentOrders = @() }
                $updatedOrders = @($newOrder) + @($currentOrders)
                $updatedOrders | ConvertTo-Json -Depth 10 | Set-Content -Path $ordersFile -Encoding UTF8

                $resJson = '{"status":"success","message":"Order created"}'
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $respHeader = "HTTP/1.1 201 Created`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($resBytes.Length)`r`n`r`n"
                $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
                $writer.Write($resBytes)
                $client.Close()
                return
            }
        }
        elseif ($path -match "^/api/orders/([^/]+)/status$") {
            $orderId = $Matches[1]
            if ($method -eq "PATCH") {
                $data = $body | ConvertFrom-Json
                $currentOrders = if (Test-Path $ordersFile) { (Get-Content $ordersFile -Raw -Encoding UTF8) | ConvertFrom-Json } else { @() }
                foreach ($ord in $currentOrders) {
                    if ($ord.id -eq $orderId) {
                        $ord.status = $data.status
                        break
                    }
                }
                $currentOrders | ConvertTo-Json -Depth 10 | Set-Content -Path $ordersFile -Encoding UTF8

                $resJson = '{"status":"success","message":"Status updated"}'
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($resBytes.Length)`r`n`r`n"
                $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
                $writer.Write($resBytes)
                $client.Close()
                return
            }
        }
        elseif ($path -eq "/api/menu") {
            if ($method -eq "GET") {
                $json = if (Test-Path $menuFile) { Get-Content $menuFile -Raw -Encoding UTF8 } else { "[]" }
                $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($jsonBytes.Length)`r`n`r`n"
                $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
                $writer.Write($jsonBytes)
                $client.Close()
                return
            }
        }
        elseif ($path -match "^/api/menu/([^/]+)/availability$") {
            $menuId = $Matches[1]
            if ($method -eq "PUT") {
                $data = $body | ConvertFrom-Json
                $currentMenu = if (Test-Path $menuFile) { (Get-Content $menuFile -Raw -Encoding UTF8) | ConvertFrom-Json } else { @() }
                foreach ($item in $currentMenu) {
                    if ($item.id -eq $menuId) {
                        $item.isAvailable = $data.isAvailable
                        break
                    }
                }
                $currentMenu | ConvertTo-Json -Depth 10 | Set-Content -Path $menuFile -Encoding UTF8

                $resJson = '{"status":"success","message":"Menu availability updated"}'
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resJson)
                $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($resBytes.Length)`r`n`r`n"
                $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
                $writer.Write($resBytes)
                $client.Close()
                return
            }
        }

        # --- STATIC FILE SERVING ---
        $targetFile = if ($path -eq "/" -or $path -eq "") {
            Join-Path $scriptDir $defaultPage
        } else {
            $cleanRel = $path.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            Join-Path $scriptDir $cleanRel
        }

        if (Test-Path $targetFile -PathType Leaf) {
            $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
            $mime = Get-MimeType $targetFile
            $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($fileBytes.Length)`r`n`r`n"
            $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
            $writer.Write($fileBytes)
        } else {
            $errMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $respHeader = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($errMsg.Length)`r`n`r`n"
            $writer.Write([System.Text.Encoding]::UTF8.GetBytes($respHeader))
            $writer.Write($errMsg)
        }
    } catch {
        # Catch and close
    } finally {
        $client.Close()
    }
}

# Start Sockets
$ipAny = [System.Net.IPAddress]::Any
$tcp3000 = New-Object System.Net.Sockets.TcpListener ($ipAny, 3000)
$tcp4000 = New-Object System.Net.Sockets.TcpListener ($ipAny, 4000)

$tcp3000.Start()
$tcp4000.Start()

Write-Host "=========================================================" -ForegroundColor Green
Write-Host "  MIE GACOAN DUAL PORT SERVER AKTIF!" -ForegroundColor Yellow
Write-Host "  Port 3000 (Pemesan): http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Port 4000 (Penjual): http://localhost:4000" -ForegroundColor Magenta
Write-Host "=========================================================" -ForegroundColor Green

while ($true) {
    if ($tcp3000.Pending()) {
        $client = $tcp3000.AcceptTcpClient()
        Handle-Client $client "customer.html"
    }

    if ($tcp4000.Pending()) {
        $client = $tcp4000.AcceptTcpClient()
        Handle-Client $client "merchant.html"
    }

    Start-Sleep -Milliseconds 15
}
