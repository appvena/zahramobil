export const metadata = {
  title: "Zahra Mobil — Showroom Mobil Bekas Terpercaya",
  description: "Dealer mobil bekas dengan inspeksi 150+ titik dan jaminan transparansi penuh. Beli mobil online, kirim langsung ke rumah Anda.",
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
