import re

with open('app/routers/history.py', 'r') as f:
    content = f.read()

# Fix the def to async def for the optional endpoints
content = content.replace("def get_extruder_history", "async def get_extruder_history")
content = content.replace("def get_mill_history", "async def get_mill_history")
content = content.replace("def get_all_history", "async def get_all_history")

# Fix query_history remaining db.query and related sync methods
content = content.replace("db: Session = Depends", "db: AsyncSession = Depends")
content = content.replace("from sqlalchemy.orm import Session, joinedload, selectinload", "from sqlalchemy.ext.asyncio import AsyncSession\nfrom sqlalchemy.orm import joinedload, selectinload\nfrom sqlalchemy import select")

# Fix the base query execution in query_history
# query = query.filter -> query_stmt = query_stmt.filter

# Actually I need to replace the entire query_history to be safe
