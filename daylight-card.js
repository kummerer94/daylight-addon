// Daylight card for Home Assistant dashboards (Lovelace custom card).
//
// Installed through HACS from kummerer94/daylight-addon (see DOCS.md).
// HACS manages the dashboard resource. The app has no config folder access.
//
// The card reads Daylight through Home Assistant ingress. It makes its own
// ingress session over Home Assistant's websocket, exactly as Home
// Assistant's app panel does, and keeps it alive. Home Assistant allows
// these calls for users who are not administrators. The Supervisor then
// tells Daylight which Home Assistant user asks; that user's linked profile
// or unique free name match decides what the card shows. Without a match,
// Daylight uses the original profile. The card never names a profile itself.
//
// The card speaks the language of the Home Assistant user: German when the
// user's language starts with "de", English otherwise. It sends that language
// to Daylight, so the briefing comes in the same language.
//
// Plain JavaScript without a build step. The helpers are exported for tests.

// The public repository sync stamps this with the app manifest's version.
const VERSION = "0.5.0";
// crypto.randomUUID exists only on HTTPS or localhost; Home Assistant often
// runs on plain http on the home network.
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Validate the ingress session at most this often. It lives 15 minutes. */
export const SESSION_CHECK_MS = 4 * 60_000;
const BRIEFING_EVERY_MS = 5 * 60_000;
const ANSWER_POLL_MS = 2_000;
const ANSWER_WAIT_MS = 4 * 60_000;
const INGRESS_URL = /^\/api\/hassio_ingress\/[A-Za-z0-9_-]{1,128}\/?$/;

/** The texts of the card. `{0}` is replaced by the value. */
export const STRINGS = {
  en: {
    loading: "Loading…",
    approvalsOne: "1 action waits for your approval.",
    approvalsMany: "{0} actions wait for your approval.",
    openDaylight: "Open Daylight",
    writtenAt: "Written at {0}",
    updateFollows: " · update follows",
    askFollowUp: "Ask a follow-up…",
    askPlaceholder: "Ask Daylight…",
    askLabel: "Ask Daylight",
    ask: "Ask",
    thinking: "Daylight is thinking…",
    needsApproval: "This needs your approval in Daylight.",
    openInDaylight: "Open in Daylight",
    newQuestion: "New question",
    noAnswer: "No answer yet. Open Daylight to see it when it is ready.",
    notReachable: "Daylight is not reachable.",
    notInSidebar:
      "Daylight is not in the sidebar. Turn on “Show in sidebar” or set app: in the card.",
    notInstalled: "Daylight is not installed or not started.",
    noSession: "Home Assistant gave no ingress session.",
    notRunning: "Daylight is not running.",
    status: "Daylight answered with status {0}.",
  },
  de: {
    loading: "Wird geladen…",
    approvalsOne: "1 Aktion wartet auf deine Freigabe.",
    approvalsMany: "{0} Aktionen warten auf deine Freigabe.",
    openDaylight: "Daylight öffnen",
    writtenAt: "Geschrieben um {0}",
    updateFollows: " · Aktualisierung folgt",
    askFollowUp: "Nachfrage stellen…",
    askPlaceholder: "Daylight fragen…",
    askLabel: "Daylight fragen",
    ask: "Fragen",
    thinking: "Daylight denkt nach…",
    needsApproval: "Dafür ist deine Freigabe in Daylight nötig.",
    openInDaylight: "In Daylight öffnen",
    newQuestion: "Neue Frage",
    noAnswer:
      "Noch keine Antwort. Öffne Daylight, um sie zu sehen, sobald sie fertig ist.",
    notReachable: "Daylight ist nicht erreichbar.",
    notInSidebar:
      "Daylight ist nicht in der Seitenleiste. Schalte „In Seitenleiste anzeigen“ ein oder setze app: in der Karte.",
    notInstalled: "Daylight ist nicht installiert oder nicht gestartet.",
    noSession: "Home Assistant hat keine Ingress-Sitzung gegeben.",
    notRunning: "Daylight läuft nicht.",
    status: "Daylight hat mit Status {0} geantwortet.",
  },
};

/** The locale of the Home Assistant user, for example "de" or "en-GB". */
export function cardLocale(hass) {
  const value =
    (hass && hass.locale && hass.locale.language) || (hass && hass.language);
  return typeof value === "string" && value ? value : "en";
}

/** "de" for every German locale, "en" for all other languages. */
export function cardLanguage(hass) {
  return /^de(?:$|[-_])/i.test(cardLocale(hass)) ? "de" : "en";
}

/** A text of the card in a language. */
export function translate(language, key, value) {
  const text = (STRINGS[language] || STRINGS.en)[key] || STRINGS.en[key];
  return value === undefined ? text : text.replace("{0}", String(value));
}

/** A request failure with the message that Daylight sent. */
export class CardError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

/**
 * The Daylight app among Home Assistant's panels. App panels have
 * `config.addon` with the app slug and use the slug as their address. A
 * repository app's slug ends with `_daylight`. `configured` may name the
 * slug or the panel address instead.
 */
export function findApp(panels, configured) {
  const list = Object.values(panels || {});
  const slugOf = (panel) => {
    const slug =
      panel && panel.config && (panel.config.addon || panel.config.ingress);
    return typeof slug === "string" ? slug : null;
  };
  if (configured) {
    const panel = list.find(
      (p) => slugOf(p) === configured || p.url_path === configured,
    );
    return panel
      ? { slug: slugOf(panel) || configured, path: panel.url_path }
      : { slug: configured, path: configured };
  }
  const panel = list.find((p) => {
    const slug = slugOf(p);
    return slug === "daylight" || (slug && slug.endsWith("_daylight"));
  });
  return panel ? { slug: slugOf(panel), path: panel.url_path } : null;
}

/** Sets the ingress cookie like Home Assistant's frontend does. */
export function ingressCookie(session, secure) {
  return `ingress_session=${session};path=/api/hassio_ingress/;SameSite=Strict${secure ? ";Secure" : ""}`;
}

/**
 * Requests to Daylight through ingress. One session at a time; it is
 * validated (which extends it) at most every four minutes and made again
 * when it has expired, for example after the tablet slept.
 */
export function createIngressClient({
  slug,
  callWS,
  fetch,
  setCookie,
  now,
  text,
}) {
  const clock = now || (() => Date.now());
  const t = text || ((key, value) => translate("en", key, value));
  let base = null;
  let session = null;
  let checkedAt = 0;
  let pending = null;

  async function readBase() {
    const info = await callWS({
      type: "supervisor/api",
      endpoint: `/addons/${slug}/info`,
      method: "get",
    });
    const url = info && info.ingress_url;
    if (typeof url !== "string" || !INGRESS_URL.test(url))
      throw new CardError(t("notInstalled"));
    base = url.replace(/\/$/, "");
  }
  async function create() {
    const result = await callWS({
      type: "supervisor/api",
      endpoint: "/ingress/session",
      method: "post",
    });
    if (!result || typeof result.session !== "string")
      throw new CardError(t("noSession"));
    session = result.session;
    setCookie(session);
    checkedAt = clock();
  }
  async function check(force) {
    if (!base) await readBase();
    if (force || !session) return create();
    if (clock() - checkedAt < SESSION_CHECK_MS) return;
    try {
      await callWS({
        type: "supervisor/api",
        endpoint: "/ingress/validate_session",
        method: "post",
        data: { session },
      });
      checkedAt = clock();
    } catch {
      await create();
    }
  }
  /** One check at a time, also for several cards on one page. */
  function ensure(force = false) {
    if (!pending)
      pending = check(force).finally(() => {
        pending = null;
      });
    return pending;
  }
  async function send(path, init) {
    const options = {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: {
        accept: "application/json",
        ...(init && init.body ? { "content-type": "application/json" } : {}),
      },
    };
    return fetch(`${base}/${path}`, options);
  }
  return {
    keepAlive: () => ensure(false),
    async request(path, init) {
      await ensure(false);
      let response = await send(path, init);
      // The Supervisor answers 401 when the session expired.
      if (response.status === 401) {
        await ensure(true);
        response = await send(path, init);
      }
      let body = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      if (!response.ok)
        throw new CardError(
          typeof body.error === "string"
            ? body.error
            : response.status === 502 || response.status === 503
              ? t("notRunning")
              : t("status", response.status),
          response.status,
        );
      return body;
    },
  };
}

const clients = new Map();
function clientFor(slug, hass) {
  let entry = clients.get(slug);
  if (!entry) {
    entry = { hass };
    entry.client = createIngressClient({
      slug,
      text: (key, value) => translate(cardLanguage(entry.hass), key, value),
      callWS: (message) => entry.hass.callWS(message),
      fetch: (...args) => window.fetch(...args),
      setCookie: (session) => {
        document.cookie = ingressCookie(
          session,
          location.protocol === "https:",
        );
      },
    });
    clients.set(slug, entry);
  }
  entry.hass = hass;
  return entry.client;
}

/** "07:42" in the browser's time, in the format of the user's locale. */
export function clockTime(iso, locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const options = { hour: "2-digit", minute: "2-digit" };
  try {
    return date.toLocaleTimeString(locale || [], options);
  } catch {
    return date.toLocaleTimeString([], options);
  }
}

const STYLE = `
:host{display:block}
ha-card{padding:16px;display:flex;flex-direction:column;gap:12px;height:100%;box-sizing:border-box}
.head{display:flex;align-items:center;gap:10px}
.head ha-icon{color:var(--state-icon-color,var(--primary-color));--mdc-icon-size:24px}
.title{flex:1;min-width:0}
.title h2{margin:0;font-size:var(--ha-font-size-l,16px);font-weight:var(--ha-font-weight-medium,500);line-height:1.3;color:var(--primary-text-color)}
.title p{margin:0;font-size:var(--ha-font-size-s,12px);color:var(--secondary-text-color)}
ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
li{display:flex;gap:10px;align-items:baseline;color:var(--primary-text-color);font-size:var(--ha-font-size-m,14px);line-height:1.4}
li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--primary-color);transform:translateY(-2px)}
.alert{display:flex;gap:8px;align-items:center;padding:8px 12px;border-radius:var(--ha-border-radius-md,8px);background:rgba(var(--rgb-warning-color,255,166,0),.12);color:var(--primary-text-color);font-size:var(--ha-font-size-m,14px)}
.alert ha-icon{color:var(--warning-color);--mdc-icon-size:20px}
.quiet{margin:0;color:var(--secondary-text-color);font-size:var(--ha-font-size-s,12px)}
.ask{display:flex;gap:8px}
.ask input{flex:1;min-width:0;font:inherit;font-size:var(--ha-font-size-m,14px);color:var(--primary-text-color);background:var(--secondary-background-color,rgba(127,127,127,.1));border:1px solid var(--divider-color);border-radius:var(--ha-border-radius-md,8px);padding:10px 12px;outline:none}
.ask input:focus{border-color:var(--primary-color)}
button{font:inherit;font-size:var(--ha-font-size-m,14px);border:none;border-radius:var(--ha-border-radius-md,8px);padding:8px 14px;cursor:pointer;background:var(--primary-color);color:var(--text-primary-color,#fff)}
button:disabled{opacity:.5;cursor:default}
button.link{background:none;color:var(--primary-color);padding:4px 0}
.answer{border-top:1px solid var(--divider-color);padding-top:12px;display:flex;flex-direction:column;gap:8px}
.answer .q{margin:0;color:var(--secondary-text-color);font-size:var(--ha-font-size-s,12px)}
.answer .text{color:var(--primary-text-color);font-size:var(--ha-font-size-m,14px);line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}
.answer ha-markdown{white-space:normal}
.actions{display:flex;gap:16px;align-items:center}
`;

/** `el("li", {className: "x"}, "text")`; children are text or elements. */
function el(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props || {});
  for (const child of children)
    if (child !== null && child !== undefined && child !== false)
      node.append(child);
  return node;
}

const Base = globalThis.HTMLElement || class {};

export class DaylightCard extends Base {
  static getStubConfig() {
    return {};
  }
  setConfig(config) {
    if (config && config.app !== undefined && typeof config.app !== "string")
      throw new Error(
        "app must be the Daylight app slug, e.g. abc123_daylight",
      );
    this._config = {
      title: "Daylight",
      show_prompt: true,
      ...config,
    };
    this._render();
  }
  set hass(hass) {
    const first = !this._hass;
    const language = this._language;
    this._hass = hass;
    this._language = cardLanguage(hass);
    if (first && this.isConnected) this._start();
    // The user changed the language: load the briefing in the new language.
    else if (!first && this._timer && language !== this._language)
      this._loadBriefing();
  }
  /** A text in the user's language. */
  _t(key, value) {
    return translate(this._language || "en", key, value);
  }
  getCardSize() {
    return 4;
  }
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }
  connectedCallback() {
    if (this._hass) this._start();
  }
  disconnectedCallback() {
    clearInterval(this._timer);
    clearTimeout(this._poll);
    this._timer = undefined;
    document.removeEventListener("visibilitychange", this._onVisible);
  }

  _start() {
    if (this._timer) return;
    this._onVisible = () => {
      if (document.visibilityState === "visible") this._loadBriefing();
    };
    document.addEventListener("visibilitychange", this._onVisible);
    // The interval also keeps the ingress session alive while the page is open.
    this._timer = setInterval(() => this._loadBriefing(), BRIEFING_EVERY_MS);
    this._loadBriefing();
  }

  _client() {
    const app = findApp(this._hass && this._hass.panels, this._config.app);
    if (!app) throw new CardError(this._t("notInSidebar"));
    this._app = app;
    return clientFor(app.slug, this._hass);
  }

  async _loadBriefing() {
    try {
      this._briefing = await this._client().request(
        `api/card/briefing?lang=${this._language || "en"}`,
      );
      this._error = null;
    } catch (error) {
      this._error =
        error instanceof CardError ? error.message : this._t("notReachable");
    }
    this._render();
  }

  async _ask(text) {
    const question = text.trim();
    if (!question || this._answer?.status === "waiting") return;
    this._answer = { question, status: "waiting", text: "" };
    this._render();
    try {
      const body = {
        text: question,
        requestId: randomId(),
        ...(this._conversationId
          ? { conversationId: this._conversationId }
          : {}),
      };
      const sent = await this._client().request("api/card/ask", {
        method: "POST",
        body: JSON.stringify(body),
      });
      this._conversationId = sent.conversationId;
      this._waitFor(sent.messageId, Date.now());
    } catch (error) {
      this._answer = {
        question,
        status: "failed",
        text:
          error instanceof CardError ? error.message : this._t("notReachable"),
      };
      this._render();
    }
  }

  _waitFor(messageId, startedAt) {
    clearTimeout(this._poll);
    this._poll = setTimeout(async () => {
      try {
        const reply = await this._client().request(`api/card/ask/${messageId}`);
        if (reply.status === "done" || reply.status === "failed") {
          this._answer = {
            ...this._answer,
            status: reply.status,
            text: reply.text,
            approvals: reply.approvals,
          };
          this._render();
          return;
        }
      } catch {
        // Try again until the time is up.
      }
      if (Date.now() - startedAt > ANSWER_WAIT_MS) {
        this._answer = {
          ...this._answer,
          status: "failed",
          text: this._t("noAnswer"),
        };
        this._render();
        return;
      }
      this._waitFor(messageId, startedAt);
    }, ANSWER_POLL_MS);
  }

  _openDaylight() {
    const path = `/${(this._app && this._app.path) || ""}`;
    history.pushState(null, "", path);
    window.dispatchEvent(
      new CustomEvent("location-changed", { detail: { replace: false } }),
    );
  }

  _render() {
    if (!this._config || typeof document === "undefined") return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    // Keep what the person types while the briefing updates.
    const typed = root.querySelector("input")?.value ?? "";
    const focused = root.activeElement?.tagName === "INPUT";
    const b = this._briefing;
    const sub = b ? [b.date, b.name].filter(Boolean).join(" · ") : "";
    const card = el("ha-card");
    card.append(
      el(
        "div",
        { className: "head" },
        el("ha-icon", { icon: "mdi:white-balance-sunny" }),
        el(
          "div",
          { className: "title" },
          el("h2", { textContent: this._config.title }),
          sub ? el("p", { textContent: sub }) : null,
        ),
      ),
    );
    for (const alert of (b && b.alerts) || [])
      card.append(
        el(
          "div",
          { className: "alert" },
          el("ha-icon", { icon: "mdi:train" }),
          alert,
        ),
      );
    if (b) {
      card.append(
        el("ul", {}, ...b.items.map((item) => el("li", { textContent: item }))),
      );
      if (b.approvals > 0)
        card.append(
          el(
            "div",
            { className: "actions" },
            el("span", {
              className: "quiet",
              textContent:
                b.approvals === 1
                  ? this._t("approvalsOne")
                  : this._t("approvalsMany", b.approvals),
            }),
            el("button", {
              className: "link",
              textContent: this._t("openDaylight"),
              onclick: () => this._openDaylight(),
            }),
          ),
        );
    } else if (!this._error)
      card.append(
        el("p", { className: "quiet", textContent: this._t("loading") }),
      );
    if (this._error)
      card.append(el("p", { className: "quiet", textContent: this._error }));
    else if (b && b.updatedAt)
      card.append(
        el("p", {
          className: "quiet",
          textContent: `${this._t("writtenAt", clockTime(b.updatedAt, cardLocale(this._hass)))}${b.stale ? this._t("updateFollows") : ""}`,
        }),
      );

    if (this._config.show_prompt && b) {
      const input = el("input", {
        type: "text",
        placeholder: this._conversationId
          ? this._t("askFollowUp")
          : this._t("askPlaceholder"),
        value: typed,
        maxLength: 4000,
        enterKeyHint: "send",
      });
      input.setAttribute("aria-label", this._t("askLabel"));
      const send = el("button", {
        textContent: this._t("ask"),
        disabled: this._answer?.status === "waiting",
      });
      const submit = () => {
        const value = input.value;
        input.value = "";
        this._ask(value);
      };
      send.onclick = submit;
      input.onkeydown = (event) => {
        if (event.key === "Enter" && !event.isComposing) submit();
      };
      card.append(el("div", { className: "ask" }, input, send));
      if (focused) queueMicrotask(() => input.focus());
    }

    const a = this._answer;
    if (a) {
      const answer = el(
        "div",
        { className: "answer" },
        el("p", { className: "q", textContent: a.question }),
      );
      if (a.status === "waiting")
        answer.append(
          el("div", {
            className: "text",
            textContent: this._t("thinking"),
          }),
        );
      else {
        const text = el("div", { className: "text" });
        if (a.status === "done" && customElements.get("ha-markdown")) {
          const markdown = document.createElement("ha-markdown");
          markdown.content = a.text;
          markdown.breaks = true;
          text.append(markdown);
        } else text.textContent = a.text;
        answer.append(text);
      }
      if (a.approvals > 0)
        answer.append(
          el("p", {
            className: "quiet",
            textContent: this._t("needsApproval"),
          }),
        );
      answer.append(
        el(
          "div",
          { className: "actions" },
          el("button", {
            className: "link",
            textContent: this._t("openInDaylight"),
            onclick: () => this._openDaylight(),
          }),
          a.status === "waiting"
            ? null
            : el("button", {
                className: "link",
                textContent: this._t("newQuestion"),
                onclick: () => {
                  this._answer = null;
                  this._conversationId = null;
                  this._render();
                },
              }),
        ),
      );
      card.append(answer);
    }
    root.replaceChildren(el("style", { textContent: STYLE }), card);
  }
}

if (
  typeof customElements !== "undefined" &&
  !customElements.get("daylight-card")
) {
  customElements.define("daylight-card", DaylightCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "daylight-card",
    name: "Daylight",
    description:
      "What matters today and in the next days, and a box to ask Daylight.",
  });
  console.info(`Daylight card ${VERSION}`);
}
