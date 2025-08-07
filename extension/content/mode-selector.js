(() => {
    if (document.getElementById('mode-selector-container')) {
        return; // Already active
    }

    const container = document.createElement('div');
    container.id = 'mode-selector-container';

    const partialBtn = document.createElement('button');
    partialBtn.className = 'mode-selector-button';
    partialBtn.textContent = 'Partial Screenshot';

    const fullPageBtn = document.createElement('button');
    fullPageBtn.className = 'mode-selector-button';
    fullPageBtn.textContent = 'Full Page Screenshot';

    container.appendChild(partialBtn);
    container.appendChild(fullPageBtn);
    document.body.appendChild(container);

    const removeUI = () => {
        document.body.removeChild(container);
    };

    partialBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startPartialCapture' });
        removeUI();
    });

    fullPageBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startFullPageCapture' });
        removeUI();
    });
})();
