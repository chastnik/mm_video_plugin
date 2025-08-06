# Инструкции по сборке Mattermost Video Plugin

## ✅ Текущий статус

**Веб-часть**: ✅ Собрана успешно
**Серверная часть**: ⚠️ Требует установки Go

## 📦 Готовый пакет

Создан файл: `dist/com.mattermost.video-plugin-1.0.0.zip` (13.5 KB)

**⚠️ ВАЖНО**: Этот пакет содержит только веб-часть. Для полной функциональности необходимо собрать серверную часть.

## 🔧 Завершение сборки (требуется Go)

### Шаг 1: Установка Go

**Windows:**
```bash
# Используя winget
winget install --id GoLang.Go

# Или скачайте с https://golang.org/dl/
```

**После установки перезапустите PowerShell**

### Шаг 2: Сборка серверной части

```bash
# Перейдите в директорию server
cd server

# Соберите исполняемые файлы для разных платформ
go build -o dist/plugin-linux-amd64 ./main.go
go env GOOS=darwin GOARCH=amd64 go build -o dist/plugin-darwin-amd64 ./main.go
go env GOOS=windows GOARCH=amd64 go build -o dist/plugin-windows-amd64.exe ./main.go
```

### Шаг 3: Пересборка финального пакета

```bash
# Вернитесь в корень проекта
cd ..

# Удалите старый дистрибутив
Remove-Item -Recurse -Force dist

# Создайте новую структуру
mkdir dist/com.mattermost.video-plugin

# Скопируйте файлы
copy plugin.json dist/com.mattermost.video-plugin/
xcopy webapp/dist dist/com.mattermost.video-plugin/webapp/ /E /I
xcopy server/dist dist/com.mattermost.video-plugin/server/ /E /I

# Создайте финальный архив
cd dist
Compress-Archive -Path "com.mattermost.video-plugin" -DestinationPath "com.mattermost.video-plugin-1.0.0-full.zip" -Force
```

## 🚀 Альтернативный способ (с помощью Make)

Если у вас установлен Make для Windows:

```bash
# Установите Make (например, через Chocolatey)
choco install make

# Выполните полную сборку
make dist
```

## 📥 Установка в Mattermost

### Способ 1: Через веб-интерфейс

1. Перейдите в **Системная консоль > Плагины > Управление плагинами**
2. Нажмите **Выберите файл**
3. Загрузите файл `com.mattermost.video-plugin-1.0.0.zip` (или `-full.zip`)
4. Нажмите **Загрузить**
5. Включите плагин в списке

### Способ 2: Через API

```bash
curl -X POST \
  http://your-mattermost-server/api/v4/plugins \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'plugin=@dist/com.mattermost.video-plugin-1.0.0.zip'
```

## ⚠️ Ограничения текущего пакета

**Без серверной части плагин будет работать только частично:**

✅ **Работает:**
- Отображение видео файлов в сообщениях
- Базовый видео плеер
- Веб-интерфейс

❌ **НЕ работает:**
- Автоматическая генерация превью
- Обработка загрузки файлов на сервере
- HTTP API endpoints
- Проверка размера файлов
- Интеграция с FFmpeg

## 🔍 Проверка установки

После установки проверьте в логах Mattermost:

```bash
# Linux/macOS
tail -f /opt/mattermost/logs/mattermost.log | grep video-plugin

# Windows
Get-Content "C:\mattermost\logs\mattermost.log" -Tail 10 -Wait | Select-String "video-plugin"
```

## 📋 Требования

- **Mattermost Server**: 10.0.0+
- **Go**: 1.21+ (для сборки серверной части)
- **Node.js**: 18+ (уже использован)
- **FFmpeg**: Опционально, для генерации превью

## 🆘 Поддержка

Если возникают проблемы:

1. Проверьте версию Mattermost (должна быть 10.0.0+)
2. Убедитесь, что плагин включен в настройках
3. Проверьте логи сервера на ошибки
4. Убедитесь, что FFmpeg установлен (для превью)

---

**Создано**: $(Get-Date)  
**Версия плагина**: 1.0.0  
**Совместимость**: Mattermost 10.0.0+ 