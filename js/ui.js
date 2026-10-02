/**
 * Renders Journeyman. Player answers are written into the DOM only after
 * a round is won or lost — never as hidden fields, titles, or URLs.
 */

const ICONS = {
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#1D4ED8" stroke-width="2"/><path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" fill="none" stroke="#1D4ED8" stroke-width="2"/></svg>',
  shirt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#067A42" d="M8 4l4 2 4-2 4 3-2 3v11H6V10L4 7z"/></svg>',
  badge: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#6D28D9"/><path fill="#fff" d="M12 7.2l1.1 2.4 2.6.3-1.9 1.8.5 2.6L12 13.1 9.7 14.3l.5-2.6-1.9-1.8 2.6-.3z"/></svg>',
  case: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V6a3 3 0 0 1 6 0v1" fill="none" stroke="#8A5A00" stroke-width="1.8"/><rect x="4" y="7" width="16" height="12" rx="2" fill="#FFC933" stroke="#8A5A00" stroke-width="1.4"/></svg>',
  cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#9F1239" d="M7 7l10 10M17 7L7 17" stroke="#9F1239" stroke-width="2.4" stroke-linecap="round"/></svg>',
  fallback: '<svg viewBox="0 0 96 96" aria-hidden="true"><rect width="96" height="96" fill="#D6E8FF"/><circle cx="48" cy="38" r="14" fill="#8FB4E8"/><path d="M22 82c4-16 14-24 26-24s22 8 26 24" fill="#8FB4E8"/><circle cx="70" cy="64" r="8" fill="#fff" stroke="#14213D" stroke-width="2"/></svg>',
};

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child == null || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

function icon(name) {
  const wrap = document.createElement("span");
  wrap.className = "clue-icon";
  wrap.innerHTML = ICONS[name] || "";
  return wrap;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let lastFocus = null;
let toastTimer = 0;
let suggestItems = [];
let suggestIndex = -1;

export function setStreak(count) {
  const number = document.querySelector("#streak-count");
  const pill = document.querySelector("#streak-pill");
  if (number) number.textContent = String(count);
  if (pill) {
    pill.setAttribute("aria-label", `Current streak: ${count} ${count === 1 ? "day" : "days"}`);
  }
}

export function setTaglineVisible(visible) {
  const tagline = document.querySelector("#tagline");
  if (tagline) tagline.hidden = !visible;
}

export function setVersionLabel(label) {
  const node = document.querySelector("#version-label");
  if (node) node.textContent = label;
}

export function announce(message) {
  const live = document.querySelector("#live");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = message;
  }, 30);
}

export function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

export function burstConfetti() {
  if (reducedMotion()) return;
  const colors = ["#16C06B", "#FFC933", "#3B82F6", "#FF5A5F", "#8B5CF6", "#FFFFFF"];
  for (let index = 0; index < 36; index += 1) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    bit.style.background = colors[index % colors.length];
    bit.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 280)}px`);
    bit.style.setProperty("--dy", `${Math.round(80 + Math.random() * 260)}px`);
    bit.style.setProperty("--rot", `${Math.round(Math.random() * 360)}deg`);
    document.body.append(bit);
    window.setTimeout(() => bit.remove(), 1000);
  }
}

export function shakeCareer() {
  pulseClass(".career-card");
}

export function shakeGuess() {
  pulseClass(".guess-dock");
}

function pulseClass(selector) {
  const node = document.querySelector(selector);
  if (!node || reducedMotion()) return;
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

export function showFeedback(message) {
  const node = document.querySelector("#guess-feedback");
  if (node) node.textContent = message;
}

export function renderLoading() {
  replaceApp(
    h("section", { class: "card loading-card" },
      h("div", { class: "boot", "aria-hidden": "true" }),
      h("h2", {}, "Lacing up…"),
      h("p", {}, "Today's squad is on its way."))
  );
}

export function renderError() {
  replaceApp(
    h("section", { class: "card error-card" },
      h("h2", {}, "The squad list didn't load"),
      h("p", {}, "Refresh the page to try again."))
  );
}

function replaceApp(node) {
  const app = document.querySelector("#app");
  app.replaceChildren(node);
}

function photoFrame(url) {
  const frame = h("div", { class: "photo" });
  if (!url) {
    frame.innerHTML = ICONS.fallback;
    return frame;
  }
  const image = h("img", { alt: "", src: url, width: "96", height: "96" });
  image.addEventListener("error", () => {
    image.replaceWith(fallbackNode());
  });
  frame.append(image);
  return frame;
}

function fallbackNode() {
  const holder = document.createElement("span");
  holder.innerHTML = ICONS.fallback;
  return holder.firstChild;
}

function careerTable(career, total) {
  const table = h("table", { class: "career", "aria-labelledby": "career-title" });
  const head = h("thead", {},
    h("tr", {},
      h("th", { scope: "col" }, "Years"),
      h("th", { scope: "col" }, "Team"),
      h("th", { class: "num", scope: "col" }, "Apps"),
      h("th", { class: "num", scope: "col" }, "(Gls)")));
  const body = h("tbody");
  career.forEach((row) => {
    const team = row.isLoan
      ? h("td", {},
        h("span", { class: "loan-arrow", "aria-hidden": "true" }, "→"),
        h("span", { class: "team-name" }, row.team),
        h("span", { class: "loan-tag" }, "(loan)"))
      : h("td", {}, h("span", { class: "team-name" }, row.team));
    body.append(
      h("tr", { class: row.isLoan ? "loan" : "" },
        h("td", {}, row.years || "–"),
        team,
        h("td", { class: "num" }, formatCount(row.apps)),
        h("td", { class: "num" }, formatGoals(row.goals)))
    );
  });
  body.append(
    h("tr", { class: "total" },
      h("th", { scope: "row", colspan: "2" }, "Total"),
      h("td", { class: "num" }, String(total.apps)),
      h("td", { class: "num" }, `(${total.goals})`))
  );
  table.append(head, body);
  return h("div", { class: "table-fit" }, table);
}

function formatCount(value) {
  return Number.isFinite(value) ? String(value) : "–";
}

function formatGoals(value) {
  return Number.isFinite(value) ? `(${value})` : "(–)";
}

const CLUE_ICONS = { nation: "globe", position: "shirt", caps: "badge", club: "case" };

function clueList(clues) {
  return h("section", { class: "clues", "aria-label": "Clues" },
    clues.map((clue) => {
      const open = clue.state === "open";
      return h("article", {
        class: `clue ${clue.state} ${open ? `tint-${clue.tint}` : ""}`,
      },
      open ? icon(CLUE_ICONS[clue.key]) : null,
      h("div", {},
        open ? h("p", { class: "kicker" }, clue.kicker) : null,
        h("p", { class: open ? "clue-text" : "" }, clue.text)));
    }));
}

function dotRow(dots) {
  return h("span", { class: "dots", "aria-hidden": "true" },
    dots.map((dot) => h("span", { class: `dot ${dot === "unused" ? "" : dot}` })));
}

export function renderPlay(model, handlers) {
  suggestItems = [];
  suggestIndex = -1;
  const segments = h("div", { class: "segments", "aria-hidden": "true" },
    model.segments.map((state) => h("span", { class: state === "upcoming" ? "" : state })));

  const reveal = model.reveal
    ? h("article", { class: `card result-card ${model.reveal.won ? "win" : "loss"}` },
      photoFrame(model.reveal.photo),
      h("div", {},
        h("p", { class: "result-kicker" }, model.reveal.won ? "Correct" : "Revealed"),
        h("h2", { class: "reveal-name" }, model.reveal.name),
        h("p", { class: "result-copy" }, model.reveal.message),
        h("p", { class: "emoji-row", "aria-hidden": "true" }, model.reveal.emoji)))
    : null;

  const chips = model.wrongs.length
    ? h("div", { class: "chips", "aria-label": "Wrong guesses" },
      model.wrongs.map((name) => h("span", { class: "chip" }, chipIcon(), name)))
    : null;

  const section = h("section", { class: "stack" },
    h("div", { class: "round-top" },
      h("div", {},
        h("p", { class: "progress-copy" }, `Player ${model.playerNumber} of ${model.playerCount}`),
        segments),
      h("p", { class: "guess-pill" }, dotRow(model.dots), model.counter)),
    reveal,
    reveal ? h("button", { class: "btn", type: "button" }, model.reveal.nextLabel) : null,
    h("article", { class: `card career-card${model.shake ? " shake" : ""}` },
      h("h2", { id: "career-title" }, "Senior career"),
      careerTable(model.career, model.totals)),
    clueList(model.clues),
    chips,
    model.reveal ? null : guessBox());

  const nextButton = section.querySelector(".btn");
  if (nextButton) nextButton.addEventListener("click", handlers.onNext);

  replaceApp(section);
  if (!model.reveal) bindGuess(handlers, model.focusGuess);
}

function chipIcon() {
  const holder = document.createElement("span");
  holder.innerHTML = ICONS.cross;
  const svg = holder.firstChild;
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function guessBox() {
  return h("form", { class: "guess-dock", autocomplete: "off" },
    h("label", { class: "guess-label", for: "guess-input" }, "Who is it?"),
    h("input", {
      id: "guess-input",
      class: "guess-input",
      type: "text",
      role: "combobox",
      placeholder: "Search for a player",
      autocomplete: "off",
      autocorrect: "off",
      spellcheck: "false",
      enterkeyhint: "search",
      "aria-autocomplete": "list",
      "aria-controls": "suggestions",
      "aria-expanded": "false",
    }),
    h("ul", { id: "suggestions", class: "suggestions", role: "listbox", hidden: "hidden" }),
    h("p", { id: "guess-feedback", class: "feedback", "aria-live": "polite" }));
}

function bindGuess(handlers, focusGuess) {
  const form = document.querySelector(".guess-dock");
  const input = document.querySelector("#guess-input");
  const list = document.querySelector("#suggestions");
  form.addEventListener("submit", (event) => event.preventDefault());

  const draw = () => {
    list.replaceChildren();
    if (!suggestItems.length) {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      return;
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    suggestItems.forEach((player, index) => {
      const option = h("li", { role: "presentation" },
        h("button", {
          type: "button",
          role: "option",
          id: `suggest-${index}`,
          "aria-selected": index === suggestIndex ? "true" : "false",
        }, player.name));
      const button = option.querySelector("button");
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => handlers.onGuess(player));
      list.append(option);
    });
    if (suggestIndex >= 0) input.setAttribute("aria-activedescendant", `suggest-${suggestIndex}`);
    else input.removeAttribute("aria-activedescendant");
  };

  input.addEventListener("input", () => {
    suggestItems = handlers.search(input.value).slice(0, 6);
    suggestIndex = suggestItems.length ? 0 : -1;
    showFeedback("");
    draw();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && suggestItems.length) {
      event.preventDefault();
      suggestIndex = (suggestIndex + 1) % suggestItems.length;
      draw();
    } else if (event.key === "ArrowUp" && suggestItems.length) {
      event.preventDefault();
      suggestIndex = (suggestIndex - 1 + suggestItems.length) % suggestItems.length;
      draw();
    } else if (event.key === "Escape") {
      suggestItems = [];
      suggestIndex = -1;
      draw();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (suggestIndex >= 0 && suggestItems[suggestIndex]) {
        handlers.onGuess(suggestItems[suggestIndex]);
        return;
      }
      const exact = handlers.search(input.value).find((player) => handlers.sameName(player, input.value));
      if (exact) handlers.onGuess(exact);
      else {
        showFeedback("Pick a player from the list");
        shakeGuess();
      }
    }
  });

  input.addEventListener("focus", () => {
    window.setTimeout(() => {
      input.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    }, 280);
  });

  if (window.visualViewport && !bindGuess.watching) {
    bindGuess.watching = true;
    window.visualViewport.addEventListener("resize", () => {
      const active = document.querySelector("#guess-input");
      if (active && document.activeElement === active) {
        active.scrollIntoView({ block: "center" });
      }
    }, { passive: true });
  }

  if (focusGuess) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center" });
  }
}

export function renderResults(model, handlers) {
  const cards = model.rows.map((row) => h("article", { class: "card result-mini" },
    photoFrame(row.photo),
    h("div", {},
      h("h3", {}, row.name),
      h("p", {}, row.summary),
      h("p", { class: "emoji-row" }, row.emoji))));

  const section = h("section", { class: "stack results" },
    h("div", { class: "results-hero" },
      h("h2", {}, "Today's stamps"),
      h("p", {}, `Journeyman #${model.puzzle}`)),
    ...cards,
    h("button", { class: "btn", type: "button", id: "share-btn" }, "Share"),
    h("pre", { class: "share-preview" }, model.shareText),
    h("article", { class: "card countdown-card" },
      h("p", {}, "Next puzzle in"),
      h("span", { class: "countdown", "data-countdown": "true" }, model.countdown)));

  section.querySelector("#share-btn").addEventListener("click", handlers.onShare);
  replaceApp(section);
}

export function openHowTo(onClose) {
  const dialog = h("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "howto-title" },
    h("div", { class: "dialog-head" },
      h("h2", { id: "howto-title" }, "How to play"),
      h("button", { class: "close-btn", type: "button", "data-close": "true", "aria-label": "Close" }, "×")),
    h("p", { class: "tagline" }, "Name the player from their career"),
    h("ol", { class: "steps" },
      h("li", {}, "Each day everyone gets the same 3 mystery players."),
      h("li", {}, "Study the senior career table. Loans wear an arrow."),
      h("li", {}, "You get 5 guesses. Search, then tap a name — no spelling battles."),
      h("li", {}, "Each wrong guess unlocks a clue: nationality, position, caps, then birth decade and club."),
      h("li", {}, "Finish all 3, win or lose, to keep your streak. A new trio arrives at midnight UK time.")),
    h("button", { class: "btn", type: "button", "data-close": "true" }, "Let's play"));
  openDialog(dialog, onClose);
}

export function openStats(model) {
  const max = Math.max(1, ...model.distribution);
  const labels = ["1", "2", "3", "4", "5", "X"];
  const names = ["Won on guess 1", "Won on guess 2", "Won on guess 3", "Won on guess 4", "Won on guess 5", "Not solved"];
  const dialog = h("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "stats-title" },
    h("div", { class: "dialog-head" },
      h("h2", { id: "stats-title" }, "Your stats"),
      h("button", { class: "close-btn", type: "button", "data-close": "true", "aria-label": "Close" }, "×")),
    h("div", { class: "stat-grid" },
      tile("tile-yellow", "Current streak", model.streak, "stat-streak"),
      tile("tile-purple", "Best streak", model.best, "stat-best"),
      tile("tile-blue", "Games played", model.played, "stat-played"),
      tile("tile-green", "Win rate", `${model.winRate}%`, "stat-rate")),
    h("h3", { class: "section-title" }, "Guess distribution"),
    model.played
      ? h("ol", { class: "dist" }, model.distribution.map((count, index) => h("li", {},
        h("span", {}, labels[index]),
        h("span", { class: "dist-track" },
          h("span", {
            class: `dist-bar${index === 5 ? " lost" : ""}${model.todayBuckets.includes(index === 5 ? "lost" : index + 1) ? " today" : ""}`,
            style: `width:${count ? Math.max(10, Math.round((count / max) * 100)) : 0}%`,
          })),
        h("span", {}, String(count)),
        h("span", { class: "sr-only" }, names[index]))))
      : h("p", { class: "empty-note" }, "Finish today's three players to start your chart."));
  openDialog(dialog, () => {});
  countUp(dialog.querySelector("#stat-streak"), model.streak);
  countUp(dialog.querySelector("#stat-best"), model.best);
  countUp(dialog.querySelector("#stat-played"), model.played);
  countUp(dialog.querySelector("#stat-rate"), model.winRate, "%");
}

function tile(tint, label, value, id) {
  return h("article", { class: `stat-tile ${tint}` },
    h("span", {}, label),
    h("strong", { id }, String(value)));
}

function countUp(node, target, suffix = "") {
  if (!node) return;
  if (reducedMotion()) {
    node.textContent = `${target}${suffix}`;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / 700);
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = `${Math.round(target * eased)}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function openDialog(dialog, onClose) {
  const root = document.querySelector("#modal-root");
  const backdrop = h("div", { class: "modal-backdrop" });
  backdrop.append(dialog);
  lastFocus = document.activeElement;
  root.replaceChildren(backdrop);
  root.hidden = false;
  document.querySelector("#page")?.setAttribute("inert", "");
  const close = () => {
    closeModal();
    onClose();
  };
  dialog.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", close);
  });
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...dialog.querySelectorAll("button, [href], input")].filter((item) => !item.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  (dialog.querySelector("[data-close]") || dialog).focus();
}

export function closeModal() {
  const root = document.querySelector("#modal-root");
  if (!root) return;
  root.replaceChildren();
  root.hidden = true;
  document.querySelector("#page")?.removeAttribute("inert");
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

export function setCountdown(label) {
  const node = document.querySelector("[data-countdown]");
  if (node) node.textContent = label;
}
