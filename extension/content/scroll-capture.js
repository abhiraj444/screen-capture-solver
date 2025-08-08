(() => {
    if (document.getElementById('scroll-capture-stop-btn')) {
        return; // Already active
    }

    const stopButton = document.createElement('button');
    stopButton.id = 'scroll-capture-stop-btn';
    stopButton.textContent = 'Stop Capturing';
    Object.assign(stopButton.style, {
        position: 'fixed',
        bottom: '20px',
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

    const fixedElements = [];
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed') {
            fixedElements.push({ el, originalPosition: style.position });
            el.style.position = 'absolute';
        }
    });

    const restoreFixedElements = () => {
        fixedElements.forEach(({ el, originalPosition }) => {
            el.style.position = originalPosition;
        });
    };

    stopButton.addEventListener('click', () => {
        stopped = true;
        restoreFixedElements();
        document.body.removeChild(stopButton);
    });

    const pageHeight = document.body.scrollHeight;
    const windowHeight = window.innerHeight;
    let scrollTop = 0;

    const captureLoop = async () => {
        if (stopped) return;

        window.scrollTo(0, scrollTop);

        // Give the page a moment to render after scrolling
        await new Promise(resolve => setTimeout(resolve, 150));

        chrome.runtime.sendMessage({ action: 'takeStripCapture' });
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'stripCaptureComplete') {
            scrollTop += windowHeight;
            if (scrollTop < pageHeight) {
                captureLoop();
            } else {
                // All strips captured
                restoreFixedElements();
                document.body.removeChild(stopButton);
                chrome.runtime.sendMessage({ action: 'stitchImages' });
            }
        }
    });

    // Start the loop
    captureLoop();
})();
