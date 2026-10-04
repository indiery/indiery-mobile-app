import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import LegacyRuntime from "./LegacyRuntime";

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

  for (const [file, route] of Object.entries(ROUTES)) {
    normalized = normalized.replace(
      new RegExp(`(["'])${file.replace(".", "\\.")}([#?][^"']*)?(["'])`, "g"),
      (_, opening, suffix = "", closing) =>
        `${opening}${route}${suffix}${closing}`,
    );
  }

  return normalized;
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
      body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ""),
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
