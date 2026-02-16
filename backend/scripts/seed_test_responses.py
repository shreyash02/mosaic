"""
Seed script: Creates 5 test users and submits varied, LLM-generated responses
to a specified conversation.

Usage:
    source venv/bin/activate
    python scripts/seed_test_responses.py <conversation_id>
"""

import sys
import os
import json
from uuid import uuid4
from datetime import datetime, timezone

# Add backend root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

import anthropic
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.response import Response
from app.models.conversation_invitation import ConversationInvitation


TEST_USERS = [
    {"email": "testuser1@mosaic-test.local", "full_name": "Alex Chen"},
    {"email": "testuser2@mosaic-test.local", "full_name": "Jordan Rivera"},
    {"email": "testuser3@mosaic-test.local", "full_name": "Sam Okafor"},
    {"email": "testuser4@mosaic-test.local", "full_name": "Priya Sharma"},
    {"email": "testuser5@mosaic-test.local", "full_name": "Morgan Taylor"},
]

PASSWORD = "testpassword123"


def get_or_create_users(db):
    """Create test users if they don't already exist."""
    users = []
    for u in TEST_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            print(f"  User already exists: {u['full_name']} ({u['email']})")
            users.append(existing)
        else:
            user = User(
                id=uuid4(),
                email=u["email"],
                password_hash=get_password_hash(PASSWORD),
                full_name=u["full_name"],
                email_verified=True,
            )
            db.add(user)
            print(f"  Created user: {u['full_name']} ({u['email']})")
            users.append(user)
    db.commit()
    return users


def ensure_invitations(db, conversation, users):
    """Create invitations for users who don't have one yet."""
    for user in users:
        existing = (
            db.query(ConversationInvitation)
            .filter(
                ConversationInvitation.conversation_id == conversation.id,
                ConversationInvitation.email == user.email,
            )
            .first()
        )
        if not existing:
            invitation = ConversationInvitation(
                id=uuid4(),
                conversation_id=conversation.id,
                email=user.email,
                invited_by_id=conversation.creator_id,
                invited_user_id=user.id,
                is_accepted=True,
                accepted_at=datetime.now(timezone.utc),
            )
            db.add(invitation)
            print(f"  Invited: {user.full_name}")
    db.commit()


def generate_responses_with_llm(conversation, questions):
    """Use Claude to generate varied responses for 5 different personas."""
    client = anthropic.Anthropic()

    questions_desc = []
    for q in questions:
        desc = f"- Question {q.question_order} (id={q.id}, type={q.question_type}): \"{q.question_text}\""
        if q.question_type == "rating" and q.options:
            desc += f" [Rating scale: {q.options.get('min', 1)}-{q.options.get('max', 5)}, where {q.options.get('min_label', 'low')} to {q.options.get('max_label', 'high')}]"
        elif q.question_type in ("single_choice", "multiple_choice") and q.options:
            choices = q.options.get("choices", [])
            desc += f" [Choices: {', '.join(c['label'] for c in choices)}]"
        questions_desc.append(desc)

    prompt = f"""You are generating test data for a feedback platform. Generate realistic, varied responses from 5 different people to this conversation.

**Conversation:** "{conversation.title}"
**Description:** "{conversation.description}"

**Questions:**
{chr(10).join(questions_desc)}

Generate responses for these 5 personas (each should have a distinct perspective and writing style):
1. Alex Chen - Generally positive, detail-oriented engineer
2. Jordan Rivera - Candid and direct, focuses on process improvements
3. Sam Okafor - Thoughtful and balanced, often sees both sides
4. Priya Sharma - Enthusiastic but has specific concerns about workload
5. Morgan Taylor - Pragmatic, focuses on tooling and efficiency

Return a JSON array of 5 objects, one per user (in the order above). Each object has a "responses" array with one entry per question. Each entry must have:
- "question_id": the question id string exactly as given above
- "response_text": string answer (for text questions, 1-3 sentences, varied length)
- "response_data": null for text questions, or {{"rating": <int>}} for rating questions

Make the responses realistic, varied (not all positive - include some constructive criticism), and relevant to a team retrospective. Vary response lengths - some short, some detailed. Ratings should spread across the scale realistically (not all 4s and 5s).

Return ONLY the JSON array, no markdown fences or other text."""

    print("  Calling Claude API to generate responses...")
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]

    return json.loads(raw)


def insert_responses(db, conversation, questions, users, llm_responses):
    """Insert LLM-generated responses into the database."""
    now = datetime.now(timezone.utc)
    question_map = {str(q.id): q for q in questions}
    count = 0

    for i, user in enumerate(users):
        # Check if user already submitted
        existing = (
            db.query(Response)
            .filter(
                Response.conversation_id == conversation.id,
                Response.participant_id == user.id,
                Response.status == "submitted",
            )
            .first()
        )
        if existing:
            print(f"  Skipping {user.full_name} - already submitted")
            continue

        # Delete any drafts
        db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == user.id,
            Response.status == "draft",
        ).delete()

        user_responses = llm_responses[i]["responses"]
        for resp in user_responses:
            qid = resp["question_id"]
            if qid not in question_map:
                print(f"  WARNING: Unknown question_id {qid}, skipping")
                continue

            response = Response(
                id=uuid4(),
                conversation_id=conversation.id,
                question_id=qid,
                response_text=resp.get("response_text"),
                response_data=resp.get("response_data"),
                anonymity_level=conversation.anonymity_level,
                participant_id=user.id,
                status="submitted",
                submitted_at=now,
                is_test_data=True,
            )
            db.add(response)
            count += 1

        print(f"  Submitted responses for {user.full_name}")

    db.commit()
    print(f"  Total responses inserted: {count}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/seed_test_responses.py <conversation_id>")
        sys.exit(1)

    conversation_id = sys.argv[1]
    db = SessionLocal()

    try:
        # Load conversation
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            print(f"ERROR: Conversation {conversation_id} not found")
            sys.exit(1)

        print(f"Conversation: \"{conv.title}\" (state={conv.state}, anonymity={conv.anonymity_level})")

        if conv.state != "active":
            print(f"WARNING: Conversation is {conv.state}, not active. Responses may not display correctly.")

        # Load questions
        questions = (
            db.query(Question)
            .filter(Question.conversation_id == conv.id)
            .order_by(Question.question_order)
            .all()
        )
        print(f"Found {len(questions)} questions")

        # Step 1: Create users
        print("\n[1/4] Creating test users...")
        users = get_or_create_users(db)

        # Step 2: Create invitations (needed for invite_only)
        if conv.invite_only:
            print("\n[2/4] Creating invitations (invite_only conversation)...")
            ensure_invitations(db, conv, users)
        else:
            print("\n[2/4] Skipping invitations (not invite_only)")

        # Step 3: Generate responses via LLM
        print("\n[3/4] Generating responses via Claude...")
        llm_responses = generate_responses_with_llm(conv, questions)

        # Step 4: Insert responses
        print("\n[4/4] Inserting responses into database...")
        insert_responses(db, conv, questions, users, llm_responses)

        print("\nDone! Test users can login with password: testpassword123")

    finally:
        db.close()


if __name__ == "__main__":
    main()
