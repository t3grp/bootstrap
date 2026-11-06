"use client";

import { useEffect, useRef, useState } from "react";
import { LINKS, NAV } from "../lib/links";
import { CONTENT } from "../lib/content";

/** Sticky marketing header: wordmark, anchored nav, development status, GitHub action. */
export function Header() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open && wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Escape closes the menu wherever focus sits (button or a menu link).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="wordmark" href="#top" aria-label="Bootstrap — back to top">
            <span className="wordmark__mark" aria-hidden="true">B</span>
            {CONTENT.header.wordmark}
          </a>
          <span className="status-pill">
            <span className="status-pill__dot" aria-hidden="true" />
            {CONTENT.header.status}
          </span>
          <nav className="site-nav" aria-label="Sections">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
          </nav>
          <a className="btn btn--secondary btn--small header__github" href={LINKS.github}>
            {CONTENT.header.githubLabel}
          </a>
          <button
            ref={buttonRef}
            type="button"
            className="menu-button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>
      {open ? (
        <nav
          id="mobile-menu"
          className="mobile-menu"
          aria-label="Sections"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a href={LINKS.github} onClick={() => setOpen(false)}>
            {CONTENT.header.githubLabel}
          </a>
        </nav>
      ) : null}
    </>
  );
}
