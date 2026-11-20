(() => {
  const targets = document.querySelectorAll("[data-reveal]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parallaxElements = document.querySelectorAll("[data-parallax]");

  if (!prefersReducedMotion && parallaxElements.length > 0) {
    let animationFrame = 0;
    const updateParallax = () => {
      animationFrame = 0;
      const viewportCenter = window.innerHeight / 2;
      const strength = window.innerWidth <= 620 ? 0.04 : 0.08;
      const maximumOffset = window.innerWidth <= 620 ? 16 : 28;

      parallaxElements.forEach((element) => {
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom < 0 || bounds.top > window.innerHeight) return;
        const distanceFromCenter = bounds.top + bounds.height / 2 - viewportCenter;
        const offset = Math.max(-maximumOffset, Math.min(maximumOffset, -distanceFromCenter * strength));
        element.style.setProperty("--parallax-offset", `${Math.round(offset)}px`);
      });
    };
    const scheduleParallaxUpdate = () => {
      if (animationFrame === 0) animationFrame = window.requestAnimationFrame(updateParallax);
    };

    window.addEventListener("scroll", scheduleParallaxUpdate, { passive: true });
    window.addEventListener("resize", scheduleParallaxUpdate);
    scheduleParallaxUpdate();
  }

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-revealed"));
    return;
  }

  document.documentElement.classList.add("scroll-reveal-ready");
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

  targets.forEach((target) => observer.observe(target));
})();
