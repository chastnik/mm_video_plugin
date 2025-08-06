import React from 'react';
import ReactDOM from 'react-dom';
import {Store, Action} from 'redux';
import {GlobalState} from 'mattermost-redux/types/store';
import {FileInfo} from 'mattermost-redux/types/files';
import {Post} from 'mattermost-redux/types/posts';

import VideoPlayer from './components/video_player';
import VideoPreview from './components/video_preview';

// Типы для плагина
interface PluginRegistry {
    registerPostTypeComponent(typeName: string, component: React.ComponentType<any>): void;
    registerFilePreviewComponent(component: React.ComponentType<any>, supportedTypes: string[]): void;
    registerPostWillRenderEmbedComponent(component: React.ComponentType<any>, matcher: (embed: any) => boolean): void;
}

interface WindowObject {
    registerPlugin(pluginId: string, plugin: {
        initialize: (registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, any>>>) => void;
        uninitialize: () => void;
    }): void;
}

declare const window: Window & WindowObject;

// Поддерживаемые видео форматы
const SUPPORTED_VIDEO_FORMATS = [
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'
];

// Проверка, является ли файл видео
const isVideoFile = (fileInfo: FileInfo): boolean => {
    if (!fileInfo || !fileInfo.extension) {
        return false;
    }
    return SUPPORTED_VIDEO_FORMATS.includes(fileInfo.extension.toLowerCase());
};

// Получение MIME типа для видео
const getVideoMimeType = (extension: string): string => {
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
    return mimeTypes[extension.toLowerCase()] || `video/${extension.toLowerCase()}`;
};

// Компонент для отображения видео файлов в постах
const PostVideoComponent: React.FC<{post: Post, fileInfos: FileInfo[]}> = ({post, fileInfos}) => {
    const videoFiles = fileInfos.filter(isVideoFile);
    
    if (videoFiles.length === 0) {
        return null;
    }

    return (
        <div className="video-post-component">
            {videoFiles.map((fileInfo) => (
                <VideoPreview
                    key={fileInfo.id}
                    fileInfo={fileInfo}
                    showPlayer={true}
                />
            ))}
        </div>
    );
};

// Компонент для предварительного просмотра видео файлов
const FilePreviewComponent: React.FC<{fileInfo: FileInfo}> = ({fileInfo}) => {
    if (!isVideoFile(fileInfo)) {
        return null;
    }

    return (
        <VideoPreview
            fileInfo={fileInfo}
            showPlayer={false}
        />
    );
};

// Главная функция инициализации плагина
const initialize = (registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, any>>>) => {
    // Регистрируем компонент для отображения видео в постах
    registry.registerPostTypeComponent('custom_video_post', PostVideoComponent);
    
    // Регистрируем компонент для предварительного просмотра видео файлов
    registry.registerFilePreviewComponent(
        FilePreviewComponent,
        SUPPORTED_VIDEO_FORMATS.map(ext => `video/${ext}`)
    );
};

const uninitialize = () => {
    // Очистка ресурсов при деинициализации плагина
};

// Регистрируем плагин
window.registerPlugin('com.mattermost.video-plugin', {
    initialize,
    uninitialize,
}); 