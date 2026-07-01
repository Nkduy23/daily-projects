"use strict";

// ─── Modal System ─────────────────────────────────────────────────────────
const Modal = (() => {
  // Stack of open modal IDs
  const stack = [];

  // Options per modal ID
  const optMap = {};

  // z-index base
  const Z_BASE = 1000;

  function getBackdrop(id) {
    return document.querySelector(`[data-modal-id="${id}"]`);
  }

  function open(id, opts = {}) {
    const backdrop = getBackdrop(id);
    if (!backdrop || backdrop.classList.contains("is-open")) return;

    const defaults = { backdropClose: true, showBackdrop: true };
    optMap[id] = { ...defaults, ...opts };

    // Push to stack
    stack.push(id);
    const zIndex = Z_BASE + (stack.length - 1) * 10;

    backdrop.style.zIndex = zIndex;
    backdrop.classList.add("is-open");

    // Focus trap — focus first focusable element
    requestAnimationFrame(() => {
      const focusable = backdrop.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    });

    // Prevent body scroll
    if (stack.length === 1) {
      document.body.style.overflow = "hidden";
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent("modal:open", { detail: { id } }));
  }

  function close(id) {
    const backdrop = getBackdrop(id);
    if (!backdrop || !backdrop.classList.contains("is-open")) return;

    const modal = backdrop.querySelector(".modal");

    // Play closing animation
    backdrop.classList.add("closing");

    const duration = modal ? getAnimDuration(modal) : 200;

    setTimeout(() => {
      backdrop.classList.remove("is-open", "closing");
      backdrop.style.zIndex = "";

      // Remove from stack
      const idx = stack.indexOf(id);
      if (idx > -1) stack.splice(idx, 1);

      // Restore body scroll if no more modals
      if (stack.length === 0) {
        document.body.style.overflow = "";
      }

      document.dispatchEvent(new CustomEvent("modal:close", { detail: { id } }));
    }, duration);
  }

  function closeAll() {
    [...stack].reverse().forEach((id) => close(id));
  }

  function closeCurrent() {
    if (stack.length > 0) close(stack[stack.length - 1]);
  }

  function getAnimDuration(modal) {
    const anim = modal.dataset.anim || "scale";
    const durations = { scale: 180, slide: 200, zoom: 180, flip: 250 };
    return durations[anim] || 180;
  }

  // ── Alert shortcut ──────────────────────────────────────────────────────
  function alert(type, title, message) {
    const id = `__alert_${Date.now()}`;

    const icons = { success: "✅", warning: "⚠️", error: "❌", info: "ℹ️" };
    const colors = {
      success: { bg: "var(--green-bg)", color: "var(--green)", border: "var(--green-border)" },
      warning: { bg: "var(--yellow-bg)", color: "var(--yellow)", border: "var(--yellow-border)" },
      error: { bg: "var(--red-bg)", color: "var(--red)", border: "var(--red-border)" },
      info: { bg: "var(--blue-bg)", color: "var(--accent)", border: "var(--blue-border)" },
    };

    const c = colors[type] || colors.info;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.dataset.modalId = id;

    backdrop.innerHTML = `
      <div class="modal modal-sm alert-${type}" data-anim="scale" style="border-top:3px solid ${c.color}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <button class="modal-close-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2.22 2.22a.75.75 0 0 1 1.06 0L7 5.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L8.06 7l3.72 3.72a.75.75 0 1 1-1.06 1.06L7 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L5.94 7 2.22 3.28a.75.75 0 0 1 0-1.06z"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-alert-icon" style="background:${c.bg};color:${c.color}">${icons[type]}</div>
          <p style="text-align:center">${message}</p>
        </div>
        <div class="modal-footer" style="justify-content:center">
          <button class="btn-primary modal-close-btn" style="background:${c.color}">Đóng</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);

    // Clean up on close
    document.addEventListener("modal:close", function handler(e) {
      if (e.detail.id === id) {
        setTimeout(() => backdrop.remove(), 300);
        document.removeEventListener("modal:close", handler);
      }
    });

    // Wire up
    wireBackdrop(backdrop, id);
    open(id);
  }

  // ── Confirm shortcut ────────────────────────────────────────────────────
  function confirm(title, message, opts = {}) {
    const id = `__confirm_${Date.now()}`;
    const { confirmText = "Xác nhận", cancelText = "Hủy", danger = false, onConfirm = null, onCancel = null } = opts;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.dataset.modalId = id;

    backdrop.innerHTML = `
      <div class="modal modal-sm" data-anim="scale">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" id="__cancel_${id}">${cancelText}</button>
          <button class="btn-primary${danger ? " danger" : ""}" id="__confirm_${id}">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(backdrop);

    // Clean up on close
    document.addEventListener("modal:close", function handler(e) {
      if (e.detail.id === id) {
        setTimeout(() => backdrop.remove(), 300);
        document.removeEventListener("modal:close", handler);
      }
    });

    backdrop.querySelector(`#__confirm_${id}`).addEventListener("click", () => {
      close(id);
      if (onConfirm) onConfirm();
    });

    backdrop.querySelector(`#__cancel_${id}`).addEventListener("click", () => {
      close(id);
      if (onCancel) onCancel();
    });

    wireBackdrop(backdrop, id);
    open(id);
  }

  // ── Auto-close ──────────────────────────────────────────────────────────
  function openAutoClose(id, duration = 3000) {
    open(id);

    const bar = document.getElementById("auto-progress-bar");
    const countdown = document.getElementById("countdown");
    if (!bar) return;

    // Animate progress bar shrink
    bar.style.transition = `transform ${duration}ms linear`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transform = "scaleX(0)";
      });
    });

    // Countdown text
    let remaining = Math.round(duration / 1000);
    if (countdown) countdown.textContent = remaining;

    const interval = setInterval(() => {
      remaining--;
      if (countdown) countdown.textContent = Math.max(0, remaining);
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      close(id);
      // reset bar
      setTimeout(() => {
        bar.style.transition = "none";
        bar.style.transform = "scaleX(1)";
      }, 300);
    }, duration);
  }

  // ── Wire backdrop events ────────────────────────────────────────────────
  function wireBackdrop(backdrop, id) {
    // Close buttons
    backdrop.querySelectorAll(".modal-close-btn").forEach((btn) => {
      btn.addEventListener("click", () => close(id));
    });

    // Click outside
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        const o = optMap[id];
        if (!o || o.backdropClose !== false) close(id);
      }
    });
  }

  // ── Global keyboard handler ─────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCurrent();
  });

  // ── Wire all static backdrops on load ───────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".modal-backdrop[data-modal-id]").forEach((backdrop) => {
      const id = backdrop.dataset.modalId;
      wireBackdrop(backdrop, id);
    });
  });

  return { open, close, closeAll, alert, confirm, openAutoClose };
})();

// ─── Toast ────────────────────────────────────────────────────────────────
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ─── Wire static backdrops (before DOMContentLoaded fires on inline) ─────
(function wireStatic() {
  document.querySelectorAll(".modal-backdrop[data-modal-id]").forEach((backdrop) => {
    const id = backdrop.dataset.modalId;
    // Close buttons
    backdrop.querySelectorAll(".modal-close-btn").forEach((btn) => {
      btn.addEventListener("click", () => Modal.close(id));
    });
    // Backdrop click
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) Modal.close(id);
    });
  });
})();
