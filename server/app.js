import express from 'express';
import path from 'path';
import ytdlp from "./yt-dlp.js";
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import fs from 'fs';
import { fetchTranscript, searchVideo } from './utils.js';
import { Server } from "socket.io";
import { createServer } from 'http';

const app = express();
const port = process.env.PORT || 3000;

// Create an HTTP server and listen to the port
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.set('trust proxy', 1); 

const STORAGE_DIR = '/tmp';
const PUBLIC_DIR = path.join(STORAGE_DIR, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audios');
const INFO_DIR = path.join(PUBLIC_DIR, 'infos');

[PUBLIC_DIR, AUDIO_DIR, INFO_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use(express.static(PUBLIC_DIR));
// app.use(express.static(path.join(__dirname, 'public')));

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
    max: 2, // limit each IP to 1 request per windowMs
    message: { message: 'Too many requests, please try again after 5 seconds' }
}));

// API endpoint to get music list
app.get('/api/songs', async (req, res) => {
    try {
        const query = req.query.q;
        const list = await ytdlp.getMusicList(query);
        for (const song of list) {
            song.path = path.join('/audios', song.id + '.webm');
        }
        res.json(list);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    } finally {
        // Any cleanup code if necessary
    }
});

// API endpoint to search for music
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.kw;
        if (!query) {
            res.status(400).json({ message: 'Missing query parameter `kw`' });
            return;
        }
        const r = await searchVideo(query);
        res.json(r);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

// API endpoint to download music
app.get('/api/download', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            res.status(400).json({ message: 'Missing query parameter `url`' });
            return;
        }
        const r = await ytdlp.getAudio(url);
        r.path = path.join('/audios', r.id + '.webm');
        res.json(r);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

app.delete('/api/song/:id', async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            res.status(400).json({ message: 'Missing query parameter `id`' });
            return;
        }
        const r = await ytdlp.deleteAudio(id);
        res.json(r);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

app.post('/api/set-cookies', async (req, res) => {
    return res.json({ message: 'Not implemented' });
    try {
        const cookies = req.body.cookies;
        if (!cookies) {
            res.status(400).json({ message: 'Missing query parameter `cookies`' });
            return;
        }
        const r = await ytdlp.setCookies(cookies);
        res.json(r);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

app.get('/api/get-subtitles', async (req, res) => {
    try {
        const videoId = req.query.videoId;
        if (!videoId) {
            res.status(400).json({ message: 'Missing query parameter `videoId`' });
            return;
        }
        const r = await fetchTranscript(videoId);
        res.json(r);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
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
// app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
// });

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('song-update', (data) => {
      console.log('song-update', data);
      io.emit(`song-update-${data.clientId}`, data); // Broadcast to specific client's room
    });
  
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
});


