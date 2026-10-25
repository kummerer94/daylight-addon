/** Card answers never render HTML or image Markdown. The Open button opens Daylight. */
export function cardAnswerText(text) {
  return text
    .replace(
      /!\[([^\]\n]*)\]\(\s*<?(?:\.\/)?api\/attachments\/[0-9a-f-]+\/content>?[^\n)]*\)/g,
      (_, alt) => `${alt || "Photo"} (open in Daylight)`,
    )
    .replace(/!\[([^\]\n]*)\](?:\([^\n]*?\)|\[[^\]\n]*\])?/g, "$1")
    .replace(/<img\b[^>]*>/gi, "");
}

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
// The card shows the board: typed rows that Daylight makes from the facts
// without the model. What needs attention comes first, then today and the
// next days. The model's summary line, when one exists, stands above them.
// A server older than the board sends only lines; the card shows them as a
// list. All texts go into the page as text, never as HTML.
//
// Plain JavaScript without a build step. The helpers are exported for tests.

// The public repository sync stamps this with the app manifest's version.
const VERSION = "0.27.1";
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
    overdue: "Late",
    since: "since {0}",
    tonight: "Tonight",
    binsOut: "{0} out",
    pickupTomorrow: "pickup tomorrow",
    approval: "Approval",
    waitsOne: "1 action waits",
    waitsMany: "{0} actions wait",
    inDaylight: "in Daylight",
    review: "Review",
    expires: "Expires",
    onDate: "on {0}",
    more: "+{0} more",
    allDay: "all day",
    lunch: "Lunch",
    dinner: "Dinner",
    reminder: "Reminder",
    chore: "Chore",
    nothingPlanned: "Nothing planned",
    calm: "Nothing special in the next three days.",
    summaryAt: "Summary written at {0}",
  },
  de: {
    loading: "Wird geladen…",
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
    overdue: "Verspätet",
    since: "seit {0}",
    tonight: "Heute Abend",
    binsOut: "{0} rausstellen",
    pickupTomorrow: "Abholung morgen",
    approval: "Freigabe",
    waitsOne: "1 Aktion wartet",
    waitsMany: "{0} Aktionen warten",
    inDaylight: "in Daylight",
    review: "Prüfen",
    expires: "Läuft ab",
    onDate: "am {0}",
    more: "+{0} weitere",
    allDay: "ganztags",
    lunch: "Mittagessen",
    dinner: "Abendessen",
    reminder: "Erinnerung",
    chore: "Aufgabe",
    nothingPlanned: "Nichts geplant",
    calm: "In den nächsten drei Tagen steht nichts Besonderes an.",
    summaryAt: "Zusammenfassung von {0}",
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
  // A function keeps "$&" and "$'" in names as they are.
  return value === undefined ? text : text.replace("{0}", () => String(value));
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

/**
 * A household day (YYYY-MM-DD) less than a week from `today` as its weekday
 * ("Saturday"), other days as "9 October", in the user's locale.
 */
export function dayName(date, today, locale) {
  const at = Date.parse(`${date}T12:00:00Z`);
  if (Number.isNaN(at)) return "";
  const from = Date.parse(`${today}T12:00:00Z`);
  const options =
    !Number.isNaN(from) && Math.abs(at - from) < 7 * 86_400_000
      ? { timeZone: "UTC", weekday: "long" }
      : { timeZone: "UTC", day: "numeric", month: "long" };
  try {
    return new Intl.DateTimeFormat(locale || [], options).format(at);
  } catch {
    return new Intl.DateTimeFormat([], options).format(at);
  }
}

/** The board of a briefing; null from a server older than the board. */
export function briefingBoard(briefing) {
  const board = briefing && briefing.board;
  return board &&
    Array.isArray(board.attention) &&
    Array.isArray(board.days) &&
    board.days.every((day) => day && Array.isArray(day.rows))
    ? board
    : null;
}

const WEATHER_ICONS = {
  rain: "mdi:weather-rainy",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  hail: "mdi:weather-hail",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  hot: "mdi:thermometer-high",
  frost: "mdi:snowflake",
};

// Accent texts mix the theme's accent with its text colour, so they keep
// the contrast of the text in light and dark themes. Quiet text on a tinted
// background mixes in some text colour for the same reason.
const STYLE = `
:host{display:block;min-width:0}
ha-card{--list-default:var(--secondary-text-color);--list-green:color-mix(in srgb,#3d6a3f 65%,var(--primary-text-color));--list-blue:color-mix(in srgb,#326ca6 65%,var(--primary-text-color));--list-purple:color-mix(in srgb,#7b4ca0 65%,var(--primary-text-color));--list-orange:color-mix(in srgb,#a64b12 65%,var(--primary-text-color));--list-pink:color-mix(in srgb,#ac4274 65%,var(--primary-text-color));--dl-accent-ink:color-mix(in srgb,var(--primary-color) 60%,var(--primary-text-color));--dl-quiet-ink:color-mix(in srgb,var(--secondary-text-color) 65%,var(--primary-text-color));--dl-warning:var(--warning-color,#ffa600);--dl-warning-ink:color-mix(in srgb,var(--dl-warning) 60%,var(--primary-text-color));padding:16px;display:flex;flex-direction:column;gap:14px;height:100%;box-sizing:border-box;container-type:inline-size;overflow-wrap:anywhere;color:var(--primary-text-color);font-size:var(--ha-font-size-l,16px);line-height:1.4}
button{box-sizing:border-box;font:inherit;color:inherit;cursor:pointer}
button:disabled{opacity:.5;cursor:default}
:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
.head{display:flex;align-items:center;gap:12px;min-height:44px}
.head>ha-icon{flex:none;color:var(--state-icon-color,var(--primary-color));--mdc-icon-size:24px}
.title{flex:1;min-width:0}
.title h2{margin:0;font-size:var(--ha-font-size-xl,20px);font-weight:var(--ha-font-weight-medium,500);line-height:1.25}
.title p{margin:1px 0 0;font-size:var(--ha-font-size-m,14px);color:var(--secondary-text-color)}
.icon-btn{flex:none;width:44px;height:44px;margin:-6px -8px -6px 0;padding:0;border:none;border-radius:50%;background:transparent;color:var(--secondary-text-color);display:grid;place-items:center;--mdc-icon-size:24px}
.icon-btn:hover{background:var(--secondary-background-color);color:var(--primary-text-color)}
.summary{margin:0;line-height:1.45}
.calm,.quiet{margin:0;color:var(--secondary-text-color)}
.quiet{font-size:var(--ha-font-size-m,14px)}
.attn{display:flex;flex-direction:column;gap:6px}
@container (min-width:720px){.attn{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}}
.notice{display:flex;align-items:center;gap:12px;min-height:44px;width:100%;box-sizing:border-box;margin:0;padding:6px 12px 6px 6px;border:none;border-radius:10px;text-align:left;line-height:1.35;background:color-mix(in srgb,var(--dl-warning) 11%,transparent)}
.chip{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;--mdc-icon-size:20px;color:var(--dl-warning-ink);background:color-mix(in srgb,var(--dl-warning) 18%,transparent)}
.notice .text{flex:1;min-width:0}
.notice b{font-weight:var(--ha-font-weight-medium,500)}
.notice .meta{display:block;font-size:var(--ha-font-size-m,14px);color:var(--dl-quiet-ink)}
.notice.primary{background:color-mix(in srgb,var(--primary-color) 10%,transparent)}
.notice.primary .chip{color:var(--dl-accent-ink);background:color-mix(in srgb,var(--primary-color) 16%,transparent)}
.notice.neutral{background:var(--secondary-background-color,rgba(127,127,127,.1))}
.notice.neutral .chip{color:var(--secondary-text-color);background:color-mix(in srgb,var(--secondary-text-color) 14%,transparent)}
.go{flex:none;font-size:var(--ha-font-size-m,14px);font-weight:var(--ha-font-weight-medium,500);color:var(--dl-accent-ink)}
.days{display:grid;grid-template-columns:minmax(0,1fr);gap:12px 28px}
@container (min-width:600px){.days{grid-template-columns:repeat(2,minmax(0,1fr))}}
.col{display:flex;flex-direction:column;gap:8px;min-width:0}
.day{display:grid;grid-template-columns:minmax(52px,max-content) minmax(0,1fr);column-gap:12px;align-content:start;min-width:0}
.day h3{grid-column:1/-1;margin:0 0 2px;display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;min-height:26px;font-size:var(--ha-font-size-m,14px);font-weight:var(--ha-font-weight-medium,500);color:var(--secondary-text-color)}
.tag{display:inline-flex;align-items:center;gap:4px;padding:1px 8px 1px 6px;border-radius:999px;font-size:13px;font-weight:400;color:var(--primary-text-color);background:var(--secondary-background-color,rgba(127,127,127,.1));--mdc-icon-size:15px}
.row{grid-column:1/-1;display:grid;grid-template-columns:52px minmax(0,1fr);column-gap:12px;align-items:baseline;padding:5px 0;line-height:1.35}
@supports (grid-template-columns:subgrid){.row{grid-template-columns:subgrid}}
.t{font-variant-numeric:tabular-nums;font-weight:var(--ha-font-weight-medium,500);white-space:nowrap}
.t.ad{font-size:13px;font-weight:400;color:var(--secondary-text-color)}
.t ha-icon{--mdc-icon-size:18px;color:var(--secondary-text-color);vertical-align:-3px}
.row.past{color:var(--secondary-text-color)}
.row.past .t{font-weight:400}
.row.next .t{color:var(--dl-accent-ink)}
.suffix{font-size:var(--ha-font-size-m,14px);color:var(--secondary-text-color)}
.day .none{grid-column:1/-1;padding:5px 0;color:var(--secondary-text-color)}
.day .link{grid-column:1/-1;justify-self:start}
button.link{min-width:44px;min-height:44px;margin:0;padding:0;border:none;background:none;text-align:left;color:var(--dl-accent-ink);font-size:var(--ha-font-size-m,14px);font-weight:var(--ha-font-weight-medium,500)}
.items{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.items li{display:flex;gap:10px;align-items:baseline}
.items li::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:var(--secondary-text-color);transform:translateY(-3px)}
.answer{border-top:1px solid var(--divider-color);padding-top:12px;display:flex;flex-direction:column;gap:6px}
.answer .q{margin:0;font-size:var(--ha-font-size-m,14px);color:var(--secondary-text-color)}
.answer .text{line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}
.actions{display:flex;flex-wrap:wrap;gap:0 20px;align-items:center}
.ask{display:flex;align-items:center;gap:6px;min-height:48px;box-sizing:border-box;padding:2px 2px 2px 12px;border:1px solid transparent;border-radius:24px;background:var(--secondary-background-color,rgba(127,127,127,.1));cursor:text}
.ask:focus-within{border-color:var(--primary-color)}
.ask>ha-icon{flex:none;--mdc-icon-size:20px;color:var(--secondary-text-color)}
.ask input{flex:1;min-width:0;min-height:44px;box-sizing:border-box;margin:0;padding:0;border:none;outline:none;background:transparent;font:inherit;font-size:max(16px,var(--ha-font-size-l,16px));color:var(--primary-text-color)}
.ask input::placeholder{color:var(--dl-quiet-ink);opacity:1}
.send{flex:none;width:44px;height:44px;padding:0;border:none;border-radius:50%;display:grid;place-items:center;background:transparent;color:var(--secondary-text-color);--mdc-icon-size:20px}
.send.ready{background:color-mix(in srgb,var(--primary-color) 80%,var(--primary-text-color));color:var(--text-primary-color,#fff)}
.meta-line{margin:0;font-size:var(--ha-font-size-s,12px);color:var(--secondary-text-color)}
.ask+.meta-line{margin:-6px 0 0 14px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
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
const LIST_ICONS = {
  list: "mdi:format-list-checks",
  scissors: "mdi:content-cut",
  palette: "mdi:palette-outline",
  suitcase: "mdi:bag-suitcase-outline",
  house: "mdi:home-outline",
  sparkles: "mdi:creation",
  basket: "mdi:basket-outline",
  gift: "mdi:gift-outline",
  book: "mdi:book-open-variant",
  plane: "mdi:airplane",
  heart: "mdi:heart-outline",
  leaf: "mdi:leaf",
  wrench: "mdi:wrench-outline",
};
const LIST_COLOURS = {
  default: "var(--list-default)",
  green: "var(--list-green)",
  blue: "var(--list-blue)",
  purple: "var(--list-purple)",
  orange: "var(--list-orange)",
  pink: "var(--list-pink)",
};
function listMark(list) {
  if (!list || typeof list.name !== "string") return null;
  const mark = el(
    "span",
    { title: list.name, className: "list-mark" },
    icon(LIST_ICONS[list.icon] || LIST_ICONS.list),
  );
  mark.style.borderInlineStart = `3px solid ${LIST_COLOURS[list.colour] || LIST_COLOURS.default}`;
  // Screen readers name the list; the icon alone says nothing.
  mark.setAttribute("role", "img");
  mark.setAttribute("aria-label", list.name);
  return mark;
}
const icon = (name) => el("ha-icon", { icon: name });

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
    // Without a title, the date is the heading. A set title stays the
    // heading, with the date below it.
    this._config = {
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
    const board = briefingBoard(this._briefing);
    if (!board) return 4;
    const rows = board.days.reduce(
      (sum, day) => sum + day.rows.length,
      board.attention.length,
    );
    return Math.min(12, 3 + Math.ceil(rows * 0.6));
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
    this._poll = undefined;
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
    // Back on the page: wait again for an answer that is on its way.
    if (this._answer?.status === "waiting" && this._pending)
      this._waitFor(this._pending.messageId, this._pending.startedAt);
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
    this._pending = { messageId, startedAt };
    // Off the page, the card asks again when it is back (see _start).
    if (!this.isConnected) return;
    const poll = setTimeout(async () => {
      try {
        const reply = await this._client().request(`api/card/ask/${messageId}`);
        // A reconnect or a newer question may have replaced this in-flight poll.
        if (this._poll !== poll) return;
        if (reply.status === "done" || reply.status === "failed") {
          this._pending = null;
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
      // The card left the page while it asked.
      if (this._poll !== poll) return;
      if (Date.now() - startedAt > ANSWER_WAIT_MS) {
        this._pending = null;
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
    this._poll = poll;
  }

  _openDaylight() {
    const app =
      this._app || findApp(this._hass && this._hass.panels, this._config.app);
    const path = `/${(app && app.path) || ""}`;
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
    const board = briefingBoard(b);
    const card = el("ha-card", {}, this._head(b));
    if (board) this._board(card, b, board);
    else if (b) this._items(card, b);
    else if (!this._error)
      card.append(
        el("p", { className: "quiet", textContent: this._t("loading") }),
      );
    if (this._error)
      card.append(el("p", { className: "quiet", textContent: this._error }));
    // The answer stands above the box for the follow-up.
    if (this._answer) card.append(this._answerBlock(this._answer));
    if (this._config.show_prompt && b)
      card.append(this._askBox(typed, focused));
    if (!this._error && b && b.updatedAt)
      card.append(
        el("p", {
          className: "meta-line",
          textContent: `${this._t(board ? "summaryAt" : "writtenAt", clockTime(b.updatedAt, cardLocale(this._hass)))}${b.stale ? this._t("updateFollows") : ""}`,
        }),
      );
    root.replaceChildren(el("style", { textContent: STYLE }), card);
  }

  /** The date as the heading, the profile below, and a way into Daylight. */
  _head(b) {
    const title =
      typeof this._config.title === "string" ? this._config.title.trim() : "";
    const sub = b
      ? (title ? [b.date, b.name] : [b.name]).filter(Boolean).join(" · ")
      : "";
    let open = null;
    if (findApp(this._hass && this._hass.panels, this._config.app)) {
      open = el(
        "button",
        {
          className: "icon-btn",
          type: "button",
          title: this._t("openDaylight"),
          onclick: () => this._openDaylight(),
        },
        icon("mdi:open-in-new"),
      );
      open.setAttribute("aria-label", this._t("openDaylight"));
    }
    return el(
      "div",
      { className: "head" },
      icon("mdi:white-balance-sunny"),
      el(
        "div",
        { className: "title" },
        el("h2", { textContent: title || (b && b.date) || "Daylight" }),
        sub ? el("p", { textContent: sub }) : null,
      ),
      open,
    );
  }

  /** The summary line, what needs attention, then the days. */
  _board(card, b, board) {
    const locale = cardLocale(this._hass);
    if (typeof b.summary === "string" && b.summary)
      card.append(el("p", { className: "summary", textContent: b.summary }));
    const notices = board.attention
      .map((notice) => this._notice(notice, board.today, locale))
      .filter(Boolean);
    if (notices.length)
      card.append(el("div", { className: "attn" }, ...notices));
    if (board.more > 0) card.append(this._more(board.more));
    const filled = (day) =>
      day.rows.length > 0 ||
      day.more > 0 ||
      (Array.isArray(day.weather) && day.weather.length > 0);
    const [today, ...later] = board.days;
    if (!notices.length && !(board.more > 0) && !board.days.some(filled)) {
      card.append(el("p", { className: "calm", textContent: this._t("calm") }));
      return;
    }
    // A failed update leaves old rows; then no time is marked as next.
    const live = !this._error;
    const rest = later.filter(filled).map((day) => this._day(day, live));
    card.append(
      el(
        "div",
        { className: "days" },
        today ? el("div", { className: "col" }, this._day(today, live)) : null,
        rest.length ? el("div", { className: "col" }, ...rest) : null,
      ),
    );
  }

  _notice(notice, today, locale) {
    if (!notice || typeof notice !== "object") return null;
    const t = (key, value) => this._t(key, value);
    const row = (tone, name, label, text, meta, list) =>
      el(
        "div",
        { className: `notice ${tone}` },
        el("span", { className: "chip" }, listMark(list) || icon(name)),
        el(
          "span",
          { className: "text" },
          el("b", { textContent: label }),
          ` ${text}`,
          el("span", { className: "meta", textContent: meta }),
        ),
      );
    switch (notice.kind) {
      case "overdue":
        // A phone has no hover: the list name is written next to the date.
        return row(
          (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${notice.since}T00:00:00Z`)) / 86400000 >= 7 ? "warning" : "neutral",
          "mdi:checkbox-blank-circle-outline",
          t("overdue"),
          String(notice.title),
          [
            t("since", dayName(notice.since, today, locale)),
            notice.list && typeof notice.list.name === "string"
              ? notice.list.name
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          notice.list,
        );
      case "bins":
        return row(
          "warning",
          "mdi:trash-can-outline",
          t("tonight"),
          t("binsOut", notice.title),
          t("pickupTomorrow"),
        );
      case "document":
        return row(
          "neutral",
          "mdi:file-document-outline",
          t("expires"),
          String(notice.title),
          t("onDate", dayName(notice.date, today, locale)),
        );
      case "approvals": {
        const count = Number(notice.count) || 0;
        if (count < 1) return null;
        // Approvals stay in Daylight: the card only leads there.
        return el(
          "button",
          {
            className: "notice primary",
            type: "button",
            onclick: () => this._openDaylight(),
          },
          el("span", { className: "chip" }, icon("mdi:shield-check-outline")),
          el(
            "span",
            { className: "text" },
            el("b", { textContent: t("approval") }),
            ` ${count === 1 ? t("waitsOne") : t("waitsMany", count)}`,
            el("span", { className: "meta", textContent: t("inDaylight") }),
          ),
          el("span", { className: "go", textContent: t("review") }),
        );
      }
      default:
        return null;
    }
  }

  _day(day, live) {
    const heading = el(
      "h3",
      {},
      el("span", { textContent: String(day.label) }),
    );
    for (const note of Array.isArray(day.weather) ? day.weather : [])
      heading.append(
        el(
          "span",
          { className: "tag" },
          icon(WEATHER_ICONS[note.kind] || "mdi:alert-outline"),
          String(note.text),
        ),
      );
    const section = el("section", { className: "day" }, heading);
    for (const row of day.rows) {
      const line = this._row(row, live);
      if (line) section.append(line);
    }
    if (!day.rows.length && !(day.more > 0))
      section.append(
        el("span", {
          className: "none",
          textContent: this._t("nothingPlanned"),
        }),
      );
    if (day.more > 0) section.append(this._more(day.more));
    return section;
  }

  _row(row, live) {
    if (!row || typeof row.title !== "string") return null;
    let time = el("span", { className: "t" });
    let label = null;
    let suffix = null;
    if (row.kind === "event" && !row.time)
      time = el("span", { className: "t ad", textContent: this._t("allDay") });
    else if (row.kind === "event" || row.kind === "reminder")
      time.textContent = String(row.time);
    else if (row.kind === "chore") {
      time.append(listMark(row.list) || icon("mdi:checkbox-blank-outline"));
      label = row.list?.name || this._t("chore");
    } else if (row.kind === "bins") time.append(icon("mdi:trash-can-outline"));
    else if (row.kind === "lunch" || row.kind === "dinner")
      time.append(icon("mdi:silverware-fork-knife"));
    if (row.kind === "reminder") suffix = this._t("reminder");
    if (row.kind === "lunch" || row.kind === "dinner")
      suffix = this._t(row.kind);
    const state =
      row.state === "past"
        ? " past"
        : row.state === "next" && live
          ? " next"
          : "";
    return el(
      "div",
      { className: `row${state}` },
      time,
      el(
        "span",
        { className: "x" },
        label
          ? el("span", { className: "sr", textContent: `${label}: ` })
          : null,
        row.title,
        suffix
          ? el("span", { className: "suffix", textContent: ` · ${suffix}` })
          : null,
      ),
    );
  }

  /** Entries that the card leaves out are in Daylight. */
  _more(count) {
    return el("button", {
      className: "link",
      type: "button",
      textContent: this._t("more", count),
      onclick: () => this._openDaylight(),
    });
  }

  /** The list of a server older than the board. */
  _items(card, b) {
    const items = Array.isArray(b.items) ? b.items : [];
    card.append(
      el(
        "ul",
        { className: "items" },
        ...items.map((item) => el("li", { textContent: String(item) })),
      ),
    );
    // The plain list already says that actions wait.
    if (b.approvals > 0 && b.source !== "plain")
      card.append(
        el(
          "div",
          { className: "attn" },
          this._notice({ kind: "approvals", count: b.approvals }),
        ),
      );
  }

  _answerBlock(a) {
    const text = el("div", { className: "text" });
    // Answers are plain text: model output must never fetch image URLs.
    text.textContent =
      a.status === "waiting" ? this._t("thinking") : cardAnswerText(a.text);
    return el(
      "div",
      { className: "answer" },
      el("p", { className: "q", textContent: a.question }),
      text,
      a.approvals > 0
        ? el("p", {
            className: "quiet",
            textContent: this._t("needsApproval"),
          })
        : null,
      el(
        "div",
        { className: "actions" },
        el("button", {
          className: "link",
          type: "button",
          textContent: this._t("openInDaylight"),
          onclick: () => this._openDaylight(),
        }),
        a.status === "waiting"
          ? null
          : el("button", {
              className: "link",
              type: "button",
              textContent: this._t("newQuestion"),
              onclick: () => {
                this._answer = null;
                this._conversationId = null;
                this._render();
              },
            }),
      ),
    );
  }

  /** The question box. The send button takes the accent once there is text. */
  _askBox(typed, focused) {
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
    const send = el(
      "button",
      {
        className: typed.trim() ? "send ready" : "send",
        type: "button",
        title: this._t("ask"),
        disabled: this._answer?.status === "waiting",
      },
      icon("mdi:send"),
    );
    send.setAttribute("aria-label", this._t("ask"));
    input.oninput = () =>
      send.classList.toggle("ready", input.value.trim() !== "");
    const submit = () => {
      // While an answer is on its way, the typed text stays in the box.
      if (!input.value.trim() || this._answer?.status === "waiting") return;
      const value = input.value;
      input.value = "";
      send.classList.remove("ready");
      this._ask(value);
    };
    send.onclick = submit;
    input.onkeydown = (event) => {
      if (event.key === "Enter" && !event.isComposing) submit();
    };
    const box = el(
      "div",
      { className: "ask" },
      icon("mdi:message-outline"),
      input,
      send,
    );
    box.onclick = (event) => {
      if (!send.contains(event.target)) input.focus();
    };
    if (focused) queueMicrotask(() => input.focus());
    return box;
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
