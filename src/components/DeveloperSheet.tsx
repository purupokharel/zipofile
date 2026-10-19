import { isTauri } from "../lib/platform";
import { externalLinkRel, safeExternalHref } from "../lib/safeUrl";

const VENMO = "https://account.venmo.com/u/purupokharel";
const PAYPAL = "https://www.paypal.me/PuruPokharel";
const DEV_SITE = "https://purul.link/";
const DEV_HREF = safeExternalHref(DEV_SITE);
const COUNTERPANEL = "https://counterpanel.com/";
const COUNTERPANEL_HREF = safeExternalHref(COUNTERPANEL);

function openOutside(e: React.MouseEvent<HTMLAnchorElement>) {
  if (!isTauri()) return;
  e.preventDefault();
  const url = safeExternalHref(e.currentTarget.href);
  if (!url) return;
  void import("@tauri-apps/api/core").then(({ invoke }) => invoke("open_external", { url: url.replace(/\/$/, "") }));
}

export function DeveloperSheet() {
  return (
    <div className="dev-sheet">
      <div className="coffee-who">
        <img src="/assets/img/puru.png" width={56} height={56} alt="Puru Pokharel" />
        <div>
          <b>Puru Pokharel</b>
          <em>Developer of ZipoFile</em>
          <p className="coffee-credit">
            CREATOR OF THE{" "}
            {COUNTERPANEL_HREF ? (
              <a href={COUNTERPANEL_HREF} target="_blank" onClick={openOutside} rel={`nofollow ${externalLinkRel}`}>
                COUNTERPANEL
              </a>
            ) : (
              "COUNTERPANEL"
            )}
          </p>
        </div>
      </div>
      <p className="coffee-note">
        If ZipoFile saved you time, a coffee supports its development and can help speed up the planned Windows and Linux native apps. Thank you.
      </p>
      <div className="coffee-pay">
        <a
          className="coffee-card venmo"
          href={VENMO}
          target="_blank"
          onClick={openOutside}
          rel={`nofollow ${externalLinkRel}`}
        >
          <svg viewBox="0 0 512 512" aria-hidden="true">
            <path
              d="m381.4 105.3c11 18.1 15.9 36.7 15.9 60.3 0 75.1-64.1 172.7-116.2 241.2h-118.8l-47.6-285 104.1-9.9 25.3 202.8c23.5-38.4 52.6-98.7 52.6-139.7 0-22.5-3.9-37.8-9.9-50.4z"
              fill="#008CFF"
            />
          </svg>
          <span>Venmo</span>
        </a>
        <a
          className="coffee-card paypal"
          href={PAYPAL}
          target="_blank"
          onClick={openOutside}
          rel={`nofollow ${externalLinkRel}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#003087"
              d="M7.2 21H3.7L6.2 3h7.4c2.2 0 3.9.5 5 1.6 1 .9 1.4 2.2 1.2 3.9-.6 4.6-3.4 6.7-7.8 6.7H9.6L8.5 21H4.8l.7-3.8h3.3"
            />
            <path
              fill="#009cde"
              d="M9.8 14.4h2.4c4.4 0 7.2-2.1 7.8-6.7.1-.9 0-1.7-.3-2.4 1.9 1.3 2.6 3.5 2.1 7.2-.7 4.7-3.9 6.8-8.4 6.8h-2.2L9.8 21H6.2l.7-3.8 2.9-2.8z"
            />
          </svg>
          <span>PayPal</span>
        </a>
      </div>
      <p className="dev-more">
        More at{" "}
        {DEV_HREF ? (
          <a href={DEV_HREF} target="_blank" onClick={openOutside} rel={`nofollow ${externalLinkRel}`}>
            purul.link
          </a>
        ) : (
          "purul.link"
        )}
      </p>
    </div>
  );
}
