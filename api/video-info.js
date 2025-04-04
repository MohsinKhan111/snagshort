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

        console.log('Extracted video ID:', videoId);
        return videoId;
    } catch (error) {
        console.error('Error extracting video ID:', error);
        return null;
    }
}

async function getVideoInfo(videoId) {
    try {
        console.log('Starting video info fetch for ID:', videoId);
        
        const options = {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                }
            }
        };

        console.log('Using options:', JSON.stringify(options));
        
        const info = await ytdl.getBasicInfo(videoId, options);
        console.log('Successfully fetched basic info');
        
        return info;
    } catch (error) {
        console.error('Error in getVideoInfo:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        throw error;
    }
}

module.exports = async (req, res) => {
    console.log('Received request:', {
        method: req.method,
        url: req.url,
        query: req.query
    });

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
            console.log('Missing URL parameter');
            return res.status(400).json({ 
                error: 'Missing URL',
                message: 'Video URL is required'
            });
        }

        console.log('Processing URL:', url);
        const videoId = extractVideoId(url);
        
        if (!videoId) {
            console.log('Failed to extract video ID from URL:', url);
            return res.status(400).json({ 
                error: 'Invalid URL',
                message: 'Could not extract video ID from URL'
            });
        }

        console.log('Fetching info for video ID:', videoId);
        const info = await getVideoInfo(videoId);

        // Get available formats
        console.log('Getting available formats');
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        console.log('Found', formats.length, 'formats with video and audio');
        
        // If no combined formats available, get video-only formats
        const selectedFormats = formats.length > 0 ? formats : ytdl.filterFormats(info.formats, 'video');
        console.log('Selected formats count:', selectedFormats.length);
        
        if (selectedFormats.length === 0) {
            console.log('No suitable formats found');
            return res.status(400).json({
                error: 'No formats available',
                message: 'Could not find any suitable video formats'
            });
        }

        // Sort by quality and get the best format
        const format = selectedFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
        console.log('Selected best format:', {
            quality: format.qualityLabel,
            container: format.container,
            hasAudio: format.hasAudio
        });

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
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            statusCode: error.statusCode
        });

        // Handle specific error cases
        if (error.message.includes('age-restricted')) {
            return res.status(403).json({
                error: 'Age Restricted',
                message: 'This video is age-restricted and cannot be accessed',
                details: error.message
            });
        }

        if (error.message.includes('private')) {
            return res.status(403).json({
                error: 'Private Video',
                message: 'This video is private and cannot be accessed',
                details: error.message
            });
        }

        if (error.message.includes('copyright') || error.message.includes('removed')) {
            return res.status(410).json({
                error: 'Video Unavailable',
                message: 'This video has been removed or is not available',
                details: error.message
            });
        }

        if (error.message.includes('status code: 410')) {
            return res.status(410).json({
                error: 'Resource Gone',
                message: 'The requested video is no longer available',
                details: error.message
            });
        }

        // Default error response with more details
        return res.status(500).json({
            error: 'Server Error',
            message: 'An error occurred while processing your request',
            details: error.message,
            errorType: error.constructor.name
        });
    }
}; 