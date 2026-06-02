import asyncio
import httpx
import urllib.parse
from pyproj import Transformer

# Transformation von WGS84 (EPSG:4326) zu LV95 (EPSG:2056)
# always_xy=True stellt sicher, dass wir (Longitude, Latitude) übergeben und (Easting, Northing) erhalten.
transformer = Transformer.from_crs("epsg:4326", "epsg:2056", always_xy=True)
inv_transformer = Transformer.from_crs("epsg:2056", "epsg:4326", always_xy=True)


def transform_coords_to_wgs84(coords):
    """Rekursive Transformation von LV95 Koordinaten-Arrays nach WGS84."""
    if not coords: return []
    if isinstance(coords[0], (int, float)):
        lng, lat = inv_transformer.transform(coords[0], coords[1])
        return [lng, lat]
    return [transform_coords_to_wgs84(c) for c in coords]


WFS_LAYERS = {
    # Baupotenzial & Baurecht
    "grundnutzung": {"produkt_id": "ZONPLANX_COL_V3_MP", "typename": "esri:Grundnutzung"},
    "landwerte": {"produkt_id": "LANDWERT_DS_V2_MP", "typename": "esri:Landwertzone__innerhalb_Bauzone"},
    "gebaeudehoehen": {"produkt_id": "GEBHOHEN_DS_V5_MP", "typename": "esri:Blockmodelle_Gebäude"},

    # Umwelt & Energie
    "altlasten": {"produkt_id": "KBSTANDO_DS_V3_MP",
                  "typename": "esri:Kataster_der_belasteten_Standorte__Betriebsstandorte"},
    "grundwasser": {"produkt_id": "GRWASXXX_COL_V4_MP", "typename": "esri:Grundwasser__Randgebiete"},
    "solarpotenzial": {"produkt_id": "SOLPKT18_DS_V2_MP",
                       "typename": "esri:Solarpotentialkataster_2018__Teildachflächen"},
    "erdwaerme": {"produkt_id": "EWNUTZXX_COL_V3_MP", "typename": "esri:Erdwärmenutzung_zulässig"},
    "energieplanung": {"produkt_id": "ENERPLAN_COL_V5_MP", "typename": "esri:Kommunale_Energieplanungen"},

    # Infrastruktur & Lebensqualität
    "kantonsstrassen": {"produkt_id": "STRWXXXX_COL_V3_MP", "typename": "esri:Kantonsstrassen"},
    "oev_haltestellen": {"produkt_id": "OEVXXXXX_COL_V4_MP", "typename": "esri:Öffentlicher_Verkehr__Haltestellen"},
    "schulen": {"produkt_id": "BILUKDVX_COL_V4_MP", "typename": "esri:Bauinventar__Punkte_"},
    "glasfaser": {"produkt_id": "GLFSERSC_DS_V2_MP", "typename": "esri:Glasfasererschliessung"},
    "wanderwege": {"produkt_id": "WANDRWEG_DS_V1_MP", "typename": "esri:Wanderwege"},

    # Natur & Gefahren
    "gefahrenkarte": {"produkt_id": "GHKXXXXX_COL_V1_MP", "typename": "esri:Gefahrenhinweiskarte__Perimeter"},
    "waldgrenzen": {"produkt_id": "STWALDGR_DS_V2_MP", "typename": "esri:Statische_Waldgrenzen"},
    "gewaesserraum": {"produkt_id": "GWRMBRXX_COL_V1_MP",
                      "typename": "esri:Gewässerraumbreite_der_Fliessgewässer__theoretisch"},

    # Spezielle Restriktionen
    "archaeologie": {"produkt_id": "ARCHFSTL_DS_V1_MP", "typename": "esri:Archäologische_Fundstellen"},
    "luftschutz": {"produkt_id": "LUFTSCHR_DS_V3_MP", "typename": "esri:Schutzbauten_Zivilschutz__Punkte_"},
    "schiessanlagen": {"produkt_id": "SLAEXXXX_COL_V1_MP", "typename": "esri:Schiessanlage"}
}


async def fetch_layer(client: httpx.AsyncClient, url: str, typename: str):
    try:
        response = await client.get(url, timeout=10.0)
        # Fallback-Daten fuer den lokalen Betrieb, wenn die echte API fehlschlaegt.
        if response.status_code != 200:
            print(f"WFS Layer {typename} returned {response.status_code}.", flush=True)
            dummy_feature = {
                "type": "Feature",
                "properties": {
                    "kategorie": typename,
                    "status": "Simulierte Fallback-Daten",
                    "relevanz": "Hoch" if "gefahren" in typename or "altlasten" in typename else "Normal",
                    "distanz_meter": "120",
                    "details": f"Dieser Layer ({typename}) lieferte HTTP {response.status_code}."
                }
            }
            return {"typename": typename,
                    "data": {"type": "FeatureCollection", "features": [dummy_feature], "fallback_mock": True},
                    "failed": True}
        return {"typename": typename, "data": response.json(), "failed": False}
    except Exception as e:
        print(f"Error fetching {typename}: {e}.", flush=True)
        dummy_feature = {
            "type": "Feature",
            "properties": {"kategorie": typename, "error": str(e), "status": "Simuliert"}
        }
        return {"typename": typename, "data": {"type": "FeatureCollection", "features": [dummy_feature]},
                "failed": True}


async def get_geo_data(lat: float, lng: float, radius: int, role: str) -> dict:
    # Umrechnung der Koordinate (WGS84 Lng, Lat) in LV95 (X, Y)
    lv95_x, lv95_y = transformer.transform(lng, lat)


async def get_geo_data(lat: float, lng: float, radius: int, active_layers: list[str] = None) -> dict:
    """Holt asynchron Geodaten aus mehreren WFS-Layern und gibt sie als kombiniertes JSON zurück."""

    lv95_x, lv95_y = transformer.transform(lng, lat)
    bbox = f"{lv95_x - radius},{lv95_y - radius},{lv95_x + radius},{lv95_y + radius}"

    tasks = []

    async with httpx.AsyncClient() as client:
        for layer_id, layer_info in WFS_LAYERS.items():
            # Wenn active_layers mitgegeben wird, nur die filtern, die drin sind
            if active_layers is not None and layer_id not in active_layers:
                continue

            produkt_id = layer_info["produkt_id"]
            typename = layer_info["typename"]

            # WFS 2.0 GetFeature Request (Umlaute url-encodieren!)
            safe_typename = urllib.parse.quote(typename)
            url = f"https://public.geo.lu.ch/ogd/services/managed/{produkt_id}/MapServer/WFSServer?service=wfs&version=2.0.0&request=getfeature&typename={safe_typename}&srsname=epsg:2056&bbox={bbox}&outputformat=geojson"
            tasks.append(fetch_layer(client, url, typename))

        results = await asyncio.gather(*tasks)

    combined_geo_data = {}
    failed_count = 0
    for res in results:
        combined_geo_data[res["typename"]] = res["data"]
        if res.get("failed", False):
            failed_count += 1

    # Wenn zu viele (z.B. >= 3) WFS-Anfragen fehlschlagen, brechen wir ab.
    # Wir wollen der KI keine Fake-Daten geben.
    if failed_count >= 3:
        raise Exception(
            "Der kantonale WFS-Server (Luzern) ist momentan überlastet oder blockiert die Anfragen (Rate Limit). Bitte versuchen Sie es in einigen Minuten erneut.")

    return combined_geo_data


async def get_egrid(lat: float, lng: float) -> str:
    """Ermittelt die EGRID (Eidgenössischer Grundstücksidentifikator) für eine Koordinate."""
    lv95_x, lv95_y = transformer.transform(lng, lat)
    url = f"https://svc.geo.lu.ch/oereb/getegrid/json/?EN={lv95_x},{lv95_y}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if "OrderedItems" in data and len(data["OrderedItems"]) > 0:
                    return data["OrderedItems"][0].get("Value")
        except Exception as e:
            print(f"Error fetching EGRID: {e}", flush=True)
    return None


async def fetch_oereb(egrid: str) -> dict:
    """Ruft den ÖREB-Auszug für eine gegebene EGRID ab."""
    # Mit geometry=true, um das Polygon für die Karte zu erhalten
    url = f"https://svc.geo.lu.ch/oereb/extract/json/{egrid}?geometry=true"

    async with httpx.AsyncClient() as client:
        try:
            # ÖREB API kann langsam sein
            response = await client.get(url, timeout=30.0)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error fetching ÖREB extract: {e}", flush=True)
    return None


def extract_parcel_geometry(oereb_json: dict) -> dict:
    """Extrahiert die Geometrie der Parzelle aus dem ÖREB-JSON und konvertiert sie nach WGS84 für Leaflet."""
    if not oereb_json:
        return None

    try:
        response = oereb_json.get("GetExtractByIdResponse", oereb_json)
        extract = response.get("extract", response.get("Extract", response))
        real_estate = extract.get("RealEstate", extract.get("realEstate", {}))
        limit = real_estate.get("Limit", real_estate.get("limit", {}))

        # OEREB liefert MultiSurface -> Surface -> Patch -> Polyline
        # oder in neueren Versionen direkt GeoJSON oder Koordinaten-Arrays.
        # Im Standard GeoJSON-Format:
        if isinstance(limit, dict):
            # Prüfen ob es direkt Koordinaten sind (LV95)
            if "coordinates" in limit:
                raw_coords = limit["coordinates"]
                wgs84_coords = transform_coords_to_wgs84(raw_coords)

                return {
                    "type": "Feature",
                    "geometry": {
                        "type": limit.get("type", "MultiPolygon"),
                        "coordinates": wgs84_coords
                    },
                    "properties": {
                        "egrid": real_estate.get("EGRID")
                    }
                }
    except Exception as e:
        print(f"Error extracting parcel geometry: {e}", flush=True)
    return None


def simplify_oereb_for_llm(oereb_json: dict) -> dict:
    """Extrahiert die relevanten Eigentumsbeschränkungen für das LLM aus dem komplexen ÖREB-JSON."""
    if not oereb_json:
        return {}

    try:
        # Finde "extract" oder "Extract"
        response = oereb_json.get("GetExtractByIdResponse", oereb_json)
        extract = response.get("extract", response.get("Extract", response))

        real_estate = extract.get("RealEstate", {})

        restrictions = real_estate.get("RestrictionOnLandownership", extract.get("RealEstateRestrictionOnLandownership", []))
        if not isinstance(restrictions, list):
            restrictions = [restrictions]

        simplified = {
            "Parzelle": {
                "EGRID": real_estate.get("EGRID", real_estate.get("egrid")),
                "Nummer": real_estate.get("Number", real_estate.get("number")),
                "Gemeinde": real_estate.get("Municipality", real_estate.get("municipality")),
                "Fläche_m2": real_estate.get("LandRegistryArea", real_estate.get("landRegistryArea"))
            },
            "Öffentlich_rechtliche_Beschränkungen": []
        }

        for restriction in restrictions:
            if not restriction: continue
            theme_obj = restriction.get("Theme", restriction.get("theme", {}))
            theme = "Unbekannt"
            if isinstance(theme_obj, dict):
                text_list = theme_obj.get("Text", theme_obj.get("text", []))
                if text_list and isinstance(text_list, list) and len(text_list) > 0:
                    theme = text_list[0].get("Text", text_list[0].get("text", "Unbekannt"))
            elif isinstance(theme_obj, str):
                theme = theme_obj

            sub_theme = restriction.get("SubTheme", restriction.get("subTheme"))

            law_status_obj = restriction.get("Lawstatus", restriction.get("lawstatus", {}))
            law_status = "Unbekannt"
            if isinstance(law_status_obj, dict):
                ls_text_list = law_status_obj.get("Text", law_status_obj.get("text", []))
                if ls_text_list and isinstance(ls_text_list, list) and len(ls_text_list) > 0:
                    law_status = ls_text_list[0].get("Text", ls_text_list[0].get("text", "Unbekannt"))
            elif isinstance(law_status_obj, str):
                law_status = law_status_obj

            # Manche Restriktionen sind verschachtelt oder haben spezifische Rechtsvorschriften
            simplified["Öffentlich_rechtliche_Beschränkungen"].append({
                "Thema": theme,
                "Zusatzinfo": sub_theme,
                "Gesetzlicher_Status": law_status
            })

        return simplified
    except Exception as e:
        print(f"Error parsing ÖREB: {e}", flush=True)
        return {"Fehler": "ÖREB Daten konnten nicht geparst werden."}


import math


def calculate_min_distance(x: float, y: float, geometry: dict) -> int:
    """Berechnet die approximative minimale Distanz (in Metern) von einem LV95-Punkt zu einer GeoJSON-Geometrie."""
    if not geometry or "coordinates" not in geometry:
        return None

    coords = geometry["coordinates"]

    # Flatten the coordinates array recursively
    def flatten(arr):
        if not arr: return []
        if isinstance(arr[0], (int, float)):
            return [arr]  # [x, y]
        flat_list = []
        for item in arr:
            flat_list.extend(flatten(item))
        return flat_list

    all_points = flatten(coords)
    if not all_points: return None

    min_dist = float('inf')
    for p in all_points:
        if len(p) >= 2:
            dx = p[0] - x
            dy = p[1] - y
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < min_dist:
                min_dist = dist

    return round(min_dist)


def simplify_geo_data(geo_data: dict, center_lat: float = None, center_lng: float = None) -> dict:
    """Entfernt Geometrien, technische Felder und fügt Distanzen hinzu."""
    simplified_data = {}
    irrelevant_keys = {"GmlID", "OBJECTID", "Identifikator_in_Originaldaten", "Datenmodell_Originaldaten",
                       "Filename_Originaldaten", "SHAPE_Length", "SHAPE_Area", "OBJECTID_1"}

    # Transformation des Zentrums nach LV95, falls vorhanden
    lv95_x = lv95_y = None
    if center_lat is not None and center_lng is not None:
        lv95_x, lv95_y = transformer.transform(center_lng, center_lat)

    for layer_name, data in geo_data.items():
        if isinstance(data, dict) and "features" in data:
            simplified_features = []
            for f in data["features"]:
                if "properties" in f:
                    props = f["properties"]
                    clean_props = {k: v for k, v in props.items() if v is not None and k not in irrelevant_keys}

                    # Distanz berechnen und Geometrie sichern
                    transformed_geom = None
                    if "geometry" in f:
                        if lv95_x and lv95_y:
                            dist = calculate_min_distance(lv95_x, lv95_y, f["geometry"])
                            if dist is not None:
                                clean_props["Distanz_zum_Standort_m"] = dist

                        geom = f["geometry"]
                        if "coordinates" in geom:
                            transformed_geom = {
                                "type": geom.get("type", "Polygon"),
                                "coordinates": transform_coords_to_wgs84(geom["coordinates"])
                            }

                    if clean_props:
                        if transformed_geom:
                            clean_props["_geometry"] = transformed_geom
                        simplified_features.append(clean_props)
            simplified_data[layer_name] = simplified_features
        else:
            simplified_data[layer_name] = data

    return simplified_data
