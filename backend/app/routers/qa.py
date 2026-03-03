from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models import AnswerVote, MentorProfile, QaAnswer, QaQuestion, QaQuestionMentor, User
from app.schemas import MentorOut, QaAnswerCreate, QaAnswerOut, QaQuestionCreate, QaQuestionOut

router = APIRouter()


def _display_name(user: User) -> str:
    return user.display_name or user.email


def _mentor_out(user: User, profile: MentorProfile | None) -> MentorOut:
    return MentorOut(
        id=user.id,
        display_name=_display_name(user),
        avatar_url=user.avatar_url,
        title=profile.title if profile else None,
        bio=profile.bio if profile else None,
        tags=profile.tags if profile else [],
    )


@router.get("", response_model=list[QaQuestionOut])
def list_questions(
    tag: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[QaQuestionOut]:
    query = db.query(QaQuestion).order_by(QaQuestion.created_at.desc())
    questions = query.all()

    # Get current user's votes for dedup display
    user_votes = set()
    vote_rows = db.query(AnswerVote.answer_id).filter(AnswerVote.user_id == current_user.id).all()
    for row in vote_rows:
        user_votes.add(row[0])

    results: list[QaQuestionOut] = []

    for question in questions:
        # Filter by tag if specified
        if tag and tag not in (question.tags or []):
            continue

        answer_rows = (
            db.query(QaAnswer, User)
            .join(User, QaAnswer.author_id == User.id)
            .filter(QaAnswer.question_id == question.id)
            .order_by(QaAnswer.created_at.asc())
            .all()
        )
        answers: list[QaAnswerOut] = []
        for answer, user in answer_rows:
            answer_out = QaAnswerOut.model_validate(answer)
            answers.append(QaAnswerOut(**{
                **answer_out.model_dump(),
                "author_name": _display_name(user),
                "voted": answer.id in user_votes,
            }))

        mentor_rows = (
            db.query(QaQuestionMentor, User, MentorProfile)
            .join(User, QaQuestionMentor.mentor_id == User.id)
            .outerjoin(MentorProfile, MentorProfile.user_id == User.id)
            .filter(QaQuestionMentor.question_id == question.id)
            .all()
        )
        mentors = [_mentor_out(user, profile) for _, user, profile in mentor_rows]

        asker_name = "Anonymous" if question.is_anonymous else _display_name(question.asker)
        results.append(
            QaQuestionOut(
                id=question.id,
                title=question.title,
                content=question.content,
                tags=question.tags,
                is_anonymous=question.is_anonymous,
                asker_id=question.asker_id,
                asker_name=asker_name,
                views=question.views,
                created_at=question.created_at,
                answers=answers,
                mentors=mentors,
            )
        )

    return results


@router.post("", response_model=QaQuestionOut)
def create_question(
    payload: QaQuestionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> QaQuestionOut:
    mentor_ids = list(dict.fromkeys(payload.mentor_ids))
    if not mentor_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please select at least one mentor")

    mentors = (
        db.query(User)
        .filter(User.id.in_(mentor_ids), User.role == "mentor")
        .all()
    )
    if len(mentors) != len(mentor_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mentor selection")

    question = QaQuestion(
        title=payload.title,
        content=payload.content,
        tags=payload.tags,
        is_anonymous=payload.is_anonymous,
        asker_id=current_user.id,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    for mentor in mentors:
        db.add(QaQuestionMentor(question_id=question.id, mentor_id=mentor.id))
    db.commit()

    profiles = (
        db.query(MentorProfile)
        .filter(MentorProfile.user_id.in_(mentor_ids))
        .all()
    )
    profile_map = {profile.user_id: profile for profile in profiles}
    mentors_out = [_mentor_out(mentor, profile_map.get(mentor.id)) for mentor in mentors]
    asker_name = "Anonymous" if question.is_anonymous else _display_name(current_user)
    return QaQuestionOut(
        id=question.id,
        title=question.title,
        content=question.content,
        tags=question.tags,
        is_anonymous=question.is_anonymous,
        asker_id=question.asker_id,
        asker_name=asker_name,
        views=question.views,
        created_at=question.created_at,
        answers=[],
        mentors=mentors_out,
    )


@router.post("/{question_id}/answers", response_model=QaAnswerOut)
def create_answer(
    question_id: int,
    payload: QaAnswerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> QaAnswerOut:
    question = db.query(QaQuestion).filter(QaQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    if current_user.role not in {"mentor", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only mentors can reply")

    if current_user.role == "mentor":
        assigned = (
            db.query(QaQuestionMentor)
            .filter(
                QaQuestionMentor.question_id == question_id,
                QaQuestionMentor.mentor_id == current_user.id,
            )
            .first()
        )
        if not assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this question")

    answer = QaAnswer(
        question_id=question_id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    answer_out = QaAnswerOut.model_validate(answer)
    return QaAnswerOut(**{**answer_out.model_dump(), "author_name": _display_name(current_user)})


@router.post("/answers/{answer_id}/vote", response_model=QaAnswerOut)
def vote_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> QaAnswerOut:
    answer = db.query(QaAnswer).filter(QaAnswer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")

    # Check for duplicate vote
    existing_vote = (
        db.query(AnswerVote)
        .filter(AnswerVote.answer_id == answer_id, AnswerVote.user_id == current_user.id)
        .first()
    )
    if existing_vote:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already voted")

    db.add(AnswerVote(answer_id=answer_id, user_id=current_user.id))
    answer.votes += 1
    db.commit()
    db.refresh(answer)

    author = db.query(User).filter(User.id == answer.author_id).first()
    author_name = _display_name(author) if author else "Unknown"
    answer_out = QaAnswerOut.model_validate(answer)
    return QaAnswerOut(**{**answer_out.model_dump(), "author_name": author_name, "voted": True})
