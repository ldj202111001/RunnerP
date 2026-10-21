from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt는 72바이트까지만 사용
    nickname: str = Field(min_length=1, max_length=50)


class SignupResponse(BaseModel):
    user_id: int
    access_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
