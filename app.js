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
    const db = client.db('uNote'); // Replace with your actual database name
    collection = db.collection('uNote'); // Replace with your actual collection name
    console.log("Connected to MongoDB");
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join-session', async (sessionId) => {
        socket.join(sessionId);

        try {
            // Check if a document for this session exists
            const doc = await collection.findOne({ sessionId: sessionId });
            if (doc) {
                // If it exists, send the document content to the client
                socket.emit('load-document', doc.content);
            } else {
                // If it does not exist, create a new document
                const newDoc = { sessionId: sessionId, content: new QuillDelta() };
                await collection.insertOne(newDoc);
                socket.emit('load-document', newDoc.content);
            }
        } catch (error) {
            console.error("Error loading or creating document:", error);
        }
    });

    socket.on('text-change', async (data) => {
        const { sessionId, change } = data;

        try {
            // Find the document for this session
            const doc = await collection.findOne({ sessionId: sessionId });
            if (doc) {
                // Apply the change to the document content
                const newDelta = new QuillDelta(change);
                doc.content = doc.content.compose(newDelta);
                
                // Update the document in the database
                await collection.updateOne({ sessionId: sessionId }, { $set: { content: doc.content } });
                
                // Broadcast the change to other clients in the session
                socket.to(sessionId).emit('receive-change', change);
            }
        } catch (error) {
            console.error("Error updating document:", error);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
