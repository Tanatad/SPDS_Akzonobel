import asyncio
from asyncua import Client
import logging

logger = logging.getLogger(__name__)

KEPWARE_ENDPOINT = "opc.tcp://192.168.0.200:49320"

class KepwareClient:
    def __init__(self, endpoint: str):
        self.endpoint = endpoint
        self.client = None
        self.is_connected = False
        self.cached_extruder_data = {}
        self.cached_mill_data = {}

    async def connect(self):
        try:
            self.client = Client(url=self.endpoint)
            # Short timeout for connection to not block startup if kepware is down
            await asyncio.wait_for(self.client.connect(), timeout=5.0)
            self.is_connected = True
            logger.info("✅ Connected to Kepware OPC UA Server")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Kepware: {e}")
            self.is_connected = False

    async def disconnect(self):
        if self.client and self.is_connected:
            try:
                await self.client.disconnect()
                logger.info("🔌 Disconnected from Kepware")
            except Exception as e:
                logger.error(f"Error disconnecting from Kepware: {e}")
            finally:
                self.is_connected = False

    async def _read_tags(self, tags_map):
        result = {}
        if not self.is_connected or not self.client:
            return {k: 0.0 for k in tags_map.keys()}

        for db_field, item_id in tags_map.items():
            try:
                node_id = f"ns=2;s={item_id}"
                var = self.client.get_node(node_id)
                val = await var.read_value()
                result[db_field] = float(val)
            except Exception as e:
                result[db_field] = 0.0
        return result

    async def read_extruder_tags(self, line_no: int):
        ext_tags = {}
        if line_no == 3:
            prefix = "Extruder_3.Device1.ServerInterfaces.Akzo_Performance_Portal.OPC_UA_Comms"
        else:
            prefix = f"Extruder_{line_no}.Device"

        ext_tags = {
            "actual_screw_rpm": f"{prefix}.Extruder Actual Speed (RPM)",
            "actual_torque_pct": f"{prefix}.Extruder Torque PCT",
            "actual_side_feed_pct": f"{prefix}.Feeder Actual Speed PCT",
            "actual_ht1": f"{prefix}.Zone 1 Actual Temperature",
            "actual_ht2": f"{prefix}.Zone 2 Actual Temperature",
            "actual_ht3": f"{prefix}.Zone 3 Actual Temperature",
            "actual_ht4": f"{prefix}.Zone 4 Actual Temperature",
            "actual_ht5": f"{prefix}.Zone 5 Actual Temperature",
            "std_screw_rpm": f"{prefix}.Setpoint - Extruder",
            "std_side_feed_pct": f"{prefix}.Setpoint - Feeder",
            "std_ht1": f"{prefix}.Setpoint - Zone 1 Temperature",
            "std_ht2": f"{prefix}.Setpoint - Zone 2 Temperature",
            "std_ht3": f"{prefix}.Setpoint - Zone 3 Temperature",
            "std_ht4": f"{prefix}.Setpoint - Zone 4 Temperature",
            "std_ht5": f"{prefix}.Setpoint - Zone 5 Temperature",
            "barrel_water_temp": f"{prefix}.BCU Customer Temperature C/F",
        }

        if line_no in [1, 3, 7, 11]:
            ext_tags["barrel_water_flow"] = f"{prefix}.BCU Customer Flow"

        return await self._read_tags(ext_tags)

    async def read_mill_tags(self, mill_line: str):
        try:
            m_line = int(mill_line)
        except:
            return {}

        mill_tags = {}
        if m_line in [9, 13, 14]:
            prefix = f"Mill_{m_line}.Device"
            mill_tags = {
                "actual_mill_sep": f"{prefix}.SEPARATOR",
                "actual_mill_rotor": f"{prefix}.ROTOR",
                "actual_mill_dosing": f"{prefix}.FEEDER",
                "actual_mill_air_flow": f"{prefix}.AIRFLOW",
                "actual_mill_temp_in": f"{prefix}.TEMP_IN",
                "actual_mill_temp_out": f"{prefix}.TEMP_OUT",
            }
        elif m_line in [2, 3, 4, 10, 12]:
            prefix = f"Mill_{m_line}.Device"
            mill_tags = {
                "actual_mill_sep": f"{prefix}.CLASSIFIER_SPEED",
                "actual_mill_rotor": f"{prefix}.MAIN_SPEED",
                "actual_mill_dosing": f"{prefix}.FEED_A_SPEED",
                "actual_mill_air_flow": f"{prefix}.FT_AIR_1",
                "actual_mill_temp_in": f"{prefix}.new-t2",
                "actual_mill_temp_out": f"{prefix}.new-t3",
            }
        
        if not mill_tags:
            return {}

        return await self._read_tags(mill_tags)

# Singleton instance
kepware_client = KepwareClient(KEPWARE_ENDPOINT)

# Wrapper functions to retain compatibility with old code if needed, but they use cache now
async def read_extruder_only(line_no: int):
    # Fetch from cache instead of querying directly to avoid blocking
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
    return data

async def read_mill_only(mill_line: str):
    data = kepware_client.cached_mill_data.get(mill_line)
    if not data:
        data = {"actual_mill_sep": 0.0, "actual_mill_rotor": 0.0, "actual_mill_dosing": 0.0, "actual_mill_air_flow": 0.0, "actual_mill_temp_in": 0.0, "actual_mill_temp_out": 0.0}
    return data
