export const metadata = {
  title: "Zahra Mobil — Showroom Mobil Bekas Terpercaya",
  description: "Dealer mobil bekas dengan inspeksi 150+ titik dan jaminan transparansi penuh. Beli mobil online, kirim langsung ke rumah Anda.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
