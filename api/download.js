const ytdl = require('ytdl-core');
const UserAgent = require('user-agents');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

// Function to get a random user agent
function getRandomUserAgent() {
    return new UserAgent().toString();
}

// Function to extract video ID from various YouTube URL formats
function extractVideoId(url) {
    try {
        const urlObj = new URL(url);
        let videoId = null;

        if (urlObj.pathname.includes('/shorts/')) {
            videoId = urlObj.pathname.split('/shorts/')[1].split('?')[0];
        } else if (urlObj.pathname.includes('/watch')) {
            videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.includes('/v/')) {
            videoId = urlObj.pathname.split('/v/')[1];
        }

        return videoId;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Convert to standard YouTube URL
        const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const userAgent = getRandomUserAgent();

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

        // Get available formats
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        // Sort formats by quality (highest first)
        const sortedFormats = formats.sort((a, b) => {
            const qualityA = parseInt(a.height) || 0;
            const qualityB = parseInt(b.height) || 0;
            return qualityB - qualityA;
        });

        if (sortedFormats.length === 0) {
            throw new Error('No suitable format found');
        }

        const format = sortedFormats[0];

        // Set response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // Create download stream
        const videoStream = ytdl(normalizedUrl, {
            format: format,
            requestOptions: {
                headers: {
                    'User-Agent': userAgent,
                    'Cookie': '' // Empty cookie to avoid age restriction issues
                }
            }
        });

        // Pipe the video stream to the response
        await pipeline(videoStream, res);
    } catch (error) {
        console.error('Error:', error);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ 
                error: error.message || 'Failed to download video',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
}; 