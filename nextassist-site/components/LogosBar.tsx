const BRANDS = [
  "iPhone", "Samsung", "Motorola", "Xiaomi", "LG", "Positivo",
];

export default function LogosBar() {
  return (
    <div className="logos-bar">
      <p>Usado por assistências que consertam</p>
      <div className="logos-list">
        {BRANDS.map((b) => (
          <span key={b} className="logo-badge">
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
