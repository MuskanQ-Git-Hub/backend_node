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
  const { level } = req.body  // 1-6 or "final"

  const topics = syllabusMap[level] || syllabusMap[1]

  try {
    const prompt = `
You are an expert C++ teacher.

Generate EXACTLY 20 beginner-level MCQs.

IMPORTANT RULES:
- Only EASY beginner questions
- No advanced concepts
- No tricky questions
- Only based on given topics
- Return ONLY valid JSON array

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

    let text = response.data?.choices?.[0]?.message?.content || ""

    if (!text) return res.json([])

    text = text.replace(/```json/g, "").replace(/```/g, "").trim()

    let quiz = []

    try {
      quiz = JSON.parse(text)
    } catch (e) {
      console.log("RAW OUTPUT:", text)
      return res.json([])
    }

    quiz = quiz
      .filter(q => q?.question)
      .map(q => ({
        question: String(q.question),
        options: Array.isArray(q.options)
          ? q.options.slice(0, 4)
          : ["A", "B", "C", "D"],
        answer: q.answer || "A",
        hint: q.hint || "Think step by step"
      }))

    res.json(quiz)

  } catch (error) {
    console.log(error.response?.data || error.message)
    res.status(500).json({ error: "Quiz generation failed" })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})