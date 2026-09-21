import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";

interface ConsentHooks {
  onPreferencesShow?: () => void;
  onPreferencesHide?: () => void;
}

// Cookie consent (vanilla-cookieconsent): strictly necessary cookies are always
// on, everything else is opt-in. Nothing optional is loaded until the visitor
// accepts, and the choice can be changed later via any [data-cc] button.
export function initCookieConsent(hooks: ConsentHooks = {}) {
  CookieConsent.run({
    hideFromBots: false,
    guiOptions: {
      consentModal: { layout: "box", position: "bottom right", equalWeightButtons: true, flipButtons: false },
      preferencesModal: { layout: "box", equalWeightButtons: true, flipButtons: false },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      analytics: {},
    },
    onModalShow: ({ modalName }) => {
      if (modalName === "preferencesModal") hooks.onPreferencesShow?.();
    },
    onModalHide: ({ modalName }) => {
      if (modalName === "preferencesModal") hooks.onPreferencesHide?.();
    },
    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "Cookies on this site",
            description:
              "We use a small number of cookies to keep the site working and, only with your permission, to understand how it is used. You can change your choice at any time.",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            showPreferencesBtn: "Manage preferences",
            footer: "<a href=\"/privacy-policy/\">Privacy Policy</a><a href=\"/cookie-policy/\">Cookie Policy</a>",
          },
          preferencesModal: {
            title: "Cookie preferences",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject all",
            savePreferencesBtn: "Save preferences",
            closeIconLabel: "Close",
            sections: [
              {
                title: "How we use cookies",
                description:
                  "Choose which cookies you are comfortable with. Strictly necessary cookies cannot be switched off because the site relies on them.",
              },
              {
                title: "Strictly necessary",
                description: "Needed for the site to work and to remember your cookie choice.",
                linkedCategory: "necessary",
              },
              {
                title: "Analytics",
                description:
                  "Anonymous statistics about how the site is used, so we can improve it. Nothing is collected unless you accept.",
                linkedCategory: "analytics",
              },
            ],
          },
        },
      },
    },
  });
}
