const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/analyze", async (req, res) => {
  const { title, description } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `
You classify lost items by importance. Return STRICT JSON ONLY:
{
  "category": "...",
  "value_bucket": "very_high | high | medium | low",
  "has_docs": true/false,
  "is_essential": true/false
}
Rules:
- Phones, laptops, wallets, IDs = very_high
- Keys, important items = high
- Bags, clothing = medium
- Junk or unclear = low
`
        },
        {
          role: "user",
          content: `TITLE: ${title}\nDESCRIPTION: ${description}`
        }
      ]
    });

    const ai = JSON.parse(completion.choices[0].message.content);
    res.json(ai);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

app.listen(3000, () => console.log("AI server using Groq running on port 3000"));