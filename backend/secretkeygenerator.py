import secrets
import string

alphabet = string.ascii_letters + string.digits
secret_key = ''.join(secrets.choice(alphabet) for _ in range(32))

print(secret_key)
