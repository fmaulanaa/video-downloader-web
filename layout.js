export const metadata = {
  title: 'Video Downloader Pro',
  description: 'Download video dari YouTube, Instagram, TikTok, Facebook, Twitter',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}