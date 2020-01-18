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
from sqlalchemy.sql import expression as expr

from flask_jwt_extended import decode_token

from db.bolt import *
from ldap_auth import check_credentials

# TODO remove for production
dummy_user = {
    'uid': 'dummy',
        'password': 'dummy',
        'name': 'Dummy User',
        'email': 'dummy@swarthmore.edu'
}


class BoltException(Exception):
    pass


class NotFoundException(BoltException):
    pass


class NotUniqueException(BoltException):
    pass


def row2dict(row):
    return dict((col, getattr(row, col)) for col in row.__table__.columns.keys())


class BoltDB(object):
    USERNAME = 'keikun'
    PASSWORD = 'carpoolservice'
    HOST = 'localhost'
    DATABASENAME = 'bolt'

    def __init__(self, echo=False):
        self.engine = create_engine('mysql://{}:{}@{}/{}'.format(
            self.USERNAME, self.PASSWORD, self.HOST, self.DATABASENAME), echo=echo)
        self._Session = sessionmaker(bind=self.engine)

    @contextmanager
    def Session(self):
        ''' Provide a transactional scope around a series of operations. '''
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
            token_row = Token(
                token=token, user_id=user_id, expiration=expiration)
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
            raise NotFoundException('BoltDB.revoke_token: token not found')

    def login(self, username, password):
        '''
        given username and password, login and return user info else return None
        '''
        ldap_user = check_credentials(username, password)
        # TODO remove for production
        if username == dummy_user['uid'] and password == dummy_user['password']:
            ldap_user = dummy_user
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
                user = User(id=id_, email=email, name=name)
                session.add(user)
                session.commit()
            user_dict = row2dict(user)
        return user_dict

    def get_user(self, user_id):
        ''' returns dictionary of a user '''
        with self.Session() as session:
            # match
            c_subq1 = (
                session.query(
                    expr.func.max(Couple.id).label('id')
                ).filter(sql.and_(
                         Couple.user_1 == user_id,
                         Couple.cancelled == expr.false()))
                        .group_by(Couple.user_1)  # trick is to add both (u1, u2) (u2, u1) pairs
                        .subquery()
            )
            c_subq = (
                session.query(
                    Couple.user_1,
                    Couple.user_2
                ).filter(Couple.id.in_(c_subq1))
                    .subquery()
            )
            query = (
                session.query(
                    User,
                    c_subq.c.user_2
                ).outerjoin(
                    c_subq, User.id == c_subq.c.user_1
                ).filter(User.id == user_id)
            )
            user, match = query.first()
            user_dict = row2dict(user)
            user_dict['matched'] = match is not None
        return user_dict

    def get_all_users(self):
        ''' returns list of dictionaries '''
        with self.Session() as session:
            # driver
            d_subq1 = (
                session.query(
                    expr.func.max(Driver.id).label('id')
                ).filter(Driver.cancelled == expr.false())
                    .group_by(Driver.screw)
                    .subquery()
            )
            d_subq = (
                session.query(
                    Driver.screw,
                        Driver.driver
                ).filter(Driver.id.in_(d_subq1))
                    .subquery()
            )
            # match
            c_subq1 = (
                session.query(
                    expr.func.max(Couple.id).label('id')
                ).filter(Couple.cancelled == expr.false())
                    .group_by(Couple.user_1)  # trick is to add both (u1, u2) (u2, u1) pairs
                    .subquery()
            )
            c_subq = (
                session.query(
                    Couple.user_1,
                        Couple.user_2
                ).filter(Couple.id.in_(c_subq1))
                    .subquery()
            )
            query = (
                session.query(
                    User,
                        d_subq.c.driver,
                        c_subq.c.user_2
                ).outerjoin(
                    d_subq, User.id == d_subq.c.screw
                ).outerjoin(
                    c_subq, User.id == c_subq.c.user_1
                )
            )
            users = []
            for user, driver, match in query.all():
                user_dict = row2dict(user)
                user_dict[
                    'driver'] = None if driver is None else self.get_user(driver)
                user_dict['matched'] = match is not None
                users.append(user_dict)
        return users

    def make_driver_request(self, screw, driver):
        '''
        given screw user id and driver user id registers a driver request

        return: newly created driver request
        '''
        if screw == driver:
            raise Exception(
                'BoltDB.set_driver_request: a screw cannot be its own driver!')
        if self.get_requested_driver(screw) is not None:
            raise NotUniqueException(
                'BoltDB.set_driver_request: screw (%s) already has a driver request!' % screw)
        with self.Session() as session:
            driver_request = DriverRequest(screw=screw, driver=driver)
            session.add(driver_request)
            session.flush()
            driver_request_dict = row2dict(driver_request)
            driver_request_dict['screw'] = self.get_user(
                driver_request_dict['screw'])
            driver_request_dict['driver'] = self.get_user(
                driver_request_dict['driver'])
            session.commit()
        return driver_request_dict

    def get_driver_request(self, request_id):
        ''' given request id returns request '''
        with self.Session() as session:
            query = session.query(DriverRequest).filter(
                sql.and_(
                    DriverRequest.id == request_id,
                    DriverRequest.active == expr.true()
                )
            )
            request = query.first()
            if request is None:
                raise NotFoundException(
                    'BoltDB.get_driver_request: request not found')
            request = request
            request_dict = row2dict(request)
            request_dict['screw'] = self.get_user(request_dict['screw'])
            request_dict['driver'] = self.get_user(request_dict['driver'])
        return request_dict

    def user_associated_driver_requests(self, user_id):
        ''' given user id return all driver request associated with the user '''
        with self.Session() as session:
            query = session.query(DriverRequest).filter(
                sql.and_(
                    sql.or_(
                        DriverRequest.screw == user_id,
                        DriverRequest.driver == user_id
                    ),
                    DriverRequest.active == expr.true()
                )
            )
            request_dicts = []
            for request in query.all():
                r_dict = row2dict(request)
                r_dict['screw'] = self.get_user(r_dict['screw'])
                r_dict['driver'] = self.get_user(r_dict['driver'])
                request_dicts.append(r_dict)
        return request_dicts

    def get_requested_driver(self, screw):
        '''
        get requested driver of screw else return None
        useful to check if a screw has an active driver request

        return: user dict or None
        '''
        with self.Session() as session:
            subq = (
                session.query(
                    expr.func.max(DriverRequest.id).label('id')
                ).filter(
                    sql.and_(
                        DriverRequest.screw == screw,
                        DriverRequest.active == expr.true())
                ).subquery()
            )
            query = session.query(DriverRequest.driver).filter(
                DriverRequest.id.in_(subq))
            driver = query.first()
            driver_dict = None
            if driver is not None:
                driver, = driver  # need a comma because this returns (match,)
                driver_dict = self.get_user(driver)
        return driver_dict

    def approve_driver_request(self, request_id):
        ''' given request id approve a driver request returns approved request '''
        with self.Session() as session:
            query = session.query(DriverRequest).filter(
                DriverRequest.id == request_id)
            request = query.first()
            if request is None:
                raise NotFoundException(
                    'BoltDB.approve_driver_request: request not found')
            request.active = False
            request_dict = row2dict(request)
            screwdriver = Driver(screw=request.screw, driver=request.driver)
            session.add(screwdriver)
            session.commit()
        return request_dict

    def cancel_driver_request(self, request_id):
        ''' given screw user id and driver user id cancels a driver request '''
        with self.Session() as session:
            query = session.query(DriverRequest).filter(
                DriverRequest.id == request_id)
            request = query.first()
            if request is None:
                raise NotFoundException(
                    'BoltDB.cancel_driver_request: request not found')
            request.active = False
            session.commit()

    def is_screwdriver(self, screw, driver):
        ''' verifies the screw driver relation '''
        with self.Session() as session:
            query = session.query(Driver.screw).filter(
                sql.and_(
                    Driver.driver == driver,
                    Driver.screw == screw,
                    Driver.cancelled == expr.false()
                )
            )
            screw = query.first()
        return screw is not None

    def get_driver(self, screw):
        ''' get driver of screw else return None '''
        with self.Session() as session:
            subq = (
                session.query(
                    expr.func.max(Driver.id).label('id')
                ).filter(
                    sql.and_(
                        Driver.screw == screw,
                        Driver.cancelled == expr.false()
                    )
                ).subquery()
            )
            query = session.query(Driver.driver).filter(Driver.id.in_(subq))
            driver = query.first()
            driver_dict = None
            if driver is not None:
                driver, = driver
                driver_dict = self.get_user(driver)
        return driver_dict

    def get_screws(self, driver):
        ''' get screws of driver '''
        with self.Session() as session:
            query = session.query(Driver.screw).filter(
                sql.and_(
                    Driver.driver == driver,
                    Driver.cancelled == expr.false()
                )
            )
            results = []
            for screw in query.all():
                s_dict = self.get_user(screw)
                s_dict['match'] = self.get_match(screw)
                results.append(s_dict)
        return results

    def get_screw(self, screw):
        ''' get screw information '''
        screw_dict = self.get_user(screw)
        screw_dict['match'] = self.get_match(screw)
        return screw_dict

    def get_driver(self, screw):
        ''' get driver of screw else return None '''
        with self.Session() as session:
            subq = (
                session.query(
                    expr.func.max(Driver.id).label('id')
                ).filter(
                    sql.and_(
                        Driver.screw == screw,
                        Driver.cancelled == expr.false()
                    )
                ).subquery()
            )
            query = session.query(Driver.driver).filter(Driver.id.in_(subq))
            driver = query.first()
            driver_dict = None
            if driver is not None:
                driver, = driver
                driver_dict = self.get_user(driver)
        return driver_dict

    def cancel_driver(self, screw):
        ''' cancel driver of screw '''
        with self.Session() as session:
            query = (
                session.query(Driver).filter(
                    sql.and_(
                        Driver.screw == screw,
                        Driver.cancelled == expr.false()
                    )
                )
            )
            for driver in query.all():
                driver.cancelled = True
            session.commit()

    def get_preferences(self, screw):
        ''' given screw, return their preferences '''
        with self.Session() as session:
            query = (
                session.query(User,
                              Preference.preference)
                    .join(Preference,
                          User.id == Preference.candidate)
                    .filter(sql.and_(Preference.screw == screw,
                                     Preference.active == expr.true()))
            )
            candidates = []
            for candidate, preference in query.all():
                cand_dict = row2dict(candidate)
                cand_dict['preference'] = str(round(preference, 2))
                candidates.append(cand_dict)
        return candidates

    def save_preferences(self, screw, preferences):
        ''' save preferences for a screw '''
        with self.Session() as session:
            query = (
                session.query(Preference)
                    .filter(sql.and_(Preference.screw == screw,
                                     Preference.active == expr.true()))
            )
            for preference in query:
                preference.active = False
            session.flush()
            preference_rows = []
            for preference in preferences:
                pref_row = Preference(screw=screw, candidate=preference[
                                      'candidate'], preference=preference['preference'])
                preference_rows.append(pref_row)
                session.bulk_save_objects(preference_rows)
            pref_dicts = [row2dict(p) for p in preference_rows]
            session.commit()
        return pref_dicts

    def set_match(self, user_1, user_2):
        ''' add a match '''
        if user_1 == user_2:
            raise Exception(
                'BoltDB.set_match: users cannot match with themselves')
        with self.Session() as session:
            # check if one is already matched
            # we do this because matches are important enough
            # to go the extra mile to prevent them being overwritten
            query = (
                session.query(Couple.id)
                .filter(
                    sql.or_(
                        sql.and_(
                            Couple.user_1 == user_1,
                            Couple.cancelled == expr.false(
                            )),
                        sql.and_(
                            Couple.user_1 == user_2,
                            Couple.cancelled == expr.false())
                    )
                )
            )
            match = query.first()
            if match is not None:
                raise NotUniqueException(
                    'BoltDB.set_match: a user in this match is already matched with someone else (match id {})'.format(match[0]))
            matches = [
                Couple(user_1=user_1, user_2=user_2),
                    Couple(user_1=user_2, user_2=user_1)
            ]
            session.bulk_save_objects(matches)
            session.commit()

    def get_match(self, user_id):
        ''' get the match of user if exists else return None '''
        with self.Session() as session:
            subq = (
                session.query(
                    expr.func.max(Couple.id).label('id')
                ).filter(
                    sql.and_(
                        Couple.user_1 == user_id,
                        Couple.cancelled == expr.false())
                ).subquery()
            )
            query = session.query(Couple.user_2).filter(Couple.id.in_(subq))
            match = query.first()
            if match is not None:
                match, = match  # need a comma because this returns (match,)
        return match

    def cancel_match(self, user_1, user_2):
        ''' cancel a match '''
        with self.Session() as session:
            subq = (
                session.query(
                    expr.func.max(Couple.id).label('id')
                ).filter(sql.or_(
                         sql.and_(
                         Couple.user_1 == user_1,
                         Couple.user_2 == user_2,
                         Couple.cancelled == expr.false()),
                         sql.and_(
                         Couple.user_1 == user_2,
                         Couple.user_2 == user_1,
                         Couple.cancelled == expr.false())
                         ))
                    .group_by(Couple.user_1, Couple.user_2)
                    .subquery()
            )
            query = session.query(Couple).filter(Couple.id.in_(subq))
            if len(query.all()) == 0:
                raise NotFoundException('BoltDB.cancel_match: match not found')
            elif len(query.all()) != 2:
                raise Exception('BoltDB.cancel_match: match table corrupted')
            for couple in query.all():
                couple.cancelled = True
            session.commit()


def main_login():
    import getpass
    import sys
    if sys.version_info < (3, 0):
        input = raw_input
    username = input('username: ')
    password = getpass.getpass('password: ')
    BDB = BoltDB()
    print(BDB.login(username, password))


def main_match():
    BDB = BoltDB()
    BDB.cancel_match('keikun', 'dummy')


def main_driver():
    BDB = BoltDB()
    BDB.make_driver_request('keikun', 'dummy')
    BDB.approve_driver_request('keikun', 'dummy')

if __name__ == '__main__':
    main_driver()
