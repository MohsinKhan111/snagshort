const ytdl = require('ytdl-core');
const UserAgent = require('user-agents');

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
        
        res.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url,
            quality: `${format.height}p`
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to get video info',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}; 