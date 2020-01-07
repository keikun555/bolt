'''
Kei Imada
20200106
Bolt REST API
'''

from flask import flash, Flask, g, jsonify, request

from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
from flask_json import FlaskJSON, as_json
from flask_login import LoginManager, current_user, login_user, login_required

from BoltDB import BoltDB
from forms import LoginForm

# make and configure Flask App
app = Flask(__name__)
# generated with `openssl rand -base64 32`
app.secret_key = 'PzfQpZ38A9Vj+rewcgHUSDKk8QIaR/5ssnD1Yl/7va0='
FlaskJSON(app)
CORS(app)  # TODO remove for production
csrf = CSRFProtect(app)

# make and configure Login Manager
login_manager = LoginManager()
login_manager.init_app(app)

# BoltDB
def get_bdb():
    if 'bdb' not in g:
        g.bdb = BoltDB()
    return g.bdb

@login_manager.user_loader
def load_user(user_id):
    bdb = get_bdb()
    return bdb.get_user(user_id)

@app.route('/login', methods=['GET', 'POST'])
@as_json
def login():
    form = LoginForm(request.args, csrf_enabled=False)
    form.validate()
    response = {'errors': form.errors}
    if not form.errors:
        # no errors
        bdb = get_bdb()
        user = bdb.login(form.data.get('username'), form.data.get('password'))
        if user is None:
            response['errors']['login'] = 'failed'
        else:
            print('Logged in successfully.')
            login_user(user, remember=form.data.get('rememberMe'))
            response['user'] = user.__dict__
    return response, 200

@app.route("/logout")
@login_required
def logout():
    logout_user()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
