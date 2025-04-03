const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: '*'
}));

// Parse JSON bodies
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'SnagShort backend is running' });
});

// Route to get video info
app.get('/video-info', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get video info' });
    }
});

// Route to download video
app.get('/download', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });

        res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        ytdl(videoUrl, {
            format: format
        }).pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to download video' });
    }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 