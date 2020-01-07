'''
Kei Imada
20200107
Bolt Database Interface
'''
import pdb
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from flask_login import UserMixin

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

class BoltDB(object):
    USERNAME='keikun'
    PASSWORD='carpoolservice'
    HOST='localhost'
    DATABASENAME='bolt'
    def __init__(self):
        self.engine = create_engine('mysql://{}:{}@{}/{}'.format(self.USERNAME, self.PASSWORD, self.HOST, self.DATABASENAME), echo=True)
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
