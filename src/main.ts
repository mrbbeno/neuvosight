import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ---- Method section sequence ------------------------------------------------
// 1) dots 01-04 (with their text) appear one after another, 2) each row's
// arrow wipes in left to right, 3) then that row's output fades in.
const methodSeq = document.querySelector<HTMLElement>("[data-method-seq]");
if (methodSeq) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("seq-off");
  } else {
    try {
      const q = (sel: string) => Array.from(methodSeq.querySelectorAll<HTMLElement>(sel));
      const dots = q(".seq-dot");
      const texts = q(".seq-text");
      const arrows = q(".seq-arrow");
      const outs = q(".seq-out");
      const lines = q(".seq-line");

      // Mirror the CSS hidden states inline so GSAP starts from known values.
      gsap.set(dots, { opacity: 0, scale: 0.6 });
      gsap.set(texts, { opacity: 0, y: 16 });
      gsap.set(arrows, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(outs, { opacity: 0, y: 10 });
      gsap.set(lines, { scaleY: 0, transformOrigin: "top" });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: methodSeq, start: "top 70%", once: true },
      });

      const rowStagger = 0.28;
      tl.to(lines, { scaleY: 1, duration: 0.3, ease: "none", stagger: rowStagger }, 0.3);
      tl.to(dots, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", stagger: rowStagger }, 0);
      tl.to(texts, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: rowStagger }, 0.1);

      // Arrows start as soon as the 3rd dot begins animating.
      tl.addLabel("arrows", 2 * rowStagger);
      arrows.forEach((arrow, i) => {
        const start = i * 0.14;
        tl.to(arrow, { clipPath: "inset(0 0% 0 0)", duration: 0.3, ease: "power2.out" }, `arrows+=${start}`);
        if (outs[i]) {
          tl.to(outs[i], { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, `arrows+=${start + 0.22}`);
        }
      });
    } catch (err) {
      console.error("Method sequence failed, showing content statically:", err);
      document.documentElement.classList.add("seq-off");
    }
  }
}

// ---- Footer year -----------------------------------------------------
document.querySelectorAll<HTMLElement>("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

// ---- Mobile nav --------------------------------------------------------
// The hamburger <-> close icon morph is pure CSS, driven by aria-expanded.
const navToggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
const navMenu = document.querySelector<HTMLElement>("[data-nav-menu]");

if (navToggle && navMenu) {
  const setMenu = (open: boolean) => {
    navMenu.dataset.open = String(open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };

  navToggle.addEventListener("click", () => setMenu(navMenu.dataset.open !== "true"));
  navMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });
}

// ---- Header "Tools" dropdown ---------------------------------------------
// Hover and keyboard focus open it through CSS; a click toggles it too (touch
// laptops), and an outside click or Escape closes it.
const toolsMenu = document.querySelector<HTMLElement>("[data-dropdown]");
if (toolsMenu) {
  const trigger = toolsMenu.querySelector<HTMLButtonElement>("button");
  const setToolsOpen = (open: boolean) => {
    toolsMenu.dataset.open = String(open);
    trigger?.setAttribute("aria-expanded", String(open));
  };
  trigger?.addEventListener("click", () => setToolsOpen(toolsMenu.dataset.open !== "true"));
  toolsMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setToolsOpen(false)));
  document.addEventListener("click", (e) => {
    if (!toolsMenu.contains(e.target as Node)) setToolsOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setToolsOpen(false);
  });
}

// ---- Scroll reveal -------------------------------------------------------
const revealEls = document.querySelectorAll<HTMLElement>(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delaySeconds = Number(el.dataset.delay ?? Math.min(i, 4) * 0.08);
          window.setTimeout(() => el.classList.add("is-visible"), delaySeconds * 1000);
          io.unobserve(el);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => {
    // Elements pinned to the bottom edge of the first screen (e.g. the
    // "Worked alongside" strip) never clear the observer's bottom margin
    // without scrolling, so they are revealed on a timer instead.
    if (el.hasAttribute("data-reveal-immediate")) {
      window.setTimeout(() => el.classList.add("is-visible"), Number(el.dataset.delay ?? 0) * 1000);
    } else {
      io.observe(el);
    }
  });

  // Safety net: if an element is somehow never intersected (e.g. a section
  // shorter than the 15% threshold never gets scrolled past), don't leave it
  // permanently invisible.
  window.setTimeout(() => {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }, 4000);
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// ---- Marquee follows the scroll ---------------------------------------------
// The CSS animation keeps its base speed. Scrolling down speeds it up, scrolling
// up runs it backwards; the extra rate eases back to normal once scrolling stops.
const marqueeTrack = document.querySelector<HTMLElement>(".marquee-track");
const marqueeAnim = marqueeTrack?.getAnimations()[0];
if (marqueeAnim) {
  const period = Number(marqueeAnim.effect?.getComputedTiming().duration ?? 0);
  let extra = 0; // added to the base rate of 1; below -1 the strip runs backwards
  let running = false;
  let prevY = window.scrollY;
  let prevT = performance.now();
  let frameT = prevT;

  const apply = () => {
    const rate = 1 + extra;
    // A looping animation stops applying before time 0, so keep the clock a
    // few periods ahead when running backwards (the loop is seamless).
    if (rate < 0 && period > 0) {
      const t = Number(marqueeAnim.currentTime ?? 0);
      if (t < period * 2) marqueeAnim.currentTime = t + period * 20;
    }
    marqueeAnim.playbackRate = rate;
  };

  const tick = (now: number) => {
    const dt = Math.min(now - frameT, 64);
    frameT = now;
    extra *= Math.exp(-dt / 350);
    if (Math.abs(extra) < 0.02) {
      extra = 0;
      marqueeAnim.playbackRate = 1;
      running = false;
      return;
    }
    apply();
    requestAnimationFrame(tick);
  };

  window.addEventListener(
    "scroll",
    () => {
      const now = performance.now();
      const dy = window.scrollY - prevY;
      const dt = Math.max(now - prevT, 1);
      prevY = window.scrollY;
      prevT = now;
      if (dy === 0) return;
      const b = Math.min((Math.abs(dy) / dt) * 4, 6); // px/s / 250
      const next = dy > 0 ? b : -(2 + b);
      if (Math.sign(next) !== Math.sign(extra) || Math.abs(next) > Math.abs(extra)) extra = next;
      apply();
      if (!running) {
        running = true;
        frameT = now;
        requestAnimationFrame(tick);
      }
    },
    { passive: true }
  );
}

// ---- Accordion (FAQ) -----------------------------------------------------
document.querySelectorAll<HTMLElement>("[data-accordion-item]").forEach((item) => {
  const trigger = item.querySelector<HTMLElement>("[data-accordion-trigger]");
  trigger?.addEventListener("click", () => {
    const isOpen = item.dataset.open === "true";
    item.closest("[data-accordion]")
      ?.querySelectorAll<HTMLElement>("[data-accordion-item]")
      .forEach((other) => {
        if (other !== item) other.dataset.open = "false";
      });
    item.dataset.open = isOpen ? "false" : "true";
  });
});

// ---- KPI section ------------------------------------------------------------
// Tiles are revealed bottom-to-top, the numbers spin in like odometers and the
// unit dots (one per project, pilot, ...) light up. The static markup already
// holds the final values, so nothing depends on this running.
function setupOdometer(el: HTMLElement): () => void {
  const text = el.dataset.odometer ?? "";
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;

  // Column widths follow the final digit so "14" is not spaced like "00".
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
  el.appendChild(probe);
  const widthEm = (ch: string) => {
    probe.textContent = ch;
    return probe.getBoundingClientRect().width / fontSize;
  };

  const visual = document.createElement("span");
  visual.className = "odo";
  visual.setAttribute("aria-hidden", "true");
  const reels: { reel: HTMLElement; digit: number }[] = [];
  const chars: HTMLElement[] = [];

  for (const ch of text) {
    if (/\d/.test(ch)) {
      const col = document.createElement("span");
      col.className = "odo-col";
      col.style.width = `${widthEm(ch)}em`;
      const reel = document.createElement("span");
      reel.className = "odo-reel";
      for (let i = 0; i < 20; i++) {
        const d = document.createElement("span");
        d.className = "odo-digit";
        d.textContent = String(i % 10);
        reel.appendChild(d);
      }
      col.appendChild(reel);
      visual.appendChild(col);
      reels.push({ reel, digit: Number(ch) });
    } else {
      const c = document.createElement("span");
      c.className = "odo-char";
      c.textContent = ch;
      visual.appendChild(c);
      chars.push(c);
    }
  }

  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;
  el.replaceChildren(sr, visual);

  gsap.set(chars, { opacity: 0, yPercent: 30 });
  gsap.set(
    reels.map((r) => r.reel),
    { yPercent: 0 }
  );

  return () => {
    reels.forEach(({ reel, digit }, i) => {
      gsap.to(reel, {
        yPercent: -((10 + digit) / 20) * 100,
        duration: 1.9 + i * 0.4,
        delay: i * 0.08,
        ease: "power4.out",
      });
    });
    gsap.to(chars, { opacity: 1, yPercent: 0, duration: 0.7, delay: 1.1, ease: "power3.out", stagger: 0.1 });
  };
}

function runKpiIntro(kpi: HTMLElement) {
  const tiles = Array.from(kpi.querySelectorAll<HTMLElement>(".k-tile"));
  const ins = Array.from(kpi.querySelectorAll<HTMLElement>(".k-in"));
  const plays = Array.from(kpi.querySelectorAll<HTMLElement>("[data-odometer]")).map(setupOdometer);
  const dotGroups = tiles.map((t) => Array.from(t.querySelectorAll<HTMLElement>(".kdot")));
  const allDots = dotGroups.flat();
  const hiddenClip = "inset(100% 0px 0px 0px round 1.5rem)";
  const shownClip = "inset(0% 0px 0px 0px round 1.5rem)";

  gsap.set(tiles, { clipPath: hiddenClip });
  gsap.set(ins, { opacity: 0, y: 16 });
  gsap.set(allDots, { opacity: 0.18, scale: 0.5 });

  const tl = gsap.timeline({
    scrollTrigger: { trigger: kpi, start: "top 65%", once: true },
    onComplete: () => {
      kpi.classList.add("kpi-done");
      gsap.set([...tiles, ...ins, ...allDots], { clearProps: "opacity,transform,clipPath" });
    },
  });
  tl.to(tiles, { clipPath: shownClip, duration: 0.9, ease: "power3.inOut", stagger: 0.12 }, 0.1)
    .to(ins, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }, 0.6)
    .add(() => plays.forEach((play) => play()), 0.7);
  dotGroups.forEach((dots, i) => {
    tl.to(dots, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)", stagger: { amount: 1.2 } }, 0.9 + i * 0.12);
  });
}

const kpiSection = document.querySelector<HTMLElement>("[data-kpi]");
if (kpiSection) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("seq-off");
  } else {
    let kpiStarted = false;
    // If the fonts never settle, show the section statically instead of hiding it.
    window.setTimeout(() => {
      if (!kpiStarted) kpiSection.classList.add("kpi-done");
    }, 4000);
    document.fonts.ready.then(() => {
      kpiStarted = true;
      try {
        runKpiIntro(kpiSection);
      } catch (err) {
        console.error("KPI intro failed, showing content statically:", err);
        kpiSection.classList.add("kpi-done");
      }
    });
  }
}

// ---- Testimonials -------------------------------------------------------------
// Company tabs (or the arrows) pick the quote; its words rise into place. A
// progress line under the active tab advances to the next quote on its own
// (CSS animation) while the section is on screen.
const quoteWidget = document.querySelector<HTMLElement>("[data-quotes-widget]");
if (quoteWidget) {
  const tabs = Array.from(quoteWidget.querySelectorAll<HTMLElement>("[data-quote-tab]"));
  const panels = Array.from(quoteWidget.querySelectorAll<HTMLElement>("[data-quote-panel]"));
  const counter = quoteWidget.querySelector<HTMLElement>("[data-quote-count]");
  const animateWords = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let started = false;

  // Each quote is split into words that rise out of a mask when it appears.
  const wordSets = panels.map((panel) => {
    const quote = panel.querySelector<HTMLElement>("blockquote");
    if (!quote || !animateWords) return [] as HTMLElement[];
    const words = splitWords(quote);
    gsap.set(words, { yPercent: 115 });
    return words;
  });
  const riseWords = (i: number, delay: number) => {
    const words = wordSets[i];
    if (!words?.length) return;
    gsap.killTweensOf(words);
    gsap.fromTo(
      words,
      { yPercent: 115 },
      { yPercent: 0, duration: 0.9, delay, ease: "power4.out", stagger: 0.02 }
    );
  };

  const show = (i: number, focus = false) => {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((tab, ti) => {
      const on = ti === current;
      tab.dataset.active = String(on);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel, pi) => {
      panel.dataset.active = String(pi === current);
    });
    if (counter) counter.textContent = String(current + 1).padStart(2, "0");
    if (started) riseWords(current, 0.2);
    if (focus) tabs[current].focus();
  };

  tabs.forEach((tab, ti) => {
    tab.addEventListener("click", () => show(ti));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        show(current + 1, true);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        show(current - 1, true);
      }
    });
    // The progress line finishing means it is time for the next quote.
    tab.addEventListener("animationend", () => {
      if (tab.dataset.active === "true") show(current + 1);
    });
  });
  quoteWidget.querySelector("[data-quote-prev]")?.addEventListener("click", () => show(current - 1));
  quoteWidget.querySelector("[data-quote-next]")?.addEventListener("click", () => show(current + 1));

  // Only run the progress line while the widget is visible; the first quote
  // types itself in the first time the widget comes into view.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        quoteWidget.dataset.live = String(entry.isIntersecting);
        if (entry.isIntersecting && !started) {
          started = true;
          riseWords(current, 0.35);
        }
      },
      { threshold: 0.35 }
    ).observe(quoteWidget);
  } else {
    started = true;
    riseWords(current, 0);
  }
}

// ---- Lower sections: masked headings, clip-revealed cards, staggered fades ---
// Headings rise word by word out of a mask, cards open bottom-to-top with their
// content following, everything else fades up in a stagger. Reduced motion (or
// any failure) leaves the markup untouched.
function splitWords(root: HTMLElement): HTMLElement[] {
  const inners: HTMLElement[] = [];
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        (child.textContent ?? "").split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const outer = document.createElement("span");
          outer.className = "sw";
          const inner = document.createElement("span");
          inner.className = "swi";
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
          inners.push(inner);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(root);
  return inners;
}

function splitLetters(root: HTMLElement): HTMLElement[] {
  const text = root.textContent ?? "";
  root.textContent = "";
  return Array.from(text).map((ch) => {
    const span = document.createElement("span");
    span.className = "fm-l";
    span.textContent = ch;
    root.appendChild(span);
    return span;
  });
}

function setupLowerMotion() {
  const qsa = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));

  qsa("[data-split]").forEach((heading) => {
    const words = splitWords(heading);
    gsap.set(words, { yPercent: 115 });
    heading.classList.add("split-ready");
    const delay = Number(heading.dataset.splitDelay ?? 0);
    ScrollTrigger.create({
      trigger: heading,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(words, { yPercent: 0, duration: 1.1, delay, ease: "power4.out", stagger: 0.07, clearProps: "transform" }),
    });
  });

  const fades = qsa("[data-fade]");
  gsap.set(fades, { opacity: 0, y: 32 });
  ScrollTrigger.batch(fades, {
    start: "top 90%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, clearProps: "opacity,transform" }),
  });

  const pops = qsa("[data-pop]");
  gsap.set(pops, { scale: 0 });
  ScrollTrigger.batch(pops, {
    start: "top 92%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, { scale: 1, duration: 0.7, delay: 0.2, ease: "back.out(2.2)", stagger: 0.12, clearProps: "transform" }),
  });

  const hiddenClip = "inset(100% 0px 0px 0px round 1.5rem)";
  const shownClip = "inset(0% 0px 0px 0px round 1.5rem)";
  const clips = qsa("[data-clip]");
  const clipItems = (el: HTMLElement) => {
    const host = el.dataset.clipIn ? el.querySelector<HTMLElement>(el.dataset.clipIn) : el;
    return Array.from(host?.children ?? []) as HTMLElement[];
  };
  clips.forEach((el) => {
    gsap.set(el, { clipPath: hiddenClip });
    gsap.set(clipItems(el), { opacity: 0, y: 24 });
  });
  ScrollTrigger.batch(clips, {
    start: "top 88%",
    once: true,
    onEnter: (els) => {
      (els as HTMLElement[]).forEach((el, i) => {
        const items = clipItems(el);
        gsap
          .timeline({
            delay: i * 0.12,
            onComplete: () => {
              gsap.set([el, ...items], { clearProps: "clipPath,opacity,transform" });
            },
          })
          .to(el, { clipPath: shownClip, duration: 0.9, ease: "power3.inOut" }, 0)
          .add(() => el.classList.add("is-drawn"), 0.3)
          .to(items, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0.35);
      });
    },
  });

  // A list that appears as one block: one trigger, children open in quick succession.
  qsa("[data-cascade]").forEach((group) => {
    const rows = Array.from(group.children) as HTMLElement[];
    rows.forEach((row) => {
      gsap.set(row, { clipPath: hiddenClip });
      gsap.set(Array.from(row.children), { opacity: 0, y: 16 });
    });
    ScrollTrigger.create({
      trigger: group,
      start: "top 85%",
      once: true,
      onEnter: () => {
        rows.forEach((row, i) => {
          const kids = Array.from(row.children) as HTMLElement[];
          gsap
            .timeline({
              delay: i * 0.06,
              onComplete: () => {
                gsap.set([row, ...kids], { clearProps: "clipPath,opacity,transform" });
              },
            })
            .to(row, { clipPath: shownClip, duration: 0.5, ease: "power3.out" }, 0)
            .to(kids, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.08);
        });
      },
    });
  });

  const mark = document.querySelector<HTMLElement>("[data-letters]");
  if (mark) {
    const letters = splitLetters(mark);
    mark.classList.add("is-split");
    gsap.set(letters, { yPercent: 60, opacity: 0 });
    ScrollTrigger.create({
      trigger: mark,
      start: "top 98%",
      once: true,
      onEnter: () =>
        gsap.to(letters, { yPercent: 0, opacity: 1, duration: 1.3, ease: "power4.out", stagger: 0.06, clearProps: "transform,opacity" }),
    });
  }
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("[data-clip]").forEach((el) => el.classList.add("is-drawn"));
  document.querySelectorAll("[data-split]").forEach((el) => el.classList.add("split-ready"));
} else {
  try {
    setupLowerMotion();
  } catch (err) {
    console.error("Lower section motion failed, showing content statically:", err);
    document.querySelectorAll<HTMLElement>("[data-fade],[data-pop],[data-clip],[data-clip] *,[data-split] *,[data-letters] *").forEach((el) => {
      gsap.set(el, { clearProps: "opacity,transform,clipPath" });
    });
    document.querySelectorAll("[data-clip]").forEach((el) => el.classList.add("is-drawn"));
    document.querySelectorAll("[data-split]").forEach((el) => el.classList.add("split-ready"));
  }
}

// ---- Sticky nav -----------------------------------------------------------
const navRoot = document.querySelector<HTMLElement>("[data-nav-root]");
if (navRoot) {
  // Hides when scrolling down, comes back as soon as the user scrolls up.
  let lastY = window.scrollY;
  const update = () => {
    const y = window.scrollY;
    navRoot.dataset.scrolled = String(y > 24);
    const delta = y - lastY;
    if (y <= 80) {
      navRoot.dataset.hidden = "false";
    } else if (delta > 6) {
      navRoot.dataset.hidden = "true";
    } else if (delta < -6) {
      navRoot.dataset.hidden = "false";
    }
    if (Math.abs(delta) > 6) lastY = y;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
}
