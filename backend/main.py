import asyncio
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import StreamingResponse
import httpx
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from geo_service import get_geo_data, simplify_geo_data, get_egrid, fetch_oereb, simplify_oereb_for_llm, \
    extract_parcel_geometry
from llm_service import analyze_geo_data, compare_geo_data

app = FastAPI(title="Lucerne Geo-AI Searching Tool")

# CORS-Konfiguration für lokale Entwicklung
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    lat: float
    lng: float
    radius: int = Field(ge=50, le=5000)
    role: str = Field(pattern="^(private|business)$")
    provider: str = Field(default="openai", pattern="^(openai|gemini)$")
    active_layers: list[str] = []


class CompareRequest(BaseModel):
    lat1: float
    lng1: float
    lat2: float
    lng2: float
    radius: int = Field(ge=50, le=5000)
    role: str = Field(pattern="^(private|business)$")
    provider: str = Field(default="openai", pattern="^(openai|gemini)$")
    active_layers: list[str] = []


@app.get("/api/oereb/pdf/{egrid}")
async def get_oereb_pdf(egrid: str):
    """Proxy für das ÖREB-PDF, um den Download-Zwang (Content-Disposition: attachment) des kantonalen Servers zu inline umzuschreiben."""
    url = f"https://svc.geo.lu.ch/oereb/extract/pdf/{egrid}"
    
    async def stream_pdf():
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", url, timeout=60.0) as response:
                if response.status_code != 200:
                    yield b"Fehler beim Laden des PDFs vom kantonalen Server."
                    return
                async for chunk in response.aiter_bytes():
                    yield chunk

    headers = {
        "Content-Type": "application/pdf",
        "Content-Disposition": f'inline; filename="oereb_auszug_{egrid}.pdf"'
    }
    return StreamingResponse(stream_pdf(), headers=headers)


@app.post("/api/analyze")
async def analyze_endpoint(request: AnalyzeRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="OpenAI API-Key im Authorization-Header fehlt.")

    api_key = authorization.split(" ")[1].strip()

    # 1. Geodaten (Umkreis) abrufen
    try:
        geo_data = await get_geo_data(request.lat, request.lng, request.radius, request.active_layers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der Geodaten-Abfrage: {str(e)}")

    simplified_data = simplify_geo_data(geo_data, request.lat, request.lng)

    # 2. ÖREB-Daten
    oereb_data_simplified = None
    parcel_geometry = None
    egrid = None

    try:
        egrid = await get_egrid(request.lat, request.lng)
        if egrid:
            oereb_json = await fetch_oereb(egrid)
            if oereb_json:
                oereb_data_simplified = simplify_oereb_for_llm(oereb_json)
                parcel_geometry = extract_parcel_geometry(oereb_json)
    except Exception as e:
        print(f"Warnung: Fehler bei ÖREB-Abfrage: {e}", flush=True)
        # Wir lassen es nicht abstürzen, fallback auf WFS
        pass

    # 3. LLM-Analyse
    try:
        # Wir übergeben nun auch oereb_data_simplified
        report = await asyncio.to_thread(
            analyze_geo_data,
            api_key,
            simplified_data,
            request.role,
            request.provider,
            oereb_data_simplified
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der LLM-Generierung: {str(e)}")

    del api_key

    summary = {layer: len(data.get("features", [])) for layer, data in geo_data.items() if isinstance(data, dict)}
    if oereb_data_simplified:
        summary["ÖREB"] = len(oereb_data_simplified.get("Öffentlich_rechtliche_Beschränkungen", []))

    return {
        "report": report,
        "geo_summary": summary,
        "raw_geo_data": simplified_data,
        "egrid": egrid,
        "parcel_geometry": parcel_geometry
    }


@app.post("/api/compare")
async def compare_endpoint(request: CompareRequest, authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="API-Key im Authorization-Header fehlt.")

    api_key = authorization.split(" ")[1].strip()

    # 1. Geodaten für beide Standorte parallel abrufen
    try:
        geo_data_1, geo_data_2 = await asyncio.gather(
            get_geo_data(request.lat1, request.lng1, request.radius, request.active_layers),
            get_geo_data(request.lat2, request.lng2, request.radius, request.active_layers)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der Geodaten-Abfrage: {str(e)}")

    simplified_1 = simplify_geo_data(geo_data_1, request.lat1, request.lng1)
    simplified_2 = simplify_geo_data(geo_data_2, request.lat2, request.lng2)

    # 2. ÖREB-Daten ignorieren wir im Compare-Modus fürs Erste aus Performance-Gründen

    # 3. LLM-Analyse (Vergleich)
    try:
        report = await asyncio.to_thread(
            compare_geo_data,
            api_key,
            simplified_1,
            simplified_2,
            request.role,
            request.provider
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler bei der LLM-Generierung: {str(e)}")

    return {
        "report": report,
        # Wir liefern beide Rohdaten-Sets ans Frontend zurück
        "raw_geo_data_1": simplified_1,
        "raw_geo_data_2": simplified_2
    }
