'''
Kei Imada
20200107
Forms for Bolt
'''

import json
from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, FieldList, IntegerField, FormField, Field, ValidationError
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

# class PreferenceForm(FlaskForm):
#     candidate = StringField('candidate', validators=[DataRequired()])
#     preference = StringField('preference', validators=[DataRequired()])


class PreferenceField(Field):

    def process_formdata(self, valuelist):
        self.data = [json.loads(value) for value in valuelist]


def isPreference(form, field):
    for i in range(len(field.data)):
        preference = field.data[i]
        if not isinstance(preference, dict):
            raise ValidationError('Not a preference list (not a dict)')
        if 'candidate' not in preference:
            raise ValidationError('Not a preference list (no candidate)')
        if 'preference' not in preference:
            raise ValidationError('Not a preference list (no preference)')
        if not isinstance(preference['candidate'], str):
            raise ValidationError(
                'Not a preference list (candidate not a string)')
        try:
            field.data[i]['preference'] = round(float(field.data[i]['preference']), 2)
        except:
            raise ValidationError(
                'Not a preference list (preference not a number)')


class PreferencesForm(FlaskForm):

    class Meta:
        csrf = False
    name = StringField('names')
    preference = PreferenceField('preference', validators=[isPreference])
