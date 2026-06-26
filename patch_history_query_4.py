import re

with open('app/routers/history.py', 'r') as f:
    content = f.read()

# Make sure page uses AsyncSession
content = content.replace("db: Session = Depends", "db: AsyncSession = Depends")
content = content.replace("from sqlalchemy.orm import Session, joinedload, selectinload", "from sqlalchemy.ext.asyncio import AsyncSession\nfrom sqlalchemy.orm import joinedload, selectinload\nfrom sqlalchemy import select")

# Fix query fetching
content = content.replace("jobs = query.options(", "jobs = (await db.execute(query.options(")
content = content.replace("     .limit(limit) \\\n     .all()", "     .limit(limit) \\\n     )).unique().scalars().all()")

with open('app/routers/history.py', 'w') as f:
    f.write(content)
