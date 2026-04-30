const express = require("express")
const cors = require("cors")
const axios = require("axios")
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

app.post("/generate-quiz", async (req, res) => {
  const { topics } = req.body

  try {
    const prompt = `
You are a strict JSON generator.

Generate 20 MCQs.

Topics:
${topics.join(", ")}

RULES:
- return ONLY JSON array
- each item must have:
  question (string)
  options (array of 4 strings)
  answer (string)
  hint (string)

FORMAT ONLY:
[
  {
    "question": "string",
    "options": ["A","B","C","D"],
    "answer": "A",
    "hint": "string"
  }
]
`

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    let text = response.data.choices[0].message.content

    if (!text) return res.json([])

    // clean
    text = text.replace(/```json/g, "").replace(/```/g, "").trim()

    let quiz = []

    try {
      quiz = JSON.parse(text)
    } catch (e) {
      console.log("RAW OUTPUT:", text)
      return res.json([])
    }

    // FORCE CLEAN STRUCTURE
    quiz = quiz.map(q => ({
      question: q.question,
      options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"],
      answer: q.answer || "A",
      hint: q.hint || "Think logically"
    }))

    res.json(quiz)

  } catch (error) {
    console.log(error.response?.data || error.message)
    res.status(500).json({ error: "Quiz generation failed" })
  }
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});