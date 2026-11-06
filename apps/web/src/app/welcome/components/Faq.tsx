"use client";

import { useState } from "react";
import { CONTENT } from "../lib/content";

/** FAQ (§5): six questions, accessible expand/collapse controls. */
export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="section" id="faq" aria-labelledby="faq-heading">
      <div className="container">
        <p className="eyebrow">Questions</p>
        <h2 id="faq-heading">Frequently asked questions</h2>
        <div className="faq-list">
          {CONTENT.faq.map((item, index) => {
            const open = openIndex === index;
            return (
              <div className="faq-item" key={item.q} data-open={open}>
                <h3 style={{ margin: 0 }}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpenIndex(open ? null : index)}
                  >
                    {item.q}
                    <span className="faq-item__icon" aria-hidden="true">+</span>
                  </button>
                </h3>
                {open ? (
                  <div
                    className="faq-item__answer"
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-button-${index}`}
                  >
                    <p>{item.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
