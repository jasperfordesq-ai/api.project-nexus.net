# Web UK manual accessibility evidence

This register records directed browser and assistive-technology checks separately from the automated accessibility gate. An entry is evidence only for the exact page, browser, input method, viewport, and state listed. It is not a claim of WCAG conformance.

## 2026-07-12 - English sign-in error recovery

- Page: `http://127.0.0.1:5181/hour-timebank/accessible/login`
- Build: Web UK commit `dfead143`, using an isolated local listener and Laravel at `http://127.0.0.1:8088`
- Browser: Codex in-app browser; Chromium engine/version was not exposed by the inspection surface
- Assistive technology: none
- Input: browser-assisted pointer activation and focus inspection
- Viewports: default browser viewport and `320 x 640`

Observed outcomes:

- The English page exposed one main landmark, the `Sign in` level-one heading, labelled email and password fields, cookie controls, the skip link, service navigation, and footer navigation.
- Activating the empty sign-in form created one focused `role="alert"` GOV.UK error summary with `tabindex="-1"`.
- The summary contained two links, targeting `#email` and `#password`. The fields referenced `email-error` and `password-error` through `aria-describedby`.
- Activating the email-summary link moved focus to the email field.
- At `320 x 640`, the error state remained present and the document had no horizontal overflow (`scrollWidth 305`, `clientWidth 305`).

Limitations and open evidence:

- The in-app browser's keyboard-injection path did not dispatch Tab or Enter during this inspection. This entry therefore does **not** count as a manual keyboard-only pass. The repository's Playwright accessibility gate separately exercises cookie-control order, the skip link, summary focus, and error-link focus with keyboard input.
- No screen reader, magnifier, speech input, switch control, or representative disabled user was involved. Those checks remain open.
- Browser-engine/version diversity, 200% and 400% zoom, and operating-system high-contrast behavior remain open manual checks.
