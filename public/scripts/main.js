document.addEventListener('DOMContentLoaded', function() {
    var socket = io(window.location.origin); // Use absolute URL for WebSocket connection
    var quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: '#toolbar'
        }
    });

    var chatQuill = new Quill('#chat-editor', {
        theme: 'snow',
        modules: {
            toolbar: false
        },
        readOnly: true
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

    socket.on('load-chat', function(chatState) {
        chatQuill.setContents(chatState, 'silent');
        chatQuill.root.scrollTop = chatQuill.root.scrollHeight; // Scroll to the bottom after loading
    });

    quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
            socket.emit('text-change', { sessionId: sessionId, change: delta });
        }
    });

    // Chat functionality
    var messageInput = document.getElementById('message-input');
    var sendButton = document.getElementById('send-button');
    var usernameInput = document.getElementById('username');
    var setUsernameButton = document.getElementById('set-username-button');
    var chatInput = document.getElementById('chat-input');
    var username;

    setUsernameButton.addEventListener('click', function() {
        username = usernameInput.value.trim();
        if (username !== '') {
            usernameInput.parentElement.style.display = 'none';
            chatInput.style.display = 'flex';
        }
    });

    sendButton.addEventListener('click', function() {
        var message = messageInput.value;
        if (message.trim() !== '') {
            var timestamp = new Date().toLocaleTimeString();
            var delta = chatQuill.clipboard.convert(`<div class="message"><strong>${timestamp}</strong> ${username}: ${message}</div><br>`);
            socket.emit('send-message', { sessionId: sessionId, change: delta });
            messageInput.value = '';
        }
    });

    socket.on('receive-message', function(data) {
        if (data.sessionId === sessionId) {
            chatQuill.updateContents(data.change, 'silent');
            chatQuill.root.scrollTop = chatQuill.root.scrollHeight; // Scroll to the bottom after receiving a message
        }
    });
});
