import re

with open('app/routers/mill.py', 'r') as f:
    content = f.read()

# get_pending_jobs
content = content.replace("    return db.query(models.ExtruderJob).filter(\n        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL'])\n    ).order_by(models.ExtruderJob.created_at.desc()).all()", "    return (await db.execute(select(models.ExtruderJob).filter(\n        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL'])\n    ).order_by(models.ExtruderJob.created_at.desc()))).scalars().all()")

# start_manual_mill_job
content = content.replace("    existing_job = db.query(models.ExtruderJob).filter(\n        models.ExtruderJob.po_no == po_formatted,\n        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL', 'IN_PROCESS_MILL'])\n    ).first()", "    existing_job = (await db.execute(select(models.ExtruderJob).filter(\n        models.ExtruderJob.po_no == po_formatted,\n        models.ExtruderJob.status.in_(['IN_PROGRESS', 'WAITING_MILL', 'IN_PROCESS_MILL'])\n    ))).scalars().first()")

with open('app/routers/mill.py', 'w') as f:
    f.write(content)
