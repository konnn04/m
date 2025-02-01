const express = require('express');
const path = require('path');
const ytdlp = require("./yt-dlp")
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;
app.use(cors());
app.set('trust proxy', 1); 

const mkdirSync = require('fs').mkdirSync;
const existsSync = require('fs').existsSync;

// Tạo thư mục nếu chưa tồn tại
const dirs = [
    path.join(__dirname, 'public'), 
    path.join(__dirname, 'public/audios'), 
    path.join(__dirname, 'public/infos')
];

dirs.forEach(dir => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
    }
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to specific routes
app.use('/api/search', rateLimit({
    windowMs: 3000, // 3 seconds
    max: 1, // limit each IP to 1 request per windowMs
    message: { message: 'Too many requests, please try again after 3 seconds' }
}));

app.use('/api/songs', rateLimit({
    windowMs: 3000, // 3 seconds
    max: 5, // limit each IP to 1 request per windowMs
    message: { message: 'Too many requests, please try again after 3 seconds' }
}));

app.use('/api/download', rateLimit({
    windowMs: 5000, // 5 seconds
    max: 1, // limit each IP to 1 request per windowMs
    message: { message: 'Too many requests, please try again after 3 seconds' }
}));

// API endpoint to get music list
app.get('/api/songs', async (req, res) => {
    const query = req.query.q;
    const list = await ytdlp.getMusicList(query);
    for (const song of list) {
        song.path = path.join('/audios', song.id + '.webm')
    }
    res.json(list);
});

// API endpoint to search for music
app.get('/api/search', async (req, res) => {
    const query = req.query.kw;
    if (!query) {
        res.status(400).json({ message: 'Missing query parameter `kw`' });
        return
    }
    const r = await ytdlp.searchByKeyword(query)
    res.json(r);
})

// API endpoint to download music
app.get('/api/download', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        res.status(400).json({ message: 'Missing query parameter `url`' });
        return
    }
    const r = await ytdlp.getAudio(url)
    r.path = path.join('/audios', r.id + '.webm')
    res.json(r);
})

app.delete('/api/song/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
        res.status(400).json({ message: 'Missing query parameter `id`' });
        return
    }
    const r = await ytdlp.deleteAudio(id)
    res.json(r);
})

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    res.status(404).send('Not Found');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

