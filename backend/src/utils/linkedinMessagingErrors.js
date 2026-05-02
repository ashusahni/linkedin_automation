/**
 * Maps raw PhantomBuster / LinkedIn container output into stable API fields for the UI.
 * @param {string} rawMessage
 * @returns {{ status: number, code: string, message: string, failureReason: string, tips?: string[] } | null}
 */
export function classifyLinkedInMessagingFailure(rawMessage) {
  const msg = String(rawMessage || "");
  const lower = msg.toLowerCase();

  const looksMessagingContext =
    /send message|message sender|linkedin message|inmail|\bmessaging\b|dm\b|direct message/i.test(msg) ||
    (/container failed|exit code/i.test(msg) &&
      /(premium|inmail|sales navigator|open profile|message|cannot|restricted|degree|rate limit)/i.test(msg));

  if (!looksMessagingContext) {
    return null;
  }

  if (
    /linkedin premium|premium account|premium member|upgrade to premium|paid feature|requires premium|need.*premium|must have premium/i.test(
      lower
    )
  ) {
    return {
      status: 403,
      code: "PB_MESSAGE_PREMIUM_REQUIRED",
      failureReason: "premium_required",
      message:
        "LinkedIn did not allow this message with your current account. A Premium or Sales Navigator subscription is often required to message people outside your network or in certain cases.",
      tips: [
        "Try messaging someone you are already connected to (1st degree), or upgrade your LinkedIn plan.",
        "You can still send connection requests with a note from an Auto Connect phantom where supported.",
      ],
    };
  }

  if (/sales navigator|inmail|recruiter lite|recruiter account|sn account/i.test(lower)) {
    return {
      status: 403,
      code: "PB_MESSAGE_SALES_NAV_REQUIRED",
      failureReason: "sales_navigator_required",
      message:
        "This action requires Sales Navigator or InMail credits. Your account does not appear to have access for this recipient.",
      tips: ["Use a Sales Navigator account in PhantomBuster, or adjust your campaign to connection-request steps first."],
    };
  }

  if (/open profile|open.?profile|can.?t message|cannot message|messaging.?restricted|not accepting messages|only accept/i.test(lower)) {
    return {
      status: 400,
      code: "PB_MESSAGE_RECIPIENT_RESTRICTED",
      failureReason: "recipient_restricted",
      message:
        "This person cannot receive your message the usual way (Open Profile only, messaging closed, or degree restrictions).",
      tips: ["Try a connection request with a short note instead, or use email if you have it."],
    };
  }

  if (/rate limit|too many|temporarily restricted|unusual activity|try again later|weekly invitation/i.test(lower)) {
    return {
      status: 429,
      code: "PB_MESSAGE_RATE_LIMITED",
      failureReason: "rate_limited",
      message: "LinkedIn temporarily limited this action. Wait before sending more messages or invites.",
      tips: ["Reduce daily volume in PhantomBuster settings and spread sends over more hours."],
    };
  }

  if (/not connected|degree|2nd|3rd|first.?degree|must be connected/i.test(lower) && /message|inmail|dm/i.test(lower)) {
    return {
      status: 400,
      code: "PB_MESSAGE_DEGREE_RESTRICTED",
      failureReason: "connection_required",
      message: "LinkedIn only allows this type of message for certain connection degrees. You may need to connect first.",
      tips: ["Send a connection request first, then follow up with a message once accepted."],
    };
  }

  return null;
}
