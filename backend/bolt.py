'''
Kei Imada
20200106
Bolt REST API
'''

import os
import datetime

from flask import flash, Flask, g, jsonify, request, send_from_directory

from flask_cors import CORS
from flask_json import FlaskJSON, as_json

from flask_jwt_extended import (
    JWTManager,
        jwt_required, jwt_optional, jwt_refresh_token_required,
        create_access_token, create_refresh_token,
        get_jwt_identity, get_raw_jwt,
)

from BoltDB import BoltDB, NotFoundException, NotUniqueException
from forms import LoginForm, DriverRequestForm, PreferencesForm

# make and configure Flask App
app = Flask(__name__, static_folder='../frontend/build')
# generated with `openssl rand -base64 32`
TOKEN_EXPIRES = datetime.timedelta(minutes=15)
# TOKEN_EXPIRES = datetime.timedelta(seconds=5)
REFRESH_EXPIRES = datetime.timedelta(days=30)
app.config['JWT_SECRET_KEY'] = 'PzfQpZ38A9Vj+rewcgHUSDKk8QIaR/5ssnD1Yl/7va0='
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = TOKEN_EXPIRES
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = REFRESH_EXPIRES
app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
FlaskJSON(app)
if(app.config['ENV'] == 'development'):
    # only allow CORS for development
    CORS(app)
jwt = JWTManager(app)


def get_bdb():
    # BoltDB
    if 'bdb' not in g:
        g.bdb = BoltDB()
    return g.bdb


@jwt.token_in_blacklist_loader
def check_if_token_is_revoked(payload):
    jti = payload['jti']
    bdb = get_bdb()
    return bdb.token_revoked(jti)


@app.route('/auth/login', methods=['POST'])
@as_json
@jwt_optional
def login():
    user_id = get_jwt_identity()
    if user_id:
        bdb = get_bdb()
        return {
            'errors': {},
                'user': bdb.get_user(user_id)
        }, 200
    form = LoginForm(request.form)
    form.validate()
    response = {'errors': form.errors}
    if not form.errors:
        # no errors
        bdb = get_bdb()
        user = bdb.login(form.data.get('username'), form.data.get('password'))
        if user is None:
            response['errors']['login'] = 'failed'
        else:
            user_id = user['id']
            print('%s logged in successfully.' % user_id)
            response['user'] = user
            token = create_access_token(identity=user_id)
            refresh_token = create_refresh_token(identity=user_id)
            response['token'] = token
            response['refreshToken'] = refresh_token
            bdb.add_token(token, app.config['JWT_IDENTITY_CLAIM'])
            bdb.add_token(refresh_token, app.config['JWT_IDENTITY_CLAIM'])
    return response, 200


@app.route('/auth/refresh', methods=['POST'])
@jwt_refresh_token_required
@as_json
def refresh():
    bdb = get_bdb()
    user_id = get_jwt_identity()
    token = create_access_token(identity=user_id)
    response = {
        'token': token
    }
    bdb.add_token(token, app.config['JWT_IDENTITY_CLAIM'])
    return response, 200


@app.route("/auth/logout/1", methods=['DELETE'])
@jwt_required
def logout():
    bdb = get_bdb()
    jti = get_raw_jwt()['jti']
    user_id = get_jwt_identity()
    bdb.revoke_token(jti, user_id)
    print('revoked token %s' % jti)
    return jsonify({"msg": "Successfully logged out (access)"}), 200


@app.route("/auth/logout/2", methods=['DELETE'])
@jwt_refresh_token_required
def logout2():
    bdb = get_bdb()
    jti = get_raw_jwt()['jti']
    user_id = get_jwt_identity()
    bdb.revoke_token(jti, user_id)
    print('revoked token %s' % jti)
    return jsonify({"msg": "Successfully logged out (refresh)"}), 200


@app.route('/user/<string:user_id>', methods=['POST'])
@as_json
@jwt_required
def get_user(user_id):
    bdb = get_bdb()
    try:
        user = bdb.get_user(user_id)
    except NotFoundException as e:
        return ({
            'errors': {'user': 'not found'}
        }, 404)
    except Exception as e:
        return ({
            'errors': {'user': str(e)}
        }, 404)
    user['errors'] = {}
    current_user_id = get_jwt_identity()
    if user_id == current_user_id:
        try:
            user['driver_requests'] = bdb.user_associated_driver_requests(
                user_id)
        except Exception as e:
            user['errors']['driver_requests'] = str(e)
    return user, 200


# @app.route('/user/<string:user_id>/driver_requests', methods=['POST'])
# @as_json
# @jwt_required
# def user_associated_driver_requests(user_id):
#     current_user_id = get_jwt_identity()
#     if user_id != current_user_id:
#         return {
#             'errors': {'driver_requests': 'forbidden'}
#         }, 403
#     bdb = get_bdb()
#     try:
#         user = bdb.user_associated_driver_requests(user_id)
#     except Exception as e:
#         return {
#             'errors': {'user': str(e)}
#         }, 404
#     return user, 200


@app.route('/user/<string:user_id>/driver', methods=['POST'])
@as_json
@jwt_required
def get_driver(user_id):
    current_user_id = get_jwt_identity()
    if user_id != current_user_id:
        return ({
            'errors': {'get_driver': 'forbidden'}
        }, 403)
    bdb = get_bdb()
    try:
        driver = bdb.get_driver(user_id)
    except NotFoundException as e:
        return ({
            'errors': {'get_driver': 'driver not found'}
        }, 404)
    except Exception as e:
        return ({
            'errors': {'get_driver': str(e)}
        }, 404)
    return {'driver': driver, 'errors': {'get_driver': None}}, 200


@app.route('/user/<string:user_id>/screw', methods=['POST'])
@as_json
@jwt_required
def get_screws(user_id):
    current_user_id = get_jwt_identity()
    if user_id != current_user_id:
        return ({
            'errors': {'get_screws': 'forbidden'}
        }, 403)
    bdb = get_bdb()
    try:
        screws = bdb.get_screws(user_id)
    except Exception as e:
        return ({
            'errors': {'get_screws': str(e)}
        }, 404)
    return {'screws': screws, 'errors': {'get_screws': None}}, 200


@app.route('/user/<string:driver_id>/screw/<string:screw_id>', methods=['POST'])
@as_json
@jwt_required
def get_screw(driver_id, screw_id):
    current_user_id = get_jwt_identity()
    if driver_id != current_user_id:
        return {
            'errors': {'get_screw': 'forbidden'}
        }, 403
    bdb = get_bdb()
    try:
        if bdb.is_screwdriver(screw_id, driver_id):
            screw = bdb.get_screw(screw_id)
        else:
            return ({
                'errors': {'get_screw': 'forbidden'}
            }, 403)
    except Exception as e:
        return ({
            'errors': {'get_screw': str(e)}
        }, 404)
    return {'screw': screw, 'errors': {'get_screw': None}}, 200


@app.route('/user/<string:driver_id>/screw/<string:screw_id>/preference', methods=['POST'])
@as_json
@jwt_required
def get_preferences(driver_id, screw_id):
    current_user_id = get_jwt_identity()
    if driver_id != current_user_id:
        return {
            'errors': {'get_preferences': 'forbidden'}
        }, 403
    bdb = get_bdb()
    try:
        if bdb.is_screwdriver(screw_id, driver_id):
            preferences = bdb.get_preferences(screw_id)
        else:
            return ({
                'errors': {'get_preferences': 'forbidden'}
            }, 403)
    except Exception as e:
        return ({
            'errors': {'get_preferences': str(e)}
        }, 404)
    return {'preferences': preferences, 'errors': {'get_preferences': None}}, 200


@app.route('/user/<string:driver_id>/screw/<string:screw_id>/preference/save', methods=['POST'])
@as_json
@jwt_required
def save_preferences(driver_id, screw_id):
    current_user_id = get_jwt_identity()
    if driver_id != current_user_id:
        return {
            'errors': {'save_preferences': 'forbidden'}
        }, 403
    bdb = get_bdb()
    try:
        if bdb.is_screwdriver(screw_id, driver_id):
            form = PreferencesForm(request.form)
            form.validate()
            if form.errors:
                response = {'errors': form.errors}
                return response, 400
            bdb.save_preferences(screw_id, form.data.get('preference'))
            preferences = bdb.get_preferences(screw_id)
        else:
            return ({
                'errors': {'save_preferences': 'forbidden'}
            }, 403)
    except Exception as e:
        return ({
            'errors': {'save_preferences': str(e)}
        }, 404)
    return {'preferences': preferences, 'errors': {'save_preferences': None}}, 200


@app.route('/user/<string:user_id>/driver/cancel', methods=['POST'])
@as_json
@jwt_required
def cancel_driver(user_id):
    current_user_id = get_jwt_identity()
    bdb = get_bdb()
    driver = bdb.get_driver(user_id)
    if driver is None:
        return ({
            'errors': {'cancel_driver': 'forbidden'}
        }, 403)
    if current_user_id not in (user_id, driver['id']):
        # only screw and driver can cancel
        return ({
            'errors': {'cancel_driver': 'forbidden'}
        }, 403)
    try:
        driver = bdb.cancel_driver(user_id)
    except Exception as e:
        return ({
            'errors': {'cancel_driver': str(e)}
        }, 404)
    return {'errors': {'cancel_driver': None}}, 200


@app.route('/user', methods=['POST'])
@as_json
@jwt_required
def get_all_users():
    bdb = get_bdb()
    users = bdb.get_all_users()
    return {'users': users, 'errors': {'get_users': None}}, 200


@app.route('/driver_request/make', methods=['POST'])
@as_json
@jwt_required
def make_driver_request():
    form = DriverRequestForm(request.form)
    form.validate()
    response = {'errors': form.errors}
    if not form.errors:
        bdb = get_bdb()
        user_id = get_jwt_identity()
        if user_id != form.data.get('screw'):
            # only the screw can make the request
            return {
                'errors': {'make_driver_request': 'forbidden'}
            }, 200
        if bdb.get_driver(form.data.get('screw')) is not None:
            return {
                'make_driver_request': 'You cannot make a driver request when you already have a driver!'
            }, 200
        try:
            driver_request = bdb.make_driver_request(
                form.data.get('screw'), form.data.get('driver'))
            response['errors']['make_driver_request'] = None
        except NotUniqueException as e:
            response['errors'][
                'make_driver_request'] = 'You cannot have more than one driver request!'
        except Exception as e:
            return {
                'errors': {'make_driver_request': str(e)}
            }, 200
    return response, 200


@app.route('/driver_request/<int:request_id>', methods=['POST'])
@as_json
@jwt_required
def get_driver_request(request_id):
    bdb = get_bdb()
    try:
        request = bdb.get_driver_request(request_id)
    except Exception as e:
        return {
            'errors': {'get_driver_request': str(e)}
        }, 404
    user_id = get_jwt_identity()
    if user_id not in (request['screw']['id'], request['driver']['id']):
        return {
            'errors': {'get_driver_request': 'forbidden'}
        }, 403
    return request


@app.route('/driver_request/<int:request_id>/cancel', methods=['POST'])
@as_json
@jwt_required
def cancel_driver_request(request_id):
    bdb = get_bdb()
    # first check if its authorized
    try:
        request = bdb.get_driver_request(request_id)
    except Exception as e:
        return {
            'errors': {'cancel_request': str(e)}
        }, 404
    user_id = get_jwt_identity()
    if user_id not in (request['screw']['id'], request['driver']['id']):
        return {
            'errors': {'cancel_request': 'forbidden'}
        }, 403
    # cancel
    try:
        request = bdb.cancel_driver_request(request_id)
        request['errors'] = {'cancel_request': None}
    except Exception as e:
        return {
            'errors': {'cancel_request': str(e)}
        }, 404
    return request


@app.route('/driver_request/<int:request_id>/approve', methods=['POST'])
@as_json
@jwt_required
def approve_driver_request(request_id):
    bdb = get_bdb()
    # first check if its authorized
    try:
        request = bdb.get_driver_request(request_id)
    except Exception as e:
        return {
            'errors': {'approve_request': str(e)}
        }, 404
    user_id = get_jwt_identity()
    if user_id != request['driver']['id']:
        return {
            'errors': {'approve_request': 'forbidden'}
        }, 403
    # approve
    try:
        request = bdb.approve_driver_request(request_id)
        request['errors'] = {'approve_request': None}
    except Exception as e:
        return {
            'errors': {'approve_request': str(e)}
        }, 404
    return request, 200


@app.route('/match/<string:user_id>', methods=['POST'])
@as_json
@jwt_required
def get_match(user_id):
    bdb = get_bdb()
    match = bdb.get_match(user_id)
    return {'match': match, 'errors': {'get_match': None}}, 200


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
