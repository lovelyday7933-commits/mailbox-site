/**
 * 마음우체통 - 네비게이션 (Cloudflare Pages 버전)
 * Clean URL (.html 제거)
 */

const NAV_ITEMS = [
    { path: '/', icon: '📬', label: '홈', match: /^\/$|^\/index\.html$/ },
    { path: '/reply', icon: '✍️', label: '답장', match: /^\/reply/ },
    { path: '/my', icon: '📭', label: '내우체통', match: /^\/my/ },
    { path: '/popular', icon: '🔥', label: '인기', match: /^\/popular/ },
    { path: '/play', icon: '🎮', label: '심심풀이', match: /^\/play|\/tests|\/games/ },
];

function getCurrentPath() {
    let path = window.location.pathname;
    if (path.endsWith('.html')) {
        path = path.slice(0, -5);
    }
    if (path === '/index') {
        path = '/';
    }
    return path;
}

function isActive(item) {
    const currentPath = getCurrentPath();
    return item.match.test(currentPath);
}

function renderNavBottom() {
    const nav = document.createElement('nav');
    nav.className = 'nav-bottom';

    nav.innerHTML = NAV_ITEMS.map(item => `
        <a href="${item.path}"
           class="${isActive(item) ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-label">${item.label}</span>
        </a>
    `).join('');

    document.body.appendChild(nav);
}

function renderHeader() {
    const header = document.createElement('header');
    header.className = 'header';

    header.innerHTML = `
        <div class="header-inner">
            <a href="/" class="logo">
                <span>📮</span>
                <span>마음우체통</span>
            </a>
            <nav class="nav-desktop">
                ${NAV_ITEMS.map(item => `
                    <a href="${item.path}"
                       class="${isActive(item) ? 'active' : ''}">
                        ${item.icon} ${item.label}
                    </a>
                `).join('')}
            </nav>
            <a href="/write" class="btn btn-primary" style="padding: 8px 16px;">
                고민 쓰기
            </a>
        </div>
    `;

    document.body.insertBefore(header, document.body.firstChild);
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderNavBottom();
});
