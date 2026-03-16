const extractJson = (aiResponse) => {
  try {

    if (!aiResponse) return null;

    const firstBrace = aiResponse.indexOf("{");
    const lastBrace = aiResponse.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) return null;

    const jsonString = aiResponse.slice(firstBrace, lastBrace + 1);

    return JSON.parse(jsonString);

  } catch (err) {
    console.error("JSON parsing failed:", err);
    return null;
  }
};

module.exports = extractJson;
