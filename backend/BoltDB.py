'''
Kei Imada
20200107
Bolt Database Interface
'''
import pdb
import datetime
from contextlib import contextmanager
import sqlalchemy as sql
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from flask_login import UserMixin
from flask_jwt_extended import decode_token

from db.bolt import *
from auth import check_credentials

class BoltUser(UserMixin):
    ''' used for flask login '''
    def __init__(self, user):
        self.__dict__ = user
        for key in user:
            setattr(self, key, user[key])

    def get_id(self):
        return self.id

    def __str__(self):
        return 'User(id=%s)' % self.id

class BoltDB(object):
    USERNAME='keikun'
    PASSWORD='carpoolservice'
    HOST='localhost'
    DATABASENAME='bolt'
    def __init__(self, echo=False):
        self.engine = create_engine('mysql://{}:{}@{}/{}'.format(self.USERNAME, self.PASSWORD, self.HOST, self.DATABASENAME), echo=echo)
        self._Session = sessionmaker(bind=self.engine)

    @contextmanager
    def Session(self):
        """Provide a transactional scope around a series of operations."""
        session = self._Session()
        try:
            yield session
            session.commit()
        except:
            session.rollback()
            raise
        finally:
            session.close()

    def add_token(self, encoded_token, identity_claim):
        ''' adds token with expiration '''
        decoded_token = decode_token(encoded_token)
        token = decoded_token['jti']
        user_id = decoded_token[identity_claim]
        expiration = datetime.datetime.fromtimestamp(decoded_token['exp'])
        with self.Session() as session:
            token_row = Token(token=token, user_id=user_id, expiration=expiration)
            session.add(token_row)
            session.commit()

    def token_revoked(self, token):
        ''' checks whether token is revoked '''
        with self.Session() as session:
            query = (
                    session.query(Token.revoked)
                    .filter(sql.and_(Token.token == token, Token.expiration >= datetime.datetime.now()))
                    )
            results = query.all()
            if len(results) == 0:
                # for safety reasons if its not in db, consider it revoked
                return True
            if True in results:
                return True
            return False

    # TODO Add a pruning method that prunes expired tokens

    def revoke_token(self, token, user_id):
        ''' revokes a token '''
        try:
            with self.Session() as session:
                token = (
                        session.query(Token)
                        .filter(sql.and_(Token.token == token, Token.user_id == user_id))
                        ).one()
                token.revoked = True
                session.commit()
        except:
            raise Exception('BoltDB.revoke_token: token not found')

    def login(self, username, password):
        '''
        given username and password, login and return user info else return None
        '''
        ldap_user = check_credentials(username, password)
        if ldap_user is None:
            # failed
            return None
        id_ = ldap_user.get('uid')
        email = ldap_user.get('email')
        name = ldap_user.get('name')
        if None in (id_, email, name):
            # somehow failed
            return None
        # successful
        with self.Session() as session:
            # check if user is in bolt db
            query = (session.query(User).filter(User.id == id_))
            user = query.first()
            if user is None:
                # not in boltdb => add to boltdb
                user = User(id_=id_, email=email, name=name)
                session.add(user)
                session.commit()
            user_dict = dict((col, getattr(user, col)) for col in user.__table__.columns.keys())
        return BoltUser(user_dict)

    def get_user(self, id_):
        with self.Session() as session:
            query = (session.query(User).filter(User.id == id_))
            user = query.first()
            user_dict = dict((col, getattr(user, col)) for col in user.__table__.columns.keys())
        return BoltUser(user_dict)

if __name__ == '__main__':
    import getpass, sys
    if sys.version_info < (3, 0):
        input = raw_input
    username = input("username: ")
    password = getpass.getpass("password: ")
    BDB = BoltDB()
    print(BDB.login(username, password))
