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
  6: ["Arrays"]
}

// 🔥 fallback quiz generator (VERY IMPORTANT)
function generateFallbackQuiz() {
  let quiz = []

  for (let i = 1; i <= 20; i++) {
    quiz.push({
      question: `Basic question ${i}`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "Option A",
      hint: "Revise basics"
    })
  }

  return quiz
}

// 🔥 safe AI call with retry
async function getQuizFromAI(prompt) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    )

    let text = response.data?.choices?.[0]?.message?.content || ""

    text = text.replace(/```json/g, "").replace(/```/g, "").trim()

    return JSON.parse(text)

  } catch (err) {
    console.log("AI ERROR:", err.message)
    return null
  }
}

app.post("/generate-quiz", async (req, res) => {
  try {
    const level = req.body.level || 1
    const topics = syllabusMap[level] || syllabusMap[1]

    const prompt = `
Generate EXACTLY 20 beginner MCQs.

STRICT RULES:
- return ONLY JSON
- no explanation
- no markdown
- options must be full text answers (NOT A,B,C,D)

Topics:
${topics.join(", ")}

FORMAT:
[
  {
    "question": "string",
    "options": ["option1","option2","option3","option4"],
    "answer": "option1",
    "hint": "simple hint"
  }
]
`

    // 🔁 try AI twice
    let quiz = await getQuizFromAI(prompt)

    if (!quiz) {
      console.log("Retrying AI...")
      quiz = await getQuizFromAI(prompt)
    }

    // ❌ if still failed → fallback
    if (!quiz || !Array.isArray(quiz)) {
      console.log("Using fallback quiz")
      return res.json(generateFallbackQuiz())
    }

    // ✅ clean quiz
    quiz = quiz.map(q => ({
      question: q.question || "No question",
      options: Array.isArray(q.options)
        ? q.options.slice(0, 4)
        : ["Option A", "Option B", "Option C", "Option D"],
      answer: q.answer || "Option A",
      hint: q.hint || "Think step by step"
    }))

    res.json(quiz)

  } catch (error) {
    console.log("SERVER ERROR:", error.message)

    // 🔥 NEVER FAIL → always return quiz
    res.json(generateFallbackQuiz())
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log("Server running on port " + PORT)
})