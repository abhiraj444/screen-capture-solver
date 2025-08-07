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
        const rect = selection.getBoundingClientRect();

        // Remove the overlay
        document.body.removeChild(overlay);

        // Send message to background script with the coordinates
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
    });

})();
