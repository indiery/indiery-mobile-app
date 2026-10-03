export default function Logo({ light = false }) {
  return (
    <a href="/" className={`logo ${light ? "logo-light" : ""}`} aria-label="Indiery home">
      <svg viewBox="0 0 52 58" role="img" aria-label="Indiery location globe mark">
        <path d="M26 2C14.4 2 5 11.2 5 22.5 5 37.2 26 55 26 55s21-17.8 21-32.5C47 11.2 37.6 2 26 2Z" fill="currentColor" />
        <circle cx="26" cy="22" r="11.3" fill="none" stroke="var(--logo-cutout, #fff)" strokeWidth="2.4" />
        <path d="M14.8 22h22.4M26 10.7c4 4.2 4 18.4 0 22.6M26 10.7c-4 4.2-4 18.4 0 22.6M17.2 15.4h17.6M17.2 28.6h17.6" fill="none" stroke="var(--logo-cutout, #fff)" strokeWidth="1.55" />
        <path d="M8.5 9.5H2.5M10.5 5.5 7 2M8 14 3.5 17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span>indiery</span>
    </a>
  );
}
