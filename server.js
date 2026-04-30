const express = require("express")
const cors = require("cors")
const axios = require("axios")
require("dotenv").config()

const app = express()
app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Quiz API is running")
})

const syllabusMap = {
  1: ["Introduction to C++", "Setting Up Environment", "Structure of C++ Program"],
  2: ["Input and Output", "Variables", "Data Types"],
  3: ["Operators", "Type Casting", "Constants and Keywords"],
  4: ["If-else Statements", "Switch Case", "For Loop"],
  5: ["While Loop", "Do-while Loop", "Function Basics"],
  6: ["Arrays"],
  final: [
    "Introduction to C++",
    "Setting Up Environment",
    "Structure of C++ Program",
    "Input and Output",
    "Variables",
    "Data Types",
    "Operators",
    "Type Casting",
    "Constants and Keywords",
    "If-else Statements",
    "Switch Case",
    "For Loop",
    "While Loop",
    "Do-while Loop",
    "Function Basics",
    "Arrays"
  ]
}

app.post("/generate-quiz", async (req, res) => {
  try {
    const level = req.body.level || 1
    const topics = syllabusMap[level] || syllabusMap[1]

    const prompt = `
You are a STRICT beginner C++ teacher.

Generate EXACTLY 20 MCQs.

RULES:
- Very easy beginner level only
- No advanced questions
- Return ONLY JSON array
- NO explanation
- NO markdown

TOPICS:
${topics.join(", ")}

FORMAT:
[
  {
    "question": "string",
    "options": ["A","B","C","D"],
    "answer": "A",
    "hint": "simple hint"
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

    let text = response.data?.choices?.[0]?.message?.content

    if (!text) {
      return res.status(500).json({ error: "Empty AI response" })
    }

    // SAFE CLEANING
    text = text.replace(/```json/g, "").replace(/```/g, "").trim()

    let quiz = []

    try {
      quiz = JSON.parse(text)
    } catch (err) {
      console.log("❌ JSON PARSE ERROR")
      console.log(text)

      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text
      })
    }

    // SAFE NORMALIZATION
    quiz = quiz.map(q => ({
      question: q.question || "No question",
      options: Array.isArray(q.options)
        ? q.options.slice(0, 4)
        : ["A", "B", "C", "D"],
      answer: q.answer || "A",
      hint: q.hint || "Think step by step"
    }))

    res.json(quiz)

  } catch (error) {
    console.log("❌ SERVER ERROR:", error.response?.data || error.message)

    res.status(500).json({
      error: "Quiz generation failed",
      details: error.response?.data || error.message
    })
  }
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})