import json
import os
import tempfile
import base64
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
import yt_dlp

class handler(BaseHTTPRequestHandler):
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            url = data.get('url')
            number = data.get('number', 1)
            format_type = data.get('format', 'best')
            audio_quality = data.get('audioQuality', 'best')
            
            if not url:
                self._send_response(400, {'success': False, 'error': 'URL tidak ditemukan'})
                return
            
            unique_code = self._extract_code_from_url(url)
            
            with tempfile.TemporaryDirectory() as temp_dir:
                filename_template = os.path.join(
                    temp_dir,
                    '%(title)s ' + unique_code + ' #%03d' % number + '.%(ext)s'
                )
                
                if format_type == 'best':
                    format_spec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
                elif format_type == 'mp4':
                    format_spec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
                elif format_type == 'webm':
                    format_spec = 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]'
                elif format_type == 'mkv':
                    format_spec = 'bestvideo[ext=mkv]+bestaudio[ext=mkv]/best[ext=mkv]'
                else:
                    format_spec = 'bestvideo+bestaudio/best'
                
                ydl_opts = {
                    'format': format_spec,
                    'outtmpl': filename_template,
                    'quiet': True,
                    'no_warnings': True,
                    'retries': 10,
                    'fragment_retries': 10,
                    'timeout': 300,
                    'noplaylist': True,
                    'merge_output_format': 'mp4',
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'force_ipv4': True,
                    'geo_bypass': True,
                    'extractor_args': {
                        'youtube': {
                            'player_client': ['android', 'web'],
                            'skip': ['hls']
                        }
                    },
                    'ignoreerrors': True,
                    'no_color': True,
                }
                
                if audio_quality != 'best':
                    ydl_opts['postprocessors'] = [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'mp3',
                        'preferredquality': audio_quality,
                    }]
                
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(url, download=True)
                        
                        downloaded_file = None
                        for file in os.listdir(temp_dir):
                            if file.endswith(('.mp4', '.mkv', '.webm', '.mp3', '.m4a')):
                                downloaded_file = os.path.join(temp_dir, file)
                                break
                        
                        if not downloaded_file:
                            raise Exception('File hasil download tidak ditemukan')
                        
                        with open(downloaded_file, 'rb') as f:
                            file_data = base64.b64encode(f.read()).decode('utf-8')
                        
                        self._send_response(200, {
                            'success': True,
                            'message': f'Video berhasil diunduh dengan nomor #{number:03d}',
                            'filename': os.path.basename(downloaded_file),
                            'data': file_data,
                            'size': os.path.getsize(downloaded_file)
                        })
                        
                except Exception as e:
                    self._send_response(500, {
                        'success': False,
                        'error': f'Gagal mengunduh: {str(e)}'
                    })
                    
        except Exception as e:
            self._send_response(500, {
                'success': False,
                'error': f'Internal server error: {str(e)}'
            })
    
    def _extract_code_from_url(self, url: str) -> str:
        try:
            parsed = urlparse(url)
            path_parts = parsed.path.strip('/').split('/')
            
            if any(domain in parsed.netloc for domain in ['youtube.com', 'youtu.be']):
                if 'v=' in parsed.query:
                    query_dict = dict(param.split('=') for param in parsed.query.split('&') if '=' in param)
                    return query_dict.get('v', 'UNK')[:15]
                elif parsed.netloc == 'youtu.be' and len(path_parts) >= 1:
                    return path_parts[0][:15]
                elif len(path_parts) >= 2 and path_parts[0] in ['embed', 'v']:
                    return path_parts[1][:15]
                elif path_parts:
                    return path_parts[-1][:15]
            
            elif 'instagram.com' in parsed.netloc:
                for prefix in ['p', 'reel', 'tv']:
                    if prefix in path_parts:
                        idx = path_parts.index(prefix)
                        if idx + 1 < len(path_parts):
                            return path_parts[idx + 1][:15]
                if len(path_parts) >= 2:
                    return path_parts[1][:15]
            
            elif 'tiktok.com' in parsed.netloc:
                if len(path_parts) >= 1:
                    return path_parts[0][:15]
            
            return 'UNK_' + datetime.now().strftime('%Y%m%d%H%M%S')
            
        except Exception:
            return 'UNK'
    
    def _send_response(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        self._send_response(200, {
            'success': True,
            'message': 'Video Downloader API is running',
            'version': '1.0.0'
        })