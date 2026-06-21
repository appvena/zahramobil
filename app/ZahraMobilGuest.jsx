"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const INSPECTION_CATEGORIES = [
  { key: "mesin", label: "Mesin & Performa", icon: "⚙️" },
  { key: "kakikaki", label: "Kaki-kaki & Suspensi", icon: "🔧" },
  { key: "interior", label: "Interior & Kabin", icon: "🪑" },
  { key: "eksterior", label: "Eksterior & Body", icon: "🚘" },
];

function genInspection(seed) {
  const items = {
    mesin: ["Oli mesin & kebocoran", "Radiator & sistem pendingin", "Aki & sistem starter", "Suara mesin (idle)", "Transmisi & perpindahan gigi", "Sistem bahan bakar"],
    kakikaki: ["Ban depan & belakang", "Shockbreaker", "Rem depan & belakang", "Velg (baret/penyok)", "Kaki-kaki bunyi", "Spooring & balancing"],
    interior: ["Jok & material", "AC & sirkulasi udara", "Audio & head unit", "Dashboard & panel", "Power window & central lock", "Bau kabin"],
    eksterior: ["Cat bodi (orisinil/repaint)", "Lecet/baret halus", "Lampu depan & belakang", "Kaca & wiper", "Bumper depan/belakang", "Karat & rangka"],
  };
  const statuses = ["OK", "OK", "OK", "Minor", "OK", "Perlu Perhatian"];
  let out = {};
  Object.entries(items).forEach(([cat, list]) => {
    out[cat] = list.map((name, i) => ({
      name, status: statuses[(seed + i) % statuses.length],
      note: statuses[(seed + i) % statuses.length] === "Minor" ? "Lecet halus, tidak mempengaruhi fungsi" :
            statuses[(seed + i) % statuses.length] === "Perlu Perhatian" ? "Disarankan servis dalam waktu dekat" : "Kondisi baik, sesuai standar",
    }));
  });
  return out;
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtShort = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(2)} M` : `${(n / 1e6).toFixed(0)} Jt`;

const SILVER = "#C8CDD2";
const GOLD = SILVER; // alias dipertahankan agar seluruh kode lama tetap konsisten memakai warna baru
const CLOUDINARY_CLOUD_NAME = "dtpow34rz";
const CLOUDINARY_UPLOAD_PRESET = "zahramobil_unsigned";

// ─── NAVBAR (shared) ─────────────────────────────────────────────────────────
function Navbar({ onNav, onToggleTheme }) {
  return (
    <nav style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px clamp(16px, 4vw, 48px)", boxSizing: "border-box", maxWidth: "100vw" }}>
      <button onClick={() => onNav("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
        <img src="/zahramobil/logo.png" alt="Zahra Mobil" style={{ height: "clamp(44px, 8vw, 56px)", width: "auto", flexShrink: 0, objectFit: "contain" }} />
        <span style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(16px, 4vw, 24px)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>ZAHRA <span style={{ color: GOLD }}>MOBIL</span></span>
      </button>
      <div style={{ display: "flex", gap: "clamp(8px, 2vw, 28px)", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "clamp(8px, 2vw, 28px)", flexShrink: 1, overflow: "hidden" }}>
          {[["Katalog", "katalog"]].map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => onNav("home")} style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "clamp(10px, 2.2vw, 14px)", letterSpacing: "0.08em", fontWeight: 400, textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {label}
            </a>
          ))}
          <a href="https://wa.me/628116707099" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "clamp(10px, 2.2vw, 14px)", letterSpacing: "0.08em", fontWeight: 400, textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Kontak
          </a>
        </div>
        {onToggleTheme && (
          <button onClick={onToggleTheme} aria-label="Ganti ke mode terang" style={{ width: 30, height: 30, minWidth: 30, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, padding: 0 }}>
            ☀️
          </button>
        )}
      </div>
    </nav>
  );
}

// ─── HERO SLIDER ────────────────────────────────────────────────────────────
function HeroSlider({ cars, onSelectCar }) {
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(null);
  const [dir, setDir] = useState(1);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const heroCars = cars.filter(c => c.showInHero);

  const go = useCallback((idx) => {
    if (animating || idx === cur) return;
    setDir(idx > cur ? 1 : -1);
    setPrev(cur); setAnimating(true); setCur(idx);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 900);
  }, [animating, cur]);

  const next = useCallback(() => go((cur + 1) % heroCars.length), [go, cur, heroCars.length]);

  useEffect(() => {
    if (heroCars.length === 0) return;
    timerRef.current = setInterval(next, 5500);
    return () => clearInterval(timerRef.current);
  }, [next, heroCars.length]);

  if (!heroCars || heroCars.length === 0) return null;
  const car = heroCars[cur];
  const prevCar = prev !== null ? heroCars[prev] : null;

  return (
    <section style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: car.heroStyle === "floating" ? "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)" : "#0a0a0a" }}>
      {prevCar && prevCar.heroStyle !== "floating" && (
        <div key={`prev-${prev}`} style={{ position: "absolute", inset: 0, zIndex: 1, backgroundImage: `url(${prevCar.images[0]})`, backgroundSize: "cover", backgroundPosition: "center", animation: `heroBgOut${dir > 0 ? "Left" : "Right"} 0.9s cubic-bezier(.77,0,.18,1) forwards` }} />
      )}
      {prevCar && prevCar.heroStyle === "floating" && (
        <div key={`previmg-${prev}`} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "52vh", zIndex: 1, animation: `heroBgOut${dir > 0 ? "Left" : "Right"} 0.9s cubic-bezier(.77,0,.18,1) forwards`, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <img src={prevCar.images[0]} alt="" style={{ maxWidth: "92%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))" }} />
        </div>
      )}

      {car.heroStyle === "floating" ? (
        <div key={`curimg-${cur}`} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "52vh", zIndex: 2, animation: animating ? `heroBgIn${dir > 0 ? "Right" : "Left"} 0.9s cubic-bezier(.77,0,.18,1) forwards` : "none", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <img src={car.images[0]} alt={car.model} style={{ maxWidth: "92%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.6))" }} />
        </div>
      ) : (
        <div key={`cur-${cur}`} style={{ position: "absolute", inset: 0, zIndex: 2, backgroundImage: `url(${car.images[0]})`, backgroundSize: "cover", backgroundPosition: "center", animation: animating ? `heroBgIn${dir > 0 ? "Right" : "Left"} 0.9s cubic-bezier(.77,0,.18,1) forwards` : "none" }} />
      )}

      {car.heroStyle !== "floating" && (
        <>
          <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.15) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", zIndex: 3, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
        </>
      )}
      {car.heroStyle === "floating" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
      )}

      <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: car.heroStyle === "floating" ? "flex-start" : "center", padding: car.heroStyle === "floating" ? "clamp(90px, 18vh, 130px) clamp(16px, 4vw, 48px) 0" : "0 clamp(16px, 4vw, 48px) 80px", boxSizing: "border-box" }}>
        <div key={`txt-${cur}`} style={{ maxWidth: 620, animation: "heroTextIn 0.8s cubic-bezier(.25,.8,.25,1) both", animationDelay: "0.15s", textAlign: car.heroStyle === "floating" ? "center" : "left", margin: car.heroStyle === "floating" ? "0 auto" : "0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: car.heroStyle === "floating" ? "center" : "flex-start", gap: 12, marginBottom: car.heroStyle === "floating" ? 12 : 20 }}>
            <div style={{ width: 32, height: 2, background: GOLD }} />
            <span style={{ color: GOLD, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 400 }}>{car.brand} — {car.type}</span>
          </div>
          <h1 style={{ color: "#fff", fontSize: car.heroStyle === "floating" ? "clamp(28px, 4.5vw, 56px)" : "clamp(36px, 5vw, 68px)", fontWeight: 300, lineHeight: 1.08, margin: car.heroStyle === "floating" ? "0 0 10px" : "0 0 16px", letterSpacing: "0.01em" }}>{car.model}</h1>
          {car.heroStyle !== "floating" && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 1.7, margin: "0 0 12px", maxWidth: 480 }}>{car.desc}</p>}
          <div style={{ color: GOLD, fontSize: car.heroStyle === "floating" ? "clamp(16px, 2.2vw, 24px)" : "clamp(18px, 2.5vw, 26px)", fontWeight: 300, letterSpacing: "0.03em", margin: car.heroStyle === "floating" ? "0 0 18px" : "0 0 32px" }}>{fmt(car.price)}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: car.heroStyle === "floating" ? "center" : "flex-start", marginTop: 28 }}>
            <button onClick={() => onSelectCar(car)} style={{ padding: "11px 22px", background: "transparent", color: "#fff", border: `1px solid ${SILVER}cc`, borderRadius: 2, fontWeight: 400, fontSize: 11, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.25s" }}>
              Lihat Detail & Rapor
            </button>
            <button onClick={() => document.getElementById("katalog").scrollIntoView({ behavior: "smooth" })} style={{ padding: "11px 22px", background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 2, fontWeight: 400, fontSize: 11, cursor: "pointer", letterSpacing: "0.12em", textTransform: "uppercase", transition: "all 0.25s" }}>
              Lihat Katalog
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 36, left: 48, zIndex: 10, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {heroCars.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{ width: i === cur ? 32 : 8, height: 3, border: "none", borderRadius: 2, cursor: "pointer", transition: "all 0.4s", background: i === cur ? GOLD : "rgba(255,255,255,0.35)", padding: 0 }} />
          ))}
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, letterSpacing: "0.1em" }}>{String(cur + 1).padStart(2, "0")} / {String(heroCars.length).padStart(2, "0")}</span>
      </div>

      <button onClick={next} style={{ position: "absolute", bottom: 28, right: 48, zIndex: 10, width: 48, height: 48, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 4, cursor: "pointer", fontSize: 18, backdropFilter: "blur(4px)" }}>→</button>

      <style>{`
        @keyframes heroBgInRight { from { transform: translateX(6%) scale(1.04); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
        @keyframes heroBgInLeft { from { transform: translateX(-6%) scale(1.04); opacity: 0 } to { transform: translateX(0) scale(1); opacity: 1 } }
        @keyframes heroBgOutLeft { to { transform: translateX(-4%) scale(0.98); opacity: 0 } }
        @keyframes heroBgOutRight { to { transform: translateX(4%) scale(0.98); opacity: 0 } }
        @keyframes heroTextIn { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </section>
  );
}

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { Ready: ["#22c55e"], Booking: ["#f59e0b"], Terjual: ["#6b7280"] };
  const [c] = map[status] || map.Ready;
  return <span style={{ background: c + "22", color: c, border: `1px solid ${c}44`, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>{status === "Terjual" ? "SOLD OUT" : status}</span>;
}

// ─── CAR CARD ────────────────────────────────────────────────────────────────
function CarCard({ car, onView }) {
  const [hover, setHover] = useState(false);
  const sold = car.status === "Terjual";
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onView(car)}
      style={{ background: "#141414", border: `1px solid ${hover ? GOLD + "44" : "#2a2a2a"}`, borderRadius: 10, overflow: "hidden", transition: "all 0.3s", transform: hover ? "translateY(-4px)" : "none", boxShadow: hover ? "0 20px 60px rgba(0,0,0,0.5)" : "none", cursor: "pointer" }}>
      <div style={{ position: "relative", paddingTop: "62%", overflow: "hidden", background: "#0d0d0d" }}>
        <img src={car.images[0]} alt={car.model} loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease", transform: hover ? "scale(1.06)" : "scale(1)", filter: sold ? "grayscale(0.6) brightness(0.6)" : "none" }} />
        <div style={{ position: "absolute", top: 12, right: 12 }}><StatusBadge status={car.status} /></div>
        {sold && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ border: "3px solid #fff", color: "#fff", fontWeight: 900, fontSize: 22, padding: "6px 24px", transform: "rotate(-8deg)", letterSpacing: "0.1em" }}>SOLD</div>
          </div>
        )}
      </div>
      <div style={{ padding: "18px 20px 20px" }}>
        <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>{car.brand} · {car.type}</div>
        <h3 style={{ color: "#f5f5f5", fontSize: 18, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.2 }}>{car.model}</h3>
        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          {[["📅", car.year], ["⚡", car.transmission], ["🔢", `${car.km.toLocaleString("id-ID")} km`]].map(([icon, val]) => (
            <span key={val} style={{ color: "#888", fontSize: 12 }}>{icon} {val}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
          <div>
            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Harga</div>
            <div style={{ color: GOLD, fontSize: 19, fontWeight: 700 }}>{fmtShort(car.price)}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onView(car); }} disabled={sold}
            style={{ padding: "9px 18px", background: sold ? "#333" : GOLD, color: sold ? "#777" : "#0a0a0a", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: sold ? "default" : "pointer", letterSpacing: "0.04em" }}>
            {sold ? "Terjual" : "Lihat Detail"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CATALOG SECTION ─────────────────────────────────────────────────────────
function CatalogSection({ cars, onView }) {
  const [brand, setBrand] = useState("Semua");
  const [type, setType] = useState("Semua");
  const [maxPrice, setMaxPrice] = useState(2000);
  const [search, setSearch] = useState("");

  const BRANDS = ["Semua", ...new Set(cars.map(c => c.brand))];
  const TYPES = ["Semua", ...new Set(cars.map(c => c.type))];

  const filtered = cars.filter(c =>
    (brand === "Semua" || c.brand === brand) &&
    (type === "Semua" || c.type === type) &&
    c.price <= maxPrice * 1e6 &&
    (c.model.toLowerCase().includes(search.toLowerCase()) || c.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const pillStyle = (active) => ({ padding: "7px 18px", borderRadius: 99, border: `1.5px solid ${active ? GOLD : "#333"}`, background: active ? GOLD : "transparent", color: active ? "#0a0a0a" : "#888", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, transition: "all 0.2s" });

  return (
    <section id="katalog" style={{ background: "#0d0d0d", padding: "60px clamp(16px, 4vw, 48px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>— Koleksi Kami</div>
          <h2 style={{ color: "#f5f5f5", fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Katalog Kendaraan</h2>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "20px 24px", marginBottom: 40, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Cari</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Merek atau model..." style={{ width: "100%", background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "9px 14px", color: "#f5f5f5", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Merek</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{BRANDS.map(b => <button key={b} onClick={() => setBrand(b)} style={pillStyle(brand === b)}>{b}</button>)}</div>
          </div>
          <div>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Tipe</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TYPES.map(t => <button key={t} onClick={() => setType(t)} style={pillStyle(type === t)}>{t}</button>)}</div>
          </div>
          <div style={{ flex: "0 0 200px" }}>
            <div style={{ color: "#555", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Maks. Harga: <span style={{ color: GOLD }}>{fmtShort(maxPrice * 1e6)}</span></div>
            <input type="range" min={100} max={2000} step={50} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: "100%", accentColor: GOLD }} />
          </div>
        </div>

        <div className="zm-grid-catalog" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {filtered.map(car => <CarCard key={car.id} car={car} onView={onView} />)}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "80px 0", color: "#444" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
              <div style={{ fontSize: 18, color: "#555" }}>Tidak ada kendaraan yang cocok</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── INSPECTION REPORT (visual + detail) ─────────────────────────────────────
function InspectionReport({ inspection }) {
  const [openCat, setOpenCat] = useState("mesin");
  const statusColor = { OK: "#22c55e", Minor: "#f59e0b", "Perlu Perhatian": "#ef4444" };

  const summary = INSPECTION_CATEGORIES.map(cat => {
    const items = inspection[cat.key];
    const okCount = items.filter(i => i.status === "OK").length;
    const worst = items.some(i => i.status === "Perlu Perhatian") ? "Perlu Perhatian" : items.some(i => i.status === "Minor") ? "Minor" : "OK";
    return { ...cat, okCount, total: items.length, worst };
  });

  const totalPoints = Object.values(inspection).flat().length;
  const totalOk = Object.values(inspection).flat().filter(i => i.status === "OK").length;

  return (
    <div>
      <div style={{ background: "#141414", border: `1px solid #2a2a2a`, borderRadius: 12, padding: 28, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total Titik Inspeksi</div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>{totalPoints}+ <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>titik diperiksa</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Kondisi Baik</div>
            <div style={{ color: "#22c55e", fontSize: 28, fontWeight: 800 }}>{Math.round((totalOk / totalPoints) * 100)}%</div>
          </div>
        </div>
        <div className="zm-grid-inspect" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {summary.map(cat => (
            <button key={cat.key} onClick={() => setOpenCat(cat.key)}
              style={{ background: openCat === cat.key ? `${statusColor[cat.worst]}15` : "#1a1a1a", border: `1.5px solid ${openCat === cat.key ? statusColor[cat.worst] : "#2a2a2a"}`, borderRadius: 10, padding: "16px 14px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
              <div style={{ color: "#ddd", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{cat.label}</div>
              <div style={{ color: statusColor[cat.worst], fontSize: 11, fontWeight: 700 }}>{cat.okCount}/{cat.total} OK</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>{INSPECTION_CATEGORIES.find(c => c.key === openCat).icon}</span>
          <h3 style={{ color: "#f5f5f5", margin: 0, fontSize: 18, fontWeight: 700 }}>{INSPECTION_CATEGORIES.find(c => c.key === openCat).label}</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {inspection[openCat].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "#1a1a1a", borderRadius: 8, border: `1px solid ${statusColor[item.status]}22` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[item.status], marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: "#e5e5e5", fontSize: 14, fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: statusColor[item.status], fontSize: 12, fontWeight: 700 }}>{item.status}</span>
                </div>
                <div style={{ color: "#777", fontSize: 12.5 }}>{item.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p style={{ color: "#444", fontSize: 11.5, marginTop: 16, lineHeight: 1.6 }}>
        Laporan inspeksi dibuat oleh teknisi bersertifikat Zahra Mobil. Karena unit ini tidak tersedia untuk test drive langsung, laporan ini menjadi acuan transparansi kondisi kendaraan secara menyeluruh.
      </p>
    </div>
  );
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────
function Gallery({ images }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ position: "relative", paddingTop: "62%", borderRadius: 12, overflow: "hidden", marginBottom: 12, background: "#0d0d0d" }}>
        <img src={images[active]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        <img src="/zahramobil/logo.png" alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "28%", maxWidth: 130, opacity: 0.2, pointerEvents: "none", userSelect: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingRight: 16, WebkitOverflowScrolling: "touch" }}>
        {images.map((img, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ flexShrink: 0, width: 88, height: 60, borderRadius: 6, overflow: "hidden", border: `2px solid ${active === i ? GOLD : "transparent"}`, padding: 0, cursor: "pointer", background: "#0d0d0d" }}>
            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── INSTANT CHECKOUT ─────────────────────────────────────────────────────────
function InstantCheckout({ car, onSubmit }) {
  const [form, setForm] = useState({ nama: "", hp: "", email: "", alamat: "", ktp: null, ktpFileName: "", metode: "Cash" });
  const [sent, setSent] = useState(false);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const fileRef = useRef();

  const inp = { background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "11px 14px", color: "#f5f5f5", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };

  const [submitting, setSubmitting] = useState(false);

  const handleKtpUpload = async (file) => {
    if (!file) return;
    setUploadingKtp(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
      const json = await res.json();
      if (!json.secure_url) throw new Error(json.error?.message || "Upload gagal");
      setForm(f => ({ ...f, ktp: json.secure_url, ktpFileName: file.name }));
    } catch (e) {
      alert(`Gagal mengunggah KTP: ${e.message}. Silakan coba lagi.`);
    } finally {
      setUploadingKtp(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nama || !form.hp || !form.alamat) return alert("Nama, No. HP, dan Alamat wajib diisi.");
    setSubmitting(true);
    try {
      const { ktpFileName, ...payload } = form;
      await onSubmit({ ...payload, carId: car.id, carName: `${car.brand} ${car.model}`, unit: `${car.brand} ${car.model}`, type: "Beli & Kirim ke Rumah" });
      setSent(true);
    } catch (e) {
      // error sudah ditangani di handleCheckout induk
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) return (
    <div style={{ background: "#141414", border: `1px solid ${GOLD}44`, borderRadius: 12, padding: 36, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h3 style={{ color: "#f5f5f5", margin: "0 0 10px", fontSize: 20, fontWeight: 700 }}>Pesanan Diterima!</h3>
      <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>Tim Sales kami akan menghubungi Anda dalam 1 jam kerja untuk verifikasi data dan langkah selanjutnya.</p>
    </div>
  );

  return (
    <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #2a2a2a" }}>
        <span style={{ fontSize: 22 }}>🛒</span>
        <div>
          <h3 style={{ color: "#f5f5f5", margin: 0, fontSize: 18, fontWeight: 700 }}>Beli & Kirim ke Rumah</h3>
          <div style={{ color: "#666", fontSize: 12, marginTop: 2 }}>Tanpa survei tatap muka — proses online penuh</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 6 }}>Nama Lengkap (sesuai KTP) *</label>
          <input style={inp} value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="John Doe" /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 6 }}>No. HP / WhatsApp *</label>
            <input style={inp} value={form.hp} onChange={e => setForm(f => ({ ...f, hp: e.target.value }))} placeholder="08xxxxxxxxxx" /></div>
          <div><label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 6 }}>Email</label>
            <input style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@contoh.com" /></div>
        </div>

        <div><label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 6 }}>Alamat Pengiriman (lengkap) *</label>
          <textarea style={{ ...inp, resize: "vertical", minHeight: 70 }} value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))} placeholder="Jl. Contoh No. 1, Kecamatan, Kota, Provinsi, Kode Pos" /></div>

        <div>
          <label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 6 }}>Unggah Foto KTP</label>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleKtpUpload(e.target.files[0])} />
          <button onClick={() => fileRef.current.click()} disabled={uploadingKtp} style={{ width: "100%", padding: "12px", background: "#1a1a1a", border: `1.5px dashed ${form.ktp ? GOLD : "#333"}`, borderRadius: 6, color: form.ktp ? GOLD : "#666", fontSize: 13, cursor: uploadingKtp ? "default" : "pointer" }}>
            {uploadingKtp ? "⏳ Mengunggah..." : form.ktp ? `✓ ${form.ktpFileName}` : "📷 Klik untuk unggah foto KTP"}
          </button>
        </div>

        <div>
          <label style={{ color: "#666", fontSize: 12, display: "block", marginBottom: 8 }}>Metode Pembayaran</label>
          <div style={{ display: "flex", gap: 10 }}>
            {["Cash", "Ajukan Kredit"].map(m => (
              <button key={m} onClick={() => setForm(f => ({ ...f, metode: m }))} style={{ flex: 1, padding: "12px", border: `1.5px solid ${form.metode === m ? GOLD : "#333"}`, borderRadius: 6, background: form.metode === m ? `${GOLD}1a` : "transparent", color: form.metode === m ? GOLD : "#888", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {m === "Cash" ? "💵 Cash" : "🏦 Ajukan Kredit"}
              </button>
            ))}
          </div>
        </div>

        {form.metode === "Ajukan Kredit" && (
          <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14, color: "#777", fontSize: 12.5, lineHeight: 1.6 }}>
            💡 Tim Sales akan membantu proses pengajuan ke partner leasing (Adira, BCA Finance, Mandiri Tunas) setelah data terverifikasi. Hubungi kami via WhatsApp untuk simulasi cicilan.
          </div>
        )}

        <div style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 13 }}>Unit dipesan</span>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>{car.brand} {car.model}</span>
        </div>

        <button onClick={handleSubmit} disabled={submitting || uploadingKtp} style={{ width: "100%", padding: "15px", background: (submitting || uploadingKtp) ? "#555" : GOLD, color: "#0a0a0a", border: "none", borderRadius: 6, fontWeight: 800, fontSize: 15, cursor: (submitting || uploadingKtp) ? "default" : "pointer", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 6 }}>
          {submitting ? "Mengirim..." : uploadingKtp ? "Tunggu unggah KTP..." : "Pesan Sekarang →"}
        </button>
        <p style={{ color: "#444", fontSize: 11, textAlign: "center", margin: 0 }}>Dengan memesan, Anda menyetujui untuk dihubungi tim Sales kami via WhatsApp/telepon.</p>
      </div>
    </div>
  );
}

// ─── MINI KREDIT (inline di detail) ───────────────────────────────────────────
function MiniKredit({ price, carName }) {
  const waLink = `https://wa.me/628116707099?text=${encodeURIComponent(`Halo, saya tertarik dengan ${carName} (${fmt(price)}). Bisa minta info lebih lanjut?`)}`;
  return (
    <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12, padding: 24 }}>
      <div style={{ color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Tanya Harga & Cicilan</div>
      <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6, margin: "0 0 18px" }}>Tim sales kami siap membantu hitungkan simulasi cicilan sesuai DP dan tenor yang Anda inginkan.</p>
      <a href={waLink} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 8px", background: "transparent", border: `1px solid ${SILVER}`, borderRadius: 4, color: "#fff", fontSize: 11, fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", boxSizing: "border-box", whiteSpace: "nowrap" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.33A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.18l-.32-.19-3.26.85.87-3.18-.21-.33A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" fill={SILVER}/><path d="M16.5 13.3c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.56.13-.17.25-.65.8-.8.97-.15.17-.3.18-.55.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.13-.13.29-.32.43-.49.14-.17.19-.3.29-.48.1-.18.05-.34-.02-.48-.07-.13-.6-1.46-.83-2-.22-.53-.45-.46-.62-.47-.16-.01-.34-.01-.53-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.35.97 2.65 1.1 2.83.14.18 1.86 2.84 4.51 3.87 2.65 1.03 2.65.69 3.12.65.47-.04 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.29z" fill={SILVER}/></svg>
        Hubungi via WhatsApp
      </a>
    </div>
  );
}

// ─── DETAIL PAGE ─────────────────────────────────────────────────────────────
function DetailPage({ car, onBack, onCheckoutSubmit }) {
  const [tab, setTab] = useState("galeri");
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ padding: "100px clamp(16px, 4vw, 48px) 0", maxWidth: 1200, margin: "0 auto", boxSizing: "border-box" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>← Kembali ke Katalog</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ color: GOLD, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{car.brand} · {car.type} · {car.year}</div>
            <h1 style={{ color: "#fff", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{car.model}</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <StatusBadge status={car.status} />
            <div style={{ color: GOLD, fontSize: 28, fontWeight: 800, marginTop: 8 }}>{fmt(car.price)}</div>
          </div>
        </div>

        <div className="zm-grid-detail" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 32, marginBottom: 40 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #2a2a2a" }}>
              {[["galeri", "📷 Galeri Foto"], ["inspeksi", "🔍 Laporan Inspeksi"], ["spesifikasi", "📋 Spesifikasi"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)} style={{ padding: "12px 18px", background: "none", border: "none", borderBottom: `2.5px solid ${tab === key ? GOLD : "transparent"}`, color: tab === key ? GOLD : "#777", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "galeri" && <Gallery images={car.images} />}
            {tab === "inspeksi" && <InspectionReport inspection={car.inspection} />}
            {tab === "spesifikasi" && (
              <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28 }}>
                {[["Merek", car.brand], ["Model", car.model], ["Tipe Bodi", car.type], ["Tahun", car.year], ["Kilometer", `${car.km.toLocaleString("id-ID")} km`], ["Warna", car.color], ["Transmisi", car.transmission], ["Bahan Bakar", car.fuel], ["No. Rangka", car.noRangka], ["No. Mesin", car.noMesin]].map(([label, val], i) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: i < 9 ? "1px solid #2a2a2a" : "none" }}>
                    <span style={{ color: "#777", fontSize: 13.5 }}>{label}</span>
                    <span style={{ color: "#e5e5e5", fontSize: 13.5, fontWeight: 600, textTransform: "uppercase" }}>{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <MiniKredit price={car.price} carName={`${car.brand} ${car.model}`} />
            {car.status !== "Terjual" ? (
              <InstantCheckout car={car} onSubmit={onCheckoutSubmit} />
            ) : (
              <div style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 12, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
                <div style={{ color: "#999", fontSize: 14 }}>Unit ini sudah terjual</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#080808", borderTop: "1px solid #1a1a1a", padding: "48px 48px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src="/zahramobil/logo.png" alt="Zahra Mobil" style={{ height: 32, width: "auto", objectFit: "contain" }} />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>ZAHRA <span style={{ color: GOLD }}>MOBIL</span></span>
            </div>
            <p style={{ color: "#555", fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>Dealer mobil bekas terpercaya dengan inspeksi 150+ titik dan jaminan transparansi penuh.</p>
          </div>
          {[["Layanan", ["Beli & Kirim ke Rumah", "Laporan Inspeksi Digital", "Konsultasi via WhatsApp", "Ajukan Leasing"]], ["Kontak", ["📍 Jl. Dr. Mr. Mohd Hasan, Batoh, Kec. Lueng Bata, Kota Banda Aceh", "💬 0811-6707-099"]]].map(([title, items]) => (
            <div key={title}>
              <div style={{ color: GOLD, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>{title}</div>
              {items.map(item => <div key={item} style={{ color: "#666", fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{item}</div>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ color: "#333", fontSize: 12 }}>©2026 SRISP. All rights reserved.</span>
          <span style={{ color: "#333", fontSize: 12 }}>Powered by Firebase × Next.js</span>
        </div>
      </div>
    </footer>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function ZahraMobilGuest({ onToggleTheme }) {
  const [page, setPage] = useState("home");
  const [selectedCar, setSelectedCar] = useState(null);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cars"), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, ...d, inspection: d.inspection || genInspection(1) };
      });
      setCars(data);
      setLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data mobil:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const viewDetail = (car) => { setSelectedCar(car); setPage("detail"); window.scrollTo(0, 0); };
  const backHome = () => { setPage("home"); setTimeout(() => document.getElementById("katalog")?.scrollIntoView(), 50); };
  const goHome = () => { setPage("home"); window.scrollTo(0, 0); };

  const handleCheckout = async (data) => {
    try {
      await addDoc(collection(db, "orders"), {
        ...data,
        stage: "Pesanan Baru",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Gagal mengirim pesanan:", error);
      alert("Maaf, pesanan gagal terkirim. Silakan coba lagi atau hubungi kami via WhatsApp.");
    }
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", color: "#f5f5f5", overflowX: "hidden", width: "100%", maxWidth: "100vw", boxSizing: "border-box" }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        img { max-width: 100%; }
        @media (max-width: 760px) {
          .zm-grid-detail { grid-template-columns: 1fr !important; }
          .zm-grid-2col { grid-template-columns: 1fr !important; }
          .zm-grid-catalog { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .zm-grid-inspect { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 561px) and (max-width: 760px) {
          .zm-grid-catalog { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <Navbar onNav={goHome} onToggleTheme={onToggleTheme} />
      {loading ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0a0a" }}>
          <div style={{ position: "relative", width: 96, height: 96, marginBottom: 24 }}>
            <div style={{ position: "absolute", inset: 0, border: `3px solid ${SILVER}22`, borderTopColor: SILVER, borderRadius: "50%", animation: "zmSpin 1s linear infinite" }} />
            <img src="/zahramobil/logo.png" alt="Zahra Mobil" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "56%", height: "auto", animation: "zmPulse 1.6s ease-in-out infinite" }} />
          </div>
          <div style={{ color: SILVER, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, animation: "zmFadeInOut 1.8s ease-in-out infinite" }}>Memuat Showroom...</div>
          <style>{`
            @keyframes zmSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes zmPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.85; } }
            @keyframes zmFadeInOut { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
          `}</style>
        </div>
      ) : page === "home" ? (
        <>
          <HeroSlider cars={cars} onSelectCar={viewDetail} />
          <CatalogSection cars={cars} onView={viewDetail} />
          <Footer />
        </>
      ) : (
        <>
          <DetailPage car={selectedCar} onBack={backHome} onCheckoutSubmit={handleCheckout} />
          <Footer />
        </>
      )}
      <a href="https://wa.me/628116707099" target="_blank" rel="noreferrer" aria-label="Hubungi via WhatsApp" style={{ position: "fixed", bottom: 28, right: 28, zIndex: 999, width: 54, height: 54, background: "#161616", border: `1px solid ${SILVER}55`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", textDecoration: "none", transition: "border-color 0.2s" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.07L2 22l5.07-1.33A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.1-.43-4.4-1.18l-.32-.19-3.26.85.87-3.18-.21-.33A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" fill={SILVER}/>
          <path d="M16.5 13.3c-.25-.13-1.47-.72-1.7-.8-.23-.08-.4-.13-.56.13-.17.25-.65.8-.8.97-.15.17-.3.18-.55.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.13-.13.29-.32.43-.49.14-.17.19-.3.29-.48.1-.18.05-.34-.02-.48-.07-.13-.6-1.46-.83-2-.22-.53-.45-.46-.62-.47-.16-.01-.34-.01-.53-.01-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.35.97 2.65 1.1 2.83.14.18 1.86 2.84 4.51 3.87 2.65 1.03 2.65.69 3.12.65.47-.04 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.29z" fill={SILVER}/>
        </svg>
      </a>
    </div>
  );
}
