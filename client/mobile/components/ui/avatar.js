/* Контейнер аватара */
.crane-avatar-wrapper {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
}

.avatar-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

/* Форма: Круг для юзеров, скругленный квадрат для групп (как в TG) */
.is-user { border-radius: 50%; }
.is-group { border-radius: 28%; }

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    z-index: 2;
}

.avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 700;
    z-index: 1;
}

/* Статусы присутствия */
.status-indicator {
    position: absolute;
    bottom: 2%;
    right: 2%;
    width: 25%;
    height: 25%;
    border-radius: 50%;
    border: 2px solid var(--bg-main); /* Чтобы отделять от аватара */
    z-index: 3;
}

.status-online { background-color: #4cd964; box-shadow: 0 0 8px #4cd964; }
.status-offline { background-color: #8e8e93; }
.status-away { background-color: #ffcc00; }
.status-busy { background-color: #ff3b30; }

/* Эффект Историй (Story Ring) */
.has-story::before {
    content: '';
    position: absolute;
    top: -3px; left: -3px; right: -3px; bottom: -3px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, #7a5cff, #ff5ad6);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
}
