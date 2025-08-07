function parseSimpleMarkdown(text) {
    if (!text) {
        return '';
    }

    let html = text;

    // Sanitize by escaping HTML characters
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Unordered lists: * item -> <li>item</li>
    const lines = html.split('\n');
    let inList = false;
    html = lines.map(line => {
        if (line.startsWith('* ')) {
            const listItem = `<li>${line.substring(2)}</li>`;
            if (!inList) {
                inList = true;
                return `<ul>${listItem}`;
            }
            return listItem;
        } else {
            if (inList) {
                inList = false;
                return `</ul><p>${line}</p>`;
            }
            return `<p>${line}</p>`;
        }
    }).join('');

    if (inList) {
        html += '</ul>';
    }

    // Remove empty paragraphs
    html = html.replace(/<p><\/p>/g, '');

    return html;
}
