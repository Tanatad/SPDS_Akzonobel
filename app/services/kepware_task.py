import asyncio
import logging
from sqlalchemy import select
from app.db import database, models
from app.services.kepware_connector import kepware_client

logger = logging.getLogger(__name__)

async def update_kepware_cache():
    while True:
        try:
            if not kepware_client.is_connected:
                await kepware_client.connect()

            if kepware_client.is_connected:
                # Find active lines from DB
                active_extruder_lines = set()
                active_mill_lines = set()

                async with database.AsyncSessionLocal() as session:
                    # Extruder jobs
                    extruder_jobs = (await session.execute(
                        select(models.ExtruderJob.extruder_line)
                        .filter(models.ExtruderJob.status == 'IN_PROGRESS')
                    )).scalars().all()
                    active_extruder_lines.update(extruder_jobs)

                    # Mill jobs
                    mill_jobs = (await session.execute(
                        select(models.MillJob.mill_line)
                        .filter(models.MillJob.status == 'IN_PROGRESS')
                    )).scalars().all()
                    active_mill_lines.update(mill_jobs)

                # Fetch data for active lines
                for line_no in active_extruder_lines:
                    data = await kepware_client.read_extruder_tags(line_no)
                    kepware_client.cached_extruder_data[line_no] = data

                for mill_line in active_mill_lines:
                    data = await kepware_client.read_mill_tags(str(mill_line))
                    kepware_client.cached_mill_data[str(mill_line)] = data

        except Exception as e:
            logger.error(f"Error in kepware background task: {e}")
            kepware_client.is_connected = False

        await asyncio.sleep(2.0) # Poll every 2 seconds
