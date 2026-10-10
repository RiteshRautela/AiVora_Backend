const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_FALLBACK_MODEL = "gemini-3.5-flash";
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

const systemInstruction = `
You are a backend API.

Return a JSON object with exactly these fields:
{
  "message": "short confirmation",
  "code": "full HTML document"
}

Rules:
- Return no markdown or explanation.
- The code field must contain the complete HTML document.
`;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const generateWithModel = async (prompt, model, apiKey) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let response;
    let data;

    try {
      response = await fetch(
        `${API_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            // Keep the Gemini API key on the backend; never expose it to the browser.
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              // Website output is long HTML, so allow a larger JSON response.
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      data = await response.json().catch(() => null);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) {
        error.retryable = true;
        throw error;
      }

      await wait(750 * (2 ** attempt) + Math.random() * 250);
      continue;
    }

    if (!response.ok) {
      const message = data?.error?.message || response.statusText;
      const error = new Error(`Gemini API error (${response.status}): ${message}`);
      error.status = response.status;
      error.retryable = RETRYABLE_STATUS_CODES.has(response.status);

      if (!error.retryable || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const backoff = 750 * (2 ** attempt) + Math.random() * 250;
      const retryDelay = retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : backoff;
      await wait(retryDelay);
      continue;
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      const reason = data?.promptFeedback?.blockReason;
      throw new Error(reason
        ? `Gemini returned no content (blocked: ${reason})`
        : "Gemini returned no text content");
    }

    return text;
  }
};

const generateResponse = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  try {
    return await generateWithModel(prompt, primaryModel, apiKey);
  } catch (error) {
    if (!error.retryable || primaryModel === fallbackModel) {
      throw error;
    }

    return generateWithModel(prompt, fallbackModel, apiKey);
  }
};

module.exports = generateResponse;
