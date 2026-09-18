import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountHeroFunnel } from "./components/hero-funnel";

gsap.registerPlugin(ScrollTrigger);

// Decorative only: must never block the rest of the page's interactivity.
// Starts just after the hero CTA buttons begin fading in (their own reveal
// delay is 240ms), rather than mounting instantly alongside the headline, or
// waiting for their whole fade transition (~900ms) to finish first, which
// stacked with the chart's own entrance animation felt sluggish.
function mountHeroFunnelSafely() {
  try {
    mountHeroFunnel();
  } catch (err) {
    console.error("Hero funnel chart failed to mount:", err);
  }
}

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  mountHeroFunnelSafely();
} else {
  window.setTimeout(mountHeroFunnelSafely, 350);
}

// ---- Hero chart scroll-collapse -------------------------------------------
// As the hero scrolls past, only the chart's bars compress toward a
// horizontal centerline and fade — the percentage/stage-name labels are
// separate elements and are left alone so the text never gets squished.
const heroSection = document.querySelector<HTMLElement>("[data-hero]");
if (heroSection && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  // The bars only exist once the chart's own ResizeObserver has measured its
  // container and React has committed the real markup, so wait for it.
  const setupBarsCollapse = (bars: HTMLElement) => {
    gsap.set(bars, { transformOrigin: "center center" });
    gsap.to(bars, {
      scaleY: 0.1,
      opacity: 0.15,
      ease: "none",
      scrollTrigger: {
        trigger: heroSection,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  };

  const existingBars = document.querySelector<HTMLElement>("[data-funnel-bars]");
  if (existingBars) {
    setupBarsCollapse(existingBars);
  } else {
    const mo = new MutationObserver(() => {
      const bars = document.querySelector<HTMLElement>("[data-funnel-bars]");
      if (bars) {
        mo.disconnect();
        setupBarsCollapse(bars);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // Stop watching after a reasonable window in case the chart never mounts.
    window.setTimeout(() => mo.disconnect(), 5000);
  }
}

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
      const line = methodSeq.querySelector<HTMLElement>(".seq-line");

      // Mirror the CSS hidden states inline so GSAP starts from known values.
      gsap.set(dots, { opacity: 0, scale: 0.6 });
      gsap.set(texts, { opacity: 0, y: 16 });
      gsap.set(arrows, { clipPath: "inset(0 100% 0 0)" });
      gsap.set(outs, { opacity: 0, y: 10 });
      if (line) gsap.set(line, { scaleY: 0, transformOrigin: "top" });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: methodSeq, start: "top 70%", once: true },
      });

      if (line) tl.to(line, { scaleY: 1, duration: 1.3, ease: "none" }, 0);
      tl.to(dots, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", stagger: 0.28 }, 0);
      tl.to(texts, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.28 }, 0.1);

      tl.addLabel("arrows", ">-0.25");
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
const navToggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
const navMenu = document.querySelector<HTMLElement>("[data-nav-menu]");
const navLines = document.querySelectorAll<HTMLElement>("[data-nav-line]");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const open = navMenu.dataset.open === "true";
    navMenu.dataset.open = open ? "false" : "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    if (navLines[0] && navLines[1]) {
      if (!open) {
        gsap.to(navLines[0], { rotate: 45, y: 6, duration: 0.4, ease: "power3.out" });
        gsap.to(navLines[1], { rotate: -45, y: -6, duration: 0.4, ease: "power3.out" });
      } else {
        gsap.to(navLines, { rotate: 0, y: 0, duration: 0.4, ease: "power3.out" });
      }
    }
    document.body.style.overflow = open ? "" : "hidden";
  });

  navMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      navMenu.dataset.open = "false";
      navToggle.setAttribute("aria-expanded", "false");
      gsap.to(navLines, { rotate: 0, y: 0, duration: 0.3 });
      document.body.style.overflow = "";
    })
  );
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
  revealEls.forEach((el) => io.observe(el));

  // Safety net: if an element is somehow never intersected (e.g. a section
  // shorter than the 15% threshold never gets scrolled past), don't leave it
  // permanently invisible.
  window.setTimeout(() => {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }, 4000);
} else {
  revealEls.forEach((el) => el.classList.add("is-visible"));
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

// ---- Count-up stats --------------------------------------------------------
const statEls = document.querySelectorAll<HTMLElement>("[data-count-to]");
if (statEls.length && "IntersectionObserver" in window) {
  const statIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const to = Number(el.dataset.countTo);
        const suffix = el.dataset.suffix ?? "";
        const counter = { val: 0 };
        gsap.to(counter, {
          val: to,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(counter.val).toString() + suffix;
          },
        });
        statIo.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );
  statEls.forEach((el) => statIo.observe(el));
}

// ---- Testimonial carousel -------------------------------------------------
const track = document.querySelector<HTMLElement>("[data-quote-track]");
if (track) {
  const slides = Array.from(track.children) as HTMLElement[];
  const dots = document.querySelectorAll<HTMLElement>("[data-quote-dot]");
  let index = 0;
  const go = (i: number) => {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.setAttribute("data-active", String(di === index)));
  };
  document.querySelector("[data-quote-prev]")?.addEventListener("click", () => go(index - 1));
  document.querySelector("[data-quote-next]")?.addEventListener("click", () => go(index + 1));
  dots.forEach((d, di) => d.addEventListener("click", () => go(di)));
  let auto = setInterval(() => go(index + 1), 7000);
  track.closest("[data-quote-widget]")?.addEventListener("mouseenter", () => clearInterval(auto));
  track.closest("[data-quote-widget]")?.addEventListener("mouseleave", () => {
    auto = setInterval(() => go(index + 1), 7000);
  });
}

// ---- Sticky nav shrink -----------------------------------------------------
const navRoot = document.querySelector<HTMLElement>("[data-nav-root]");
if (navRoot) {
  let lastY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      navRoot.dataset.scrolled = String(y > 24);
      lastY = y;
    },
    { passive: true }
  );
}
