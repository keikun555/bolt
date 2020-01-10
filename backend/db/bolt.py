# coding: utf-8
from sqlalchemy import Column, DateTime, Index, String, text
from sqlalchemy.dialects.mysql import INTEGER, TINYINT
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
metadata = Base.metadata


class Token(Base):
    __tablename__ = 'token'
    __table_args__ = (
        Index('token', 'token', 'user_id'),
        Index('id', 'id', 'token')
    )

    id = Column(INTEGER(11), primary_key=True)
    token = Column(String(300), nullable=False)
    user_id = Column(String(500), nullable=False)
    expiration = Column(DateTime, nullable=False, comment='datetime of expiration')
    revoked = Column(TINYINT(1), nullable=False, server_default=text("'0'"))


class User(Base):
    __tablename__ = 'user'

    id = Column(String(500), primary_key=True, unique=True, comment='ID of user')
    email = Column(String(500), nullable=False)
    name = Column(String(500), nullable=False)
