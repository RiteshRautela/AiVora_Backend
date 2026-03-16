const express = require("express");
const websiteRouter = express.Router();
const { userAuth } = require("../middleware/auth");
const Website = require("../models/website");
const generateResponse = require("../config/openRouter");
const extractJson = require("../util/extractJson");

websiteRouter.post("/generate", userAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const { _id, credits } = req.user;
    if (!prompt) {
      return res.status(400).json({ message: "prompt is required" });
    }

    if (credits < 50) {
      return res
        .status(400)
        .json({ message: "you have not enough credits to generate a webiste" });
    }

    const finalPrompt = process.env.masterPrompt.replace("USER_PROMPT", prompt);

    let aiResponse = await generateResponse(finalPrompt);
    console.log("AI RAW RESPONSE:", aiResponse);
    let cleanAiResponse = extractJson(aiResponse);

    if (!cleanAiResponse) {
      aiResponse = await generateResponse(
        finalPrompt + "\nRETURN ONLY RAW JSON",
      );
      cleanAiResponse = extractJson(aiResponse);
    }

    if (!cleanAiResponse || !cleanAiResponse.code) {
      return res.status(400).json({ message: "AI returned invalid response" });
    }

    const slug =
      prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40) +
      "-" +
      Date.now();

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
    req.user.credits -= 50;
    await req.user.save();

    return res
      .status(201)
      .json({ website: website._id, remainingCredits: req.user.credits });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET WEBSITE BY ID
websiteRouter.get("/website/:id", userAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { _id } = req.user;

    const website = await Website.findOne({
      _id: id,
      user: _id,
    });

    if (!website) {
      return res.status(404).json({ message: "website not found" });
    }

    res.status(200).json(website);
  } catch (error) {
    res.status(500).json({
      message: `get website by id error ${error}`,
    });
  }
});

module.exports = websiteRouter;
