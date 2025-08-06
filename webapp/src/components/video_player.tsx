import React, {useState, useRef, useEffect} from 'react';
import {FileInfo} from 'mattermost-redux/types/files';

interface VideoPlayerProps {
    fileInfo: FileInfo;
    autoplay?: boolean;
    controls?: boolean;
    width?: string | number;
    height?: string | number;
    onError?: (error: string) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    fileInfo,
    autoplay = false,
    controls = true,
    width = '100%',
    height = 'auto',
    onError
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState<number>(1);
    const [isMuted, setIsMuted] = useState(false);

    // URL для получения файла
    const fileUrl = `/api/v4/files/${fileInfo.id}`;
    
    // Определяем MIME тип
    const getMimeType = (): string => {
        if (fileInfo.mime_type) {
            return fileInfo.mime_type;
        }
        
        const extension = fileInfo.extension?.toLowerCase() || '';
        const mimeTypes: {[key: string]: string} = {
            'mp4': 'video/mp4',
            'avi': 'video/x-msvideo',
            'mov': 'video/quicktime',
            'wmv': 'video/x-ms-wmv',
            'flv': 'video/x-flv',
            'webm': 'video/webm',
            'mkv': 'video/x-matroska',
            'm4v': 'video/mp4'
        };
        
        return mimeTypes[extension] || `video/${extension}`;
    };

    // Обработчики событий видео
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const errorMessage = `Ошибка воспроизведения видео: ${fileInfo.name}`;
        setError(errorMessage);
        setIsLoading(false);
        if (onError) {
            onError(errorMessage);
        }
    };

    const handleVolumeChange = () => {
        if (videoRef.current) {
            setVolume(videoRef.current.volume);
            setIsMuted(videoRef.current.muted);
        }
    };

    // Функции управления воспроизведением
    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const handleSeek = (newTime: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    const changeVolume = (newVolume: number) => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, newVolume));
            setVolume(videoRef.current.volume);
        }
    };

    // Форматирование времени
    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Эффект для обновления состояния
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('volumechange', handleVolumeChange);
            
            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('play', handlePlay);
                video.removeEventListener('pause', handlePause);
                video.removeEventListener('volumechange', handleVolumeChange);
            };
        }
    }, []);

    if (error) {
        return (
            <div className="video-player-error">
                <div className="error-icon">⚠️</div>
                <div className="error-message">{error}</div>
                <div className="error-details">
                    Файл: {fileInfo.name}<br/>
                    Размер: {Math.round(fileInfo.size / 1024)} KB<br/>
                    Формат: {fileInfo.extension?.toUpperCase()}
                </div>
            </div>
        );
    }

    return (
        <div className="video-player-container" style={{width, height}}>
            {isLoading && (
                <div className="video-loading">
                    <div className="loading-spinner"></div>
                    <div>Загрузка видео...</div>
                </div>
            )}
            
            <video
                ref={videoRef}
                width="100%"
                height="100%"
                controls={controls}
                autoPlay={autoplay}
                onError={handleError}
                style={{display: isLoading ? 'none' : 'block'}}
            >
                <source src={fileUrl} type={getMimeType()} />
                Ваш браузер не поддерживает воспроизведение видео.
            </video>

            {/* Дополнительная информация о видео */}
            {!isLoading && !controls && (
                <div className="video-controls-overlay">
                    <button 
                        className="play-pause-btn"
                        onClick={togglePlayPause}
                        aria-label={isPlaying ? 'Пауза' : 'Воспроизведение'}
                    >
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>
                    
                    <div className="video-progress">
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            value={currentTime}
                            onChange={(e) => handleSeek(Number(e.target.value))}
                            className="progress-slider"
                        />
                        <div className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>

                    <div className="volume-controls">
                        <button onClick={toggleMute} aria-label="Звук">
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? 0 : volume}
                            onChange={(e) => changeVolume(Number(e.target.value))}
                            className="volume-slider"
                        />
                    </div>
                </div>
            )}

            <div className="video-info">
                <div className="file-name">{fileInfo.name}</div>
                <div className="file-details">
                    {Math.round(fileInfo.size / 1024)} KB • {fileInfo.extension?.toUpperCase()}
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer; 