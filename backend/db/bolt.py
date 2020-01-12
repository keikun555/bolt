# coding: utf-8
from sqlalchemy import Column, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.mysql import INTEGER, TINYINT
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
metadata = Base.metadata


class User(Base):
    __tablename__ = 'user'

    id = Column(String(500), primary_key=True, unique=True, comment='ID of user')
    email = Column(String(500), nullable=False)
    name = Column(String(500), nullable=False)


class Couple(Base):
    __tablename__ = 'couple'

    id = Column(INTEGER(11), primary_key=True)
    user_1 = Column(ForeignKey('user.id'), nullable=False, index=True)
    user_2 = Column(ForeignKey('user.id'), nullable=False, index=True)
    cancelled = Column(TINYINT(1), nullable=False, server_default=text("'0'"))
    timestamp = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship('User', primaryjoin='Couple.user_1 == User.id')
    user1 = relationship('User', primaryjoin='Couple.user_2 == User.id')


class Driver(Base):
    __tablename__ = 'driver'
    __table_args__ = (
        Index('screw', 'screw', 'driver'),
        Index('screw_2', 'screw', 'driver'),
        Index('screw_3', 'screw', 'timestamp'),
        Index('driver', 'driver', 'timestamp')
    )

    id = Column(INTEGER(11), primary_key=True)
    screw = Column(ForeignKey('user.id'), nullable=False, index=True, comment='user id')
    driver = Column(ForeignKey('user.id'), nullable=False, index=True, comment='user id')
    cancelled = Column(TINYINT(1), nullable=False, server_default=text("'0'"))
    timestamp = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship('User', primaryjoin='Driver.driver == User.id')
    user1 = relationship('User', primaryjoin='Driver.screw == User.id')


class DriverRequest(Base):
    __tablename__ = 'driver_request'

    id = Column(INTEGER(11), primary_key=True)
    screw = Column(ForeignKey('user.id'), nullable=False, index=True, comment='user id')
    driver = Column(ForeignKey('user.id'), nullable=False, index=True, comment='user id')
    approved = Column(TINYINT(1), nullable=False, server_default=text("'0'"))
    cancelled = Column(TINYINT(1), nullable=False, server_default=text("'0'"))
    timestamp = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    user = relationship('User', primaryjoin='DriverRequest.driver == User.id')
    user1 = relationship('User', primaryjoin='DriverRequest.screw == User.id')


class Token(Base):
    __tablename__ = 'token'
    __table_args__ = (
        Index('token_2', 'token', 'user_id'),
        Index('token_4', 'token', 'expiration'),
        Index('id', 'id', 'token'),
        Index('token', 'token', 'user_id')
    )

    id = Column(INTEGER(11), primary_key=True)
    token = Column(String(36), nullable=False, index=True)
    user_id = Column(ForeignKey('user.id'), nullable=False, index=True)
    expiration = Column(DateTime, nullable=False, comment='datetime of expiration')
    revoked = Column(TINYINT(1), nullable=False, server_default=text("'0'"))

    user = relationship('User')
