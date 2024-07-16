document.addEventListener('DOMContentLoaded', function() {
    var socket = io(window.location.origin); // Use absolute URL for WebSocket connection
    var quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: '#toolbar'
        }
    });

    var urlParams = new URLSearchParams(window.location.search);
    var sessionId = urlParams.get('session');
    document.getElementById('session-id').textContent = sessionId;

    socket.emit('join-session', sessionId);

    socket.on('receive-change', function(delta) {
        quill.updateContents(delta, 'silent');
    });

    socket.on('load-document', function(documentState) {
        quill.setContents(documentState, 'silent');
    });

    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            socket.emit('text-change', { sessionId: sessionId, change: delta });
        }
    });
});
