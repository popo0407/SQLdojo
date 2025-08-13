import sys
sys.path.append('c:/Users/user/Downloads/SQLdojo_20250712')
from app.tests.test_main import app
for r in app.routes:
    p = getattr(r, 'path', '')
    methods = getattr(r, 'methods', [])
    name = getattr(getattr(r, 'endpoint', None), '__name__', '')
    print(f"{p}  {sorted(list(methods) if methods else [])}  {name}")
