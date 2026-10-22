
import os
import sqlite3
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
DATABASE = "chat_history.db"


def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/history/<conversation_id>")
def history(conversation_id):
    with get_db() as db:
        rows = db.execute(
            """SELECT role, content FROM messages
               WHERE conversation_id = ?
               ORDER BY id""",
            (conversation_id,)
        ).fetchall()

    return jsonify([dict(row) for row in rows])


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    conversation_id = str(data.get("conversation_id", "default"))[:100]

    if not message:
        return jsonify({"error": "Please enter a message."}), 400

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return jsonify({
            "error": "AI is not configured yet. Add your API key to the .env file."
        }), 503

    try:
        client = OpenAI(api_key=api_key)

        with get_db() as db:
            previous = db.execute(
                """SELECT role, content FROM messages
                   WHERE conversation_id = ?
                   ORDER BY id DESC LIMIT 12""",
                (conversation_id,)
            ).fetchall()

            previous = list(reversed(previous))

        messages = [
            {
                "role": "system",
                "content": (
                    "You are SmartAssist, a friendly and helpful AI assistant. "
                    "Answer clearly and explain things in simple language."
                )
            }
        ]

        for row in previous:
            if row["role"] in ("user", "assistant"):
                messages.append({
                    "role": row["role"],
                    "content": row["content"]
                })

        messages.append({"role": "user", "content": message})

        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=messages
        )

        reply = response.choices[0].message.content
        reply = reply or "Sorry, I couldn't generate a response."

        with get_db() as db:
            db.executemany(
                """INSERT INTO messages
                   (conversation_id, role, content)
                   VALUES (?, ?, ?)""",
                [
                    (conversation_id, "user", message),
                    (conversation_id, "assistant", reply)
                ]
            )

        return jsonify({"reply": reply})

    except Exception:
        app.logger.exception("Chat request failed")
        return jsonify({
            "error": "Something went wrong. Check your API key, internet connection, and server terminal."
        }), 500


init_db()

if __name__ == "__main__":
    app.run(debug=True)
