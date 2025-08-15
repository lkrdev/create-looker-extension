// src/components/Header.ts

function createHeader(username: string): HTMLDivElement {
    const headerEl = document.createElement('div');
    headerEl.className = 'container';
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = username ? `Hello, ${username}` : 'Loading...';
    headerEl.appendChild(title);
    return headerEl;
}

export function renderHeader(parentElement: HTMLElement, username: string) {
    parentElement.innerHTML = '';
    parentElement.appendChild(createHeader(username));
}
