import re

with open('app/routers/history.py', 'r') as f:
    content = f.read()

# Since get_extruder_history, get_mill_history, and get_all_history are commented out and not used, let's just make them async to fix compilation but we'll leave them as is or fix their syntax
content = content.replace("def get_extruder_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):", "async def get_extruder_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):")
content = content.replace("jobs = db.query(models.ExtruderJob).options(", "jobs = (await db.execute(select(models.ExtruderJob).options(")
content = content.replace(").order_by(desc(models.ExtruderJob.created_at)).limit(limit).all()", ").order_by(desc(models.ExtruderJob.created_at)).limit(limit))).unique().scalars().all()")

content = content.replace("def get_mill_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):", "async def get_mill_history(limit: int = 50, db: AsyncSession = Depends(database.get_db)):")
content = content.replace("    jobs = db.query(\n        models.MillJob, \n        models.ExtruderJob.po_no, \n        models.ExtruderJob.product_code\n    ).join(\n        models.ExtruderJob, models.MillJob.extruder_job_id == models.ExtruderJob.job_id\n    ).order_by(desc(models.MillJob.created_at)).limit(limit).all()", "    jobs = (await db.execute(select(\n        models.MillJob, \n        models.ExtruderJob.po_no, \n        models.ExtruderJob.product_code\n    ).join(\n        models.ExtruderJob, models.MillJob.extruder_job_id == models.ExtruderJob.job_id\n    ).order_by(desc(models.MillJob.created_at)).limit(limit))).all()")

content = content.replace("def get_all_history(limit: int = 100, db: AsyncSession = Depends(database.get_db)):", "async def get_all_history(limit: int = 100, db: AsyncSession = Depends(database.get_db)):")
content = content.replace("    jobs = db.query(models.ExtruderJob).options(\n        joinedload(models.ExtruderJob.warmups),\n        joinedload(models.ExtruderJob.setups),\n        joinedload(models.ExtruderJob.productions),\n    ).order_by(desc(models.ExtruderJob.created_at)).limit(limit).all()", "    jobs = (await db.execute(select(models.ExtruderJob).options(\n        joinedload(models.ExtruderJob.warmups),\n        joinedload(models.ExtruderJob.setups),\n        joinedload(models.ExtruderJob.productions),\n    ).order_by(desc(models.ExtruderJob.created_at)).limit(limit))).unique().scalars().all()")
content = content.replace("mill_job = db.query(models.MillJob).filter(models.MillJob.extruder_job_id == job.job_id).first()", "mill_job = (await db.execute(select(models.MillJob).filter(models.MillJob.extruder_job_id == job.job_id))).scalars().first()")

# Let's fix the first query in history.py again, line 24 which says query = db.query(models.ExtruderJob)
content = content.replace("    query = db.query(models.ExtruderJob)", "    query_stmt = select(models.ExtruderJob)")

with open('app/routers/history.py', 'w') as f:
    f.write(content)
