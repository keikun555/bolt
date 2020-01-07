# coding: utf-8
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
metadata = Base.metadata


class User(Base):
    __tablename__ = 'user'

    id = Column(String(500), primary_key=True, unique=True, comment='ID of user')
    email = Column(String(500), nullable=False)
    name = Column(String(500), nullable=False)
