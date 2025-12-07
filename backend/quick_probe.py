from main import app

if __name__ == '__main__':
    c = app.test_client()
    urls = [
        '/api/countries',
        '/api/provinces/ZA',
        '/api/cities/Gauteng',
        '/api/areas/Johannesburg'
    ]
    for u in urls:
        r = c.get(u)
        print(u, '->', r.status_code, r.get_json())
