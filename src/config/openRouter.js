const openRouterURL = "https://openrouter.ai/api/v1/chat/completions";
// const model = "deepseek/deepseek-chat";
const model = "openrouter/free";

const generateResponse = async (prompt) => {

  const res = await fetch(openRouterURL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,

      messages: [
        {
          role: "system",
          content: `
You are a backend API.

Return ONLY valid JSON in this exact format:

{
  "message": "short confirmation",
  "code": "full html document"
}

Rules:
- No markdown
- No explanation
- No text before JSON
- No text after JSON
- Output must start with { and end with }
`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("openRouter error: " + err);
  }

  const data = await res.json();
  console.log("OPENROUTER DATA:", data);

  return data.choices[0].message.content;
};

module.exports = generateResponse;
