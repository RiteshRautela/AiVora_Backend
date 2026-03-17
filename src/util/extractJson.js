const extractJson = (aiResponse) => {
  try {
    if (!aiResponse) return null;

    // 🔥 Remove markdown wrappers if AI adds them
    aiResponse = aiResponse.replace(/```json|```/g, "").trim();

    // 🔥 Find first valid JSON block
    const match = aiResponse.match(/\{[\s\S]*\}/);

    if (!match) {
      console.log("❌ No JSON found in AI response");
      return null;
    }

    const jsonString = match[0];

    // 🔥 Parse safely
    const parsed = JSON.parse(jsonString);

    // 🔥 Basic structure validation
    if (!parsed.code || !parsed.message) {
      console.log("❌ Missing required fields:", parsed);
      return null;
    }

    return parsed;

  } catch (err) {
    console.error("❌ JSON parsing failed:", err);
    return null;
  }
};

module.exports = extractJson;