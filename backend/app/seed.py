from datetime import date
from .database import SessionLocal, Base, engine
from . import models
from .routers.auth import hash_password

Base.metadata.create_all(bind=engine)

def run():
    db = SessionLocal()
    if db.query(models.User).filter_by(username="AdminBVG").first() is None:
        admin = models.User(
            username="AdminBVG",
            hashed_password=hash_password("BVG2025"),
            role="REGISTRADOR_BVG",
        )
        db.add(admin)
        db.commit()
    if db.query(models.Shareholder).count() == 0:
        shareholders = [
            models.Shareholder(code='S1', name='Ana', document='DOC1', email='ana@example.com', actions=100),
            models.Shareholder(code='S2', name='Bob', document='DOC2', email='bob@example.com', actions=50),
            models.Shareholder(code='S3', name='Carla', document='DOC3', email='carla@example.com', actions=75),
            models.Shareholder(code='S4', name='Diego', document='DOC4', email='diego@example.com', actions=60),
            models.Shareholder(code='S5', name='Eva', document='DOC5', email='eva@example.com', actions=40),
        ]
        db.add_all(shareholders)
        person = models.Person(type=models.PersonType.TERCERO, name='Apoderado Valido', document='P1', email='apod@example.com')
        db.add(person)
        db.flush()
        proxy = models.Proxy(
            election_id=1,
            proxy_person_id=person.id,
            tipo_doc='CC',
            num_doc='123',
            fecha_otorg=date.today(),
            fecha_vigencia=date(2099,1,1),
            pdf_url='http://example.com/poder.pdf',
            status=models.ProxyStatus.VALID
        )
        db.add(proxy)
        db.commit()
    db.close()

if __name__ == '__main__':
    run()
