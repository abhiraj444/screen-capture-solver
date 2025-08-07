(() => {
    if (document.getElementById('screenshot-overlay')) {
        return; // Already active
    }

    const overlay = document.createElement('div');
    overlay.id = 'screenshot-overlay';
    document.body.appendChild(overlay);

    const selection = document.createElement('div');
    selection.id = 'screenshot-selection';

    const dimensions = document.createElement('div');
    dimensions.id = 'screenshot-dimensions';

    let startX, startY, isSelecting = false;

    overlay.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isSelecting = true;

        selection.style.left = `${startX}px`;
        selection.style.top = `${startY}px`;
        selection.style.width = '0px';
        selection.style.height = '0px';

        selection.appendChild(dimensions);
        overlay.appendChild(selection);
    });

    overlay.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selection.style.width = `${width}px`;
        selection.style.height = `${height}px`;
        selection.style.left = `${Math.min(startX, currentX)}px`;
        selection.style.top = `${Math.min(startY, currentY)}px`;

        dimensions.textContent = `${width}px x ${height}px`;
    });

    overlay.addEventListener('mouseup', (e) => {
        isSelecting = false;

        const actions = document.createElement('div');
        actions.id = 'screenshot-actions';

        const captureBtn = document.createElement('button');
        captureBtn.className = 'screenshot-button';
        captureBtn.textContent = 'Capture Selection';

        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'screenshot-button';
        scrollBtn.textContent = 'Capture with Scroll';

        actions.appendChild(captureBtn);
        actions.appendChild(scrollBtn);
        selection.appendChild(actions);

        captureBtn.addEventListener('click', () => {
            const rect = selection.getBoundingClientRect();
            chrome.runtime.sendMessage({
                action: 'capturePartialScreenshot',
                rect: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            });
            document.body.removeChild(overlay);
        });

        scrollBtn.addEventListener('click', () => {
            const rect = selection.getBoundingClientRect();
            chrome.runtime.sendMessage({
                action: 'captureScrollingScreenshot',
                rect: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            });
            document.body.removeChild(overlay);
        });
    });

})();
