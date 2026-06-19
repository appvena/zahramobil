export const metadata = {
  title: "Zahra Mobil — Showroom Mobil Bekas Terpercaya",
  description: "Dealer mobil bekas dengan inspeksi 15+ titik dan jaminan transparansi penuh. Beli mobil online, kirim langsung ke rumah Anda.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: "hidden", maxWidth: "100vw" }}>{children}</body>
    </html>
  );
}
