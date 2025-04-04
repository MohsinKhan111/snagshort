const API_BASE_URL = 'https://snagshort-l9tgggf7i-mohsins-projects-f763fd3e.vercel.app/api';

async function getVideoInfo(url) {
    const response = await fetch(`${API_BASE_URL}/video-info?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch video info');
    }
    return response.json();
}

function showVideoPreview(data, container) {
    container.innerHTML = `
        <div class="video-info">
            <h3>${data.info.title}</h3>
            <p>By ${data.info.author}</p>
            <img src="${data.info.thumbnails[0]}" alt="Video thumbnail" onerror="this.src='${data.info.thumbnails[1]}'">
            <div class="download-options">
                <a href="${data.info.watchUrl}" target="_blank" rel="noopener noreferrer" class="button">
                    Watch on YouTube
                </a>
                <a href="${data.info.shortsUrl}" target="_blank" rel="noopener noreferrer" class="button">
                    Open in Shorts
                </a>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const urlInput = document.querySelector('input[type="text"]');
    const errorDiv = document.querySelector('.error');
    const loadingDiv = document.querySelector('.loading');
    const videoPreview = document.querySelector('.video-preview');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            if (!url) return;

            try {
                // Clear previous state
                errorDiv.style.display = 'none';
                loadingDiv.style.display = 'block';
                videoPreview.style.display = 'none';
                
                // Validate URL format
                if (!url.includes('youtube.com/shorts/')) {
                    throw new Error('Please enter a valid YouTube Shorts URL');
                }

                const data = await getVideoInfo(url);
                
                if (data.success && data.info) {
                    showVideoPreview(data, videoPreview);
                    videoPreview.style.display = 'block';
                } else {
                    throw new Error('Could not fetch video information');
                }
            } catch (error) {
                console.error('Error:', error);
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
            }
        });
    }
}); 