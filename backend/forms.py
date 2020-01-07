'''
Kei Imada
20200107
Forms for Bolt
'''

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField
from wtforms.validators import DataRequired

class LoginForm(FlaskForm):
    username = StringField('username', validators=[DataRequired()])
    password = StringField('password', validators=[DataRequired()])
    rememberMe = BooleanField('rememberMe', false_values=(False, 'false', 0, '0'))
