const ytdl = require('ytdl-core');
const UserAgent = require('user-agents');

// Function to get a random user agent
function getRandomUserAgent() {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    return userAgent.toString();
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

async function getVideoFormats(videoId, retries = 3) {
    const userAgent = getRandomUserAgent();
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log('Attempting to fetch video info with:', {
        url: normalizedUrl,
        userAgent: userAgent,
        remainingRetries: retries
    });

    try {
        const info = await ytdl.getInfo(normalizedUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cookie': '',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }
        });

        return info;
    } catch (error) {
        console.error('Error fetching video info:', {
            error: error.message,
            retries: retries,
            videoId: videoId
        });

        if (retries > 0) {
            console.log(`Retrying... ${retries} attempts remaining`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            return getVideoFormats(videoId, retries - 1);
        }

        throw error;
    }
}

module.exports = async (req, res) => {
    console.log('Received request:', {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers
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
            console.log('No URL provided');
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log('Processing URL:', url);
        const videoId = extractVideoId(url);
        if (!videoId) {
            console.log('Invalid video ID for URL:', url);
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        console.log('Extracted video ID:', videoId);
        const info = await getVideoFormats(videoId);
        console.log('Video info retrieved successfully');

        // Get available formats
        const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
        console.log('Available formats:', formats.length);
        
        if (formats.length === 0) {
            // Try getting video-only and audio-only formats
            const videoFormats = ytdl.filterFormats(info.formats, 'video');
            console.log('Video-only formats:', videoFormats.length);
            
            if (videoFormats.length === 0) {
                throw new Error('No video formats available');
            }

            // Sort formats by quality (highest first)
            const sortedFormats = videoFormats.sort((a, b) => {
                const qualityA = parseInt(a.height) || 0;
                const qualityB = parseInt(b.height) || 0;
                return qualityB - qualityA;
            });

            const format = sortedFormats[0];
            console.log('Selected video-only format:', {
                quality: format.quality,
                height: format.height,
                container: format.container
            });

            const response = {
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails[0].url,
                duration: info.videoDetails.lengthSeconds,
                downloadUrl: format.url,
                quality: `${format.height}p`,
                isVideoOnly: true
            };

            console.log('Sending video-only response');
            return res.json(response);
        }

        // Sort formats by quality (highest first)
        const sortedFormats = formats.sort((a, b) => {
            const qualityA = parseInt(a.height) || 0;
            const qualityB = parseInt(b.height) || 0;
            return qualityB - qualityA;
        });

        const format = sortedFormats[0];
        console.log('Selected format:', {
            quality: format.quality,
            height: format.height,
            container: format.container
        });
        
        const response = {
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            duration: info.videoDetails.lengthSeconds,
            downloadUrl: format.url,
            quality: `${format.height}p`,
            isVideoOnly: false
        };

        console.log('Sending response');
        res.json(response);
    } catch (error) {
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Check for specific YouTube errors
        if (error.message.includes('age-restricted')) {
            return res.status(403).json({ 
                error: 'This video is age-restricted',
                message: 'Age-restricted videos are not supported'
            });
        }
        
        if (error.message.includes('private')) {
            return res.status(403).json({ 
                error: 'This video is private',
                message: 'Private videos are not accessible'
            });
        }

        if (error.message.includes('copyright')) {
            return res.status(403).json({ 
                error: 'This video is not available',
                message: 'Video might be blocked due to copyright'
            });
        }

        res.status(500).json({ 
            error: 'Failed to get video info',
            message: error.message
        });
    }
}; 