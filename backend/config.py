import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # PostgreSQL connection string
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://username:password@localhost:5432/digitalestate')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
