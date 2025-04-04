const ytdl = require('ytdl-core');

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

async function getVideoInfo(videoId) {
    try {
        console.log('Fetching video info for ID:', videoId);
        
        const options = {
            requestOptions: {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            }
        };

        const info = await ytdl.getInfo(videoId, options);
        console.log('Successfully fetched video info');
        
        return info;
    } catch (error) {
        console.error('Error in getVideoInfo:', error);
        throw error;
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
            return res.status(400).json({ 
                error: 'Missing URL',
                message: 'Video URL is required'
            });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ 
                error: 'Invalid URL',
                message: 'Could not extract video ID from URL'
            });
        }

        console.log('Processing video ID:', videoId);
        const info = await getVideoInfo(videoId);

        // Get available formats
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        // If no combined formats available, get video-only formats
        const selectedFormats = formats.length > 0 ? formats : ytdl.filterFormats(info.formats, 'video');
        
        if (selectedFormats.length === 0) {
            return res.status(400).json({
                error: 'No formats available',
                message: 'Could not find any suitable video formats'
            });
        }

        // Sort by quality and get the best format
        const format = selectedFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];

        const response = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url,
            quality: format.qualityLabel || `${format.height}p`,
            container: format.container,
            isVideoOnly: !format.hasAudio
        };

        console.log('Sending successful response');
        return res.json(response);

    } catch (error) {
        console.error('Error processing request:', error);

        // Handle specific error cases
        if (error.message.includes('age-restricted')) {
            return res.status(403).json({
                error: 'Age Restricted',
                message: 'This video is age-restricted and cannot be accessed'
            });
        }

        if (error.message.includes('private')) {
            return res.status(403).json({
                error: 'Private Video',
                message: 'This video is private and cannot be accessed'
            });
        }

        if (error.message.includes('copyright') || error.message.includes('removed')) {
            return res.status(410).json({
                error: 'Video Unavailable',
                message: 'This video has been removed or is not available'
            });
        }

        if (error.message.includes('status code: 410')) {
            return res.status(410).json({
                error: 'Resource Gone',
                message: 'The requested video is no longer available'
            });
        }

        // Default error response
        return res.status(500).json({
            error: 'Server Error',
            message: 'An error occurred while processing your request',
            details: error.message
        });
    }
}; 