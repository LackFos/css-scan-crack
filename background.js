!(function () {
  const e = /Chrome/.test(navigator.userAgent),
    t = navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
  function s(e, t) {
    t
      ? chrome.tabs.sendMessage(t.id, e)
      : chrome.tabs.query({ active: !0, currentWindow: !0 }, function (t) {
          t[0] && chrome.tabs.sendMessage(t[0].id, e, function (e) {});
        });
  }
  function a(e, t, s) {
    chrome.scripting.executeScript({ files: ["main.js"], target: { tabId: e.id, allFrames: !0 } });
  }
  chrome.action.onClicked.addListener(function (s) {
    !e || t || s.url.startsWith("http") || s.url.startsWith("chrome")
      ? a(s)
      : chrome.extension.isAllowedFileSchemeAccess(function (e) {
          e
            ? a(s)
            : (chrome.tabs.create({ url: chrome.runtime.getURL("alert.html") }),
              setTimeout(() => {
                chrome.tabs.create({ url: "chrome://extensions/?id=" + chrome.runtime.id });
              }, 5e3));
        });
  }),
    chrome.commands.onCommand.addListener(function (e) {
      "activate-grid" === e
        ? chrome.storage.sync.get(["grid"], function (e) {
            chrome.storage.sync.set({ grid: !e.grid }, function () {});
          })
        : "scan-parent" === e
        ? s({ text: "scan-parent" })
        : "change-scan-status-by-shortcut" === e && s({ text: "changeScanStatus" });
    }),
    chrome.runtime.onMessage.addListener(function (e, t, a) {
      if ((t.tab && t.tab.id, "set" === e.action))
        chrome.storage.sync.set({ [e.prop]: e.status }, function () {
          a(`set ${e.prop} to ${e.status}`);
        });
      else if ("get" === e.action)
        chrome.storage.sync.get(function (e) {
          a(e);
        });
      else if ("getCommands" === e.action)
        chrome.commands.getAll(function (e) {
          a(e);
        });
      else if ("openShortcutsTab" === e.action) chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      else if ("close" === e.action) s({ text: "close" });
      else if ("start" === e.action) s({ text: "start" });
      else if ("getStylesFromUrl" === e.action)
        fetch(e.url)
          .then((t) => {
            t.text()
              .then((s) => a({ status: t.status, responseText: s, responseURL: e.url }))
              .catch((e) => {
                a({ fail: !0 });
              });
          })
          .catch((e) => {
            a({ fail: !0 });
          });
      else {
        if ("changeScanStatus" === e.action) return a(), void s({ text: e.action, status: e.status }, (t && t.tab) || void 0);
        if ("removeSelectedElements" === e.action) return a(), void s({ text: e.action, excludeSelf: !0 }, (t && t.tab) || void 0);
        if ("openTab" === e.action) chrome.tabs.create({ url: e.url });
        else if ("validate_license" === e.action) {
          const a = { key: e.key, ua: navigator.userAgent, timestamp: Date.now() };
          fetch("https://mycssscan.com/api/license/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(a),
          })
            .then((e) => e.json())
            .then((e) => {
              if (void 0 !== e.key)
                s({ text: "validate_result", valid: !0 }, (t && t.tab) || void 0),
                  chrome.storage.local.set({ cssscan_license: a }),
                  t && t.tab && t.tab.id
                    ? setTimeout(() => {
                        chrome.scripting.executeScript({ files: ["main.js"], target: { allFrames: !0, tabId: t.tab.id } });
                      }, 1100)
                    : chrome.tabs.query({ active: !0, currentWindow: !0 }, function (e) {
                        e[0] &&
                          setTimeout(() => {
                            chrome.scripting.executeScript({ files: ["main.js"], target: { allFrames: !0, tabId: e[0].id } });
                          }, 1100);
                      });
              else {
                let n = "Invalid license. Please check mycssscan.com";
                "already used a lot" === e &&
                  (n = "This license has already reached its activation limits. Please reset your activations at MyCssScan.com"),
                  s({ text: "validate_result", valid: !1, alert: n, key: a.key }, (t && t.tab) || void 0);
              }
            })
            .catch((e) => {
              e && 403 === e.status
                ? s(
                    {
                      text: "validate_result",
                      valid: !1,
                      alert: "This license has already reached its activation limits. Please reset your activations at mycssscan.com",
                      key: a.key,
                    },
                    (t && t.tab) || void 0
                  )
                : e && 400 === e.status
                ? s({ text: "validate_result", valid: !1, alert: "Invalid license. Please check mycssscan.com" })
                : s(
                    {
                      text: "validate_result",
                      valid: !1,
                      alert: "No internet connection or our servers are offline. Sorry for the inconvenience, please try again later.",
                    },
                    (t && t.tab) || void 0
                  );
            });
        }
      }
      return !0;
    }),
    chrome.contextMenus.onClicked.addListener(function (e, t) {
      "cssScanInspect" == e.menuItemId &&
        (t && t.id
          ? a(t)
          : chrome.tabs.query({ active: !0, currentWindow: !0 }, function (e) {
              a(e[0]);
            }));
    }),
    chrome.runtime.onInstalled.addListener((e) => {
      e.previousVersion && chrome.storage.sync.set({ have_seen_updates: !1 }, function () {}),
        chrome.storage.local.set({ cssscan_version: chrome.runtime.getManifest().version }, function () {});
    }),
    chrome.contextMenus.create(
      { title: chrome.i18n.getMessage("context_menu"), id: "cssScanInspect", contexts: ["all"] },
      () => chrome.runtime.lastError
    ),
    setInterval(() => {
      try {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.PING });
      } catch (e) {}
    }, 1e4);
})();
