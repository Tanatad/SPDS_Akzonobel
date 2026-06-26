from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
from app.services.kepware_connector import kepware_client

router = APIRouter()

@router.websocket("/ws/extruder/{line_no}")
async def websocket_extruder(websocket: WebSocket, line_no: int):
    await websocket.accept()
    try:
        while True:
            # Get data from memory cache instead of requesting from Kepware directly
            data = kepware_client.cached_extruder_data.get(line_no)
            if not data:
                # Default empty data
                data = {
                    "actual_screw_rpm": 0, "actual_torque_pct": 0, "actual_side_feed_pct": 0,
                    "actual_ht1": 0, "actual_ht2": 0, "actual_ht3": 0, "actual_ht4": 0, "actual_ht5": 0,
                    "std_screw_rpm": 0, "std_side_feed_pct": 0,
                    "std_ht1": 0, "std_ht2": 0, "std_ht3": 0, "std_ht4": 0, "std_ht5": 0,
                    "barrel_water_temp": 0, "barrel_water_flow": 0
                }
            await websocket.send_json(data)
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Extruder error: {e}")

@router.websocket("/ws/mill/{line_no}")
async def websocket_mill(websocket: WebSocket, line_no: int):
    await websocket.accept()
    line_no_str = str(line_no)
    try:
        while True:
            data = kepware_client.cached_mill_data.get(line_no_str)
            if not data:
                data = {"actual_mill_sep": 0.0, "actual_mill_rotor": 0.0, "actual_mill_dosing": 0.0, "actual_mill_air_flow": 0.0, "actual_mill_temp_in": 0.0, "actual_mill_temp_out": 0.0}
            await websocket.send_json(data)
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Mill error: {e}")
