/**
 * CRANEAPP - UI COMPONENT: VIDEO PLAYER
 * Путь: client/mobile/components/media/videoPlayer.js
 * Описание: Кастомный плеер для воспроизведения видео-сообщений и файлов.
 */

export class VideoPlayer {
    /**
     * @param {Object} options
     * @param {string} options.src - URL видеофайла
     * @param {string} options.poster - Превью-изображение
     * @param {boolean} options.autoplay - Автозапуск (по умолчанию false)
     */
    constructor(options = {}) {
        this.src = options.src;
        this.poster = options.poster || '';
        this.autoplay = options.autoplay || false;
        this.videoElement = null;
        this.container = null;
    }

    /**
     * Рендеринг плеера
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'crane-video-container';

        this.container.innerHTML = `
            <video 
                class="crane-video-element" 
                poster="${this.poster}" 
                ${this.autoplay ? 'autoplay' : ''} 
                playsinline
            >
                <source src="${this.src}" type="video/mp4">
                Ваш браузер не поддерживает видео.
            </video>
            
            <div class="video-controls">
                <button class="play-pause-btn">▶</button>
                <div class="video-progress-bar">
                    <div class="progress-filled"></div>
                </div>
                <span class="video-time">0:00</span>
            </div>
            
            <div class="video-overlay-play">
                <div class="play-icon-large"></div>
            </div>
        `;

        this.videoElement = this.container.querySelector('.crane-video-element');
        this._bindEvents();

        return this.container;
    }

    _bindEvents() {
        const playBtn = this.container.querySelector('.play-pause-btn');
        const overlay = this.container.querySelector('.video-overlay-play');
        const progress = this.container.querySelector('.progress-filled');
        const timeDisplay = this.container.querySelector('.video-time');

        // Переключение Play/Pause
        const togglePlay = () => {
            if (this.videoElement.paused) {
                this.videoElement.play();
                playBtn.textContent = '⏸';
                overlay.style.display = 'none';
            } else {
                this.videoElement.pause();
                playBtn.textContent = '▶';
                overlay.style.display = 'flex';
            }
        };

        this.container.onclick = togglePlay;

        // Обновление прогресс-бара
        this.videoElement.addEventListener('timeupdate', () => {
            const pct = (this.videoElement.currentTime / this.videoElement.duration) * 100;
            progress.style.width = `${pct}%`;
            
            const mins = Math.floor(this.videoElement.currentTime / 60);
            const secs = Math.floor(this.videoElement.currentTime % 60);
            timeDisplay.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        });

        // Сброс по окончании
        this.videoElement.onended = () => {
            playBtn.textContent = '▶';
            overlay.style.display = 'flex';
        };
    }

    /**
     * Методы управления для внешних контроллеров
     */
    play() { this.videoElement?.play(); }
    pause() { this.videoElement?.pause(); }
    destroy() {
        this.pause();
        this.container?.remove();
    }
}
