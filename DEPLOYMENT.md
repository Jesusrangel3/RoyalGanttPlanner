# Guía de Despliegue en Producción - GanttPro

Esta guía describe los pasos necesarios para desplegar la aplicación de forma óptima en la PC servidor local de la oficina, programar los respaldos automáticos de la base de datos SQL Server y automatizar el arranque del sistema al encender la computadora.

---

## 1. Configuración Inicial en la PC Servidor

1. **Clonar/Copiar el Proyecto**: Copia la carpeta `ganttpro-proyecto` a la ubicación definitiva en el servidor (ej: `C:\ganttpro-proyecto`).
2. **Variables de Entorno**: Crea o edita el archivo `.env.local` en la raíz del proyecto con la configuración de la base de datos de producción local:
   ```env
   DB_USER=sa
   DB_PASSWORD=ContraseñaDeTuSQLServer
   DB_SERVER=localhost
   DB_DATABASE=RoyalGanttPlanner
   DB_PORT=1433
   DB_ENCRYPT=false
   JWT_SECRET=UsaUnaClaveAleatoriaLargaYSegura2026
   ```

---

## 2. Compilación y Arranque de Alto Rendimiento (Modo Producción)

Correr el sistema en modo desarrollo (`npm run dev`) consume mucha memoria RAM y es más lento porque compila el código en caliente. En producción, debemos pre-compilarlo una sola vez:

1. Abre una consola de comandos (PowerShell o CMD) en la carpeta del proyecto.
2. Descarga e instala las dependencias (si no se han copiado):
   ```bash
   npm install
   ```
3. Ejecuta la compilación de producción:
   ```bash
   npm run build
   ```
4. Levanta el servidor optimizado de producción:
   ```bash
   npm run start
   ```
   *El sistema ahora estará disponible en `http://localhost:3000` funcionando hasta 10 veces más rápido y con menor consumo de recursos.*

---

## 3. Automatización: Iniciar el Sistema al Encender la PC Servidor

Para evitar tener que abrir la consola de comandos de forma manual cada vez que se reinicie o encienda la computadora del servidor, el sistema ya cuenta con el script preconfigurado `iniciar_sistema.bat` en la raíz del proyecto. Este script inicia tanto el servidor Next.js como el servidor de WebSockets en el puerto 3001.

Para programar su inicio automático:

### Paso 1: Configurar el archivo de inicio
El archivo `iniciar_sistema.bat` ya está creado en la raíz del proyecto. Si despliegas en producción, puedes compilar el código ejecutando `npm run build` primero para asegurar un óptimo rendimiento, y el script iniciará los servicios correspondientes de manera concurrente.

### Paso 2: Registrar en la carpeta de Arranque de Windows
1. Presiona las teclas **`Windows + R`** en el teclado para abrir el cuadro de diálogo "Ejecutar".
2. Escribe **`shell:startup`** y presiona **Enter**. Se abrirá la carpeta del sistema "Inicio" (Startup).
3. Haz clic derecho dentro de esta carpeta, selecciona **Nuevo > Acceso directo**.
4. Haz clic en **Examinar** y busca el archivo `iniciar_sistema.bat` localizado en la raíz de tu proyecto.
5. Haz clic en **Siguiente** y luego en **Finalizar**.
6. ¡Listo! Cada vez que la PC servidor se encienda y un usuario inicie sesión, se levantarán automáticamente ambos servicios (el sistema y la sincronización en tiempo real).

---

## 4. Programación del Respaldo Diario de la Base de Datos

Hemos provisto el script de automatización `backup_db.ps1` en la raíz del proyecto. Para programarlo para que se ejecute de forma automática todos los días:

### Paso 1: Configurar la política de ejecución de PowerShell (Ejecutar una sola vez)
Windows por defecto bloquea la ejecución de scripts locales. Para habilitarlo:
1. Abre **PowerShell como Administrador** en el servidor.
2. Ejecuta el siguiente comando y escribe `Y` para confirmar:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```

### Paso 2: Programar la Tarea en Windows Task Scheduler
1. Presiona el botón de **Inicio de Windows**, escribe **Programador de tareas** (Task Scheduler) y ábrelo.
2. En el panel derecho, haz clic en **Crear tarea...** (Create Task).
3. **Pestaña "General"**:
   * *Nombre:* `Respaldo Diario SQL Server - Royal Gantt`
   * Marca la opción: **Ejecutar tanto si el usuario inició sesión como si no** (Run whether user is logged on or not).
   * Marca la opción: **Ejecutar con los privilegios más altos** (Run with highest privileges) — *Esto es obligatorio para que PowerShell pueda comunicarse con SQL Server*.
4. **Pestaña "Desencadenadores" (Triggers)**:
   * Haz clic en **Nuevo...**.
   * *Iniciar la tarea:* **Según una programación** (On a schedule).
   * Selecciona **Diariamente** (Daily) y configura la hora (por ejemplo, `23:00:00` o las 11:00 PM).
   * Haz clic en **Aceptar**.
5. **Pestaña "Acciones" (Actions)**:
   * Haz clic en **Nueva...**.
   * *Acción:* **Iniciar un programa** (Start a program).
   * *Programa o script:* `powershell.exe`
   * *Agregar argumentos (opcional):* `-NoProfile -ExecutionPolicy Bypass -File "C:\ganttpro-proyecto\backup_db.ps1"`
     *(Modifica la ruta si tu proyecto está en otro directorio).*
   * Haz clic en **Aceptar**.
6. **Pestaña "Condiciones" y "Configuración"**:
   * Asegúrate de que en condiciones no esté restringido si la laptop no está conectada a la corriente (desmarca "Iniciar la tarea solo si el equipo está conectado a la corriente alterna" si es una laptop servidor).
7. Haz clic en **Aceptar**. Te pedirá la contraseña del usuario de Windows del servidor para guardar la tarea segura en segundo plano.

### Verificar Respaldos
La base de datos se respaldará automáticamente. Los archivos de respaldo se guardarán en:
`C:\Backups_SQL_Royal\`

El script limpiará automáticamente todos los respaldos que tengan más de **15 días** de antigüedad para que el disco duro no se llene.

---

## 5. Configuración de Red Local y Firewall (Puertos 3000 y 3001)

Para que los otros equipos de la oficina puedan visualizar el Gantt y recibir la sincronización instantánea en tiempo real sin recargar la página, debes abrir los puertos **3000** (Servidor web principal) y **3001** (Sincronización en tiempo real) en el Firewall del servidor:

1. Abre el menú **Inicio**, escribe **Firewall de Windows Defender con seguridad avanzada** y presiona **Enter**.
2. En la barra lateral izquierda, selecciona **Reglas de entrada** (Inbound Rules).
3. En la barra lateral derecha, selecciona **Nueva regla...** (New Rule).
4. En tipo de regla, selecciona **Puerto** (Port) y haz clic en Siguiente.
5. Selecciona **TCP** y en **Puertos locales específicos** ingresa: `3000, 3001`. Haz clic en Siguiente.
6. Selecciona **Permitir la conexión** y haz clic en Siguiente.
7. Asegúrate de dejar marcadas las casillas **Dominio**, **Privado** y **Público**, y haz clic en Siguiente.
8. En el campo **Nombre**, pon: `Royal Gantt Planner (Puertos 3000 y 3001)`.
9. Haz clic en **Finalizar**.
10. Con esto, cualquier computadora en la misma red local (LAN) podrá abrir `http://<IP-DEL-SERVIDOR>:3000` y sincronizarse automáticamente con las demás en el puerto `3001`.

