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

from cachetools import TTLCache

from BoltDB import BoltDB
from forms import LoginForm

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
CORS(app)  # TODO remove for production
jwt = JWTManager(app)

# BoltDB


def get_bdb():
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
    form = LoginForm(request.form, csrf_enabled=False)
    form.validate()
    response = {'errors': form.errors}
    if not form.errors:
        # no errors
        bdb = get_bdb()
        user = bdb.login(form.data.get('username'), form.data.get('password'))
        if user is None:
            response['errors']['login'] = 'failed'
        else:
            print('%s logged in successfully.' % user.id)
            response['user'] = user.__dict__
            token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
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
# @jwt_required
def get_user(user_id):
    bdb = get_bdb()
    try:
        user = bdb.get_user(user_id)
    except:
        return {
            'errors': {'user': 'not found'}
        }, 404
    current_user_id = get_jwt_identity()
    if(user_id == current_user_id):
        print("same user!")
    print(user_id, current_user_id)
    return user, 200


@app.route('/user', methods=['POST'])
@as_json
# @jwt_required
def get_all_users():
    bdb = get_bdb()
    users = bdb.get_all_users()
    return {'users': users}, 200


@app.route('/match/<string:user_id>', methods=['POST'])
@as_json
# @jwt_required
def get_match(user_id):
    bdb = get_bdb()
    match = bdb.get_match(user_id)
    return {'match': match}, 200


@app.route('/', defaults={'path': ''})
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
