package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// Plugin представляет основную структуру плагина
type Plugin struct {
	plugin.MattermostPlugin
}

// configuration содержит конфигурацию плагина
type configuration struct {
	EnableVideoPreview bool   `json:"EnableVideoPreview"`
	SupportedFormats   string `json:"SupportedFormats"`
	MaxFileSize        int    `json:"MaxFileSize"`
	PreviewDuration    int    `json:"PreviewDuration"`
}

// OnActivate вызывается при активации плагина
func (p *Plugin) OnActivate() error {
	p.API.LogInfo("Video Plugin активирован")
	return nil
}

// OnDeactivate вызывается при деактивации плагина
func (p *Plugin) OnDeactivate() error {
	p.API.LogInfo("Video Plugin деактивирован")
	return nil
}

// getConfiguration получает текущую конфигурацию плагина
func (p *Plugin) getConfiguration() *configuration {
	var config configuration
	if err := p.API.LoadPluginConfiguration(&config); err != nil {
		p.API.LogError("Ошибка загрузки конфигурации", "error", err.Error())
	}
	return &config
}

// isSupportedVideoFormat проверяет, поддерживается ли формат видео
func (p *Plugin) isSupportedVideoFormat(filename string) bool {
	config := p.getConfiguration()
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != "" && ext[0] == '.' {
		ext = ext[1:]
	}

	formats := strings.Split(strings.ToLower(config.SupportedFormats), ",")
	for _, format := range formats {
		if strings.TrimSpace(format) == ext {
			return true
		}
	}
	return false
}

// FileWillBeUploaded вызывается перед загрузкой файла
func (p *Plugin) FileWillBeUploaded(c *plugin.Context, info *model.FileInfo, file io.Reader, output io.Writer) (*model.FileInfo, string) {
	if !p.isSupportedVideoFormat(info.Name) {
		return info, ""
	}

	config := p.getConfiguration()

	// Проверяем размер файла
	if info.Size > int64(config.MaxFileSize*1024*1024) {
		return info, "Размер видео файла превышает максимально допустимый"
	}

	// Копируем файл в output
	if _, err := io.Copy(output, file); err != nil {
		return info, "Ошибка при копировании файла"
	}

	// Устанавливаем MIME тип для видео
	info.MimeType = mime.TypeByExtension(filepath.Ext(info.Name))
	if info.MimeType == "" {
		info.MimeType = "video/" + strings.ToLower(filepath.Ext(info.Name)[1:])
	}

	return info, ""
}

// MessageWillBePosted вызывается перед отправкой сообщения
func (p *Plugin) MessageWillBePosted(c *plugin.Context, post *model.Post) (*model.Post, string) {
	if len(post.FileIds) == 0 {
		return post, ""
	}

	config := p.getConfiguration()
	if !config.EnableVideoPreview {
		return post, ""
	}

	// Проверяем, есть ли видео файлы в сообщении
	hasVideo := false
	for _, fileId := range post.FileIds {
		fileInfo, err := p.API.GetFileInfo(fileId)
		if err != nil {
			continue
		}

		if p.isSupportedVideoFormat(fileInfo.Name) {
			hasVideo = true
			// Генерируем превью для видео файла
			go p.generateVideoPreview(fileId, fileInfo)
		}
	}

	if hasVideo {
		// Добавляем метаданные о видео в пост
		if post.Props == nil {
			post.Props = make(model.StringInterface)
		}
		post.Props["has_video"] = true
	}

	return post, ""
}

// generateVideoPreview генерирует превью для видео файла
func (p *Plugin) generateVideoPreview(fileId string, fileInfo *model.FileInfo) {
	config := p.getConfiguration()

	// Получаем файл
	fileReader, appErr := p.API.GetFile(fileId)
	if appErr != nil {
		p.API.LogError("Ошибка получения файла", "fileId", fileId, "error", appErr.Error())
		return
	}

	// Создаем временный файл
	tmpDir := os.TempDir()
	inputFile := filepath.Join(tmpDir, fmt.Sprintf("video_%s_%s", fileId, fileInfo.Name))
	outputFile := filepath.Join(tmpDir, fmt.Sprintf("preview_%s.jpg", fileId))

	// Сохраняем видео во временный файл
	file, err := os.Create(inputFile)
	if err != nil {
		p.API.LogError("Ошибка создания временного файла", "error", err.Error())
		return
	}
	defer os.Remove(inputFile)
	defer file.Close()

	if _, err := io.Copy(file, bytes.NewReader(fileReader)); err != nil {
		p.API.LogError("Ошибка записи во временный файл", "error", err.Error())
		return
	}

	// Генерируем превью с помощью FFmpeg
	cmd := exec.Command("ffmpeg",
		"-i", inputFile,
		"-ss", fmt.Sprintf("%d", config.PreviewDuration),
		"-vframes", "1",
		"-q:v", "2",
		"-y",
		outputFile,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		p.API.LogError("Ошибка генерации превью", "error", err.Error(), "stderr", stderr.String())
		return
	}
	defer os.Remove(outputFile)

	// Загружаем превью как новый файл
	previewData, err := os.ReadFile(outputFile)
	if err != nil {
		p.API.LogError("Ошибка чтения файла превью", "error", err.Error())
		return
	}

	// Сохраняем превью
	savedPreview, appErr := p.API.UploadFile(previewData, fmt.Sprintf("preview_%s.jpg", fileInfo.Name), fmt.Sprintf("preview_%s.jpg", fileId))
	if appErr != nil {
		p.API.LogError("Ошибка сохранения превью", "error", appErr.Error())
		return
	}

	// Связываем превью с оригинальным видео файлом
	p.API.LogInfo("Превью сгенерировано", "videoFileId", fileId, "previewFileId", savedPreview.Id)
}

// ServeHTTP обрабатывает HTTP запросы к плагину
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/video/info":
		p.handleVideoInfo(w, r)
	case "/video/preview":
		p.handleVideoPreview(w, r)
	default:
		http.NotFound(w, r)
	}
}

// handleVideoInfo возвращает информацию о видео файле
func (p *Plugin) handleVideoInfo(w http.ResponseWriter, r *http.Request) {
	fileId := r.URL.Query().Get("file_id")
	if fileId == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	fileInfo, err := p.API.GetFileInfo(fileId)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	if !p.isSupportedVideoFormat(fileInfo.Name) {
		http.Error(w, "Not a supported video format", http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"id":        fileInfo.Id,
		"name":      fileInfo.Name,
		"mime_type": fileInfo.MimeType,
		"size":      fileInfo.Size,
		"extension": fileInfo.Extension,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleVideoPreview возвращает превью видео файла
func (p *Plugin) handleVideoPreview(w http.ResponseWriter, r *http.Request) {
	fileId := r.URL.Query().Get("file_id")
	if fileId == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	// Здесь должна быть логика поиска связанного превью
	// Для простоты возвращаем заглушку
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Preview generation in progress",
	})
}

func main() {
	plugin.ClientMain(&Plugin{})
}
