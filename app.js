const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QuillDelta = require('quill-delta');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessions = {};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        if (sessions[sessionId]) {
            socket.emit('load-document', sessions[sessionId].currentDocument);
        } else {
            sessions[sessionId] = { currentDocument: new QuillDelta() };
            socket.emit('load-document', sessions[sessionId].currentDocument);
        }
    });

    socket.on('text-change', (data) => {
        const { sessionId, change } = data;
        if (!sessions[sessionId]) {
            sessions[sessionId] = { currentDocument: new QuillDelta() };
        }
        applyDelta(sessions[sessionId].currentDocument, change);
        socket.to(sessionId).emit('receive-change', change);
    });
});

function applyDelta(doc, delta) {
    let newDelta = new QuillDelta(delta.ops);
    let combinedDelta = doc.compose(newDelta);
    doc.ops = combinedDelta.ops;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
