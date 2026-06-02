# backup_db.ps1
# Script de Respaldo Diario para RoyalGanttPlanner en SQL Server Express
# ---------------------------------------------------------------------------------
# Este script realiza un respaldo completo de la base de datos y elimina los
# archivos con una antigüedad mayor a 15 días para optimizar espacio en disco.
# No requiere instalar ningún módulo adicional (utiliza ADO.NET nativo de Windows).

$DbName = "RoyalGanttPlanner"
$BackupDir = "C:\Backups_SQL_Royal"
$KeepDays = 15

Write-Output "=== INICIO DE RESPALDO DE BASE DE DATOS ==="
Write-Output "Fecha y hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"

# 1. Asegurar que la carpeta de backups exista
if (!(Test-Path -Path $BackupDir)) {
    try {
        New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
        Write-Output "Carpeta de respaldos creada con éxito en: $BackupDir"
    } catch {
        Write-Error "No se pudo crear la carpeta de respaldos: $_"
        exit 1
    }
}

# 2. Generar nombre de archivo con estampa de tiempo
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "${DbName}_${Timestamp}.bak"

# 3. Consulta SQL para respaldar la base de datos
$SqlQuery = "BACKUP DATABASE [$DbName] TO DISK = N'$BackupFile' WITH FORMAT, INIT, SKIP, NOREWIND, NOUNLOAD, STATS = 10"

try {
    # Conexión ADO.NET a la instancia local de SQL Server
    $ConnectionString = "Server=localhost;Database=master;Trusted_Connection=True;Encrypt=False;"
    $Connection = New-Object System.Data.SqlClient.SqlConnection($ConnectionString)
    $Command = New-Object System.Data.SqlClient.SqlCommand($SqlQuery, $Connection)
    
    # Timeout de 10 minutos
    $Command.CommandTimeout = 600
    
    Write-Output "Conectando al servidor local SQL Server..."
    $Connection.Open()
    
    Write-Output "Ejecutando copia de seguridad..."
    $Command.ExecuteNonQuery() | Out-Null
    $Connection.Close()
    
    Write-Output "¡Respaldo creado con éxito!"
    Write-Output "Archivo: $BackupFile"
    
    # 4. Limpieza de archivos antiguos
    Write-Output "Buscando respaldos antiguos para depuración (más de $KeepDays días)..."
    $LimitDate = (Get-Date).AddDays(-$KeepDays)
    
    Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.bak" | Where-Object {
        $_.LastWriteTime -lt $LimitDate
    } | ForEach-Object {
        try {
            $FileName = $_.Name
            Remove-Item $_.FullName -Force
            Write-Output "Copia depurada (eliminada): $FileName"
        } catch {
            Write-Warning "No se pudo eliminar el archivo antiguo: $($_.FullName). $_"
        }
    }
    
} catch {
    Write-Error "Fallo crítico durante el proceso de respaldo de la base de datos: $_"
    exit 1
}

Write-Output "=== RESPALDO FINALIZADO CON ÉXITO ==="
Write-Output "---------------------------------------"
