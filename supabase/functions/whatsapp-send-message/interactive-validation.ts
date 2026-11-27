export interface ValidationResult {
  ok: boolean;
  error?: string;
}

function characterLength(value: string): number {
  return Array.from(value).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateReplyButtonConstraints(value: unknown): ValidationResult {
  if (!isRecord(value) || value.type !== "button") return { ok: true };

  const body = value.body;
  if (!isRecord(body) || typeof body.text !== "string" || !body.text.trim()) {
    return { ok: false, error: "Reply button messages require non-empty body.text" };
  }
  if (characterLength(body.text) > 1024) {
    return { ok: false, error: "Reply button body.text exceeds the 1024 character limit" };
  }

  if (value.header !== undefined) {
    if (!isRecord(value.header) || value.header.type !== "text" ||
        typeof value.header.text !== "string" || !value.header.text.trim()) {
      return { ok: false, error: "Reply button header must be a non-empty text header" };
    }
    if (characterLength(value.header.text) > 60) {
      return { ok: false, error: "Reply button header.text exceeds the 60 character limit" };
    }
  }

  if (value.footer !== undefined) {
    if (!isRecord(value.footer) || typeof value.footer.text !== "string" || !value.footer.text.trim()) {
      return { ok: false, error: "Reply button footer.text must be a non-empty string" };
    }
    if (characterLength(value.footer.text) > 60) {
      return { ok: false, error: "Reply button footer.text exceeds the 60 character limit" };
    }
  }

  if (!isRecord(value.action) || !Array.isArray(value.action.buttons)) {
    return { ok: false, error: "Reply button messages require action.buttons" };
  }
  const buttons = value.action.buttons;
  if (buttons.length < 1 || buttons.length > 3) {
    return { ok: false, error: "Reply button messages require 1-3 buttons" };
  }

  const titles = new Set<string>();
  for (const [index, button] of buttons.entries()) {
    if (!isRecord(button) || button.type !== "reply" || !isRecord(button.reply)) {
      return { ok: false, error: `Reply button ${index + 1} must use type=reply and include reply data` };
    }

    const id = button.reply.id;
    const title = button.reply.title;
    if (typeof id !== "string" || !id.trim()) {
      return { ok: false, error: `Reply button ${index + 1} requires a non-empty ID` };
    }
    if (characterLength(id) > 256) {
      return { ok: false, error: `Reply button ${index + 1} ID exceeds the 256 character limit` };
    }
    if (typeof title !== "string" || !title.trim()) {
      return { ok: false, error: `Reply button ${index + 1} requires a non-empty title` };
    }
    if (characterLength(title) > 20) {
      return { ok: false, error: `Reply button ${index + 1} title exceeds the 20 character limit` };
    }

    const normalizedTitle = title.normalize("NFC").trim().toLowerCase();
    if (titles.has(normalizedTitle)) {
      return { ok: false, error: "Reply button titles must be unique" };
    }
    titles.add(normalizedTitle);
  }

  return { ok: true };
}
