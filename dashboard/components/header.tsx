const NAV = ["Index", "Models", "Methodology", "Changelog"];

export function Header() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-6 shrink-0"
      style={{
        height: 56,
        background: "#000",
        borderBottom: "1px solid #05260F",
        boxShadow: "0 1px 0 #05260F, 0 8px 24px rgba(0,0,0,0.6)",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="logo-mark">TX</span>
        <span
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-bricolage), sans-serif", color: "#00FF41" }}
        >
          TOKENIX
        </span>
      </div>

      {/* Hidden on mobile, visible md+ */}
      <nav className="hidden md:flex items-center">
        {NAV.map((label, i) => (
          <a key={label} href="#" className={`nav-link${i === 0 ? " active" : ""}`}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
