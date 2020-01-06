"""
Kei Imada
LDAP authentication script for Python
Verifies credentials for username and password.
Returns ldap client object on success or None on failure
user = {
    "email": email address of user,
    "name": name of user,
    "uid": user id of user
}
prints out if LDAP server error
References:
    https://gist.github.com/ibeex/1288159
"""
from __future__ import print_function
import ldap
import sys

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def check_credentials(username, password, dictionary=False):
    """
    Verifies credentials for username and password.
    dictionary bool if true, instead of True or False, returns dictionary
        of user information
    Returns user dictionary on success or None on failure
    user = {
        "email": email address of user,
        "name": name of user,
        "uid": user id of user
    }
    prints out if LDAP server error
    """
    LDAP_SERVER = 'ldap://ldap.sccs.swarthmore.edu'
    LDAP_USERNAME = 'uid=%s,ou=People,dc=sccs,dc=swarthmore,dc=edu' % username
    LDAP_PASSWORD = password
    try:
        # build a client
        ldap_client = ldap.initialize(LDAP_SERVER)
        # perform a synchronous bind
        ldap_client.set_option(ldap.OPT_REFERRALS, 0)
        ldap_client.simple_bind_s(LDAP_USERNAME, LDAP_PASSWORD)
    except ldap.INVALID_CREDENTIALS:
        # invalid credentials
        ldap_client.unbind()
        return None
    except ldap.SERVER_DOWN:
        # server not available
        eprint("LDAP server is down")
        return None
    base = 'ou=People,dc=sccs,dc=swarthmore,dc=edu'
    filt = "uid={}".format(username)
    scope = ldap.SCOPE_SUBTREE
    attrs = ["*"]
    result = ldap_client.search(base, scope, filt, attrs)
    ldap_user = ldap_client.result(result)[1][0][1]
    user = {
        "email": ldap_user["swatmail"][0],
        "name": ldap_user["cn"][0],
        "uid": ldap_user["uid"][0]
    }
    return user


if __name__ == "__main__":
    import getpass, sys
    if sys.version_info < (3, 0):
        input = raw_input
    username = input("username: ")
    password = getpass.getpass("password: ")
    if check_credentials(username, password):
        print("ACCESS GRANTED")
    else:
        print("ACCESS DENIED")
