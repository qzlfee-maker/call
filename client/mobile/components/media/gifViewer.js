/**
 * CRANEAPP - UI COMPONENT: GIF VIEWER
 * Путь: client/mobile/components/media/gifViewer.js
 * Описание: Оптимизированный компонент для отображения и управления GIF-анимациями.
 */

export class GifViewer {
    /**
     * @param {Object} options
     * @param {string} options.src - URL GIF-файла или зацикленного видео
     * @param {boolean} options.autoplay - Начинать ли воспроизведение сразу
     */
    constructor(options = {}) {
        this.src = options.src;
        this.autoplay = options.autoplay !== false;
        this.container = null;
        this.isPaused = !this.autoplay;
    }

    /**
     * Рендеринг компонента
     */
    render() {
        this.container = document.createElement('div');
        this.container.className = 'crane-gif-container';
        
        // В мессенджерах GIF часто передаются как mp4 без звука для экономии трафика
        const isVideo = this.src.endsWith('.mp4') || this.src.endsWith('.webm');

        if (isVideo) {
            this.container.innerHTML = `
                <video 
                    class="gif-element" 
                    loop 
                    muted 
                    playsinline 
                    ${this.autoplay ? 'autoplay' : ''}
                >
                    <source src="${this.src}" type="video/mp4">
                </video>
                <div class="gif-badge">GIF</div>
            `;
        } else {
            this.container.innerHTML = `
                <img src="${this.src}" class="gif-element" alt="GIF Animation">
                <div class="gif-badge">GIF</div>
            `;
        }

        this._bindEvents();
        return this.container;
    }

    /**
     * Управление воспроизведением по клику
     */
    _bindEvents() {
        const media = this.container.querySelector('.gif-element');
        
        this.container.onclick = (e) => {
            e.stopPropagation();
            if (media.tagName === 'VIDEO') {
                if (media.paused) {
                    media.play();
                    this.container.classList.remove('is-paused');
                } else {
                    media.pause();
                    this.container.classList.add('is-paused');
                }
            } else {
                // Для обычных .gif файлов просто переключаем визуальный статус
                this.isPaused = !this.isPaused;
                this.container.classList.toggle('is-paused', this.isPaused);
                media.style.opacity = this.isPaused ? '0.6' : '1';
            }
        };
    }

    destroy() {
        const video = this.container?.querySelector('video');
        if (video) {
            video.pause();
            video.src = "";
            video.load();
        }
        this.container?.remove();
    }
}
