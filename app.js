const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QuillDelta = require('quill-delta');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store document content and chat messages in memory
const documents = {};
const chatMessages = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);

        // Check if a document for this session exists
        const doc = documents[sessionId];
        if (doc) {
            // If it exists, send the document content to the client
            socket.emit('load-document', doc);
        } else {
            // If it does not exist, create a new document
            documents[sessionId] = new QuillDelta().ops;
            socket.emit('load-document', documents[sessionId]);
        }

        // Load existing chat messages for the session
        const chat = chatMessages[sessionId] || new QuillDelta().ops;
        socket.emit('load-chat', chat);
    });

    socket.on('text-change', (data) => {
        const { sessionId, change } = data;

        // Finds Doc
        const doc = documents[sessionId];
        if (doc) {
            // Doc Updates
            const newDelta = new QuillDelta(change);
            const updatedContent = new QuillDelta(doc).compose(newDelta);
            documents[sessionId] = updatedContent.ops;

            // Doc Updates
            socket.to(sessionId).emit('receive-change', change);
        }
    });

    socket.on('send-message', (data) => {
        const { sessionId, change } = data;

        // Stores message
        if (!chatMessages[sessionId]) {
            chatMessages[sessionId] = new QuillDelta().ops;
        }

        const updatedContent = new QuillDelta(chatMessages[sessionId]).compose(change);
        chatMessages[sessionId] = updatedContent.ops;

        // Sends Message
        io.to(sessionId).emit('receive-message', { sessionId, change });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
});
