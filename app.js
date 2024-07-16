const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const QuillDelta = require('quill-delta');
const Redis = require('ioredis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const redis = new Redis(process.env.REDIS_URL);

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', async (sessionId) => {
        socket.join(sessionId);
        const sessionData = await redis.get(sessionId);
        const document = sessionData ? JSON.parse(sessionData) : new QuillDelta();
        socket.emit('load-document', document);
    });

    socket.on('text-change', async (data) => {
        const { sessionId, change } = data;
        const sessionData = await redis.get(sessionId);
        let document = sessionData ? new QuillDelta(JSON.parse(sessionData)) : new QuillDelta();
        document = document.compose(new QuillDelta(change));
        await redis.set(sessionId, JSON.stringify(document));
        socket.to(sessionId).emit('receive-change', change);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
