const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Sample music data (replace with your actual data source)
const musicList = [
    { id: 1, title: 'Song 1', artist: 'Artist 1', file: 'song1.mp3' },
    { id: 2, title: 'Song 2', artist: 'Artist 2', file: 'song2.mp3' }
];

// API endpoint to get music list
app.get('/api/music', (req, res) => {
    res.json(musicList);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});