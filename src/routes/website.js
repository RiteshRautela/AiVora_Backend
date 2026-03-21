const express = require("express");
const websiteRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const Website = require("../models/website");
const generateResponse = require("../config/openRouter");
const extractJson = require("../util/extractJson");

websiteRouter.post("/generate", userAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const { _id } = req.user;

    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    const finalPrompt = process.env.masterPrompt.replace("USER_PROMPT", prompt);

    // 🔥 CALL AI
    let aiResponse = await generateResponse(finalPrompt);
    // console.log("AI RAW RESPONSE:", aiResponse);

    let cleanAiResponse = extractJson(aiResponse);

    // 🔥 RETRY IF FAILED
    if (!cleanAiResponse) {
      aiResponse = await generateResponse(
        finalPrompt + "\nRETURN ONLY RAW JSON"
      );
      cleanAiResponse = extractJson(aiResponse);
    }

    // ❌ STILL FAILED
    if (!cleanAiResponse) {
      return res.status(400).json({
        message: "AI returned invalid JSON",
      });
    }

    // 🔥 CLEAN HTML (FIX \n, \", etc.)
    if (cleanAiResponse.code) {
      let code = cleanAiResponse.code;

      code = code
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\t/g, "\t");

      // 🔥 FIX DUPLICATION BUG (VERY IMPORTANT)
      code = code.replace(/innerHTML\s*\+=/g, "innerHTML =");

      cleanAiResponse.code = code;
    }

    // 🔥 VALIDATE FINAL HTML
    if (
      !cleanAiResponse.code ||
      !cleanAiResponse.code.toLowerCase().includes("<!doctype html>")
    ) {
      return res.status(400).json({
        message: "AI returned invalid HTML",
      });
    }

    // console.log("FINAL CODE READY ✅");

    // 🔥 CREATE SLUG
    const slug =
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40) +
      "-" +
      Date.now();

    // 🔥 SAVE TO DB
    const website = new Website({
      user: _id,
      title: prompt.slice(0, 60),
      slug,
      latexcode: cleanAiResponse.code,
      conversations: [
        { role: "user", content: prompt },
        { role: "ai", content: cleanAiResponse.message },
      ],
    });

    await website.save();
    await req.user.save();

    // 🔥 RESPONSE
    return res.status(201).json({
      website: website._id,
      remainingCredits: req.user.credits,
    });

  } catch (err) {
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
});
// GET WEBSITE BY ID
websiteRouter.get("/getbyid/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    const website = await Website.findOne({
      _id: id,  // website id 
      user: _id, // user id pff
    });

    if (!website) {
      return res.status(404).json({ message: "website not found" });
    }

    res.status(200).json(website);
  } catch (error) {
    res.status(500).json({
      message: `get website by id error ${error.message}`,
    });
  }
});


websiteRouter.post("/update/:id", userAuth, async (req, res) => {

  try {
    const { prompt } = req.body;
    const { id } = req.params;
    const { _id } = req.user;

    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    // 🔥 FIND WEBSITE
    const website = await Website.findOne({
      _id: id,
      user: _id,
    });

    if (!website) {
      return res.status(404).json({ message: "website not found" });
    }

    // 🔥 BUILD UPDATE PROMPT
    const updatePrompt = `
UPDATE THIS WEBSITE.

CURRENT CODE:
${website.latexcode}

USER REQUEST:
${prompt}

RULES:
- Modify existing website
- Return FULL HTML document
- MUST include <!DOCTYPE html>

RETURN ONLY JSON:
{
  "message": "short confirmation",
  "code": "<!DOCTYPE html> FULL UPDATED HTML </html>"
}
`;

    // 🔥 CALL AI
    let aiResponse = await generateResponse(updatePrompt);
    let cleanAiResponse = extractJson(aiResponse);

    // 🔥 RETRY IF FAILED
    if (!cleanAiResponse) {
      aiResponse = await generateResponse(updatePrompt + "\nRETURN ONLY JSON");
      cleanAiResponse = extractJson(aiResponse);
    }

    if (!cleanAiResponse) {
      return res.status(400).json({
        message: "AI returned invalid JSON",
      });
    }

    // 🔥 CLEAN HTML (same as your generate route)
    if (cleanAiResponse.code) {
      let code = cleanAiResponse.code;

      code = code
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\t/g, "\t");

      code = code.replace(/innerHTML\s*\+=/g, "innerHTML =");

      cleanAiResponse.code = code;
    }

    // 🔥 VALIDATE HTML
    if (
      !cleanAiResponse.code ||
      !cleanAiResponse.code.toLowerCase().includes("<!doctype html>")
    ) {
      return res.status(400).json({
        message: "AI returned invalid HTML",
      });
    }

    // 🔥 UPDATE DB
    website.latexcode = cleanAiResponse.code;

    website.conversations.push(
      { role: "user", content: prompt },
      { role: "ai", content: cleanAiResponse.message }
    );

    await website.save();

    // 🔥 RESPONSE
    return res.status(200).json({
      message: cleanAiResponse.message,
      code: cleanAiResponse.code,
    });

  } catch (err) {
    console.error("❌ UPDATE ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
});


websiteRouter.get("/getall", userAuth, async (req, res) => {
  try {
    const websites = await Website.find({ user: req.user._id });

    return res.status(200).json(websites);
  } catch (error) {
    return res.status(500).json({
      message: `get all websites error ${error.message}`,
    });
  }
});

websiteRouter.get("/deploy/:id", userAuth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!website) {
      return res.status(400).json({ message: "website not found" });
    }

    // 🔥 create slug if not exists
    if (!website.slug) {
      website.slug =
        website.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 40) +
        "-" +
        website._id.toString().slice(-5);
    }

    // 🔥 mark deployed
    website.deployed = true;

    // 🔥 deploy URL
    website.deployurl = `${process.env.FRONTEND_URL}/site/${website.slug}`;

    await website.save();

    return res.status(200).json({
      url: website.deployurl,
    });
  } catch (error) {
    return res.status(500).json({
      message: `deploy website error ${error.message}`,
    });
  }
});

websiteRouter.get("/getbyslug/:slug", async (req, res) => {
  try {
    const website = await Website.findOne({
      slug: req.params.slug,
      user: req.user._id
    });

    if (!website) {
      return res.status(404).json({ message: "website not found" });
    }

    return res.status(200).json(website);
  } catch (error) {
    return res.status(500).json({
      message: `get website by slug error ${error.message}`,
    });
  }
});

module.exports = websiteRouter;
