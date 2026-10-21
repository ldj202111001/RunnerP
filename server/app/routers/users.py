from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, UserProfile
from app.schemas.user import Me, Profile
from app.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=Me)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/me/profile", response_model=Profile)
def update_profile(body: Profile, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.get(UserProfile, user.id) or UserProfile(user_id=user.id)
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    db.add(profile)
    db.commit()
    return profile
