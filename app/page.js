'use client'

import { useState, useRef, useEffect } from 'react'

export default function Home() {
  const [urls, setUrls] = useState('')
  const [startNumber, setStartNumber] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('Siap menunggu perintah...')
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({ success: 0, failed: 0, total: 0, downloaded: [] })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [format, setFormat] = useState('best')
  const [audioQuality, setAudioQuality] = useState('best')

  const logContainerRef = useRef(null)
  const MAX_URLS = 500

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (message, isError = false) => {
    const timestamp = new Date().toLocaleTimeString('id-ID', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
    setLogs(prev => [...prev, { timestamp, message, isError }])
  }

  const getPlatformEmoji = (url) => {
    if (!url) return '🌐'
    if (url.includes('youtube.com') || url.includes('youtu.be')) return '▶️'
    if (url.includes('instagram.com')) return '📸'
    if (url.includes('tiktok.com')) return '🎵'
    if (url.includes('facebook.com') || url.includes('fb.watch')) return '📘'
    if (url.includes('twitter.com') || url.includes('x.com')) return '🐦'
    return '🌐'
  }

  const exampleUrls = `https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://www.instagram.com/reel/Cx7YR-6Sj5/
https://www.tiktok.com/@username/video/1234567890`

  const downloadVideo = async (url, number) => {
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, number, folder: 'downloads', format, audioQuality })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        if (data.data) {
          const link = document.createElement('a')
          link.href = `data:video/mp4;base64,${data.data}`
          link.download = data.filename || `video_${number}.mp4`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          addLog(`✅ Berhasil: #${String(number).padStart(3, '0')} - ${data.filename}`)
          setStats(prev => ({
            ...prev,
            success: prev.success + 1,
            downloaded: [...prev.downloaded, { url, number, filename: data.filename }]
          }))
          return true
        } else {
          addLog(`✅ Berhasil: #${String(number).padStart(3, '0')}`)
          setStats(prev => ({ ...prev, success: prev.success + 1 }))
          return true
        }
      } else {
        addLog(`❌ Gagal: ${url} - ${data.error || 'Unknown error'}`, true)
        setStats(prev => ({ ...prev, failed: prev.failed + 1 }))
        return false
      }
    } catch (error) {
      addLog(`❌ Gagal: ${url} - ${error.message}`, true)
      setStats(prev => ({ ...prev, failed: prev.failed + 1 }))
      return false
    }
  }

  const handleDownload = async () => {
    const urlList = urls.split('\n').filter(u => u.trim())
    
    if (urlList.length === 0) {
      alert('⚠️ Masukkan minimal 1 URL video!')
      return
    }

    if (urlList.length > MAX_URLS) {
      alert(`⚠️ Maksimal ${MAX_URLS} URL dalam satu sesi!`)
      return
    }

    if (startNumber < 1) {
      alert('⚠️ Nomor urut harus lebih dari 0!')
      return
    }

    if (!confirm(
      `📥 Konfirmasi Download\n\n` +
      `📹 Total video: ${urlList.length}\n` +
      `🔢 Nomor urut mulai: #${String(startNumber).padStart(3, '0')}\n` +
      `📁 Folder: downloads\n` +
      `🎬 Format: ${format}\n` +
      `🔊 Audio: ${audioQuality}\n\n` +
      `Lanjutkan?`
    )) {
      return
    }

    setIsDownloading(true)
    setLogs([])
    setStats({ success: 0, failed: 0, total: urlList.length, downloaded: [] })
    setStatus(`📥 Mengunduh ${urlList.length} video...`)
    setProgress(0)
    
    addLog('═'.repeat(50))
    addLog(`🚀 Memulai download ${urlList.length} video`)
    addLog(`🔢 Nomor urut mulai: #${String(startNumber).padStart(3, '0')}`)
    addLog(`🎬 Format: ${format}`)
    addLog(`🔊 Audio: ${audioQuality}`)
    addLog('═'.repeat(50))

    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i].trim()
      const currentNumber = startNumber + i
      
      setProgress(((i + 1) / urlList.length) * 100)
      setStatus(`📥 ${i + 1}/${urlList.length}: ${url.substring(0, 50)}...`)
      
      addLog(`[${i + 1}/${urlList.length}] ${getPlatformEmoji(url)} ${url}`)
      
      const success = await downloadVideo(url, currentNumber)
      
      if (success) {
        successCount++
      } else {
        failedCount++
      }
      
      setStats(prev => ({ ...prev, success: successCount, failed: failedCount }))
    }

    setIsDownloading(false)
    setProgress(100)
    setStatus(`✅ Selesai! Berhasil: ${successCount} | Gagal: ${failedCount} | Total: ${urlList.length}`)
    
    addLog('═'.repeat(50))
    addLog('✅ DOWNLOAD SELESAI')
    addLog(`✅ Berhasil: ${successCount} video`)
    if (failedCount > 0) {
      addLog(`❌ Gagal: ${failedCount} video`, true)
    }
    addLog('═'.repeat(50))

    if (stats.downloaded.length > 0) {
      addLog('📋 File yang diunduh:')
      stats.downloaded.forEach((item, idx) => {
        addLog(`  ${idx + 1}. #${String(item.number).padStart(3, '0')} - ${item.filename}`)
      })
    }

    alert(
      `✅ Download Selesai!\n\n` +
      `✅ Berhasil: ${successCount} video\n` +
      `❌ Gagal: ${failedCount} video\n\n` +
      `📂 File video akan otomatis terdownload di browser Anda.`
    )
  }

  const clearAll = () => {
    if (isDownloading) return
    setUrls('')
    setLogs([])
    setStats({ success: 0, failed: 0, total: 0, downloaded: [] })
    setStatus('Siap menunggu perintah...')
    setProgress(0)
  }

  const loadExample = () => {
    if (!isDownloading) {
      setUrls(exampleUrls)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 40px rgba(37,99,235,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '12px', fontSize: '28px' }}>⬇️</div>
            <div>
              <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Video Downloader Pro</h1>
              <p style={{ color: '#93c5fd', fontSize: '14px', margin: 0 }}>YouTube • Instagram • TikTok • Facebook • Twitter</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadExample} disabled={isDownloading} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>📋 Contoh</button>
            <button onClick={clearAll} disabled={isDownloading} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>🗑️ Clear</button>
          </div>
        </div>

        {/* Main Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          {/* URL Input */}
          <label style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '8px' }}>
            📝 Daftar URL Video: <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>(satu per baris)</span>
          </label>
          <textarea
            style={{ width: '100%', height: '180px', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
            placeholder="Masukkan URL video, satu per baris&#10;Contoh:&#10;https://www.youtube.com/watch?v=...&#10;https://www.instagram.com/reel/...&#10;https://www.tiktok.com/@username/video/..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isDownloading}
          />
          <span style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', display: 'block' }}>
            {urls.split('\n').filter(u => u.trim()).length} URL terdeteksi
            {isDownloading && ' ⏳ Sedang memproses...'}
          </span>

          {/* Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '8px' }}>🔢 Nomor Urut Mulai:</label>
              <input
                type="number"
                min="1"
                style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box' }}
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                disabled={isDownloading}
              />
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>File akan diberi nomor berurutan dari angka ini</p>
            </div>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'block', marginBottom: '8px' }}>📁 Folder Output:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" style={{ flex: 1, padding: '12px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '14px', background: '#f9fafb', boxSizing: 'border-box' }} value="downloads" disabled />
                <button onClick={() => alert('📁 File akan disimpan di folder default: downloads\n\nFile akan otomatis terdownload ke browser Anda.')} disabled={isDownloading} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>📂 Info</button>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} disabled={isDownloading} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '14px', cursor: 'pointer', padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {showAdvanced ? '▼' : '▶'} Opsi Lanjutan
          </button>

          {showAdvanced && (
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '2px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>🎬 Format Video:</label>
                  <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }} value={format} onChange={(e) => setFormat(e.target.value)} disabled={isDownloading}>
                    <option value="best">Best Quality</option>
                    <option value="mp4">MP4</option>
                    <option value="webm">WebM</option>
                    <option value="mkv">MKV</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '4px' }}>🔊 Kualitas Audio:</label>
                  <select style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }} value={audioQuality} onChange={(e) => setAudioQuality(e.target.value)} disabled={isDownloading}>
                    <option value="best">Best</option>
                    <option value="320">320 kbps</option>
                    <option value="128">128 kbps</option>
                    <option value="64">64 kbps</option>
                  </select>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>⚠️ Format dan kualitas akan diterapkan pada semua video</div>
            </div>
          )}

          {/* Download Button */}
          <button onClick={handleDownload} disabled={isDownloading} style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '18px',
            border: 'none',
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            background: isDownloading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: isDownloading ? 'none' : '0 4px 12px rgba(37,99,235,0.3)'
          }}>
            {isDownloading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                DOWNLOADING... {Math.round(progress)}%
              </>
            ) : (
              '⬇️ MULAI DOWNLOAD'
            )}
          </button>

          {/* Status */}
          <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', marginTop: '20px', border: '2px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '14px' }}>
              <span style={{ fontWeight: '600', color: '#1f2937' }}>📊 Status:</span>
              <span style={{ fontWeight: '500', color: status.includes('Selesai') ? '#16a34a' : status.includes('Mengunduh') ? '#2563eb' : '#1f2937' }}>{status}</span>
            </div>
            
            <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '8px', overflow: 'hidden', marginTop: '12px' }}>
              <div style={{ height: '100%', borderRadius: '9999px', transition: 'width 0.5s ease', background: progress === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', width: `${progress}%` }} />
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
              {isDownloading && `${Math.round(progress)}%`}
              {!isDownloading && progress === 100 && '✅ Selesai'}
              {!isDownloading && progress === 0 && 'Menunggu...'}
            </div>

            {(stats.total > 0 || urls.split('\n').filter(u => u.trim()).length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>✅ {stats.success}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>❌ {stats.failed}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}>🎬 {stats.total || urls.split('\n').filter(u => u.trim()).length}</span>
                {stats.downloaded.length > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: '#faf5ff', border: '1px solid #e9d5ff', color: '#9333ea' }}>⬇️ {stats.downloaded.length} file</span>
                )}
              </div>
            )}
          </div>

          {/* Log */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '12px' }}>
                📋 Log Download:
                {logs.length > 0 && (
                  <span style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                    <span style={{ color: '#16a34a' }}>✅ {logs.filter(l => !l.isError).length}</span>
                    <span style={{ color: '#dc2626' }}>❌ {logs.filter(l => l.isError).length}</span>
                  </span>
                )}
              </span>
              {logs.length > 0 && (
                <button onClick={() => !isDownloading && setLogs([])} disabled={isDownloading} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>
                  Clear log
                </button>
              )}
            </div>
            
            <div ref={logContainerRef} style={{ height: '280px', background: '#111827', borderRadius: '12px', padding: '16px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
              {logs.length === 0 ? (
                <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🕐</div>
                  <p>Log akan muncul di sini...</p>
                  <p style={{ color: '#4b5563', fontSize: '10px', marginTop: '4px' }}>Masukkan URL dan klik tombol download</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ padding: '4px 0', borderBottom: index < logs.length - 1 ? '1px solid #1f2937' : 'none', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#6b7280', whiteSpace: 'nowrap' }}>[{log.timestamp}]</span>
                    <span style={log.isError ? { color: '#f87171' } : { color: '#34d399' }}>{log.isError ? '❌' : '✅'}</span>
                    <span style={{ wordBreak: 'break-all', color: log.isError ? '#f87171' : '#34d399' }}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span>Supported:</span>
            <span style={{ color: '#dc2626', fontWeight: '500' }}>YouTube</span>
            <span style={{ color: '#ec4899', fontWeight: '500' }}>Instagram</span>
            <span style={{ fontWeight: '500' }}>TikTok</span>
            <span style={{ color: '#2563eb', fontWeight: '500' }}>Facebook</span>
            <span style={{ color: '#3b82f6', fontWeight: '500' }}>Twitter/X</span>
          </div>
          <div style={{ color: '#9ca3af', fontSize: '11px' }}>⚠️ Hanya untuk penggunaan pribadi. Patuhi hak cipta dan kebijakan platform.</div>
          <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '4px' }}>Next.js • Python • yt-dlp • Vercel</div>
        </div>

        {/* Animations CSS */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            textarea:focus, input:focus { border-color: #2563eb !important; outline: none; }
            button:hover:not(:disabled) { opacity: 0.9; }
          `
        }} />
      </div>
    </div>
  )
}