require("dotenv").config();
const mongoose = require("mongoose");
const Website = require("../src/models/website");

async function fixDeployUrls() {
  const dbUri = process.env.DB_CONNECTION_SECRET;
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.trim().replace(/^"|"$/g, "").replace(/\/+$/, "")
    : "";

  if (!dbUri) {
    throw new Error("DB_CONNECTION_SECRET is missing in .env");
  }

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is missing in .env");
  }

  await mongoose.connect(dbUri);

  const websites = await Website.find({
    slug: { $exists: true, $ne: null },
    $or: [
      { deployed: true },
      { deployurl: { $exists: true, $ne: null } },
    ],
  });

  let updatedCount = 0;

  for (const website of websites) {
    const expectedDeployUrl = `${frontendUrl}/live/${website.slug}`;
    let changed = false;

    if (website.deployurl !== expectedDeployUrl) {
      website.deployurl = expectedDeployUrl;
      changed = true;
    }

    if (website.deployed !== true) {
      website.deployed = true;
      changed = true;
    }

    if (changed) {
      await website.save();
      updatedCount += 1;
      console.log(`Updated ${website._id} -> ${website.deployurl}`);
    }
  }

  console.log(`Done. Updated ${updatedCount} website(s).`);
}

fixDeployUrls()
  .catch((error) => {
    console.error("Failed to fix deploy URLs:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
