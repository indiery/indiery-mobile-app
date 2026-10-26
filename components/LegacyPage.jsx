import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import LegacyRuntime from "./LegacyRuntime";
import SiteHeader from "./SiteHeader";

const LEGACY_DIRECTORY = path.join(process.cwd(), "legacy-html");

const ROUTES = {
  "index.html": "/",
  "about.html": "/about",
  "services.html": "/services",
  "pricing.html": "/pricing",
  "contact.html": "/contact",
  "blog.html": "/blog",
  "faq.html": "/faq",
  "team.html": "/team",
  "tanspot_index.html": "/transport",
};

const ACTIVE_NAV_BY_SOURCE = {
  "index.html": "home",
  "about.html": "about",
  "services.html": "services",
  "pricing.html": "packages",
  "contact.html": "contact",
};

const GENERATED_ASSET_ROOT = "/assets/generated";

const LEGACY_IMAGE_REPLACEMENTS = [
  {
    files: ["about_img01.png", "inner_about_img01.jpg", "choose_img01.jpg"],
    src: `${GENERATED_ASSET_ROOT}/indiery-platform-ecosystem-v2.webp`,
    alt: "Indiery local delivery and moving services",
  },
  {
    files: ["about_img02.png", "services_img09.jpg", "project_img07.jpg", "blog_img03.jpg"],
    src: `${GENERATED_ASSET_ROOT}/indiery-home-shifting-v2.webp`,
    alt: "Indiery household shifting with a mini truck",
  },
  {
    files: ["about_img03.png", "services_img02-2.jpg", "project_img05.jpg"],
    src: `${GENERATED_ASSET_ROOT}/indiery-bike-delivery-v2.webp`,
    alt: "Indiery two-wheeler parcel delivery",
  },
  {
    files: ["services_img06-1.jpg", "project_img06.jpg", "blog_img01.jpg"],
    src: `${GENERATED_ASSET_ROOT}/indiery-business-delivery-v2.webp`,
    alt: "Indiery delivery for local businesses",
  },
  {
    files: ["services_img08.jpg", "project_img08.jpg", "blog_img02.jpg"],
    src: `${GENERATED_ASSET_ROOT}/indiery-live-tracking-v2.webp`,
    alt: "Live delivery tracking in the Indiery app",
  },
  {
    files: [
      "inner_about_img02.jpg",
      "services_img07.jpg",
      "team_img01.png",
      "team_img02.png",
      "team_img03.png",
      "team_img04.png",
    ],
    src: `${GENERATED_ASSET_ROOT}/indiery-driver-team-v2.webp`,
    alt: "Indiery delivery partners and operations team",
  },
];

function readLegacyFile(source) {
  return fs.readFileSync(path.join(LEGACY_DIRECTORY, source), "utf8");
}

function decodeAttribute(value = "") {
  return value
    .replaceAll("&#038;", "&")
    .replaceAll("&amp;", "&")
    .replaceAll("&#8211;", "–")
    .replaceAll("&#8217;", "’");
}

function normalizeReferences(markup) {
  let normalized = markup.replace(/(["'(])assets\//g, "$1/assets/");

  normalized = normalized.replaceAll(
    "/achieved_img_indiery.png",
    `${GENERATED_ASSET_ROOT}/indiery-live-tracking-v2.webp`,
  );
  normalized = normalized.replaceAll(
    "/banner_img01_indiery.png",
    `${GENERATED_ASSET_ROOT}/indiery-hero-local-fleet-v3.png`,
  );
  normalized = normalized.replaceAll(
    "/banner_img02_indiery.png",
    `${GENERATED_ASSET_ROOT}/indiery-local-fleet-cutout-v2.png`,
  );
  normalized = normalized.replaceAll(
    "Purple Indiery shipping container suspended by crane cables",
    "Indiery scooter, mini truck, parcels, and live tracking app",
  );

  const serviceIcons = {
    '<i class="logistex-truck"></i>':
      '<span class="indiery-service-emoji" aria-hidden="true">🛵</span>',
    '<i class="logistex-warehouse"></i>':
      '<span class="indiery-service-emoji" aria-hidden="true">🚚</span>',
    '<i class="logistex-air-freight"></i>':
      '<span class="indiery-service-emoji" aria-hidden="true">📦</span>',
    '<i class="logistex-delivery-man"></i>':
      '<span class="indiery-service-emoji" aria-hidden="true">🏠</span>',
  };

  for (const [legacyIcon, indieryIcon] of Object.entries(serviceIcons)) {
    normalized = normalized.replaceAll(legacyIcon, indieryIcon);
  }

  for (const [file, route] of Object.entries(ROUTES)) {
    normalized = normalized.replace(
      new RegExp(`(["'])${file.replace(".", "\\.")}([#?][^"']*)?(["'])`, "g"),
      (_, opening, suffix = "", closing) =>
        `${opening}${route}${suffix}${closing}`,
    );
  }

  normalized = normalized.replace(
    /https:\/\/logistra\.themeadapt\.com\/wp-content\/themes\/logistra\/assets\/img\/bg\/breadcrumb_bg\.webp/g,
    `${GENERATED_ASSET_ROOT}/indiery-local-city-banner-v2.webp`,
  );

  normalized = normalized.replace(/<img\b[^>]*>/gi, (tag) => {
    const replacement = LEGACY_IMAGE_REPLACEMENTS.find(({ files }) =>
      files.some((file) => tag.includes(file)),
    );

    if (!replacement) {
      return tag;
    }

    let updated = tag
      .replace(/\s+srcset\s*=\s*(["'])[\s\S]*?\1/i, "")
      .replace(/\s+sizes\s*=\s*(["'])[\s\S]*?\1/i, "")
      .replace(/\bsrc\s*=\s*(["'])[\s\S]*?\1/i, `src="${replacement.src}"`);

    if (/\balt\s*=/i.test(updated)) {
      updated = updated.replace(
        /\balt\s*=\s*(["'])[\s\S]*?\1/i,
        `alt="${replacement.alt}"`,
      );
    } else {
      updated = updated.replace(/\s*\/>$/, ` alt="${replacement.alt}" />`);
    }

    return updated;
  });

  return normalized;
}

function removeLegacyHeader(markup) {
  return markup.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, "");
}

function removeLegacyBranding(markup) {
  return markup
    .replace(/<img\b[^>]*brand_img0[1-6]\.png[^>]*>/gi, "")
    .replace(
      /<img\b[^>]*(?:about_shape|services_shape0[1-2]|achieved_shape|testimonial_shape)\.(?:png|webp)[^>]*>/gi,
      "",
    )
    .replaceAll("swiper brand-active fix", "swiper fix");
}

function getAttribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"),
  );
  return match ? decodeAttribute(match[2]) : "";
}

function parseBodyStyle(value) {
  return Object.fromEntries(
    value
      .split(";")
      .map((declaration) => declaration.split(":"))
      .filter(([property, ...parts]) => property?.trim() && parts.length)
      .map(([property, ...parts]) => [property.trim(), parts.join(":").trim()]),
  );
}

function parseLegacyDocument(source) {
  const document = readLegacyFile(source);
  const head = document.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
  const bodyMatch = document.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  const bodyAttributes = bodyMatch?.[1] || "";
  const body = bodyMatch?.[2] || "";

  const headStyles = Array.from(
    head.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>|<link\b[^>]*>/gi),
    (match) => match[0],
  )
    .filter(
      (tag) =>
        tag.startsWith("<style") ||
        /rel=["'][^"']*stylesheet/i.test(tag),
    )
    .join("\n");

  const scripts = Array.from(
    document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi),
    (match, index) => ({
      id: getAttribute(match[1], "id") || `legacy-script-${source}-${index}`,
      src: getAttribute(match[1], "src"),
      type: getAttribute(match[1], "type"),
      content: match[2],
    }),
  );

  return {
    bodyClass: getAttribute(bodyAttributes, "class"),
    bodyStyle: parseBodyStyle(getAttribute(bodyAttributes, "style")),
    headStyles: normalizeReferences(headStyles),
    markup: normalizeReferences(
      removeLegacyHeader(
        removeLegacyBranding(
          body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""),
        ),
      ),
    ),
    scripts,
  };
}

export function getLegacyMetadata(source) {
  const document = readLegacyFile(source);
  const title = document.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const description = document.match(
    /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i,
  )?.[1];

  return {
    title: {
      absolute: title
        ? decodeAttribute(title).replace(/\s+/g, " ").trim()
        : "Indiery",
    },
    description: description
      ? decodeAttribute(description).replace(/\s+/g, " ").trim()
      : "On-demand delivery and shifting services from Indiery.",
  };
}

export default function LegacyPage({ source }) {
  const page = parseLegacyDocument(source);

  return (
    <>
      <div
        className="legacy-head"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: page.headStyles }}
      />
      <SiteHeader active={ACTIVE_NAV_BY_SOURCE[source] || ""} />
      <div
        className={`legacy-document ${page.bodyClass}`}
        style={page.bodyStyle}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: page.markup }}
      />
      <nav className="indieryLegalBar" aria-label="Legal and policy links">
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/terms">Customer Terms</Link>
        <Link href="/partner-privacy">Partner Privacy</Link>
        <Link href="/partner-terms">Partner Terms</Link>
        <Link href="/refunds">Refunds &amp; Cancellations</Link>
        <Link href="/account-deletion">Account Deletion</Link>
      </nav>
      <LegacyRuntime
        bodyClass={page.bodyClass}
        bodyStyle={page.bodyStyle}
        scripts={page.scripts}
      />
    </>
  );
}
