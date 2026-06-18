import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export async function POST(request) {
  try {
    const body = await request.json()
    const { url, number, format, audioQuality } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL tidak ditemukan' },
        { status: 400 }
      )
    }

    // Buat temporary directory
    const tempDir = path.join(os.tmpdir(), `download_${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    try {
      // Format filename
      const uniqueCode = extractCodeFromUrl(url)
      const filename = `${uniqueCode}_${String(number).padStart(3, '0')}.mp4`
      const outputPath = path.join(tempDir, filename)

      // Build yt-dlp command
      let formatSpec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
      if (format === 'mp4') formatSpec = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]'
      else if (format === 'webm') formatSpec = 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]'
      else if (format === 'mkv') formatSpec = 'bestvideo[ext=mkv]+bestaudio[ext=mkv]/best[ext=mkv]'

      // Command untuk download dengan yt-dlp (menggunakan Python yt-dlp)
      const command = `yt-dlp -f "${formatSpec}" -o "${outputPath}" --no-playlist --quiet --no-warnings --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`

      console.log('Executing:', command)

      // Eksekusi download
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 100 // 100MB
      })

      // Cek apakah file berhasil didownload
      const files = fs.readdirSync(tempDir)
      const downloadedFile = files.find(f => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'))

      if (!downloadedFile) {
        throw new Error('File tidak ditemukan setelah download')
      }

      const filePath = path.join(tempDir, downloadedFile)
      const fileBuffer = fs.readFileSync(filePath)
      const base64Data = fileBuffer.toString('base64')

      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true })

      return NextResponse.json({
        success: true,
        message: `Video berhasil diunduh dengan nomor #${String(number).padStart(3, '0')}`,
        filename: downloadedFile,
        data: base64Data,
        size: fileBuffer.length
      })

    } catch (error) {
      // Cleanup jika error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
      
      console.error('Download error:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal mengunduh video' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

function extractCodeFromUrl(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const params = new URLSearchParams(urlObj.search)
      return params.get('v') || pathParts[pathParts.length - 1] || 'UNK'
    }
    if (urlObj.hostname.includes('instagram.com')) {
      for (const prefix of ['p', 'reel', 'tv']) {
        const idx = pathParts.indexOf(prefix)
        if (idx !== -1 && idx + 1 < pathParts.length) {
          return pathParts[idx + 1]
        }
      }
      return pathParts[pathParts.length - 1] || 'UNK'
    }
    if (urlObj.hostname.includes('tiktok.com')) {
      return pathParts[pathParts.length - 1] || 'UNK'
    }
    return 'UNK'
  } catch {
    return 'UNK'
  }
}