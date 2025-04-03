const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const UserAgent = require('user-agents');
const fetch = require('node-fetch');
const app = express();

// Enable CORS for all routes with more permissive options
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'SnagShort backend is running' });
});

// Function to get a random user agent
function getRandomUserAgent() {
    return new UserAgent().toString();
}

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
    try {
        console.log('Extracting video ID from URL:', url);
        const urlObj = new URL(url);
        let videoId = null;

        if (urlObj.pathname.includes('/shorts/')) {
            videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
            console.log('Extracted video ID from shorts URL:', videoId);
        } else if (urlObj.pathname.includes('/watch')) {
            videoId = urlObj.searchParams.get('v');
            console.log('Extracted video ID from watch URL:', videoId);
        } else if (urlObj.pathname.includes('/v/')) {
            videoId = urlObj.pathname.split('/v/')[1];
            console.log('Extracted video ID from v URL:', videoId);
        }

        if (!videoId) {
            console.error('Could not extract video ID from URL:', url);
        }

        return videoId;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        console.error('URL that caused error:', url);
        return null;
    }
}

// Function to validate video ID
async function validateVideoId(videoId) {
    try {
        console.log('Validating video ID:', videoId);
        const response = await fetch(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`);
        const isValid = response.status === 200;
        console.log('Video ID validation result:', isValid);
        if (!isValid) {
            console.log('Response status:', response.status);
            const text = await response.text();
            console.log('Response body:', text);
        }
        return isValid;
    } catch (error) {
        console.error('Error validating video ID:', error);
        return false;
    }
}

// Route to get video info
app.get('/video-info', async (req, res) => {
    try {
        console.log('Received video-info request:', req.query);
        const videoUrl = req.query.url;
        if (!videoUrl) {
            console.error('No video URL provided');
            return res.status(400).json({ error: 'Video URL is required' });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            console.error('Could not extract video ID from URL:', videoUrl);
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Validate video ID
        const isValid = await validateVideoId(videoId);
        if (!isValid) {
            console.error('Invalid or unavailable video ID:', videoId);
            return res.status(400).json({ error: 'Invalid or unavailable video' });
        }

        // Convert to standard YouTube URL
        const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('Fetching info for:', normalizedUrl);

        const userAgent = getRandomUserAgent();
        console.log('Using User-Agent:', userAgent);

        console.log('Calling ytdl.getInfo...');
        const info = await ytdl.getInfo(normalizedUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cookie': '' // Empty cookie to avoid age restriction issues
                }
            }
        });
        console.log('Successfully got video info');

        // Log available formats
        console.log('Available formats:', info.formats.map(f => ({
            itag: f.itag,
            quality: f.quality,
            hasVideo: !!f.hasVideo,
            hasAudio: !!f.hasAudio,
            container: f.container,
            height: f.height
        })));

        // Get available formats
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        console.log('Filtered formats (videoandaudio):', formats.length);
        
        // Sort formats by quality (highest first)
        const sortedFormats = formats.sort((a, b) => {
            const qualityA = parseInt(a.height) || 0;
            const qualityB = parseInt(b.height) || 0;
            return qualityB - qualityA;
        });

        if (sortedFormats.length === 0) {
            console.error('No suitable formats found');
            throw new Error('No suitable format found');
        }

        const format = sortedFormats[0];
        console.log('Selected format:', {
            itag: format.itag,
            quality: format.quality,
            container: format.container,
            height: format.height
        });
        
        const response = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url,
            quality: `${format.height}p`
        };
        console.log('Sending response:', response);
        res.json(response);
    } catch (error) {
        console.error('Detailed Error:', error);
        console.error('Error stack:', error.stack);
        const errorMessage = error.message || 'Failed to get video info';
        res.status(500).json({ 
            error: errorMessage,
            details: {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});

// Route to download video
app.get('/download', async (req, res) => {
    try {
        console.log('Received download request:', req.query);
        const videoUrl = req.query.url;
        if (!videoUrl) {
            console.error('No video URL provided');
            return res.status(400).json({ error: 'Video URL is required' });
        }

        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            console.error('Could not extract video ID from URL:', videoUrl);
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Validate video ID
        const isValid = await validateVideoId(videoId);
        if (!isValid) {
            console.error('Invalid or unavailable video ID:', videoId);
            return res.status(400).json({ error: 'Invalid or unavailable video' });
        }

        // Convert to standard YouTube URL
        const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('Downloading:', normalizedUrl);

        const userAgent = getRandomUserAgent();
        console.log('Using User-Agent:', userAgent);

        console.log('Getting video info for download...');
        const info = await ytdl.getInfo(normalizedUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cookie': '' // Empty cookie to avoid age restriction issues
                }
            }
        });
        console.log('Successfully got video info for download');

        // Get available formats
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        console.log('Available formats for download:', formats.length);
        
        // Sort formats by quality (highest first)
        const sortedFormats = formats.sort((a, b) => {
            const qualityA = parseInt(a.height) || 0;
            const qualityB = parseInt(b.height) || 0;
            return qualityB - qualityA;
        });

        if (sortedFormats.length === 0) {
            console.error('No suitable formats found for download');
            throw new Error('No suitable format found');
        }

        const format = sortedFormats[0];
        console.log('Selected download format:', {
            itag: format.itag,
            quality: format.quality,
            container: format.container,
            height: format.height
        });

        res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        console.log('Starting download stream...');
        ytdl(normalizedUrl, {
            format: format,
            requestOptions: {
                headers: {
                    'User-Agent': userAgent,
                    'Cookie': '' // Empty cookie to avoid age restriction issues
                }
            }
        }).pipe(res);

    } catch (error) {
        console.error('Download Error:', error);
        console.error('Error stack:', error.stack);
        const errorMessage = error.message || 'Failed to download video';
        res.status(500).json({ 
            error: errorMessage,
            details: {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 