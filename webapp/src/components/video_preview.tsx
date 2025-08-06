import React, {useState, useEffect} from 'react';
import {FileInfo} from 'mattermost-redux/types/files';
import VideoPlayer from './video_player';

interface VideoPreviewProps {
    fileInfo: FileInfo;
    showPlayer?: boolean;
    maxWidth?: number;
    maxHeight?: number;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
    fileInfo,
    showPlayer = false,
    maxWidth = 400,
    maxHeight = 300
}) => {
    const [isPlayerOpen, setIsPlayerOpen] = useState(showPlayer);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Загрузка превью изображения
    useEffect(() => {
        if (!showPlayer) {
            loadPreviewImage();
        }
    }, [fileInfo.id, showPlayer]);

    const loadPreviewImage = async () => {
        try {
            setIsLoadingPreview(true);
            
            // Пытаемся получить превью с сервера
            const response = await fetch(`/plugins/com.mattermost.video-plugin/video/preview?file_id=${fileInfo.id}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.preview_url) {
                    setPreviewImage(data.preview_url);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки превью:', error);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getVideoIcon = (): string => {
        const extension = fileInfo.extension?.toLowerCase() || '';
        const icons: {[key: string]: string} = {
            'mp4': '🎬',
            'avi': '📹',
            'mov': '🎥',
            'wmv': '📽️',
            'flv': '🎞️',
            'webm': '🎦',
            'mkv': '📺',
            'm4v': '🎬'
        };
        return icons[extension] || '📹';
    };

    const handlePlayClick = () => {
        setIsPlayerOpen(true);
    };

    const handleClosePlayer = () => {
        setIsPlayerOpen(false);
    };

    // Если плеер должен быть открыт, показываем его
    if (isPlayerOpen) {
        return (
            <div className="video-preview-player">
                <div className="video-player-header">
                    <h4>{fileInfo.name}</h4>
                    <button 
                        className="close-player-btn"
                        onClick={handleClosePlayer}
                        aria-label="Закрыть плеер"
                    >
                        ✕
                    </button>
                </div>
                <VideoPlayer
                    fileInfo={fileInfo}
                    controls={true}
                    width={Math.min(maxWidth, 800)}
                    height={Math.min(maxHeight, 600)}
                />
            </div>
        );
    }

    // Показываем превью
    return (
        <div className="video-preview-container" style={{maxWidth, maxHeight}}>
            <div className="video-preview-thumbnail" onClick={handlePlayClick}>
                {isLoadingPreview ? (
                    <div className="preview-loading">
                        <div className="loading-spinner"></div>
                        <div>Генерация превью...</div>
                    </div>
                ) : previewImage ? (
                    <img 
                        src={previewImage} 
                        alt={`Превью видео ${fileInfo.name}`}
                        className="preview-image"
                    />
                ) : (
                    <div className="preview-placeholder">
                        <div className="video-icon">{getVideoIcon()}</div>
                        <div className="video-format">{fileInfo.extension?.toUpperCase()}</div>
                    </div>
                )}
                
                {/* Кнопка воспроизведения */}
                <div className="play-overlay">
                    <button className="play-button" aria-label="Воспроизвести видео">
                        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                            <circle cx="30" cy="30" r="30" fill="rgba(0,0,0,0.7)"/>
                            <polygon 
                                points="23,18 23,42 42,30" 
                                fill="white"
                            />
                        </svg>
                    </button>
                </div>

                {/* Информация о длительности */}
                <div className="video-duration">
                    {/* Здесь может быть длительность, если она доступна */}
                </div>
            </div>

            {/* Информация о файле */}
            <div className="video-file-info">
                <div className="file-name" title={fileInfo.name}>
                    {fileInfo.name.length > 30 
                        ? `${fileInfo.name.substring(0, 30)}...` 
                        : fileInfo.name
                    }
                </div>
                <div className="file-metadata">
                    <span className="file-size">{formatFileSize(fileInfo.size)}</span>
                    <span className="file-separator">•</span>
                    <span className="file-format">{fileInfo.extension?.toUpperCase()}</span>
                    {fileInfo.width && fileInfo.height && (
                        <>
                            <span className="file-separator">•</span>
                            <span className="file-dimensions">
                                {fileInfo.width}×{fileInfo.height}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Дополнительные действия */}
            <div className="video-actions">
                <button 
                    className="action-btn download-btn"
                    onClick={() => window.open(`/api/v4/files/${fileInfo.id}`, '_blank')}
                    title="Скачать видео"
                >
                    📥
                </button>
                <button 
                    className="action-btn fullscreen-btn"
                    onClick={handlePlayClick}
                    title="Открыть в плеере"
                >
                    ⛶
                </button>
            </div>
        </div>
    );
};

export default VideoPreview; 