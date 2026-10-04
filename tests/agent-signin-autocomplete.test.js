// QA5 fix regression (claim qa5-fix-fo-1): autocomplete contract on the agent
// sign-in forms. The credentials form must expose standard autocomplete
// tokens so password managers can save and fill agent identities; the create
// and make-room forms keep autocomplete="off" (fresh-secret and room-title
// entry — no credential reuse). Asserted on the mounted render boundary, the
// same pattern as tests/auth-signin-ui.test.js.
import test from "node:test";
import assert from "node:assert/strict";
import { createAgentSigninUI } from "../src/agent-signin-ui.js";

// render() reads document.activeElement; no DOM in node:test.
globalThis.document ??= { activeElement: null };

function fakeContainer() {
  const listeners = {};
  let html = "";
  return {
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; },
    hidden: false,
    listeners,
    addEventListener(name, fn) { (listeners[name] ??= []).push(fn); },
    removeEventListener(name, fn) { listeners[name] = (listeners[name] ?? []).filter((f) => f !== fn); },
    contains() { return false; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    fire(name, event) { for (const fn of listeners[name] ?? []) fn(event); },
  };
}

function mount() {
  const ui = createAgentSigninUI({ onSignedIn: async () => {}, firstRunActions: {} });
  const container = fakeContainer();
  ui.mount(container);
  return container;
}

// Pretend the click target matches one data-* selector, like the closest()
// shims in tests/auth-signin-ui.test.js.
const clickOn = (datasetKind) => ({
  target: { closest: (sel) => (sel === `[data-${datasetKind}]` ? {} : null) },
});

test("credentials form exposes username/current-password autocomplete", () => {
  const c = mount();
  const form = c.innerHTML.match(/<form[^>]*data-agent-form="credentials"[^>]*>/);
  assert.ok(form, "credentials form rendered");
  assert.doesNotMatch(form[0], /autocomplete="off"/, "credentials form must not disable autocomplete");
  assert.match(c.innerHTML, /name="identityId"[^>]*autocomplete="username"/, "identityId fills like a username");
  assert.match(c.innerHTML, /name="secret"[^>]*autocomplete="current-password"/, "secret fills like a current password");
});

test("create form keeps autocomplete off", () => {
  const c = mount();
  c.fire("click", clickOn("agent-new"));
  const form = c.innerHTML.match(/<form[^>]*data-agent-form="create"[^>]*>/);
  assert.ok(form, "create form rendered");
  assert.match(form[0], /autocomplete="off"/, "create form keeps autocomplete off");
});

test("make-room form keeps autocomplete off", () => {
  const c = mount();
  c.fire("click", clickOn("agent-create-room"));
  const form = c.innerHTML.match(/<form[^>]*data-agent-form="make-room"[^>]*>/);
  assert.ok(form, "make-room form rendered");
  assert.match(form[0], /autocomplete="off"/, "make-room form keeps autocomplete off");
});
