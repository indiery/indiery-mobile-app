import Image from "next/image";

export default function Logo({ light = false }) {
  return (
    <a href="/" className={`logo ${light ? "logo-light" : ""}`} aria-label="Indiery home" style={{ display: "inline-flex", alignItems: "center" }}>
      <Image
        src={light ? "/indiery-official-logo-white.png" : "/indiery-brand-logo.png"}
        alt="Indiery"
        width={150}
        height={40}
        priority
        style={{ height: "36px", width: "auto", objectFit: "contain" }}
      />
    </a>
  );
}
