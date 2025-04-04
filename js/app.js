const API_BASE_URL = 'https://snagshort-pxatdbhvg-mohsins-projects-f763fd3e.vercel.app/api';

async function getVideoInfo(url) {
    const response = await fetch(`${API_BASE_URL}/video-info?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch video info');
    }
    return response.json();
}

async function downloadVideo(videoId) {
    // Create a hidden iframe to trigger the download
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `https://www.youtube.com/shorts/${videoId}`;
    document.body.appendChild(iframe);

    // Remove the iframe after a short delay
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const urlInput = document.querySelector('input[type="text"]');
    const downloadBtn = document.querySelector('button');
    const errorDiv = document.querySelector('.error');
    const loadingDiv = document.querySelector('.loading');
    const videoPreview = document.querySelector('.video-preview');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url = urlInput.value.trim();
            if (!url) return;

            try {
                errorDiv.style.display = 'none';
                loadingDiv.style.display = 'block';
                videoPreview.style.display = 'none';
                
                const data = await getVideoInfo(url);
                
                if (data.success && data.info) {
                    // Show video preview
                    videoPreview.innerHTML = `
                        <h3>${data.info.title}</h3>
                        <p>By ${data.info.author}</p>
                        <img src="${data.info.thumbnails[0]}" alt="Video thumbnail">
                        <div class="download-options">
                            <button onclick="window.open('${data.info.watchUrl}', '_blank')">Watch on YouTube</button>
                            <button onclick="downloadVideo('${data.videoId}')">Download</button>
                        </div>
                    `;
                    videoPreview.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            } finally {
                loadingDiv.style.display = 'none';
            }
        });
    }
}); 