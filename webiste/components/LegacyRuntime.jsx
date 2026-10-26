"use client";

import { useEffect } from "react";

function appendScript(script) {
  return new Promise((resolve) => {
    const element = document.createElement("script");

    if (script.id) element.id = script.id;
    if (script.type) element.type = script.type;

    if (script.src) {
      element.async = false;
      element.src = script.src;
      element.addEventListener("load", () => resolve(element), { once: true });
      element.addEventListener("error", () => resolve(element), { once: true });
    } else {
      element.text = script.content || "";
    }

    document.body.appendChild(element);
    if (!script.src) resolve(element);
  });
}

export default function LegacyRuntime({ bodyClass, bodyStyle, scripts }) {
  useEffect(() => {
    const originalClassName = document.body.className;
    const originalStyles = new Map();
    const mountedScripts = [];
    let cancelled = false;

    document.body.className = [originalClassName, bodyClass]
      .filter(Boolean)
      .join(" ");

    Object.entries(bodyStyle || {}).forEach(([property, value]) => {
      originalStyles.set(property, document.body.style.getPropertyValue(property));
      document.body.style.setProperty(property, value);
    });

    document.getElementById("preloader")?.remove();

    async function initialize() {
      for (const script of scripts) {
        if (cancelled) return;
        const element = await appendScript(script);
        if (element) mountedScripts.push(element);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      mountedScripts.forEach((script) => script.remove());
      document.body.className = originalClassName;
      originalStyles.forEach((value, property) => {
        if (value) document.body.style.setProperty(property, value);
        else document.body.style.removeProperty(property);
      });
    };
  }, [bodyClass, bodyStyle, scripts]);

  return null;
}
