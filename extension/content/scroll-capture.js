(() => {
    if (document.getElementById('scroll-capture-stop-btn')) {
        return; // Already active
    }

    const stopButton = document.createElement('button');
    stopButton.id = 'scroll-capture-stop-btn';
    stopButton.textContent = 'Stop Capturing';
    Object.assign(stopButton.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '99999999',
        padding: '10px 16px',
        backgroundColor: '#e43f5a',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
    });
    document.body.appendChild(stopButton);

    let stopped = false;
    stopButton.addEventListener('click', () => {
        stopped = true;
        document.body.removeChild(stopButton);
    });

    // Logic for scrolling and capturing will go here.
    // This is a placeholder for now.
    console.log('Scroll capture script injected.');

    // For now, just send a message to the background to do a simple capture.
    // This will be replaced with the full scrolling logic.
    chrome.runtime.sendMessage({ action: 'captureFullPage' });
    document.body.removeChild(stopButton); // Remove button after sending message
})();
