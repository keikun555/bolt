'''
Kei Imada
20200107
Forms for Bolt
'''

from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField
from wtforms.validators import DataRequired


class LoginForm(FlaskForm):
    class Meta:
        csrf = False
    username = StringField('username', validators=[DataRequired()])
    password = StringField('password', validators=[DataRequired()])


class DriverRequestForm(FlaskForm):
    class Meta:
        csrf = False
    screw = StringField('screw', validators=[DataRequired()])
    driver = StringField('driver', validators=[DataRequired()])
