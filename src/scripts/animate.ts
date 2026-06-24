/*
 * Site motion — GSAP entrance, scroll reveals, the tape-label "peel", and one
 * restrained hover micro-interaction. Intensity is deliberately balanced:
 * short durations and small offsets, in keeping with a senior-engineer
 * portfolio that's tactile but not flashy.
 *
 * Reduced-motion / no-JS safety: the initial hidden states live in global.css
 * under `.anim-ready`, a class added pre-paint by BaseLayout's inline script
 * ONLY when the user allows motion. So reduced-motion and no-JS visitors never
 * hide anything. If this module throws, we drop the gate and reveal everything.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Eases chosen to echo the design tokens: power3.out ≈ --ease-out, and
// back.out ≈ --ease-snap, the overshoot used for stamped/pressed elements.
const EASE_OUT = 'power3.out';
const EASE_SNAP = 'back.out(1.6)';

function init() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // ---- Hero: a staggered rise on load (eyebrow → h1 → … → actions). ----
  const heroChildren = gsap.utils.toArray<HTMLElement>('[data-anim="hero"] > *');
  if (heroChildren.length) {
    gsap.set(heroChildren, { y: 12 });
    gsap.to(heroChildren, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: EASE_OUT,
      stagger: 0.08,
      delay: 0.1,
    });
  }

  // ---- Scroll reveals: rise + fade once, gently staggered per batch. ----
  const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  gsap.set(reveals, { y: 16 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 85%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: EASE_OUT,
        stagger: 0.1,
      }),
  });

  // ---- Signature: tape labels peel + press into their hand-stuck −2°. ----
  gsap.utils.toArray<HTMLElement>('.bw-tape').forEach((tape) => {
    gsap.fromTo(
      tape,
      { opacity: 0, scale: 0.6, rotation: 8 },
      {
        opacity: 1,
        scale: 1,
        rotation: -2, // settle into the CSS rotate(-2deg)
        duration: 0.55,
        ease: EASE_SNAP,
        clearProps: 'transform', // hand control back to CSS (hover, etc.)
        scrollTrigger: { trigger: tape, start: 'top 88%', once: true },
      },
    );
  });
}

try {
  init();
} catch (error) {
  // Never let a motion bug hide the page: drop the gate so CSS reveals all.
  document.documentElement.classList.remove('anim-ready');
  console.error('[animate] disabled after error:', error);
}
