type PushTokenRow = {
  token: string;
};

export async function sendGmailReminder(input: {
  to: string[];
  subject: string;
  text: string;
}) {
  const sender = requireSecret("GMAIL_SENDER_EMAIL");
  const accessToken = await getGmailAccessToken();
  const message = [
    `From: Yaadi <${sender}>`,
    `To: ${input.to.join(", ")}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text
  ].join("\r\n");
  const raw = encodeBase64Url(new TextEncoder().encode(message));
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${response.status} ${await response.text()}`);
  }
}

export async function sendExpoPush(tokens: PushTokenRow[], title: string, body: string) {
  if (tokens.length === 0) {
    return;
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify(tokens.map(({ token }) => ({
      to: token,
      sound: "default",
      title,
      body
    })))
  });

  if (!response.ok) {
    throw new Error(`Expo push send failed: ${response.status} ${await response.text()}`);
  }
}

async function getGmailAccessToken() {
  const params = new URLSearchParams({
    client_id: requireSecret("GOOGLE_CLIENT_ID"),
    client_secret: requireSecret("GOOGLE_CLIENT_SECRET"),
    refresh_token: requireSecret("GMAIL_REFRESH_TOKEN"),
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params
  });
  if (!response.ok) {
    throw new Error(`Gmail token refresh failed: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error("Gmail token refresh did not return an access token.");
  }
  return json.access_token as string;
}

function requireSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function encodeBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
