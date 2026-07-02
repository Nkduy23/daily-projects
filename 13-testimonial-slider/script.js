"use strict";

// ─── Generic Slider Engine ────────────────────────────────────────────────
class TSlider {
  constructor({ track, prevBtn, nextBtn, dotsEl, total, loop = true, autoplay = false, autoplayMs = 5000 }) {
    this.track = track;
    this.total = total;
    this.loop = loop;
    this.current = 0;
    this.autoplayMs = autoplayMs;
    this._timer = null;

    this._buildDots(dotsEl);

    if (prevBtn) prevBtn.addEventListener("click", () => this.prev());
    if (nextBtn) nextBtn.addEventListener("click", () => this.next());

    // Touch swipe
    this._bindTouch(track?.parentElement || track);

    if (autoplay) this._startAutoplay();
    this._update();
  }

  go(idx) {
    this.current = this.loop ? ((idx % this.total) + this.total) % this.total : Math.max(0, Math.min(this.total - 1, idx));
    this._update();
  }

  next() {
    this.go(this.current + 1);
  }
  prev() {
    this.go(this.current - 1);
  }

  _update() {
    if (this.track) {
      this.track.style.transform = `translateX(-${this.current * 100}%)`;
    }
    this._updateDots();
  }

  _buildDots(el) {
    if (!el) return;
    this._dotsEl = el;
    el.innerHTML = "";
    for (let i = 0; i < this.total; i++) {
      const btn = document.createElement("button");
      btn.className = "dot" + (i === 0 ? " active" : "");
      btn.addEventListener("click", () => this.go(i));
      el.appendChild(btn);
    }
  }

  _updateDots() {
    if (!this._dotsEl) return;
    this._dotsEl.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === this.current));
  }

  _startAutoplay() {
    this._timer = setInterval(() => this.next(), this.autoplayMs);
    // Pause on hover
    const el = this.track?.closest(".tslider, .showcase-slider, .quote-tslider") || this.track?.parentElement;
    if (el) {
      el.addEventListener("mouseenter", () => clearInterval(this._timer));
      el.addEventListener("mouseleave", () => {
        clearInterval(this._timer);
        this._timer = setInterval(() => this.next(), this.autoplayMs);
      });
    }
  }

  _bindTouch(el) {
    if (!el) return;
    let sx = 0,
      sy = 0;
    el.addEventListener(
      "touchstart",
      (e) => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      },
      { passive: true },
    );
    el.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          dx < 0 ? this.next() : this.prev();
        }
      },
      { passive: true },
    );

    // Mouse drag
    let msx = 0,
      dragging = false;
    el.addEventListener("mousedown", (e) => {
      dragging = true;
      msx = e.clientX;
      el.style.cursor = "grabbing";
    });
    el.addEventListener("mouseup", (e) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      const dx = e.clientX - msx;
      if (Math.abs(dx) > 40) dx < 0 ? this.next() : this.prev();
    });
    el.addEventListener("mouseleave", () => {
      dragging = false;
      el.style.cursor = "";
    });
  }
}

// ─── Minimal Fade Slider ──────────────────────────────────────────────────
class MinimalSlider {
  constructor({ slides, prevBtn, nextBtn, dotsEl, autoplay = true, autoplayMs = 4500 }) {
    this.slides = Array.from(slides);
    this.total = this.slides.length;
    this.current = 0;
    this._dotsEl = dotsEl;
    this._timer = null;
    this.autoplayMs = autoplayMs;

    this._buildDots();
    if (prevBtn)
      prevBtn.addEventListener("click", () => {
        this.prev();
        this._resetAutoplay();
      });
    if (nextBtn)
      nextBtn.addEventListener("click", () => {
        this.next();
        this._resetAutoplay();
      });

    // Touch
    const wrap = this.slides[0]?.parentElement?.parentElement;
    if (wrap) {
      let sx = 0;
      wrap.addEventListener(
        "touchstart",
        (e) => {
          sx = e.touches[0].clientX;
        },
        { passive: true },
      );
      wrap.addEventListener(
        "touchend",
        (e) => {
          const dx = e.changedTouches[0].clientX - sx;
          if (Math.abs(dx) > 40) {
            dx < 0 ? this.next() : this.prev();
            this._resetAutoplay();
          }
        },
        { passive: true },
      );
    }

    if (autoplay) this._startAutoplay();
  }

  go(idx) {
    this.slides[this.current].classList.remove("active");
    this.current = ((idx % this.total) + this.total) % this.total;
    this.slides[this.current].classList.add("active");
    this._updateDots();
  }

  next() {
    this.go(this.current + 1);
  }
  prev() {
    this.go(this.current - 1);
  }

  _buildDots() {
    if (!this._dotsEl) return;
    this._dotsEl.innerHTML = "";
    for (let i = 0; i < this.total; i++) {
      const btn = document.createElement("button");
      btn.className = "dot" + (i === 0 ? " active" : "");
      btn.addEventListener("click", () => {
        this.go(i);
        this._resetAutoplay();
      });
      this._dotsEl.appendChild(btn);
    }
  }

  _updateDots() {
    if (!this._dotsEl) return;
    this._dotsEl.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === this.current));
  }

  _startAutoplay() {
    this._timer = setInterval(() => this.next(), this.autoplayMs);
  }

  _resetAutoplay() {
    clearInterval(this._timer);
    this._startAutoplay();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────

// 1. Card slider
const cardSlider = new TSlider({
  track: document.getElementById("card-track"),
  prevBtn: document.getElementById("card-prev"),
  nextBtn: document.getElementById("card-next"),
  dotsEl: document.getElementById("card-dots"),
  total: 5,
  autoplay: true,
  autoplayMs: 5000,
});

// 2. Quote slider
const quoteSlider = new TSlider({
  track: document.getElementById("quote-track"),
  prevBtn: document.getElementById("quote-prev"),
  nextBtn: document.getElementById("quote-next"),
  dotsEl: document.getElementById("quote-dots"),
  total: 3,
  autoplay: true,
  autoplayMs: 6000,
});

// 3. Minimal fade slider
const minimalSlider = new MinimalSlider({
  slides: document.querySelectorAll("#minimal-track .minimal-slide"),
  prevBtn: document.getElementById("min-prev"),
  nextBtn: document.getElementById("min-next"),
  dotsEl: document.getElementById("minimal-dots"),
  autoplay: true,
  autoplayMs: 4500,
});

// 4. Showcase slider
const showcaseSlider = new TSlider({
  track: document.getElementById("showcase-track"),
  prevBtn: document.getElementById("sc-prev"),
  nextBtn: document.getElementById("sc-next"),
  dotsEl: document.getElementById("sc-dots"),
  total: 3,
  autoplay: true,
  autoplayMs: 5500,
});

// ─── Keyboard ─────────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.key === "ArrowLeft") cardSlider.prev();
  if (e.key === "ArrowRight") cardSlider.next();
});

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
