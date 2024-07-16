const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { MongoClient } = require('mongodb');
const QuillDelta = require('quill-delta');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let collection;

client.connect(err => {
    if (err) throw err;
    const db = client.db('u-note-2-0'); // Replace with your DB name
    collection = db.collection('documents'); // Replace with your collection name
    console.log("Connected to MongoDB");
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', async (sessionId) => {
        socket.join(sessionId);
        const doc = await collection.findOne({ sessionId: sessionId });
        if (doc) {
            socket.emit('load-document', doc.content);
        } else {
            const newDoc = { sessionId: sessionId, content: new QuillDelta() };
            await collection.insertOne(newDoc);
            socket.emit('load-document', newDoc.content);
        }
    });

    socket.on('text-change', async (data) => {
        const { sessionId, change } = data;
        const doc = await collection.findOne({ sessionId: sessionId });
        if (doc) {
            const newDelta = new QuillDelta(change);
            doc.content = doc.content.compose(newDelta);
            await collection.updateOne({ sessionId: sessionId }, { $set: { content: doc.content } });
            socket.to(sessionId).emit('receive-change', change);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
