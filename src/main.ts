import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountHeroFunnel } from "./components/hero-funnel";

gsap.registerPlugin(ScrollTrigger);

// Decorative only: must never block the rest of the page's interactivity.
// Order in the hero: buttons fade in, then the glass panel grows from its
// center, and only once it has finished does the chart mount and animate.
let heroFunnelMounted = false;
function mountHeroFunnelSafely() {
  if (heroFunnelMounted) return;
  heroFunnelMounted = true;
  try {
    mountHeroFunnel();
  } catch (err) {
    console.error("Hero funnel chart failed to mount:", err);
  }
}

const heroPanel = document.querySelector<HTMLElement>("[data-hero-panel]");
if (!heroPanel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  if (heroPanel) document.documentElement.classList.add("seq-off");
  mountHeroFunnelSafely();
} else {
  // Grows from nothing (scale 0) at its center, quickly.
  gsap.set(heroPanel, { scale: 0 });
  gsap.to(heroPanel, {
    scale: 1,
    duration: 0.4,
    delay: 0.8,
    ease: "power3.out",
    onComplete: mountHeroFunnelSafely,
  });
  // Safety net in case the tween never completes.
  window.setTimeout(mountHeroFunnelSafely, 3000);
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

// ---- Our offer intro --------------------------------------------------------
// Heading rises in, the three cards are revealed bottom-to-top one after
// another, then their content fades up.
const offerSection = document.querySelector<HTMLElement>("[data-offer]");
if (offerSection) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("seq-off");
  } else {
    try {
      const heads = Array.from(offerSection.querySelectorAll<HTMLElement>(".off-head"));
      const cards = Array.from(offerSection.querySelectorAll<HTMLElement>(".off-card"));
      const ins = Array.from(offerSection.querySelectorAll<HTMLElement>(".off-in"));
      const hiddenClip = "inset(100% 0px 0px 0px round 1.75rem)";
      const shownClip = "inset(0% 0px 0px 0px round 1.75rem)";

      gsap.set(heads, { opacity: 0, y: 24 });
      gsap.set(cards, { clipPath: hiddenClip });
      gsap.set(ins, { opacity: 0, y: 14 });

      gsap
        .timeline({
          scrollTrigger: { trigger: offerSection, start: "top 70%", once: true },
          onComplete: () => {
            offerSection.classList.add("off-done");
            gsap.set([...heads, ...cards, ...ins], { clearProps: "opacity,transform,clipPath" });
          },
        })
        .to(heads, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.12 }, 0)
        .to(cards, { clipPath: shownClip, duration: 0.8, ease: "power3.inOut", stagger: 0.15 }, 0.25)
        .to(ins, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.06 }, ">-0.4");
    } catch (err) {
      console.error("Offer intro failed, showing content statically:", err);
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
