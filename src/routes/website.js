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

module.exports = websiteRouter;
